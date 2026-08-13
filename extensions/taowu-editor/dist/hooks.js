"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAfterBuild = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const JavaScriptObfuscator = __importStar(require("javascript-obfuscator"));
// 自定义混淆函数
const obfuscateMainJs = (options, result) => {
    let destDir = path.join(result.paths.dir, "subpackages", "main");
    if (!fs.existsSync(destDir)) {
        destDir = path.join(result.paths.dir, "assets", "main");
    }
    const pkgConfig = options.packages["taowu-editor"] || {};
    const enableObfuscate = pkgConfig.enableObfuscate;
    if (!enableObfuscate) {
        console.log('[CodeObfuscate] 代码混淆未启用，跳过');
        return;
    }
    console.log(`[混淆插件] 构建完成，开始混淆，输出目录: ${result.paths.dir}`);
    // 混淆配置
    const obfuscateOptions = {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        stringArray: true,
        stringArrayThreshold: 0.2,
        stringArrayEncoding: [],
        rotateStringArray: true,
        shuffleStringArray: true,
        transformObjectKeys: false,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        unicodeEscapeSequence: false
    };
    const obfuscateFile = (filePath) => {
        try {
            const code = fs.readFileSync(filePath, 'utf8');
            const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, obfuscateOptions);
            fs.writeFileSync(filePath, obfuscatedResult.getObfuscatedCode());
            console.log(`[混淆插件] ✅ ${filePath}`);
            return true;
        }
        catch (error) {
            console.error(`[混淆插件] ❌ ${filePath}: ${error.message}`);
            return false;
        }
    };
    // 递归查找目录下所有 .js 文件 (跳过 .min.js、system.js 等引擎文件)
    const JS_FILE_PATTERN = /^(?!.*\.min\.js$).*\.js$/;
    const SYSTEM_FILE_PATTERN = /(?:^|[\\/])(system|cocos-js|cc\.min)\.js$/;
    const findAndObfuscateJs = (dir, bundleName) => {
        let count = 0;
        if (!fs.existsSync(dir))
            return 0;
        for (const file of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                count += findAndObfuscateJs(fullPath, bundleName);
            }
            else if (JS_FILE_PATTERN.test(file) && !SYSTEM_FILE_PATTERN.test(fullPath)) {
                if (obfuscateFile(fullPath))
                    count++;
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
function calculateDirHash(dir) {
    const hash = crypto.createHash('md5');
    const files = fs.readdirSync(dir).sort();
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            hash.update(calculateDirHash(fullPath));
        }
        else {
            hash.update(fs.readFileSync(fullPath));
        }
    }
    return hash.digest('hex').substring(0, 12);
}
function calculateDirSize(dir) {
    let totalSize = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            totalSize += calculateDirSize(fullPath);
        }
        else {
            totalSize += stat.size;
        }
    }
    return totalSize;
}
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    for (const entry of fs.readdirSync(src)) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
        }
        else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
/**
 * 复制目录, 跳过指定的顶层子目录
 */
function copyDirExcluding(src, dest, exclude) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const excludeSet = new Set(exclude);
    for (const entry of fs.readdirSync(src)) {
        if (excludeSet.has(entry))
            continue;
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        if (fs.statSync(srcPath).isDirectory()) {
            copyDirExcluding(srcPath, destPath, []);
        }
        else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
/**
 * 同步等待 (busy-wait, 精度约 1ms)
 */
function sleepSync(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) { }
}
/**
 * 安全删除并重建目录 (Windows 下 rmSync 后句柄可能延迟释放, 需重试+等待)
 */
function safeRmAndMkdir(dir) {
    if (fs.existsSync(dir)) {
        for (let i = 0; i < 5; i++) {
            try {
                fs.rmSync(dir, { recursive: true, force: true });
                break;
            }
            catch {
                sleepSync(200);
            }
        }
    }
    for (let i = 0; i < 5; i++) {
        try {
            fs.mkdirSync(dir, { recursive: true });
            return;
        }
        catch (e) {
            if (i === 4)
                throw e;
            sleepSync(200);
        }
    }
}
/**
 * 生成热更新版本清单
 */
const generateVersionManifest = (options, result) => {
    const pkgConfig = options.packages["taowu-editor"] || {};
    if (pkgConfig.generateManifest === false) {
        console.log('[HotUpdate] 版本清单生成未启用，跳过');
        return;
    }
    const buildDir = result.paths.dir;
    const assetsDir = path.join(buildDir, "assets");
    const remoteDir = path.join(buildDir, "remote");
    // 收集所有 bundle: { name: { dir, builtin } }
    const allBundles = new Map();
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
    const MINI_GAME_CHANNELS = {
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
        }
        catch { }
    }
    // 精简格式: {v:version, b:{bundleName:[hash, builtin]}}
    // channel/platform/server 不写入 manifest:
    // - channel 写入 settings.json 的 assets._channel
    // - platform 运行时 UpdateConfig.getPlatformName()
    // - server 运行时读 settings.json 的 assets.server (Cocos 内置)
    // 小游戏平台: 固定渠道名 + 平台名统一为 webgl
    let channel;
    if (rawPlatform && MINI_GAME_CHANNELS[rawPlatform]) {
        channel = MINI_GAME_CHANNELS[rawPlatform];
        platformName = 'webgl';
        console.log(`[HotUpdate] Mini-game detected: ${rawPlatform} → channel: ${channel}, platform: ${platformName}`);
    }
    else {
        // 原生/Web 平台: 用户手动输入渠道名
        channel = pkgConfig.channel || 'default';
        if (rawPlatform === 'android')
            platformName = 'android';
        else if (rawPlatform === 'ios')
            platformName = 'ios';
        else if (rawPlatform === 'win' || rawPlatform === 'win32')
            platformName = 'pc';
        else
            platformName = 'webgl';
        console.log(`[HotUpdate] Platform: ${rawPlatform || platformName} → ${platformName}, channel: ${channel}`);
    }
    // 精简格式: {v:version, c:渠道名, p:平台名, s:服务器地址, b:{bundleName:[hash, builtin]}}
    const manifest = {
        v: version,
        b: {}
    };
    for (const [name, info] of allBundles) {
        const hash = calculateDirHash(info.dir);
        const size = calculateDirSize(info.dir);
        manifest.b[name] = [hash, info.builtin, size];
        console.log(`[HotUpdate] Bundle: ${name}, hash: ${hash}, builtin: ${info.builtin}, size: ${size}`);
    }
    // 将 manifest + channel 写入 settings.json (运行时通过 cc.settings 读取)
    if (fs.existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            if (!settings.assets)
                settings.assets = {};
            settings.assets._hotUpdate = manifest;
            settings.assets._channel = channel;
            fs.writeFileSync(settingsPath, JSON.stringify(settings));
            console.log(`[HotUpdate] ✅ Manifest + channel written to settings.json`);
        }
        catch (e) {
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
const onAfterBuild = async function (options, result) {
    try {
        obfuscateMainJs(options, result);
    }
    catch (e) {
        console.error(`[taowu-editor] obfuscateMainJs error: ${e?.message}\n${e?.stack}`);
    }
    try {
        generateVersionManifest(options, result);
    }
    catch (e) {
        console.error(`[taowu-editor] generateVersionManifest error: ${e?.message}\n${e?.stack}`);
    }
};
exports.onAfterBuild = onAfterBuild;
