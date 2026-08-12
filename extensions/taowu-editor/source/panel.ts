'use strict';

// 自定义构建面板
// 每次打开构建面板时, 自动将 version 版本号刷新为当前时间戳
import { IPanelThis, IBuildTaskOption } from '@cocos/creator-types/editor/packages/builder/@types/public';

const PACKAGE_NAME = 'taowu-editor';

interface IPluginOptions {
    enableObfuscate: boolean;
    generateManifest: boolean;
    version: string;
    channel: string;
}

interface ITaskOptions extends IBuildTaskOption {
    packages: {
        [PACKAGE_NAME]: IPluginOptions;
    };
}

interface ICustomPanelThis extends IPanelThis {
    options: ITaskOptions;
    $: {
        root: HTMLElement;
        enableObfuscate: any;
        generateManifest: any;
        version: any;
        channel: any;
        channelProp: HTMLElement;
    };
}

let panel: ICustomPanelThis;

export const style = `
    .build-plugin { padding: 4px 0; }
    ui-prop[disabled] { opacity: 0.5; pointer-events: none; }
`;

export const template = `
<div class="build-plugin">
    <ui-prop>
        <ui-label slot="label" value="启用代码混淆"></ui-label>
        <ui-checkbox slot="content" id="enableObfuscate"></ui-checkbox>
    </ui-prop>
    <ui-prop>
        <ui-label slot="label" value="生成热更版本清单"></ui-label>
        <ui-checkbox slot="content" id="generateManifest"></ui-checkbox>
    </ui-prop>
    <ui-prop>
        <ui-label slot="label" value="版本号"></ui-label>
        <ui-input slot="content" id="version"></ui-input>
    </ui-prop>
    <ui-prop id="channelProp">
        <ui-label slot="label" value="渠道名 (仅原生平台生效)"></ui-label>
        <ui-input slot="content" id="channel"></ui-input>
    </ui-prop>
</div>
`;

export const $ = {
    root: '.build-plugin',
    enableObfuscate: '#enableObfuscate',
    generateManifest: '#generateManifest',
    version: '#version',
    channel: '#channel',
    channelProp: '#channelProp',
};

// 构建选项变更时回调; key 为空表示面板导入配置, 需要重新渲染
export function update(options: ITaskOptions, key: string) {
    if (key) return;
    panel.options = options;
    init();
}

// 每次打开构建面板时调用: 自动刷新版本号
export function ready(options: ITaskOptions) {
    panel = this as ICustomPanelThis;
    panel.options = options;
    refreshVersion();
    init();
}

export function close() {
    unbind();
}

// 读取插件选项; 若 packages 下不存在 (未配置 options 时的首次打开), 创建默认值并同步到构建选项
function pkgOptions(): IPluginOptions {
    const o: any = panel.options;
    if (!o || !o.packages) {
        return null as any;
    }
    if (!o.packages[PACKAGE_NAME]) {
        const defaults: IPluginOptions = {
            enableObfuscate: true,
            generateManifest: true,
            version: String(Date.now()),
            channel: 'default',
        };
        o.packages[PACKAGE_NAME] = defaults;
        for (const key of Object.keys(defaults) as (keyof IPluginOptions)[]) {
            panel.dispatch('update', `packages.${PACKAGE_NAME}.${key}`, defaults[key]);
        }
    }
    return o.packages[PACKAGE_NAME];
}

// 打开面板时将版本号刷新为当前时间戳, 并同步到构建选项
function refreshVersion() {
    try {
        const opts = pkgOptions();
        if (!opts) return;
        const newVersion = String(Date.now());
        opts.version = newVersion;
        panel.dispatch('update', `packages.${PACKAGE_NAME}.version`, newVersion);
        console.log(`[taowu-editor] 打开构建面板, 版本号已自动刷新为 ${newVersion}`);
    } catch (e: any) {
        console.error(`[taowu-editor] 自动刷新版本号失败: ${e?.message}`);
    }
}

function init() {
    unbind();
    const opts = pkgOptions();
    if (!opts) return;
    panel.$.enableObfuscate.value = !!opts.enableObfuscate;
    panel.$.generateManifest.value = !!opts.generateManifest;
    panel.$.version.value = opts.version || '';
    panel.$.channel.value = opts.channel || '';
    updateChannelDisabled();

    panel.$.enableObfuscate.addEventListener('change', onEnableObfuscateChange);
    panel.$.generateManifest.addEventListener('change', onGenerateManifestChange);
    panel.$.version.addEventListener('change', onVersionChange);
    panel.$.channel.addEventListener('change', onChannelChange);
}

function unbind() {
    panel.$.enableObfuscate.removeEventListener('change', onEnableObfuscateChange);
    panel.$.generateManifest.removeEventListener('change', onGenerateManifestChange);
    panel.$.version.removeEventListener('change', onVersionChange);
    panel.$.channel.removeEventListener('change', onChannelChange);
}

// 渠道名仅原生平台 (android / ios) 可编辑, 其余平台禁用
function updateChannelDisabled() {
    const platform: string = (panel.options as any).platform;
    const disabled = platform !== 'android' && platform !== 'ios';
    if (disabled) {
        panel.$.channelProp.setAttribute('disabled', '');
        panel.$.channel.setAttribute('disabled', '');
    } else {
        panel.$.channelProp.removeAttribute('disabled');
        panel.$.channel.removeAttribute('disabled');
    }
}

function onEnableObfuscateChange(event: any) {
    pkgOptions().enableObfuscate = event.target.value;
    panel.dispatch('update', `packages.${PACKAGE_NAME}.enableObfuscate`, event.target.value);
}

function onGenerateManifestChange(event: any) {
    pkgOptions().generateManifest = event.target.value;
    panel.dispatch('update', `packages.${PACKAGE_NAME}.generateManifest`, event.target.value);
}

function onVersionChange(event: any) {
    pkgOptions().version = event.target.value;
    panel.dispatch('update', `packages.${PACKAGE_NAME}.version`, event.target.value);
}

function onChannelChange(event: any) {
    pkgOptions().channel = event.target.value;
    panel.dispatch('update', `packages.${PACKAGE_NAME}.channel`, event.target.value);
}
