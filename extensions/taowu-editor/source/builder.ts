// 必须引入类型
import { BuildPlugin, IBuildTaskOption } from '../@types';

// 必须导出一个 configs 对象
export const configs: BuildPlugin.Configs = {
    '*': {
        hooks: './hooks',
        options: {
            enableObfuscate: {
                label: '启用代码混淆',
                description: '构建后对代码混淆',
                default: true,
                render: {
                    ui: 'ui-checkbox'
                }
            },
            generateManifest: {
                label: '生成热更版本清单',
                description: '构建后自动生成 version.manifest.json',
                default: true,
                render: {
                    ui: 'ui-checkbox'
                }
            },
            version: {
                label: '版本号',
                description: '热更版本号 (纯数字，打开构建面板时自动填入当前时间戳)',
                default: String(Date.now()),
                render: {
                    ui: 'ui-input'
                }
            },
            channel: {
                label: '渠道名 (仅原生平台生效)',
                description: '小游戏平台渠道名固定 (DouYin/WeChat 等), 此项仅对原生平台生效',
                default: 'default',
                render: {
                    ui: 'ui-input',
                    attributes: {
                        disabled: '{{platform !== "android" && platform !== "ios"}}'
                    }
                }
            }
        }
    },
};

// 必须导出一个 load 方法
export const load: BuildPlugin.load = function() {
    console.debug('自定义构建插件已加载');
};

// 必须导出一个 unload 方法
export const unload: BuildPlugin.load = function() {
    console.debug('自定义构建插件已卸载');
};

// 定义钩子函数所在文件路径
export const hooks: string = './hooks';
