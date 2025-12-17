---
title: Taro-语言识别的hook
published: 2025-11-04
tags: []
category: Taro
draft: false
---

- 使用
    - status: 当前在那个阶段
    - originText：语音转换后的原文本
    - cancel：取消录音
    - convertAction：执行 originText 转业务数据逻辑，然后触发 onAddRows
    - start：开始录音
    - invalidInput：convertAction 每次转换后，剩余的无效文本
    - setInvalidInput：可编辑invalidInput 后，再此通过convertAction转换，…

```tsx
  const {
    status, originText, cancel,
    convertAction, start, invalidInput, setInvalidInput
  } = useAudio2Order({
    onAddRows: onSuccess,
    onStop: () => setVisible(false)
  })
```

- useAudio2Order.ts

```tsx
import {useCallback, useState} from "react";
import useRequest from "@taro-hooks/use-request";
import {textParse} from "@/modules/preOrder/services";
import Taro from "@tarojs/taro";
import useRecorderManager from "@/shared/hooks/useRecorderManager";

export enum Status {
  // 音频输入中
  audioInput,
  // 转换文本中
  convertText,
  // 转换文本成功
  invalid
}

export default ({onAddRows, onStop}: {
  onAddRows?: (data: PreOrder.PreOrderAddProductDTO[]) => void,
  onStop?: VoidFunction
}) => {
  const [originText, setOriginText] = useState('');
  const [invalidInput, setInvalidInput] = useState('')
  const [status, setStatus] = useState<Status | null>(null)

  const {runAsync: textParseAsyncAction, loading: textParseLoading} = useRequest(
    textParse, { manual: true }
  )

  const doParseText = useCallback(async (text: string) => {
    if (textParseLoading) {
      return;
    }
    if (!text) {
      Taro.showToast({
        title: '没有可识别的文本',
        icon: 'none',
      })
      return
    }
    const result = (await textParseAsyncAction(text)) as PreOrder.TextParseVO;
    if (!result) {
      Taro.showToast({
        title: '未能识别，请重试',
        icon: 'none',
      })
      return
    }
    let data = result
    let hasData = data.parseRespList && data.parseRespList.length > 0
    if (hasData) {
      onAddRows?.(data.parseRespList as PreOrder.PreOrderAddProductDTO[])
    }
    return data.badInput ?? '';
  }, [textParseLoading, textParseAsyncAction, onAddRows]);

  const {startRecord, stopRecording} = useRecorderManager({
    onRecognitionResult: setOriginText,
    onStop: () => convertAction(false)
  })

  const convertAction = async (st = true) => {
    if (status === Status.audioInput) {
      setStatus(Status.convertText)
      st && stopRecording()
      const otherText = await doParseText(originText)
      setOriginText('');
      if (otherText) {
        setInvalidInput(otherText)
        setStatus(Status.invalid)
        return Status.invalid;
      }
      setStatus(null)
      onStop?.();
      return null;
    }

    if (status === Status.invalid) {
      if (!invalidInput) {
        setStatus(null)
        return null;
      }
      const otherText = await doParseText(invalidInput)
      if (otherText) {
        setInvalidInput(otherText)
        return Status.invalid;
      }
      setStatus(null)
      onStop?.();
      return null;
    }
  }

  return {
    start: async () => {
      setOriginText('');
      setInvalidInput('');
      setStatus(Status.audioInput)
      await startRecord()
    },
    convertAction: () => convertAction(),
    cancel: async () => {
      await stopRecording()
    },
    originText,
    invalidInput,
    status,
    setInvalidInput,
    doParseText,
    loading: textParseLoading,
  }
}

```

- 使用

```tsx
  const {startRecord, stopRecording} = useRecorderManager({
    onRecognitionResult: setOriginText,
  })
```

- useRecorderManager 实现

```tsx
import {
  authorizePermissions,
  createSocketConnection,
  handleMessageData,
  remainingTimeInterval,
  toBase64,
} from '@/shared/hooks/useRecorderManager/utils'

import Taro from '@tarojs/taro'
import {useCallback, useRef, useState} from 'react'

export interface UseRecorderManagerProps {
  /**
   * 语音录入时间，单位毫秒，最长60000毫秒
   * 默认也是60000毫秒
   */
  remainingTime?: number
  /**
   * 识别结果的回调
   * @param value
   */
  onRecognitionResult?: (value: string) => void
  /**
   * 剩余时间变化触发的方法 返回是秒
   * @param value
   */
  onRemainingTimeChange?: (value: number) => void
  onStop?: () => void
}

const propsWithDefault = (props: UseRecorderManagerProps) => {
  if (!props.remainingTime) {
    props.remainingTime = 60 * 1000;
  }
  return props;
}

export default function useRecorderManager(props: UseRecorderManagerProps) {

  const propsRef = useRef<UseRecorderManagerProps>(props);
  propsRef.current = propsWithDefault(props);

  // 是否在录音中
  const [isRecording, _setRecording] = useState(false);
  const isRecordingRef = useRef<boolean>(isRecording);
  const setRecording = useCallback((v) => {
    isRecordingRef.current = v;
    _setRecording(v);
  }, [])

  // remainingTime 倒计时的 interval 的返回值
  const intervalTimer = useRef<any>()

  // 解析缓存
  const voiceResultMapRef = useRef<Map<number, any>>(new Map())

  // ws连接
  const socketConnection = useRef<Taro.SocketTask | null>(null)

  /**
   * 停止录音
   */
  const stopRecording = useCallback(() => {
    setRecording(false)
    clearInterval(intervalTimer.current)
    // 完整清理，关闭所有连接与状态
    try {
      Taro.getRecorderManager().stop()
    } catch {
    }
    try {
      socketConnection.current?.close({code: 1})
    } catch {
    }
    // 事件会调
    propsRef.current.onStop?.()
    // ws连接
    socketConnection.current = null
    // 解析缓存
    voiceResultMapRef.current = new Map()
  }, [])

  /**
   * 暂停录音
   */
  const pauseRecording = useCallback(() => {
    if (!isRecordingRef.current) {
      return;
    }
    Taro.getRecorderManager().pause()
    setRecording(false)
  }, [])

  /**
   * 继续录音
   */
  const resumeRecording = useCallback(() => {
    if (isRecordingRef.current) {
      return;
    }
    Taro.getRecorderManager().resume()
    setRecording(true)
  }, [])

  // 处理识别结果
  const onMessage = useCallback((res: string) => {
    if (!res) {
      return
    }

    // 解析讯飞的数据包
    try {
      const jsonData = JSON.parse(res)
      if (jsonData.data && jsonData.data.result) {
        const resultText = handleMessageData(jsonData.data.result, voiceResultMapRef.current)
        propsRef.current.onRecognitionResult?.(resultText)
      }
      if (jsonData.code === 0 && jsonData.data.status === 2) {
        stopRecording()
      }
      if (jsonData.code !== 0) {
        stopRecording()
        Taro.showToast({
          title: `讯飞调用失败:${jsonData.code}`,
          icon: 'none',
        })
      }
    } catch (err) {
      console.error('语音解析异常', err)
      stopRecording()
      Taro.showToast({
        title: `语音解析异常`,
        icon: 'none',
      })
    }
  }, [])

  const startRecord = useCallback(async () => {
    if (isRecordingRef.current) return
    setRecording(true)

    try {
      await authorizePermissions()

      const recorder = Taro.getRecorderManager()
      recorder.onStart(() => {
        clearInterval(intervalTimer.current)
        // 是否需要等待最后一个片段完成（ws 收到消息后关闭）？
        intervalTimer.current = remainingTimeInterval(
          propsRef.current.remainingTime!,
          v => propsRef.current.onRemainingTimeChange?.(v),
          stopRecording
        )
      })

      recorder.onError?.((error) => {
        console.error('录音失败，请重试', JSON.stringify(error));
        Taro.showToast({title: '录音失败，请重试', icon: 'none'})
      })

      const duration = Math.min(Math.max(propsRef.current.remainingTime!, 0), 60000)
      recorder.start({
        duration,
        sampleRate: 16000,
        numberOfChannels: 1,
        frameSize: 2,
        format: 'pcm' as any,
      })

      recorder.onFrameRecorded(({frameBuffer, isLastFrame}) => {
        if (!isRecordingRef.current) {
          return;
        }
        const u8Arr = new Uint8Array(frameBuffer)
        socketConnection.current?.send({
          data: JSON.stringify({
            data: {
              status: isLastFrame ? 2 : 1,
              format: 'audio/L16;rate=16000',
              encoding: 'raw',
              audio: toBase64(u8Arr),
            },
          }),
          fail: (err) => {
            console.error('音频发送失败', err)
            Taro.showToast({title: '音频发送失败', icon: 'none'})
          },
        })
      })

      // ws连接
      socketConnection.current = await createSocketConnection();
      socketConnection.current!.onMessage((e) => onMessage(e.data))
      socketConnection.current!.onError?.(() => Taro.showToast({title: '语音服务异常', icon: 'none'}))
    } catch (err) {
      console.error('连接语音服务失败', err)
      Taro.showToast({title: '连接语音服务失败', icon: 'none'})
      stopRecording()
    }
  }, [])
  return {
    startRecord,
    pauseRecording,
    resumeRecording,
    isRecording,
    stopRecording,
  }
}

```

- utils

```tsx
import Taro from "@tarojs/taro";

export const toBase64 = (buffer: Uint8Array) => {
   ...
}

export const handleMessageData = (data: any, map: Map<number, any>) => {
  let sn = data.sn
  let pgs = data.pgs
  if (sn && pgs) {
    map.set(sn, data)
    if (pgs == 'rpl') {
      let rg = data.rg
      if (rg != null && rg.length == 2) {
        for (let key = rg[0]; key <= rg[1]; key++) {
          map.delete(key)
        }
      }
    }
  }
  // 将Map的entries转换为数组并按键排序
  const sortedEntries = Array.from(map.entries()).sort(
    (a, b) => a[0] - b[0],
  )
  // 使用reduce累积拼接文本，模拟StringBuffer的行为
  return sortedEntries.reduce((stringBuffer, [, cur]) => {
    const ws = cur.ws

    // 如果ws为空，返回之前的累积结果
    if (!ws) {
      return stringBuffer
    }

    // 遍历词组列表，拼接每个词组的第一个候选词
    for (let i = 0; i < ws.length; i++) {
      const cw = ws[i].cw
      if (cw) {
        stringBuffer += cw[0].w
      }
    }
    return stringBuffer
  }, '')
}

export const createSocketConnection = async () => {
  const connect = await Taro.connectSocket({url: '讯飞音频转换ws服务地址' })
  await new Promise<void>((resolve, reject) => {
    connect.onOpen(() => {
      connect.send({
        data: '配置',
        fail: () => {
          Taro.showToast({title: '语音服务握手失败', icon: 'none'})
        },
      })
      resolve();
    })
    connect.onError?.((err) => {
      console.error('语音服务异常', err)
      Taro.showToast({title: '语音服务异常', icon: 'none'});
      reject(err)
    })
  })
  return connect!;
}

export const authorizePermissions = () => {
  return new Promise((resolve, reject) => {
    Taro.authorize({
      scope: 'scope.record',
      fail: (err) => {
        Taro.showModal({
          title: '提示',
          content: '您未授权录音，功能将无法使用',
          confirmColor: '#06AE56',
          cancelColor: '#000000',
          confirmText: '去授权',
          success: ({confirm}) => {
            confirm && Taro.openSetting()
          },
        })
        reject(err)
      },
      success: resolve,
    })
  })
}

export const remainingTimeInterval = (remainingTime, onRemainingTimeChange, stopRecording) => {
  let currentRemaining = Math.min(Math.max(remainingTime!, 0), 60000)
  onRemainingTimeChange?.(currentRemaining / 1000)
  const timer = setInterval(() => {
    currentRemaining -= 500
    if (currentRemaining <= 0) {
      clearInterval(timer)
      stopRecording()
      onRemainingTimeChange?.(0)
      return
    }
    onRemainingTimeChange?.(currentRemaining / 1000)
  }, 500)
  return timer;
}

```
