---
title: Webpack 4 到 Webpack 5 打包优化实战：构建时间从 42s 优化到 19s
published: 2025-11-06
tags: []
category: webpack
draft: false
---
## 背景

本项目是一个工位屏网页应用，基于 React 16 + TypeScript 开发。然而，项目中使用的是历史传承下来的 `@xxx-react-app/scripts` 脚手架（基于 Webpack 4），并且依赖了许多非必要的公共子库、子包等历史遗留组件。

这套旧脚手架存在诸多问题：

- **黑盒配置**：脚手架封装了大量 Webpack 配置，难以定制和优化
- **冗余依赖**：继承了历史项目的依赖包，包含许多当前项目不需要的库
- **特殊处理多**：为兼容老项目，脚手架内置了大量特殊逻辑：
    - 复杂的 polyfill 注入逻辑
    - React Hot Loader 热更新方案（Webpack 5 已有更好的原生支持）

随着项目迭代，构建性能问题日益突出：

- **生产构建缓慢**：打包时间需要 42 秒以上
- **热更新缓慢**：每次修改代码后，热更新时间超过 20 秒，开发体验极差
- **开发效率低下**：频繁的代码修改导致大量时间浪费在等待构建上

这些问题严重影响了开发效率和团队的开发体验。为此，我们决定进行一次彻底的构建优化：

1. 将构建工具从 Webpack 4 升级到 Webpack 5
2. 精简和移除非必要的依赖
3. 优化构建配置和策略

最终实现了显著的性能提升：

- ✅ 构建时间从 42s 优化到 19s，提升 **54.7%**
- ✅ 热更新从 20s+ 优化到 < 1s，提升 **95%+**

## 排查思路

打包缓慢问题的排查思路可以参考 [Webpack 构建速度优化实践](https://juejin.cn/post/7237053697528496184#heading-2)，核心步骤如下：

1. **使用 speed-measure-webpack-plugin 分析构建耗时**：定位最耗时的 loader 和 plugin
2. **分析模块数量和依赖关系**：检查是否引入了不必要的依赖
3. **检查 loader 配置**：优化 loader 的处理范围和配置
4. **检查 plugin 配置**：移除不必要的插件，优化插件参数
5. **升级构建工具版本**：利用新版本的性能优化

## 优化前的打包情况

使用 `speed-measure-webpack-plugin` 测量优化前的构建情况：

```
SMP  ⏱
General output time took 42.55 secs

 SMP  ⏱  Plugins
IgnorePlugin took 8.35 secs
TerserPlugin took 1.54 secs
ModuleConcatenationPlugin took 0.466 secs
Object took 0.082 secs
HtmlWebpackPlugin took 0.066 secs
ForkTsCheckerWebpackPlugin took 0.05 secs
CopyPlugin took 0.008 secs
MiniCssExtractPlugin took 0.003 secs
CheckPlugin took 0.001 secs
DefinePlugin took 0 secs

 SMP  ⏱  Loaders
modules with no loaders took 37.049 secs
  module count = 3975
thread-loader, and
babel-loader took 15.022 secs
  module count = 440
thread-loader, and
babel-loader, and
unplugin took 12.86 secs
  module count = 98
css-loader, and
postcss-loader, and
less-loader took 10.68 secs
  module count = 63
@svgr/webpack took 10.055 secs
  module count = 47
babel-loader took 3.56 secs
  module count = 4
url-loader took 2.56 secs
  module count = 19
css-loader, and
postcss-loader, and
unplugin took 0.563 secs
  module count = 1
css-loader took 0.444 secs
  module count = 3
style-loader, and
css-loader, and
postcss-loader, and
less-loader took 0.076 secs
  module count = 63
style-loader, and
css-loader, and
postcss-loader, and
unplugin took 0.039 secs
  module count = 1
html-webpack-plugin took 0.014 secs
  module count = 1

```

**主要问题点：**

1. **模块解析耗时长**：3975 个模块无 loader 处理耗时 37 秒
2. **thread-loader 配置不合理**：虽然启用了多线程，但实际效果不佳
3. **依赖包过多**：总模块数达到 3975 个

## 优化内容

基于上述分析，我们制定了以下优化方案：

### 1. 升级 Webpack 4 到 Webpack 5

Webpack 5 相比 Webpack 4 带来了诸多性能提升：

- **更好的持久化缓存**：支持文件系统级别的缓存
- **更优的 Tree Shaking**：减少打包体积
- **内置 Asset Modules**：无需 file-loader 和 url-loader
- **改进的代码生成**：更小的 bundle 体积

**升级过程关键步骤：**

1. **升级核心依赖**：webpack 5.88+、webpack-cli 5.x、webpack-dev-server 4.x
2. **重构配置文件**：拆分为 common/dev/prod 三个配置文件，职责分离
3. **适配 API 变化**：devServer.contentBase → static、移除 cache 配置项
4. **升级相关插件**：html-webpack-plugin 5.x、terser-webpack-plugin 5.x、fork-ts-checker 8.x
5. **测试验证**：确保开发环境和生产构建正常

**关键配置变化：**

### 依赖版本升级

```json
{
  "webpack": "^5.88.0",
  "webpack-cli": "^5.1.4",
  "webpack-dev-server": "^4.15.1",
  "babel-loader": "^9.1.3",
  "css-loader": "^6.8.1",
  "style-loader": "^3.3.3",
  "mini-css-extract-plugin": "^2.7.6",
  "html-webpack-plugin": "^5.5.3",
  "fork-ts-checker-webpack-plugin": "^8.0.0",
  "terser-webpack-plugin": "^5.3.9",
  "@svgr/webpack": "^8.1.0"
}

```

### 配置文件重构

在 `script/` 目录下创建了三个配置文件：

- **webpack.config.common.js**：公共配置(entry、output、module rules、plugins)
- **webpack.config.dev.js**：开发环境配置(devServer、HMR)
- **webpack.config.prod.js**：生产环境配置(优化、压缩)

**生产与开发打包的差异区分更精细：**

| 配置项 | 开发环境 | 生产环境 | 说明 |
| --- | --- | --- | --- |
| mode | `development` | `production` | 影响优化策略和调试信息 |
| devtool | `cheap-module-source-map` | `false` | 开发需要源图便于调试，生产不生成以减小包体积 |
| cache | 启用文件系统缓存 | 启用文件系统缓存 | 两者都启用，加快重建速度 |
| compress | `false` | N/A | 开发关闭压缩减少 CPU 开销 |
| minimize | `false` | `true` | 生产环境启用代码压缩 |
| drop_console | N/A | 取决于 PRINT_CONSOLE | 生产环境移除 console 调用 |
| IgnorePlugin | 无 | 排除 moment locale | 生产环境移除 moment 国际化文件减小包体积 |
| 文件名哈希 | 无版本号 | 含版本号 | 生产环境文件名含版本号便于缓存管理 |
| chunk 分割 | 启用 | 启用（更激进） | 生产环境分割策略更激进以优化缓存 |

这种差异化的配置策略带来的好处：

1. **开发阶段**
    - 关闭压缩和最小化，加快构建速度
    - 生成源映射便于调试
    - 启用 HMR 实现秒级热更新
    - 文件名简洁，易于定位资源
2. **生产阶段**
    - 启用全面的代码优化和压缩
    - 排除不必要的资源（如 moment locale）
    - 文件名含版本号，充分利用浏览器缓存
    - 不生成源映射，减小包体积
    - 严格的代码分割策略提升首屏加载性能

### 启用文件系统缓存

```jsx
// webpack.config.prod.js
cache: {
  type: 'filesystem',
  cacheDirectory: path.resolve(__dirname, '../.webpack_cache'),
  version: packageJson.version,
}

```

### 使用 Asset Modules 替代 url-loader

```jsx
// webpack.config.common.js
{
  test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
  type: 'asset',
  parser: {
    dataUrlCondition: {
      maxSize: 10 * 1024,
    },
  },
}

```

### 优化代码分割策略

```jsx
// webpack.config.prod.js
splitChunks: {
  chunks: 'all',
  automaticNameDelimiter: '.',
  cacheGroups: {
    common_base: {
      test: /[\\/]node_modules[\\/](react|react-dom|mobx|mobx-react|axios|lodash|moment)[\\/]/,
      name: 'common-base',
      priority: 10,
    },
    common_chunk: {
      test: /[\\/]src[\\/]/,
      name: 'common-chunk',
      minChunks: 3,
      priority: 5,
    },
    vendors: {
      test: /[\\/]node_modules[\\/]/,
      name: 'vendors',
      priority: 3,
    },
  },
}

```

### 2. 精简项目依赖

通过分析依赖关系，移除了项目中不必要的公共子库和公共包依赖：

- 移除了未使用的 `@xxx-react-app/scripts`
- 精简了部分业务组件库的引用
- 优化了按需加载的配置

这一步使模块数从 3975 个降低到 3503 个，减少了约 12%。

### 4. 优化 Loader 配置

```jsx
// webpack.config.common.js
{
  test: /\.(js|jsx|ts|tsx)$/,
  // /@xxx-touch/, /@xxx-common/ 是通过link导入的依赖
  include: [PATH.appSrc, /@xxx-touch/, /@xxx-common/],
  use: [
    {
      loader: 'babel-loader',
      options: {
        cacheDirectory: true,
        cacheCompression: false,
        compact: !isEnvDevelopment,
      },
    },
  ],
}

```

关键优化点：

- 使用 `include` 精确限定处理范围
- 启用 `cacheDirectory` 利用缓存
- 关闭 `cacheCompression` 减少压缩开销

### 6. 热更新(HMR)优化

**优化前：** 每次修改代码后，界面热更新时间需要等待 20 秒以上

**优化后：** 界面热更新小于 1 秒，接近秒更

**原因分析：**

1. **Webpack 5 改进的 HMR 机制**
    - Webpack 5 重写了 HMR 运行时，使用更高效的算法计算模块依赖关系
    - 改进的模块图(Module Graph)结构，减少了热更新时的模块遍历时间
    - 优化的 chunk 分割策略，减少了需要重新编译的模块数量
2. **文件系统缓存的作用**
    
    ```jsx
    // webpack.config.dev.js
    cache: {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '../.webpack_cache'),
    }
    
    ```
    
    - Webpack 5 的持久化缓存会缓存模块的编译结果
    - 热更新时只需重新编译修改的模块，未修改的模块直接从缓存读取
    - 大幅减少了重复编译的时间
3. **更精确的依赖追踪**
    - Webpack 5 使用更精确的依赖追踪算法
    - 修改一个文件时，只会重新编译真正依赖它的模块
    - Webpack 4 可能会过度编译不相关的模块
4. **优化的 devServer 配置**
    
    ```jsx
    // webpack.config.dev.js
    devServer: {
      compress: false,  // 开发环境关闭压缩，减少 CPU 开销
      hot: true,        // 启用热模块替换
    }
    
    ```
    
    - 关闭 compress 减少了每次热更新时的压缩开销
    - Webpack 5 的 webpack-dev-server 4.x 版本性能更优
5. **代码分割优化**
    
    ```jsx
    optimization: {
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
      },
    }
    
    ```
    
    - 将 runtime 代码独立出来，减少主 bundle 的更新频率
    - 合理的 chunk 分割使得热更新影响范围更小

## 优化后的打包情况

优化完成后，再次使用 `speed-measure-webpack-plugin` 测量：

```
 SMP  ⏱
General output time took 19.26 secs

 SMP  ⏱  Plugins
CaseSensitivePathsPlugin took 11.37 secs
Object took 0.241 secs
HtmlWebpackPlugin took 0.023 secs
CopyPlugin took 0.019 secs
DefinePlugin took 0.005 secs
ForkTsCheckerWebpackPlugin took 0.001 secs

 SMP  ⏱  Loaders
css-loader, and
postcss-loader, and
less-loader took 15.88 secs
  module count = 63
modules with no loaders took 11.33 secs
  module count = 3503
babel-loader, and
unplugin took 4.021 secs
  module count = 98
@svgr/webpack took 3.85 secs
  module count = 47
babel-loader took 3.81 secs
  module count = 154
css-loader, and
postcss-loader, and
unplugin took 0.689 secs
  module count = 1
css-loader took 0.278 secs
  module count = 3
style-loader, and
css-loader, and
postcss-loader, and
less-loader took 0.047 secs
  module count = 63
html-webpack-plugin took 0.024 secs
  module count = 1
style-loader, and
css-loader, and
postcss-loader, and
unplugin took 0.006 secs
  module count = 1

```

**优化效果：**

| 指标 | 优化前 | 优化后 | 提升 |
| --- | --- | --- | --- |
| 总构建时间 | 42.55s | 19.26s | **54.7%** |
| 热更新时间 | 20s+ | < 1s | **95%+** |
| 模块数量 | 3975 | 3503 | 减少 12% |
| TerserPlugin | 1.54s | 未显示 (更快) | - |
| babel-loader | 15.02s | 3.81s | **74.6%** |

## 遇到的问题与解决方案

### 问题 1：为什么不用 swc-loader 替代 babel-loader？

**原因：** 项目中使用了 MobX 4，而 swc-loader 对 MobX 4 的装饰器语法支持存在兼容性问题。

**参考：** https://github.com/swc-project/swc/issues/3389

**解决方案：** 继续使用 babel-loader，但通过以下方式优化：

- 启用 `cacheDirectory` 缓存编译结果
- 使用 `include` 精确限定处理范围
- 升级到 babel-loader 9.x 版本

### 问题 2：为什么没有使用 thread-loader？

**原因：**

1. `thread-loader` 与项目中使用的 `@unocss/webpack` 插件存在冲突
2. 对于中小型项目，启动线程池的开销可能超过并行编译的收益

**解决方案：** 移除 `thread-loader`，通过 Webpack 5 的文件系统缓存和其他优化手段提升速度。

### 问题 3：CaseSensitivePathsPlugin 耗时较长(11.37s)

**分析：** 这个插件用于检查路径大小写一致性，在大型项目中会遍历所有模块，导致耗时较长。

**权衡：** 虽然耗时较长，但这个插件对于跨平台开发很重要(避免 Mac/Linux 与 Windows 之间的路径问题)，因此保留。

**后续优化方向：** 可以考虑仅在 CI/CD 环境中启用，开发环境禁用。

## 总结与展望

### 优化成果

通过本次优化，我们实现了：

✅ 构建时间从 42.55s 降低到 19.26s，提升 **54.7%**

✅ 模块数量减少 12%，打包体积更小

✅ 启用文件系统缓存，二次构建更快

✅ 配置结构更清晰，易于维护

✅ 为后续迁移到 React 18 和 MobX 6 奠定基础

### 技术要点回顾

1. **Webpack 5 升级要点**
    - 依赖版本升级(webpack、loader、plugin)
    - 配置文件重构(common/dev/prod 分离)
    - 启用文件系统缓存
    - 使用 Asset Modules 替代 url-loader
2. **性能优化技巧**
    - 精确使用 `include/exclude` 限定 loader 范围
    - 启用 babel-loader 缓存
    - 优化代码分割策略
3. **兼容性处理**
    - MobX 4 装饰器语法兼容（保留 babel-loader）

### 后续优化方向

1. **继续减少模块数量**：进一步分析依赖关系，按需加载更多模块
2. **CaseSensitivePathsPlugin 优化**：仅在 CI/CD 环境启用
3. **考虑升级到 MobX 6**：解决装饰器兼容性问题后，可以尝试 swc-loader
4. **启用 Module Federation**：实现微前端架构，进一步提升构建效率
5. **增量编译**：利用 Webpack 5 的增量编译能力，进一步提升二次构建速度

### 经验总结

1. **性能优化要先测量再优化**：使用 speed-measure-webpack-plugin 定位瓶颈
2. **新版本不一定都要用新特性**：根据项目实际情况选择(如 thread-loader)
3. **兼容性比性能更重要**：确保项目稳定运行是第一优先级
4. **配置清晰比配置复杂更好**：分离 dev/prod 配置，便于维护

---

**相关资源：**

- [Webpack 5 官方迁移指南](https://webpack.js.org/migrate/5/)
- [Webpack 构建速度优化实践](https://juejin.cn/post/7237053697528496184)
- [项目 Webpack 5 迁移文档](https://www.notion.so/WEBPACK5_MIGRATION_PROMPT.md)
