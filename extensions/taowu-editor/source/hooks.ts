import { BuildHook, IBuildResult, IBuildTaskOption, ITaskOptions } from '../@types';
import * as fs from "fs";
import * as path from 'path';
import * as crypto from 'crypto';
import * as JavaScriptObfuscator from 'javascript-obfuscator';
import { purgeNativePng } from './native-purge';

// Cocos Creator 3.x 在 Web / 小游戏端依赖的关键标识符。
// mangled 会把标识符压成一两个字母, 这些名字一旦被改名, 或者被子作用域里新生成的短名遮蔽,
// 引擎侧按名字取到的就是另一份东西, 表现为 "xxx[yyy(...)] is not a function" 之类的运行时错误。
// 参考社区插件做法: 混淆前把这些名字整体注入 reservedNames。
const COCOS_RESERVED_NAMES: string[] = [
    // 引擎 / 运行时
    'cc', 'System', 'SystemJS', 'director', 'game', 'sys', 'macro', 'view', 'screen',
    'window', 'document', 'global', 'globalThis', 'console', 'exports', 'module', 'require',
    'define', '__esModule',
    // 节点 / 组件 / 资源
    'Node', 'Component', 'Scene', 'Sprite', 'Label', 'Asset', 'resources', 'instantiate', 'find',
    // 装饰器: 编译产物里通过 _decorator.ccclass('类名') 注册, 改名后 getComponent 找不到
    '_decorator', 'ccclass', 'property', 'menu', 'executeInEditMode', 'requireComponent',
    'disallowMultiple', 'executionOrder', 'addComponentMenu',
    // 常见内建对象: 防止被生成的短名遮蔽后取到错误的构造器
    'Promise', 'Math', 'Object', 'Array', 'JSON', 'Error', 'Date',
];

// 保留名必须锚定成 ^name$：未锚定的 'cc' 会连带匹配 account / success / accent，
// 把大批正常标识符挡在混淆之外。名单里的名字按字面量转义，不做正则展开。
const toReservedPattern = (name: string): string => {
    return '^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$';
};

// 自定义混淆函数
const obfuscateMainJs = (options: IBuildTaskOption, result: IBuildResult) => {
    let destDir = path.join(result.paths.dir, "subpackages", "main");
    if(!fs.existsSync(destDir)){
        destDir = path.join(result.paths.dir, "assets", "main");
    }
    const pkgConfig = options.packages["taowu-editor"] || {};
    const enableObfuscate = pkgConfig.enableObfuscate;
    if (!enableObfuscate) {
        console.log('[CodeObfuscate] 代码混淆未启用，跳过');
        return;
    }
    // 标识符命名风格：面板可选，默认 hexadecimal。
    // mangled 会把标识符改成一两个字母（a/b/c…），而 Cocos 构建产物本身已经是短名，
    // 两套短名在同一作用域里撞车后，引用会解析到错误的对象，表现为
    // "Uncaught TypeError: xx[yy(...)] is not a function"（实测 web-desktop 首帧 windowResize
    // 处 az['getMacroBool'] is not a function）；hexadecimal 的 _0x 前缀不会与产物撞名。
    // 选 mangled 时靠下面的 reservedNames 兜住引擎关键名。
    const namesGenerator = pkgConfig.obfuscateNamesGenerator === 'mangled' ? 'mangled' : 'hexadecimal';

    const reservedNames = COCOS_RESERVED_NAMES.map(toReservedPattern);

    console.log(`[混淆插件] 构建完成，开始混淆，输出目录: ${result.paths.dir}，标识符命名: ${namesGenerator}，保留标识符: ${reservedNames.length} 个`);

    // stringArray 会往每个函数作用域里插一个取词 wrapper（var x=b; …），mangled 下这些 wrapper
    // 也只拿到一两个字母的名字，和同作用域里被压短的业务标识符撞名后 wrapper 被遮蔽，
    // 解码出来的属性名就成了 undefined，报错形如 az[bH(...)] is not a function。
    // 另外 Creator 3.x 的 Rollup + SystemJS 产物与 stringArray 本身也有已知冲突。
    // 所以 mangled 下关掉它：标识符仍是短名，只是字符串以明文留在代码里（体积反而略小）。
    const useStringArray = namesGenerator !== 'mangled';
    console.log(`[混淆插件] 字符串数组混淆: ${useStringArray ? '开启' : '关闭（mangled 模式）'}`);

    // 混淆配置
    const obfuscateOptions: JavaScriptObfuscator.ObfuscatorOptions = {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        stringArray: useStringArray,
        stringArrayThreshold: 0.2,
        stringArrayEncoding: [],
        rotateStringArray: useStringArray,
        shuffleStringArray: useStringArray,
        transformObjectKeys: false,
        identifierNamesGenerator: namesGenerator as any,
        reservedNames,
        renameGlobals: false,
        unicodeEscapeSequence: false
    };

    const obfuscateFile = (filePath: string): boolean => {
        try {
            const code = fs.readFileSync(filePath, 'utf8');
            const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, obfuscateOptions);
            fs.writeFileSync(filePath, obfuscatedResult.getObfuscatedCode());
            console.log(`[混淆插件] ✅ ${filePath}`);
            return true;
        } catch (error: any) {
            console.error(`[混淆插件] ❌ ${filePath}: ${error.message}`);
            return false;
        }
    };

    // 递归查找目录下所有 .js 文件 (跳过 .min.js、system.js 等引擎文件)
    const JS_FILE_PATTERN = /^(?!.*\.min\.js$).*\.js$/;
    const SYSTEM_FILE_PATTERN = /(?:^|[\\/])(system|cocos-js|cc\.min)\.js$/;

    const findAndObfuscateJs = (dir: string, bundleName: string): number => {
        let count = 0;
        if (!fs.existsSync(dir)) return 0;
        for (const file of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                count += findAndObfuscateJs(fullPath, bundleName);
            } else if (JS_FILE_PATTERN.test(file) && !SYSTEM_FILE_PATTERN.test(fullPath)) {
                if (obfuscateFile(fullPath)) count++;
            }
        }
        return count;
    };

    let totalCount = 0;

    // 1. 混淆内置 bundles (assets/ 目录下的每个子目录)
    const assetsDir = path.join(result.paths.dir, "assets");
    if (fs.existsSync(assetsDir)) {
        for (const entry of fs.readdirSync(assetsDir)) {
            const bundleDir = path.join(assetsDir, entry);
            if (fs.statSync(bundleDir).isDirectory()) {
                const n = findAndObfuscateJs(bundleDir, entry);
                totalCount += n;
            }
        }
    }

    // 2. 混淆远程 bundles (remote/ 目录下的每个子目录)
    const remoteDir = path.join(result.paths.dir, "remote");
    if (fs.existsSync(remoteDir)) {
        for (const entry of fs.readdirSync(remoteDir)) {
            const bundleDir = path.join(remoteDir, entry);
            if (fs.statSync(bundleDir).isDirectory()) {
                const n = findAndObfuscateJs(bundleDir, entry);
                totalCount += n;
            }
        }
    }

    // 3. 混淆 subpackages (subpackages/ 目录下的每个子目录)
    const subpackagesDir = path.join(result.paths.dir, "subpackages");
    if (fs.existsSync(subpackagesDir)) {
        for (const entry of fs.readdirSync(subpackagesDir)) {
            const bundleDir = path.join(subpackagesDir, entry);
            if (fs.statSync(bundleDir).isDirectory()) {
                const n = findAndObfuscateJs(bundleDir, entry);
                totalCount += n;
            }
        }
    }

    console.log(`[混淆插件] 混淆完成，共处理 ${totalCount} 个 JS 文件`);
};

function calculateDirHash(dir: string): string {
    const hash = crypto.createHash('md5');
    const files = fs.readdirSync(dir).sort();
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            hash.update(calculateDirHash(fullPath));
        } else {
            hash.update(fs.readFileSync(fullPath));
        }
    }
    return hash.digest('hex').substring(0, 12);
}

function calculateDirSize(dir: string): number {
    let totalSize = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            totalSize += calculateDirSize(fullPath);
        } else {
            totalSize += stat.size;
        }
    }
    return totalSize;
}

function copyDir(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs.readdirSync(src)) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * 复制目录, 跳过指定的顶层子目录
 */
function copyDirExcluding(src: string, dest: string, exclude: string[]): void {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const excludeSet = new Set(exclude);
    for (const entry of fs.readdirSync(src)) {
        if (excludeSet.has(entry)) continue;
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        if (fs.statSync(srcPath).isDirectory()) {
            copyDirExcluding(srcPath, destPath, []);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * 同步等待 (busy-wait, 精度约 1ms)
 */
function sleepSync(ms: number): void {
    const end = Date.now() + ms;
    while (Date.now() < end) {}
}

/**
 * 删除单个子项 (文件或子目录), 带重试; 仍失败则记录, 不抛错
 */
function removeEntry(target: string): void {
    for (let i = 0; i < 5; i++) {
        try {
            fs.rmSync(target, { recursive: true, force: true });
            return;
        } catch {
            sleepSync(200);
        }
    }
    console.error(`[HotUpdate] 无法删除 "${target}"`);
}

/**
 * 安全清空并重建目录
 * 整体删除失败时 (Windows 下目录本身被占用), 退化为逐个删除其子目录和文件, 保留目录本身
 */
function safeRmAndMkdir(dir: string): void {
    if (fs.existsSync(dir)) {
        for (let i = 0; i < 5; i++) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
                break;
            } catch {
                sleepSync(200);
            }
        }
        // 整体删除失败 → 只删除目录下的子目录和文件, 不动目录本身
        if (fs.existsSync(dir)) {
            for (const entry of fs.readdirSync(dir)) {
                removeEntry(path.join(dir, entry));
            }
        }
    }
    for (let i = 0; i < 5; i++) {
        try {
            fs.mkdirSync(dir, { recursive: true });
            return;
        } catch (e: any) {
            if (i === 4) throw e;
            sleepSync(200);
        }
    }
}

/**
 * 小游戏 engine-adapter 的 bundle 下载器在加载任意 bundle 时, 都会无条件 require 本地
 * src/bundle-scripts/{basename}/index.{ver}.js, 且平台侧 require 找不到文件会直接抛错。
 * 远程包脚本为空桩 (确保无脚本) 时该文件可整目录删除, 因此把该 require 改写为包裹 try/catch:
 * 文件存在则正常加载 (内置/分包脚本不受影响), 不存在则静默跳过。
 * 通过锚点定位, 不依赖压缩后的变量名; 补丁失败返回 false, 由调用方回退到改名方案。
 */
function patchEngineAdapter(buildDir: string): boolean {
    const adapterPath = path.join(buildDir, "engine-adapter.js");
    if (!fs.existsSync(adapterPath)) {
        console.warn('[HotUpdate] engine-adapter.js 不存在, 跳过补丁');
        return false;
    }
    let code: string;
    try {
        code = fs.readFileSync(adapterPath, 'utf8');
    } catch (e: any) {
        console.error(`[HotUpdate] 读取 engine-adapter.js 失败: ${e?.message}`);
        return false;
    }
    if (code.includes('catch(e){}}()')) {
        console.log('[HotUpdate] engine-adapter.js 已打过补丁, 跳过');
        return true;
    }
    // 锚点: "...TAOBAO_CREATIVE_APP&&<require调用>,t.__cacheBundleRoot__=a,..."
    const marker = ',t.__cacheBundleRoot__=';
    const key = 'TAOBAO_CREATIVE_APP&&';
    const mIdx = code.indexOf(marker);
    const kIdx = mIdx >= 0 ? code.lastIndexOf(key, mIdx) : -1;
    if (kIdx < 0) {
        console.error('[HotUpdate] ⚠ 未找到 engine-adapter.js bundle require 锚点, 未打补丁');
        return false;
    }
    const call = code.slice(kIdx + key.length, mIdx);
    const patched = `${key}function(){try{${call}}catch(e){}}()`;
    code = code.slice(0, kIdx) + patched + code.slice(mIdx);
    try {
        fs.writeFileSync(adapterPath, code);
    } catch (e: any) {
        console.error(`[HotUpdate] 写入 engine-adapter.js 失败: ${e?.message}`);
        return false;
    }
    console.log(`[HotUpdate] ✅ Patched engine-adapter.js require: ${patched}`);
    return true;
}

/**
 * 生成热更新版本清单
 */
const generateVersionManifest = (options: IBuildTaskOption, result: IBuildResult) => {
    const pkgConfig = options.packages["taowu-editor"] || {};
    if (pkgConfig.generateManifest === false) {
        console.log('[HotUpdate] 版本清单生成未启用，跳过');
        return;
    }

    const buildDir = result.paths.dir;
    const assetsDir = path.join(buildDir, "assets");
    const remoteDir = path.join(buildDir, "remote");

    // 收集所有 bundle: { name: { dir, builtin } }
    const allBundles = new Map<string, { dir: string; builtin: boolean }>();

    // 内置 bundle (assets/ 目录)
    if (fs.existsSync(assetsDir)) {
        for (const entry of fs.readdirSync(assetsDir)) {
            const bundleDir = path.join(assetsDir, entry);
            if (fs.statSync(bundleDir).isDirectory()) {
                allBundles.set(entry, { dir: bundleDir, builtin: true });
            }
        }
    }

    // 远程 bundle (remote/ 目录)
    if (fs.existsSync(remoteDir)) {
        for (const entry of fs.readdirSync(remoteDir)) {
            const bundleDir = path.join(remoteDir, entry);
            if (fs.statSync(bundleDir).isDirectory()) {
                allBundles.set(entry, { dir: bundleDir, builtin: false });
            }
        }
    }

    // 分包 bundle (subpackages/ 目录)
    const subpackagesDir = path.join(buildDir, "subpackages");
    if (fs.existsSync(subpackagesDir)) {
        for (const entry of fs.readdirSync(subpackagesDir)) {
            const bundleDir = path.join(subpackagesDir, entry);
            if (fs.statSync(bundleDir).isDirectory()) {
                allBundles.set(entry, { dir: bundleDir, builtin: true });
            }
        }
    }

    console.log(`[HotUpdate] Builtin bundles: ${[...allBundles.values()].filter(b => b.builtin).map(b => path.basename(b.dir)).join(', ')}`);
    console.log(`[HotUpdate] Remote bundles: ${[...allBundles.values()].filter(b => !b.builtin).map(b => path.basename(b.dir)).join(', ')}`);

    const version = pkgConfig.version || String(Date.now());

    // 小游戏平台 → 固定渠道名映射 (平台名统一为 webgl, 渠道名不可自定义)
    const MINI_GAME_CHANNELS: Record<string, string> = {
        'wechatgame': 'WeChat',
        'bytedance-mini-game': 'DouYin',
        'huawei-quick-game': 'Huawei',
        'alipay-mini-game': 'Alipay',
        'oppo-mini-game': 'OPPO',
        'vivo-mini-game': 'Vivo',
        'xiaomi-quick-game': 'Xiaomi',
        'baidu-mini-game': 'Baidu',
    };

    // 从 settings.json 读取目标平台 + 服务器地址
    const settingsPath = result.paths.settings;
    let platformName = path.basename(buildDir);
    let rawPlatform = "";
    if (fs.existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            rawPlatform = settings?.engine?.platform || platformName;
        } catch {}
    }

    // 精简格式: {v:version, b:{bundleName:[hash, builtin]}}
    // channel/platform/server 不写入 manifest:
    // - channel 写入 settings.json 的 assets._channel
    // - platform 运行时 UpdateConfig.getPlatformName()
    // - server 运行时读 settings.json 的 assets.server (Cocos 内置)
    // 小游戏平台: 固定渠道名 + 平台名统一为 webgl
    let channel: string;
    if (rawPlatform && MINI_GAME_CHANNELS[rawPlatform]) {
        channel = MINI_GAME_CHANNELS[rawPlatform];
        platformName = 'webgl';
        console.log(`[HotUpdate] Mini-game detected: ${rawPlatform} → channel: ${channel}, platform: ${platformName}`);
    } else {
        // 原生/Web 平台: 用户手动输入渠道名
        channel = pkgConfig.channel || 'default';
        if (rawPlatform === 'android') platformName = 'android';
        else if (rawPlatform === 'ios') platformName = 'ios';
        else if (rawPlatform === 'win' || rawPlatform === 'win32') platformName = 'pc';
        else platformName = 'webgl';
        console.log(`[HotUpdate] Platform: ${rawPlatform || platformName} → ${platformName}, channel: ${channel}`);
    }

    // 精简格式: {v:version, c:渠道名, p:平台名, s:服务器地址, b:{bundleName:[hash, builtin]}}
    const manifest: Record<string, any> = {
        v: version,
        b: {} as Record<string, [string, boolean, number]>
    };

    for (const [name, info] of allBundles) {
        const hash = calculateDirHash(info.dir);
        const size = calculateDirSize(info.dir);
        manifest.b[name] = [hash, info.builtin, size];
        console.log(`[HotUpdate] Bundle: ${name}, hash: ${hash}, builtin: ${info.builtin}, size: ${size}`);
    }

    // 重新生成 bundleVers:
    // 远程包按 {hash} URL 加载时, 引擎用 basename(URL)=hash 查版本号, 因此需要以 hash 为 key 建立映射;
    // 内置/分包仍按包名加载 (config.{ver}.json), 必须保留 name key, 否则会去请求无版本号的 config.json
    const newBundleVers: Record<string, string> = {};
    if (fs.existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            const oldBundleVers: Record<string, string> = settings?.assets?.bundleVers || {};
            for (const name in oldBundleVers) {
                newBundleVers[name] = oldBundleVers[name];
                const hash = manifest.b[name]?.[0];
                if (hash) newBundleVers[hash] = oldBundleVers[name];
            }
        } catch (e: any) {
            console.error(`[HotUpdate] Failed to read bundleVers: ${e?.message}`);
        }
    }

    // 远程包脚本为空桩 (确保无脚本), 先把 engine-adapter 的 require 改为"存在才加载", 再整目录删除
    // src/bundle-scripts, 使远端加载不再依赖 {hash} 脚本目录
    const bundleScriptsDir = path.join(buildDir, "src", "bundle-scripts");
    const adapterPatched = patchEngineAdapter(buildDir);
    if (adapterPatched) {
        if (fs.existsSync(bundleScriptsDir)) {
            fs.rmSync(bundleScriptsDir, { recursive: true, force: true });
            console.log('[HotUpdate] ✅ Removed src/bundle-scripts (remote scripts are stubs)');
        }
    } else if (fs.existsSync(bundleScriptsDir)) {
        // 打补丁失败 → 回退: 将远程包 src/bundle-scripts/{包名} 改名为 {hash},
        // 使引擎按 basename(hash URL) 拼出的脚本路径能命中本地目录
        for (const [name, info] of allBundles) {
            if (info.builtin) continue;
            const srcDir = path.join(bundleScriptsDir, name);
            if (!fs.existsSync(srcDir)) continue;
            const hash = manifest.b[name][0];
            const dstDir = path.join(bundleScriptsDir, hash);
            if (srcDir === dstDir) continue;
            if (fs.existsSync(dstDir)) {
                fs.rmSync(dstDir, { recursive: true, force: true });
            }
            fs.renameSync(srcDir, dstDir);
            console.log(`[HotUpdate] Renamed bundle-scripts (fallback): ${name} -> ${hash}`);
        }
    }

    // 将 manifest + channel 写入 settings.json (运行时通过 cc.settings 读取)
    if (fs.existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            if (!settings.assets) settings.assets = {};
            settings.assets._hotUpdate = manifest;
            settings.assets._channel = channel;
            if (Object.keys(newBundleVers).length > 0) {
                settings.assets.bundleVers = newBundleVers;
            }
            fs.writeFileSync(settingsPath, JSON.stringify(settings));
            console.log(`[HotUpdate] ✅ Manifest + channel + bundleVers written to settings.json`);
        } catch (e: any) {
            console.error(`[HotUpdate] Failed to write to settings.json: ${e?.message}`);
        }
    }

    // 复制到 CDN 输出目录: {项目根}/Release/{渠道名}_{平台名}
    const projectRoot = path.resolve(buildDir, '..', '..');
    const cdnOutputDir = path.join(projectRoot, 'Release', `${channel}_${platformName}`);
    safeRmAndMkdir(cdnOutputDir);
    // 写入 {version}.bytes 和 version.txt 到 CDN
    const manifestJson = JSON.stringify(manifest);
    fs.writeFileSync(path.join(cdnOutputDir, `${version}.bytes`), manifestJson);
    fs.writeFileSync(path.join(cdnOutputDir, "version.txt"), version);
    // 所有 bundle (内置+远程) 都按 hash 复制到 CDN
    for (const [name, info] of allBundles) {
        const hash = manifest.b[name][0];
        copyDir(info.dir, path.join(cdnOutputDir, hash));
    }
    console.log(`[HotUpdate] ✅ Copied bundles to CDN directory: ${cdnOutputDir}`);

    // 将构建产物整体复制到 Release 目录 (排除 remote/ 目录), 与 CDN 目录同级
    const releaseRoot = path.join(projectRoot, 'Release');
    const buildOutputDir = path.join(releaseRoot, `${platformName}_build`);
    safeRmAndMkdir(buildOutputDir);
    copyDirExcluding(buildDir, buildOutputDir, ['remote']);
    console.log(`[HotUpdate] ✅ Copied build output (excluding remote) to: ${buildOutputDir}`);
};

/**
 * 图集冗余原生图清理: 摘除 config.versions.native 中"像素已并入图集"的 PNG 登记并删文件。
 * 原生平台产物结构不同且未验证, 默认跳过; 判定逻辑见 native-purge.ts。
 */
const NATIVE_PLATFORMS = new Set(['android', 'ios', 'win', 'win32', 'mac', 'linux', 'ohos', 'harmonyos']);

function readBuildPlatform(settingsPath: string): string {
    if (!settingsPath || !fs.existsSync(settingsPath)) return '';
    try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'))?.engine?.platform || '';
    } catch {
        return '';
    }
}

const purgeNativePngOnBuild = (options: IBuildTaskOption, result: IBuildResult) => {
    const pkgConfig = options.packages["taowu-editor"] || {};
    if (pkgConfig.purgeNativePng === false) {
        console.log('[NativePng] 未启用，跳过');
        return;
    }
    const rawPlatform = readBuildPlatform(result.paths.settings);
    if (NATIVE_PLATFORMS.has(rawPlatform)) {
        console.log(`[NativePng] 当前平台 ${rawPlatform} 不参与清理，跳过`);
        return;
    }
    // 项目根: 判据要回源读 assets 下的 .pac.meta 与图片 meta
    const projectDir = path.resolve(result.paths.dir, '..', '..');
    // 备份为可选: 构建产物可再生, 默认只留清单
    const backupDir = pkgConfig.purgeNativePngBackup
        ? path.resolve(projectDir, 'temp', 'backup', 'native_png', path.basename(result.paths.dir))
        : '';
    purgeNativePng({ buildDir: result.paths.dir, projectDir, backupDir });
};

export const onAfterBuild: BuildHook.onAfterBuild = async function (options: IBuildTaskOption, result: IBuildResult) {
    try {
        obfuscateMainJs(options, result);
    } catch (e: any) {
        console.error(`[taowu-editor] obfuscateMainJs error: ${e?.message}\n${e?.stack}`);
    }
    // 必须在 generateVersionManifest 之前: 清单 hash / Release 目录复制都要基于清理后的产物
    try {
        purgeNativePngOnBuild(options, result);
    } catch (e: any) {
        console.error(`[taowu-editor] purgeNativePng error: ${e?.message}\n${e?.stack}`);
    }
    try {
        generateVersionManifest(options, result);
    } catch (e: any) {
        console.error(`[taowu-editor] generateVersionManifest error: ${e?.message}\n${e?.stack}`);
    }
};
