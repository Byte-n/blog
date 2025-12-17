---
title: Taro-微信小程序 navigateBack 回传参数
published: 2025-11-01
tags: [Taro]
category: 微信小程序
draft: false
---

## 使用 事件订阅的形式 实现数据的传递。

```tsx
import Taro from "@tarojs/taro";

/** 创建跳转页面选择辅助函数 */
export const createChooseHelperEvents = <T, F extends Record<string | number, any>>({url, name}: {
  /** url 参数 */
  url: string;
  /** 监听器名称 */
  name: string;
}): {
  /** 选择页面函数 */
  choose: (data: T) => void;
  /** 跳转到选择页面函数 */
  toChoose: (params: F) => Promise<T>;
} => {
  return {
    choose: (data) => {
      const pages = Taro.getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const eventChannel = currentPage.getOpenerEventChannel();
      eventChannel.emit(name, data);
    },
    toChoose: (params: Record<string | number, any>) => {
      return new Promise<T>((resolve, reject) => {
        Taro.navigateTo({
          url: `${url}?${jsonToUrlParams(params)}`,
          events: {
            [name]: (data: T) => {
              data ? resolve(data) : reject();
            }
          }
        });
      });
    }
  };
};

// jsonToUrlParams 实现省略

```

## 使用

```tsx
export const dishedOrderChooseHelper = createChooseHelperEvents<
  PreOrder.PreOrderAddProductDTO[],
  {}
>({
  url: '/pages/placeAnOrder/subPages/dishesOrder/index',
  name: 'chooseDishesOrder'
});

// 获取数据的调用方（父界面）
const data = await dishedOrderChooseHelper.toChoose({});

// dishesOrder子界面中
dishedOrderChooseHelper.choose(selectData);
```
