"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hooks = exports.unload = exports.load = exports.configs = void 0;
// 必须导出一个 configs 对象
exports.configs = {
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
            }
        }
    },
    // 可以配置其他平台，如 android, ios 等
};
// 必须导出一个 load 方法
const load = function () {
    console.debug('自定义构建插件已加载');
};
exports.load = load;
// 必须导出一个 unload 方法
const unload = function () {
    console.debug('自定义构建插件已卸载');
};
exports.unload = unload;
// 定义钩子函数所在文件路径
exports.hooks = './hooks';
