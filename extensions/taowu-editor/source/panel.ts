'use strict';

// 自定义构建面板
// 每次打开构建面板时, 自动将 version 版本号刷新为当前时间戳
import { IPanelThis, IBuildTaskOption } from '@cocos/creator-types/editor/packages/builder/@types/public';

const PACKAGE_NAME = 'taowu-editor';

interface IPluginOptions {
    enableObfuscate: boolean;
    /** 混淆标识符命名风格: hexadecimal (默认, 安全) | mangled (短名, 可能与产物已有的短名撞车) */
    obfuscateNamesGenerator: string;
    generateManifest: boolean;
    purgeNativePng: boolean;
    purgeNativePngBackup: boolean;
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
        obfuscateGen: any;
        obfuscateGenProp: HTMLElement;
        generateManifest: any;
        purgeNativePng: any;
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
    <ui-prop id="obfuscateGenProp">
        <ui-label slot="label" value="混淆标识符命名"></ui-label>
        <ui-select slot="content" id="obfuscateGen">
            <option value="hexadecimal">hexadecimal（安全，_0x 前缀）</option>
            <option value="mangled">mangled（短名，可能与产物撞名）</option>
        </ui-select>
    </ui-prop>
    <ui-prop>
        <ui-label slot="label" value="生成热更版本清单"></ui-label>
        <ui-checkbox slot="content" id="generateManifest"></ui-checkbox>
    </ui-prop>
    <ui-prop>
        <ui-label slot="label" value="清理图集冗余原生图 (省包体)"></ui-label>
        <ui-checkbox slot="content" id="purgeNativePng"></ui-checkbox>
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
    obfuscateGen: '#obfuscateGen',
    obfuscateGenProp: '#obfuscateGenProp',
    generateManifest: '#generateManifest',
    purgeNativePng: '#purgeNativePng',
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
            obfuscateNamesGenerator: 'hexadecimal',
            generateManifest: true,
            purgeNativePng: true,
            purgeNativePngBackup: false,
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
    // 旧配置里没有该字段时按 hexadecimal 显示, 与 hooks 侧的回退逻辑保持一致;
    // 同时写回构建选项, 免得面板显示的和实际生效的不一致
    const gen = opts.obfuscateNamesGenerator === 'mangled' ? 'mangled' : 'hexadecimal';
    if (opts.obfuscateNamesGenerator !== gen) {
        opts.obfuscateNamesGenerator = gen;
        panel.dispatch('update', `packages.${PACKAGE_NAME}.obfuscateNamesGenerator`, gen);
    }
    fillObfuscateGenSelect();
    panel.$.obfuscateGen.value = gen;
    panel.$.generateManifest.value = !!opts.generateManifest;
    // 旧配置里没有该字段时按默认开启显示, 与 hooks 侧 `!== false` 的判定保持一致
    panel.$.purgeNativePng.value = opts.purgeNativePng !== false;
    panel.$.version.value = opts.version || '';
    panel.$.channel.value = opts.channel || '';
    updateChannelDisabled();
    updateObfuscateDisabled();

    panel.$.enableObfuscate.addEventListener('change', onEnableObfuscateChange);
    // ui-select 在不同版本编辑器里可能派发 change 或 confirm, 两个都接
    panel.$.obfuscateGen.addEventListener('change', onObfuscateGenChange);
    panel.$.obfuscateGen.addEventListener('confirm', onObfuscateGenChange);
    panel.$.generateManifest.addEventListener('change', onGenerateManifestChange);
    panel.$.purgeNativePng.addEventListener('change', onPurgeNativePngChange);
    panel.$.version.addEventListener('change', onVersionChange);
    panel.$.channel.addEventListener('change', onChannelChange);
}

function unbind() {
    panel.$.enableObfuscate.removeEventListener('change', onEnableObfuscateChange);
    panel.$.obfuscateGen.removeEventListener('change', onObfuscateGenChange);
    panel.$.obfuscateGen.removeEventListener('confirm', onObfuscateGenChange);
    panel.$.generateManifest.removeEventListener('change', onGenerateManifestChange);
    panel.$.purgeNativePng.removeEventListener('change', onPurgeNativePngChange);
    panel.$.version.removeEventListener('change', onVersionChange);
    panel.$.channel.removeEventListener('change', onChannelChange);
}

// 命名风格选项: 由脚本填充, 避免不同版本编辑器对模板里 <option> 的解析差异
const NAMES_GENERATOR_OPTIONS = [
    { value: 'hexadecimal', label: 'hexadecimal（安全，_0x 前缀）' },
    { value: 'mangled', label: 'mangled（短名，可能与产物撞名）' },
];

function fillObfuscateGenSelect() {
    const el: any = panel.$.obfuscateGen;
    while (el.firstChild) {
        el.removeChild(el.firstChild);
    }
    for (const item of NAMES_GENERATOR_OPTIONS) {
        const opt = document.createElement('option');
        opt.value = item.value;
        opt.textContent = item.label;
        el.appendChild(opt);
    }
}

// 未启用混淆时命名风格项置灰
function updateObfuscateDisabled() {
    const enabled = !!pkgOptions().enableObfuscate;
    if (enabled) {
        panel.$.obfuscateGenProp.removeAttribute('disabled');
        panel.$.obfuscateGen.removeAttribute('disabled');
    } else {
        panel.$.obfuscateGenProp.setAttribute('disabled', '');
        panel.$.obfuscateGen.setAttribute('disabled', '');
    }
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
    updateObfuscateDisabled();
}

function onObfuscateGenChange(event: any) {
    const value = event?.target?.value ?? panel.$.obfuscateGen.value;
    const gen = value === 'mangled' ? 'mangled' : 'hexadecimal';
    pkgOptions().obfuscateNamesGenerator = gen;
    panel.dispatch('update', `packages.${PACKAGE_NAME}.obfuscateNamesGenerator`, gen);
}

function onGenerateManifestChange(event: any) {
    pkgOptions().generateManifest = event.target.value;
    panel.dispatch('update', `packages.${PACKAGE_NAME}.generateManifest`, event.target.value);
}

function onPurgeNativePngChange(event: any) {
    pkgOptions().purgeNativePng = event.target.value;
    panel.dispatch('update', `packages.${PACKAGE_NAME}.purgeNativePng`, event.target.value);
}

function onVersionChange(event: any) {
    pkgOptions().version = event.target.value;
    panel.dispatch('update', `packages.${PACKAGE_NAME}.version`, event.target.value);
}

function onChannelChange(event: any) {
    pkgOptions().channel = event.target.value;
    panel.dispatch('update', `packages.${PACKAGE_NAME}.channel`, event.target.value);
}
