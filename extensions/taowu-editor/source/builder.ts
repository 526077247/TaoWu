// 必须引入类型
import { BuildPlugin, IBuildTaskOption } from '../@types';

// 必须导出一个 configs 对象
export const configs: BuildPlugin.Configs = {
    // 注意: 配置了自定义面板 panel 后, 不应再配置 options (避免构建面板双份渲染)
    '*': {
        hooks: './hooks',
        panel: './panel',
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
