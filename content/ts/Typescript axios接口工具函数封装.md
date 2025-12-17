---
title: Typescript axios接口工具函数封装
published: 2025-11-05
tags: [axios]
category: ts
draft: false
---

## 背景
为什么需要封装，每次请求，都需要处理身份验证、请求与响应数据转换、错误与异常处理等。若不同业务的后端验证、请求响应数据格式等不一致，则每次请求时手动处理这些规则十分麻烦，且不利于维护。

对于不同的后端服务，可以封装不同的请求工具对象。

## 实现
创建axios实例

```tsx
// 设置每个请求默认的配置
const request = axios.create({ baseURL: '/api' })

// 拦截请求
request.interceptors.request.use(
  (option) => {
    if (option.headers.authorization === undefined) {
      // 补充身份验证字段
      option.headers.authorization = xxxx;
    }
    // 打印请求信息
    console.info(`🛫🛫🛫🛫🛫🛫请求：[${option.method}]${option.url}`, 'params', option.params, 'data', option.data, 'headers', option.headers)
    return option
  }
)

// 拦截响应
request.interceptors.response.use(
  async (response) => {
    console.info(`⬇️⬇️⬇️⬇️⬇️⬇️响应：[${response.config.method}]${response.config.url}`, 'data', response.data, 'headers', response.headers)
    const data = response.data as Resp<any>;
    if (data.code === 101) {
      const refreshToken = localStorage.getItem(STORAGE_REFRESH_TOKEN)
      // 刷新token、重新发起请求，注意避免嵌套！无限递归
      if (
        response.config.params.___retry !== undefined
        || !refreshToken
        || response.config.url?.includes(URL_REFRESH_TOKEN)
      ) {
        return Promise.reject(response)
      }

      // 刷新token
      const { access_token, refresh_token } = await refreshTokenApi(
        refreshToken,
      )
      localStorage.setItem(STORAGE_TOKEN, access_token)
      localStorage.setItem(STORAGE_REFRESH_TOKEN, refresh_token)

      // 重新请求
      const opts = _.cloneDeep(response.config)
      opts.headers.authorization = `Bearer ${access_token}`
      // 标记为重试
      if (!opts.params) {
        opts.params = {}
      }
      opts.params.___retry = true;
      return request(opts)
    }
    // 成功响应
    else if (data.code === 200 || data.code === 0) {
      return response
    } else if (data.failData) {
      return response
    }
    return Promise.reject(response)
  },
  (err) => {
    // 响应拦截器逻辑 - 错误响应
    if (err instanceof AxiosError) {
      const { response, config } = err
      if (config.params?.___checkLogin) {
        goLogin()
        return Promise.reject(err)
      }
      console.debug(
        `❌❌❌❌❌❌请求异常[${config?.method}:${response?.status ?? ''}:${response?.data?.code}]${config?.url}: `,
        'data', response?.data, 'headers', response?.headers, 'response', response
      )
      if ([401, 424].includes(err.status!)) {
        message.error('登录过期')
        goLogin()
      } else if ([404].includes(err.status!)) {
        message.error('网络环境差，请稍后重试')
        goLogin()
      } else {
        message.error(`网络错误[${err.status}] ${err.message}]`)
      }
    } else if (err instanceof Error) {
      console.debug('❌❌❌❌❌❌请求异常', err.message, 'error', err)
      message.error('系统错误')
    } else {
      console.debug('❌❌❌❌❌❌请求异常', '-', 'error', err)
      message.error('系统错误')
    }
    return Promise.reject(err)
  },
)
```

现在就可以使用`request` 发起请求。

```tsx
/**
 * 统一的响应格式
 */
type Resp<T> = {
  code: number
  msg: string
  data: T
}
interface SelectNameResult {
  name: string
}

interface SelectNameRequest {
  id: number
}

async function go() {
  const response: AxiosResponse<SelectNameResult, SelectNameRequest, {}> =
    await request.post<SelectNameResult, AxiosResponse<SelectNameResult>, SelectNameRequest>('url', {id: 1});
  /*
  response类型：
  {
    data: { data: { name: string }, code: 0, msg: '成功' }
    status: number
    statusText: string
    headers: (H & RawAxiosResponseHeaders) | AxiosResponseHeaders
    config: InternalAxiosRequestConfig<Ry>
    request?: any
  }
  */
}
```

## 扩展

但是出现另外一个问题。大部分情况下我们仅需要直接读取 `name` 就行。因为所有的错误（响应错误、`Resp.code`错误)都已经在`request.interceptors.response` 中拦截并抛出异常了，代码能运行到这里，肯定是没问题的。读取`name` 需要`response.data.data.name` ，而期望的结果最好是`response`就是`name` 。所以需要将响应结果扁平化处理。

扁平化处理的时机：

- 响应拦截器中直接返回`response.data.data` 达到目的。
    - `axios.post` 的返回值还是`AxiosResponse` ，需要重新通过修改这些函数的TS类型定义。另外在一些特殊请求时，需要返回完整的响应内容，这时就需要添加额外的函数参数来做区分。那么还需要针对函数参数做TS类型重载完善提示。
- 自定义工具函数，针对`response` 做提取。
    - 需要手动调用。需要TS类型重载。但控制更精细、扩展更方便。

下面选择自定义工具函数来实现。将`request` 再封装一层为`api` （仅提供需要的部分）。使用`wrap` 来扩展`request.xxx` 返回的`promise` 。通过`flat(level)`来控制响应展开的层级（这里需要使用到TS的函数类型重载来实现更精细的类型提示）。

```tsx
const api = {
  getUri(config?: AxiosRequestConfig) {
    return request.getUri(config)
  },
  request<T = any, D = any, R extends Resp<any> = Resp<T>>(config: AxiosRequestConfig<D>) {
    return wrap(request.request<T, AxiosResponse<R>, D>(config))
  },
  post<T = any, D = any, R extends Resp<any> = Resp<T>>(url: string, data?: D, config?: AxiosRequestConfig<D>) {
    return wrap<T, R>(request.post<T, AxiosResponse<R>, D>(url, data, config))
  },
  get<T = any, R extends Resp<any> = Resp<T>>(url: string, config?: AxiosRequestConfig) {
    return wrap(request.get<T, AxiosResponse<R>>(url, config))
  },
  put<T = any, D = any, R extends Resp<any> = Resp<T>>(url: string, data?: D, config?: AxiosRequestConfig<D>) {
    return wrap(request.put<T, AxiosResponse<R>, D>(url, data, config))
  },
  patch<T = any, D = any, R extends Resp<any> = Resp<T>>(url: string, data?: D, config?: AxiosRequestConfig<D>) {
    return wrap(request.patch<T, AxiosResponse<R>, D>(url, data, config))
  },
  delete<T = any, D = any, R extends Resp<any> = Resp<T>>(url: string, config?: AxiosRequestConfig<D>) {
    return wrap(request.delete<T, AxiosResponse<R>, D>(url, config))
  },
  head<T = any, D = any, R extends Resp<any> = Resp<T>>(url: string, config?: AxiosRequestConfig<D>) {
    return wrap(request.head<T, AxiosResponse<R>, D>(url, config))
  },
  options<T = any, D = any, R extends Resp<any> = Resp<T>>(url: string, config?: AxiosRequestConfig<D>) {
    return wrap(request.options<T, AxiosResponse<R>, D>(url, config))
  },
  postForm<T = any, D = any, R extends Resp<any> = Resp<T>>(url: string, data?: D, config?: AxiosRequestConfig<D>) {
    return wrap(request.postForm<T, AxiosResponse<R>, D>(url, data, config))
  },
  putForm<T = any, D = any, R extends Resp<any> = Resp<T>>(url: string, data?: D, config?: AxiosRequestConfig<D>) {
    return wrap(request.putForm<T, AxiosResponse<R>, D>(url, data, config))
  },
  patchForm<T = any, D = any, R extends Resp<any> = Resp<T>>(url: string, data?: D, config?: AxiosRequestConfig<D>) {
    return wrap(request.patchForm<T, AxiosResponse<R>, D>(url, data, config))
  }
}

/**
 * 将结果扁平化
 */
function flat<T = any, R extends Resp<any> = Resp<T>>(this: Promise<AxiosResponse<R>>): Promise<R['data']>;
function flat<T = any, R extends Resp<any> = Resp<T>>(this: Promise<AxiosResponse<R>>, level: 1): Promise<R>;
function flat<T = any, R extends Resp<any> = Resp<T>>(this: Promise<AxiosResponse<R>>, level: 2): Promise<R['data']>;
async function flat<T = any, R extends Resp<any> = Resp<T>>(this: Promise<AxiosResponse<R>>, level?: 1 | 2): Promise<T | R> {
  const res = await this;
  if (level === 1) {
    return res.data;
  }
  return res.data?.data;
}

function wrap<T = any, R extends Resp<any> = Resp<T>>(promise: Promise<AxiosResponse<R>>) {
  const newPromise = promise as Promise<AxiosResponse<R>> & { flat: typeof flat }
  newPromise.flat = flat;
  return newPromise;
}

export default api;
```

再看看效果：

```tsx
async function go() {
  const response: string = await api.post<SelectNameResult, SelectNameRequest>('url', {id: 1}).flat();
}
```
