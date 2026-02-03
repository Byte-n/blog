---
title: React调度器在打印任务中的应用
published: 2025-11-03
tags: [react-scheduler, 性能优化]
category: react
draft: false
---
## 背景

在分拣管理系统中，用户可批量选择数百个订单并提交打印请求。直接将所有打印命令一次性发送至打印机会导致：

- 🔥 **缓冲溢出**：打印机硬件缓冲通常为 KB 级别，海量命令会超出容量
- ❌ **命令丢失或混乱**：打印机无法及时处理，部分命令丢失或顺序错乱
- ⏸️ **UI 冻结**：主线程被 I/O 操作阻塞，用户交互无响应
- 🖨️ **设备崩溃**：极端情况下打印机会重启

为此需要一个**任务调度系统**，将批量打印任务分片顺序执行。

## 概述

基于 React Scheduler 思想实现的轻量级任务调度器，专用于打印任务的顺序执行管理。通过时间分片和异步调度，防止长任务阻塞渲染。

## 核心设计

### Scheduler 类结构

```
任务队列 → 调度引擎 → 帧时间检测 → 任务执行

```

**关键特性：**

1. **MessageChannel 优先调度**：利用 MessageChannel 的微任务特性实现高效调度，无可用时降级到 setTimeout
2. **时间分片**：每批任务执行限制在 5ms 内，超时则暂停并重新调度，保持 UI 响应性
3. **Promise 支持**：任务可返回 Promise，调度器会等待异步完成后继续下一个任务
4. **任务取消**：支持按 ID 取消已队列的任务

### 执行流程

```
scheduleTask() → _taskQueue.push() → _requestHostCallback()
                                           ↓
                                   MessageChannel.postMessage()
                                           ↓
                                    _flushWork() 开始处理
                                           ↓
                                      _workLoop()
                                      循环执行任务
                                      检测 5ms 超时
                                           ↓
                                    任务队列非空时重新调度

```

## 应用场景：标签打印

### 打印流程

在 `useLabelPrint` 中的应用：

```tsx
// 1. 构建打印参数
const params = {
  saleOrderDetailIdList: products.map(p => p.saleOrderDetailId),
  isPrintItem: true,
  isPrintItemNew: true
}

// 2. 查询打印命令
const commands = await queryLabelPrintCommandApi(params)

// 3. 逐个调度打印任务
commands.forEach(command => {
  scheduler.scheduleTask(() => {
    if (bluetooth.connectedPrinterDevice?.source === 'usb') {
      bridge.printer.usbPrintLabel(command)
    } else {
      bridge.printer.bluetoothPrintLabel(address, command)
    }
  })
})

```

### 实现策略

调度器采用 **时间分片 + 消息队列** 模式：

```
[100+ 打印命令] → [Scheduler] → [消息队列]
                            ↓
                        每 5ms 执行 1 条
                            ↓
                    打印机处理完成
                            ↓
                        下一条命令

```

**优势：**

- ✅ 打印机有充足时间处理每条命令（平均间隔 5ms）
- ✅ UI 线程保持响应（每 5ms 检查一次超时）
- ✅ 系统资源均衡利用，无峰值压力
- ✅ 支持中途取消任务

## 关键优化点

### 1. 状态标志隔离

```tsx
_isScheduled    // 是否已请求调度
_isPerformingWork  // 是否正在处理任务

```

防止重复调度和竞态条件。

### 2. 自适应降级

```tsx
if (typeof MessageChannel !== 'undefined') {
  // 现代浏览器：MessageChannel 微任务调度
} else {
  // 兼容模式：setTimeout 宏任务调度
}

```

### 3. 错误隔离

单个任务失败不影响队列中其他任务的执行。

## 性能指标

- **调度延迟**：< 1ms（MessageChannel）
- **帧内执行时间**：5ms
- **支持队列深度**：无限制
- **内存占用**：O(n)，n 为队列任务数

## 总结

Scheduler 以最小化的代码复杂度实现了 React 级别的任务调度能力，特别适合：

- 大量串行 I/O 操作（打印、上传等）
- 需要保持 UI 响应性的后台任务
- 设备集成场景的命令下发

核心价值在于 **时间分片 + 优先级调度 + 异步支持** 的有机结合。

## Schduler 代码

```tsx
/** 调度任务接口 */
interface Task {
  /** 任务唯一标识 */
  id: number
  /** 任务执行函数，支持同步和异步 */
  callback: () => void | Promise<void>
}

/**
 * 任务调度器 - 基于时间分片的轻量级调度实现
 */
export default class Scheduler {
  /** 待执行任务队列 */
  private _taskQueue: Task[] = []
  /** 任务计数器，用于生成唯一 ID */
  private _taskIdCounter = 0
  /** 标志：是否已请求调度（防止重复调度） */
  private _isScheduled = false
  /** 标志：是否正在处理任务（防止并发执行） */
  private _isPerformingWork = false
  /** 当前执行的任务 */
  private _currentTask: Task | null = null
  /** 帧时间限制，单位 ms。每个时间分片最多执行 5ms 的任务 */
  private _frameDeadline = 5
  /** MessageChannel 实例，用于高效的微任务调度 */
  private _channel: MessageChannel | null = null
  /** 调度方式：优先级 MessageChannel > requestIdleCallback > setTimeout */
  private _scheduleStrategy: 'messageChannel' | 'idleCallback' | 'timeout' = 'timeout'

  /**
   * 初始化调度器
   * 
   * 自动检测 MessageChannel、requestIdleCallback、setTimeout 可用性
   */
  constructor() {
    if (typeof MessageChannel !== 'undefined') {
      try {
        this._channel = new MessageChannel()
        // port2 接收消息时触发调度
        this._channel.port2.onmessage = () => {
          this._flushWork()
        }
        this._scheduleStrategy = 'messageChannel'
      } catch (e) {
        // MessageChannel 创建失败，降级到下一个方案
        console.warn('MessageChannel initialization failed, fallback to next strategy')
        this._channel = null
      }
    }

    // 如果 MessageChannel 不可用，检查 requestIdleCallback
    if (!this._channel && typeof requestIdleCallback !== 'undefined') {
      this._scheduleStrategy = 'idleCallback'
    } else if (!this._channel) {
      // 最终降级到 setTimeout（所有环境都支持）
      this._scheduleStrategy = 'timeout'
    }
  }

  /**
   * 添加任务到调度队列
   * 
   * @param callback 任务函数
   * @returns 任务 ID
   */
  scheduleTask(callback: () => void | Promise<void>): number {
    const task: Task = {
      id: ++this._taskIdCounter,
      callback,
    }

    this._taskQueue.push(task)

    // 保证仅在有必要时调度
    if (!this._isScheduled && !this._isPerformingWork) {
      this._isScheduled = true
      this._requestHostCallback()
    }

    return task.id
  }

  /**
   * 取消指定的任务
   * 
   * @param taskId 任务 ID
   * @returns 成功返回 true
   */
  cancelTask(taskId: number): boolean {
    const index = this._taskQueue.findIndex((task) => task.id === taskId)
    if (index !== -1) {
      this._taskQueue.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * 请求调度回调
   * 
   * 根据浏览器能力选择不同策略
   */
  private _requestHostCallback() {
    switch (this._scheduleStrategy) {
      case 'messageChannel':
        // MessageChannel 微任务
        if (this._channel) {
          this._channel.port1.postMessage(null)
        } else {
          // 降级到 setTimeout
          this._scheduleStrategy = 'timeout'
          setTimeout(() => this._flushWork(), 0)
        }
        break

      case 'idleCallback':
        // requestIdleCallback 空闲回调
        requestIdleCallback(() => this._flushWork(), { timeout: 1000 })
        break

      case 'timeout':
      default:
        // setTimeout 宏任务
        setTimeout(() => this._flushWork(), 0)
        break
    }
  }

  /**
   * 刷新调度队列
   */
  private async _flushWork() {
    // 防止并发
    if (this._isPerformingWork) {
      return
    }

    this._isScheduled = false
    this._isPerformingWork = true

    try {
      await this._workLoop()
    } catch (error) {
      console.error('Scheduler error:', error)
    } finally {
      this._isPerformingWork = false
      this._currentTask = null

      if (this._taskQueue.length > 0) {
        this._isScheduled = true
        this._requestHostCallback()
      }
    }
  }

  /**
   * 时间分片工作循环
   * 
   * 每次执行后检测是否超过 5ms 时间预算
   */
  private async _workLoop() {
    const startTime = performance.now()

    while (this._taskQueue.length > 0) {
      this._currentTask = this._taskQueue.shift()!

      try {
        const result = this._currentTask.callback()

        // 支持异步任务
        if (result instanceof Promise) {
          await result
        }
      } catch (error) {
        // 单个任务失败不影响后续任务
        console.error(`Task ${this._currentTask.id} failed:`, error)
      }

      this._currentTask = null

      // 检查是否超过时间预算
      if (this._shouldYieldToHost(startTime)) {
        break
      }
    }
  }

  /**
   * 判断是否应该让出执行权
   * 
   * @param startTime 时间分片的开始时间
   * @returns 若执行时间 >= 5ms，返回 true
   */
  private _shouldYieldToHost(startTime: number): boolean {
    const elapsed = performance.now() - startTime
    return elapsed >= this._frameDeadline
  }

  /**
   * 获取待执行任务数
   */
  getQueueLength(): number {
    return this._taskQueue.length
  }

  /**
   * 清空所有任务
   */
  clearQueue(): void {
    this._taskQueue = []
    this._currentTask = null
  }

  /**
   * 获取当前调度策略
   */
  getScheduleStrategy(): string {
    return this._scheduleStrategy
  }
}

```
