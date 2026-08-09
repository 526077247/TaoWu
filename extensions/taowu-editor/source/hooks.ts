import { BuildHook, IBuildResult, IBuildTaskOption, ITaskOptions } from '../@types';
import * as fs from "fs";
import * as path from 'path';
import * as crypto from 'crypto';
import * as JavaScriptObfuscator from 'javascript-obfuscator';

// 自定义混淆函数
const obfuscateMainJs = (options: IBuildTaskOption, result: IBuildResult) => {
    let destDir = path.join(result.paths.dir, "subpackages", "main");
    if(!fs.existsSync(destDir)){
        destDir = path.join(result.paths.dir, "assets", "main");
    }
    const enableObfuscate = options.packages["taowu-editor"].enableObfuscate;
    if (!enableObfuscate) {
        console.log('[CodeObfuscate] 代码混淆未启用，跳过');
        return;
    }
    console.log(`[混淆插件] 构建完成，开始混淆，输出目录: ${destDir}`);

    const findMainJs = (dir: string): string | null => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                const result = findMainJs(fullPath);
                if (result) return result;
            } else if (/^(index|game)(?:\.[a-f0-9]+)?\.js$/.test(file)) {
                return fullPath;
            }
        }
        return null;
    };

    const targetFile = findMainJs(destDir);
    if (targetFile) {
        try {
            const code = fs.readFileSync(targetFile, 'utf8');
            const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, {
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
            });
            fs.writeFileSync(targetFile, obfuscatedResult.getObfuscatedCode());
            console.log(`[混淆插件] ✅ 混淆完成: ${targetFile}`);
        } catch (error: any) {
            console.error(`[混淆插件] ❌ 混淆失败: ${error.message}`);
        }
    } else {
        console.warn(`[混淆插件] ⚠️ 未找到符合规则的 index.js`);
    }
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
 * 安全删除并重建目录 (Windows 下 rmSync 后句柄可能延迟释放, 需重试+等待)
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

    console.log(`[HotUpdate] Builtin bundles: ${[...allBundles.values()].filter(b => b.builtin).map(b => path.basename(b.dir)).join(', ')}`);
    console.log(`[HotUpdate] Remote bundles: ${[...allBundles.values()].filter(b => !b.builtin).map(b => path.basename(b.dir)).join(', ')}`);

    const version = pkgConfig.version || String(Date.now());
    const channel = pkgConfig.channel || 'default';

    // 从 settings.json 读取目标平台 + 服务器地址
    const settingsPath = path.join(buildDir, "src", "settings.json");
    let platformName = path.basename(buildDir);
    let serverURL = "";
    if (fs.existsSync(settingsPath)) {
        try {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            const rawPlatform = settings?.engine?.platform || platformName;
            if (rawPlatform.startsWith('web')) platformName = 'webgl';
            else if (rawPlatform === 'android') platformName = 'android';
            else if (rawPlatform === 'ios') platformName = 'ios';
            else platformName = 'pc';
            console.log(`[HotUpdate] Platform: ${rawPlatform} → ${platformName}`);
            // 读取构建面板的"资源服务器地址"
            serverURL = settings?.assets?.server || "";
            console.log(`[HotUpdate] Server URL: ${serverURL}`);
        } catch {}
    }

    // 精简格式: {v:version, c:渠道名, p:平台名, s:服务器地址, b:{bundleName:[hash, builtin]}}
    const manifest: Record<string, any> = {
        v: version,
        c: channel,
        p: platformName,
        s: serverURL,
        b: {} as Record<string, [string, boolean]>
    };

    for (const [name, info] of allBundles) {
        const hash = calculateDirHash(info.dir);
        manifest.b[name] = [hash, info.builtin];
        console.log(`[HotUpdate] Bundle: ${name}, hash: ${hash}, builtin: ${info.builtin}`);
    }

    // 写入构建根目录 (随包发布)
    const manifestPath = path.join(buildDir, "version.manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`[HotUpdate] ✅ Version manifest generated: ${manifestPath}`);

    // 复制到 CDN 输出目录: {项目根}/Release/{渠道名}_{平台名}
    const projectRoot = path.resolve(buildDir, '..', '..');
    const cdnOutputDir = path.join(projectRoot, 'Release', `${channel}_${platformName}`);
    safeRmAndMkdir(cdnOutputDir);
    fs.copyFileSync(manifestPath, path.join(cdnOutputDir, `${version}.bytes`));
    // 同时写入 version.txt (只存版本号, 供运行时拼接 manifest URL)
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

export const onAfterBuild: BuildHook.onAfterBuild = async function (options: IBuildTaskOption, result: IBuildResult) {
    try {
        obfuscateMainJs(options, result);
    } catch (e: any) {
        console.error(`[taowu-editor] obfuscateMainJs error: ${e?.message}\n${e?.stack}`);
    }
    try {
        generateVersionManifest(options, result);
    } catch (e: any) {
        console.error(`[taowu-editor] generateVersionManifest error: ${e?.message}\n${e?.stack}`);
    }
};
