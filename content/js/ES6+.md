---
title: js ES6
published: 2025-11-10
tags: [ES6]
category: js
draft: false
---
## 新增的对象、函数等

- `Map`, `Set` ,`WeakMap`, `WeakSet`
- 放射与代理`Reflect`、`Proxy`
- `structureClone` 全局函数
- view transition api
- transform stream接口
- documen元素变更监听
    - `MutaionObserver`监听 DOM 树的变化
    - **`ResizeObserver`**监听 **元素尺寸变化**
    - **`IntersectionObserver`**监听 **元素是否进入/离开视口**
    - **`PerformanceObserver`** 监听 **性能条目（PerformanceEntry）** 的生成
    - `ArrayBuffer`, `DataView`
    - 国际化 **`RelativeTimeFormat` / `Intl`**
- 取消机制：**`AbortController` + `signal`**
- 函数
    - Array
        - `Array.from` 将可迭代的对象转为真正的数组
        - `Array.of` 创建一个包含指定元素的新数组
        - `Array.prototype.copyWithin` 浅复制一部分
        - **`Array.prototype.fill`**用一个固定值填充数组的全部或部分元素。
        - **`Array.prototype.find` 、`findIndex`、`keys`、`values`、`entries`**
        - `includes` [es7]
        - `flat` [**ES10**]
        - `Array.prototype.at()`（支持负索引）[**ES12]**
    - String
    | `String.prototype.includes()` | 判断字符串是否包含指定子串（返回布尔值） | ES6 |
    | --- | --- | --- |
    | `String.prototype.startsWith()` | 判断字符串是否以指定子串开头 | ES6 |
    | `String.prototype.endsWith()` | 判断字符串是否以指定子串结尾 | ES6 |
    | `for...of` 遍历字符串 | 正确迭代包含 emoji 等 Unicode 字符的字符串 | ES6 |
    | `String.prototype.padStart()` | 在字符串开头填充字符至指定长度 | ES8 |
    | `String.prototype.padEnd()` | 在字符串末尾填充字符至指定长度 | ES8 |
    | `String.prototype.trimStart()` | 移除字符串开头的空白字符（别名：`trimLeft`） | ES9 |
    | `String.prototype.trimEnd()` | 移除字符串末尾的空白字符（别名：`trimRight`） | ES9 |
    | `String.prototype.matchAll()` | 返回所有正则匹配结果（含捕获组）的迭代器 | ES10 |
    | `String.prototype.replaceAll()` | 替换所有匹配的子串（无需正则全局标志） | ES12 |
    | `String.prototype.at()` | 支持负索引访问字符（如 `.at(-1)`），更好支持 Unicode | ES13 |
    - Object
    | **方法 / 特性** | **说明** | **所属版本** |
    | --- | --- | --- |
    | `Object.assign(target, ...sources)` | 浅拷贝多个源对象到目标对象（常用于合并、克隆） | ES6 |
    | `Object.is(value1, value2)` | 更严格的相等比较（修复 `===` 对 `NaN` 和 `+0/-0` 的问题） | ES6 |
    | `Object.getOwnPropertyDescriptors(obj)` | 获取对象所有自身属性的完整描述符（含 getter/setter） | ES8 |
    | `Object.values(obj)` | 返回对象自身可枚举属性的值组成的数组 | ES8 |
    | `Object.entries(obj)` | 返回对象自身可枚举属性的 `[key, value]` 键值对数组 | ES8 |
    | `Object.getOwnPropertyNames(obj)` | （注：此方法 ES5 已有，非新增） | — |
    | `Object.fromEntries(iterable)` | 将键值对列表（如 `Map` 或 `entries` 数组）转为对象 | ES10 |
    | `Object.hasOwn(obj, prop)` | 安全检查对象自身是否含有某属性（替代 `hasOwnProperty`） | ES13 |
    - Math ： log 预算、三角函数、平方、立方根等
    

## 新增的特性

- class[ES6]
- 模块化 `import/export`
- 
- 迭代器：Iterator
- 类修饰器，函数修饰器
- BigInt 与 Symbol
- 对象属性字面量简写：`const obj = { name, age }`
    
    以前只能`const obj = { name: name , age : age }`
    
- 模板字符串
- 扩展运算符
    - ES6（数组）
    - ES9（对象）
- 解构赋值[ES6]
- **异步迭代（Async iteration） + `for await...of` [ES9]**
    
    对象的`Symbol.asyncIterator` 返回一个异步的迭代器。
    
    可以使用三种方式创建：
    
    - **`obj[**Symbol.asyncIterator**]**`返回异步生成器函数（Async Generator Function）
    - `obj[Symbol.asyncIterator]`返回一个对象 `{ next: () ⇒ { value: any, done: boolean } }`
    - 本身就是一个异步生成器函数
        
        ```jsx
        function createAsyncIterable(max) {
          return {
            async *[Symbol.asyncIterator]() {
              for (let i = 1; i <= max; i++) {
                await new Promise(resolve => setTimeout(resolve, 500)); // 模拟异步操作
                yield i;
              }
            }
          };
        }
        
        function createManualAsyncIterable(max) {
          let current = 1;
        
          return {
            [Symbol.asyncIterator]() {
              return {
                next() {
                  if (current <= max) {
                    const value = current++;
                    // 模拟异步延迟
                    return new Promise(resolve =>
                      setTimeout(() => resolve({ value, done: false }), 500)
                    );
                  } else {
                    return Promise.resolve({ done: true });
                  }
                }
              };
            }
          };
        }
        
        async function* asyncNumberStream() {
          let i = 1;
          while (i <= 3) {
            await new Promise(r => setTimeout(r, 300));
            yield i++;
          }
        }
        
        // 使用 for await...of 遍历
        (async () => {
          for await (const num of createAsyncIterable(3)) {
            console.log(num); // 每隔 500ms 输出：1, 2, 3
          }
        })();
        ```
        
- `let`\`const`\`var` 关键字
    - `var`就会将它们提升到当前作用域的顶端、可重复声明
    - 全局声明的`var`变量，会挂载到`window`上
    
    ```tsx
    var a = "a"
    let b = "b"
    const c = "c"
    console.log(window.a) // a
    console.log(window.b) // undefined
    console.log(window.c) // undefined
    ```
    
    - `const` 声明的变量是常量，变量本身不能重新赋值
    - `let` 声明的是可以修改变量，变量本身能重新赋值
    - `let`\`const` 有块级作用域、禁止重复声明
    
    ```tsx
    // let \ const
    if (true) {
        const a = 1; // 换 let 效果一致
    }
    console.log(a) // Uncaught ReferenceError: a is not defined
    
    // var
    if (true) {
        var a = 1; // var 无块级作用域
    }
    console.log(a) // 1
    
    // var 与 变量提升
    function func () {
      // 因为没有块级作用域，变量提示会提示到上一个作用域的顶部，所以这里访问 a 不会出错
    	a = 2
    	console.log(a) // 2
    	if (true) {
    	    var a = 1; // var 无块级作用域
    	}
    	console.log(a) // 1
    }
    
    func() // 2 、 1
    
    // 没有如何修饰符号时，且作用域内没有定义重复的变量时
    function func () {
      // 隐式全局变量创建
    	a = 2 // 如果开启 严格模式 ('use strict')：会抛出 ReferenceError: a is not defined
    	console.log(2) // 1
    }
    
    func() // 2
    window.a // 2
    ```
    
    - `let`\`const` 有暂时性死区
    
    备注：若是在浏览器的控制台中测试，则需要每次开始前刷新浏览器。因为浏览器的conosle是一个连续的上下文环境。
    
    ```tsx
    // 单独执行下面的语句不会有问题
    console.log(typeof value)  // "undefined"
    
    // 单独执行下面的语句不会有问题
    console.log(typeof value)  // "undefined"
    var value = ""
    
    // 执行下面的则有问题
    console.log(typeof value)
    const value = ""
    
    // 执行下面的则有问题
    console.log(typeof value)
    let value = ""
    
    // 这样就没问题了
    console.log(typeof value)  // "undefined"
    if (true) {
        let value = "" // value 仅在 if 内有效。
    }
    ```
    

## 函数新特性

- 箭头函数
    - 没有`this`, `super`, `arguments`, `new.target`
    - This指针不能被修改，this为创建箭头函数时的上下文中的this
- 默认参数`function f(a = 1) { ... }`
- 剩余参数(可变参数、不定长参数）`function f(...args) { ... }`
- 函数调用时扩展运算符`fn(...arr)`
- 异步函数`async function f() { ... }`
- Generator 函数 (支持异步)

```jsx
function* countSync() {
  yield 1;
  yield 2;
  yield 3;
}

// 使用 for...of（同步）
for (const n of countSync()) {
  console.log(n); // 1, 2, 3（立即输出）
}

async function* countAsync() {
  await delay(100);
  yield 1;
  await delay(100);
  yield 2;
}

// 必须用 for await...of（在 async 函数中）
(async () => {
  for await (const n of countAsync()) {
    console.log(n); // 每隔 100ms 输出 1, 2
  }
})();
```

- `async/await/Promise`
