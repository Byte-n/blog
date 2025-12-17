---
title: 微信小程序maxLength在IOS拼音输入法下异常
published: 2025-11-08
tags: [Taro]
category: 微信小程序
draft: false
---


使用自定义的高阶函数在onInput会调中手动限制长度

```tsx
import {BaseEventOrig, CommonEventFunction} from "@tarojs/components/types/common";
import {InputProps} from "@tarojs/components";

export const onInputMaxLength = (
  maxLength: number,
  onInput?: CommonEventFunction<InputProps.inputEventDetail>
) => {

  return (e: BaseEventOrig<InputProps.inputEventDetail>) => {
    e.detail.value = String(e.detail.value).substring(0, maxLength);
    onInput?.(e)
  }
}

```
