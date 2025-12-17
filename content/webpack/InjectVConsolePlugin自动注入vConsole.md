---
title: InjectVConsolePlugin自动注入vConsole
published: 2025-11-15
tags: []
category: webpack
draft: false
---

```tsx
const HtmlWebpackPlugin = require('html-webpack-plugin')

// 启用 speed-measure-webpack-plugin 时此插件不能正常工作
class InjectVConsolePlugin {
    constructor(options = {}) {
        this.vconsoleUrl = options.vconsoleUrl || 'https://static.zhnysz.com/lib/vconsole.min.js'
        this.enabled = Boolean(process.env.VCONSOLE)
    }

    apply(compiler) {
        if (!this.enabled) {
            return
        }

        compiler.hooks.compilation.tap('InjectVConsolePlugin', (compilation) => {
            HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tap(
                'InjectVConsolePlugin',
                (data) => {
                    const scripts = data.assetTags?.scripts || data.scripts
                    if (scripts) {
                        scripts.unshift(
                            {
                                tagName: 'script',
                                voidTag: false,
                                attributes: {
                                    src: this.vconsoleUrl,
                                },
                            },
                            {
                                tagName: 'script',
                                voidTag: false,
                                innerHTML: 'new window.VConsole()',
                            }
                        )
                    }
                    return data
                }
            )
        })
    }
}

module.exports = InjectVConsolePlugin

```
