"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hooks = exports.unload = exports.load = exports.configs = void 0;
// 必须导出一个 configs 对象
exports.configs = {
    // 注意: 配置了自定义面板 panel 后, 不应再配置 options (避免构建面板双份渲染)
    '*': {
        hooks: './hooks',
        panel: './panel',
    },
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
