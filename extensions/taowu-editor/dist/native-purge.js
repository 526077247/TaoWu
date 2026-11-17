"use strict";
/**
 * 清理"像素已并入图集"的冗余原生图 (native/**.png)
 *
 * 背景
 * ----
 * 构建器会把图集内每张子图的原图仍然复制一份到 subpackages/<bundle>/native/,
 * 而图集本身已经把这些像素打进一张 ASTC 大图。这些副本在运行时不会被采样,
 * 却占了包体里相当一部分体积 (数量与图集规模成正比)。
 *
 * 判据 (源侧, 不看产物)
 * ---------------------
 * ① 扫 assets 下所有 *.pac.meta, 得到「图集目录」集合 —— 这些目录里的图片会被
 *    auto-atlas 打包进同一个大图。
 * ② 扫 assets 下所有图片 *.meta, 建 uuid -> 源文件路径 映射。
 * ③ 产物里某张 native PNG 只有在满足以下全部条件时才冗余:
 *    - 能在 ② 里找到源文件         (找不到 = 引擎内置资源, 必须保留)
 *    - 源文件所在目录在 ① 里        (不在图集目录 = 独立图片, 必须保留)
 *    - 该图集声明了 removeImageInBundle && removeTextureInBundle
 *                                  (显式声明"原图/纹理不进包" 才说明原图是残留)
 *
 * 为什么不看产物里的 cc.SpriteAtlas 字样
 * --------------------------------------
 * 早期判据是「SpriteFrame uuid 出现在含 cc.SpriteAtlas 的 import 描述里」。
 * 这是错的: prefab 的序列化类型表里只要出现 Sprite 组件就会登记 "cc.SpriteAtlas"
 * 这个类型名, 于是判据退化成「这个 prefab 引用了这张图」, 与是否打包进图集无关。
 * 真实后果: p12 项目里引擎内置图 (default_btn_normal / default_btn_pressed ...)
 * 被误判为冗余删除, 运行时直接报
 *   `file subpackages/ui_uicommon/native/54/544e49d6-*.png does not exist!`
 * 而且真正的图集资产在产物里根本不存在 (removeSpriteAtlasInBundle=true 时构建器
 * 不输出它的 import 文件), 所以"产物里找图集"这条路从一开始就走不通。
 *
 * 为什么要摘登记
 * --------------
 * versions.native 是 [资源下标, "md5", 下标, "md5", ...] 平铺数组。引擎据此拼出
 * native/<xx>/<uuid>.<md5>.png 并下载, 下载发生在解析资产描述之前。只删文件会报
 * `file does not exist!`; 摘掉对应 pair 后引擎不再请求该路径, 文件才可以删。
 * 摘 pair 不重排 uuids, 因此不会影响其余资源的下标稳定性。
 *
 * 幂等
 * ----
 * 登记已摘但文件仍在 (上次中断) 的条目也会被删, 重复执行最终收敛到同一个结果。
 */
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
exports.compressUuid = compressUuid;
exports.purgeNativePng = purgeNativePng;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const SPRITE_FRAME_SUFFIX = '@f9941';
/** 会被 auto-atlas 收集的图片扩展名 */
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tga', '.psd', '.tiff', '.tif']);
/** 原始 uuid -> 引擎使用的 22 字符压缩 uuid */
function compressUuid(uuid) {
    const h = uuid.replace(/-/g, '');
    if (h.length !== 32)
        return null;
    let out = h.slice(0, 2);
    for (let i = 2; i < 32; i += 3) {
        const a = parseInt(h[i], 16);
        const b = parseInt(h[i + 1], 16);
        const c = parseInt(h[i + 2], 16);
        if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(c))
            return null;
        out += B64[(a << 2) | (b >> 2)] + B64[((b & 3) << 4) | c];
    }
    return out;
}
function sleepSync(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) { /* busy wait */ }
}
function toPosix(p) {
    return p.split(path.sep).join('/');
}
/** 广度优先收集所有子目录 (含 root 自身) */
function listDirs(root) {
    const out = [];
    const stack = [root];
    while (stack.length) {
        const dir = stack.pop();
        out.push(dir);
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const e of entries) {
            if (e.isDirectory())
                stack.push(path.join(dir, e.name));
        }
    }
    return out;
}
/** 含 config.*.json 且带 import/ 子目录的目录视为 bundle 根 */
function findBundles(root) {
    const res = [];
    for (const dir of listDirs(root)) {
        let names;
        try {
            names = fs.readdirSync(dir);
        }
        catch {
            continue;
        }
        if (!names.some(n => n.startsWith('config.') && n.endsWith('.json')))
            continue;
        if (!fs.existsSync(path.join(dir, 'import')))
            continue;
        res.push(dir);
    }
    return res;
}
/**
 * 扫资源根, 收集所有 .pac 目录。
 * 键是目录绝对路径 (posix/lower), 与图片 meta 反推出的目录做同目录比较。
 */
function collectAtlasDirs(projectDir, assetRoots, warnings) {
    const res = new Map();
    for (const rootName of assetRoots) {
        const root = path.isAbsolute(rootName) ? rootName : path.join(projectDir, rootName);
        if (!fs.existsSync(root)) {
            warnings.push(`资源根目录不存在: ${root}`);
            continue;
        }
        for (const dir of listDirs(root)) {
            let names;
            try {
                names = fs.readdirSync(dir);
            }
            catch {
                continue;
            }
            for (const n of names) {
                if (!n.endsWith('.pac.meta'))
                    continue;
                const pacFile = path.join(dir, n);
                let ud = {};
                let uuid = '';
                try {
                    const j = JSON.parse(fs.readFileSync(pacFile, 'utf8'));
                    ud = j.userData || {};
                    uuid = j.uuid || '';
                }
                catch (e) {
                    warnings.push(`读取图集 meta 失败 ${pacFile}: ${e?.message}`);
                    continue;
                }
                const key = toPosix(dir).toLowerCase();
                res.set(key, {
                    dirKey: key,
                    rel: toPosix(path.relative(projectDir, dir)),
                    pacFile,
                    uuid,
                    removeTexture: ud.removeTextureInBundle === true,
                    removeImage: ud.removeImageInBundle === true,
                    removeSpriteAtlas: ud.removeSpriteAtlasInBundle === true,
                    filterUnused: ud.filterUnused === true,
                });
            }
        }
    }
    return res;
}
/**
 * 扫资源根下所有图片 meta, 只保留 targets 里出现的 uuid。
 * 返回 uuid(lower) -> 源文件绝对路径 (posix)。
 */
function mapUuidToSource(projectDir, assetRoots, targets, warnings) {
    const res = new Map();
    if (!targets.size)
        return res;
    for (const rootName of assetRoots) {
        const root = path.isAbsolute(rootName) ? rootName : path.join(projectDir, rootName);
        if (!fs.existsSync(root))
            continue;
        for (const dir of listDirs(root)) {
            let names;
            try {
                names = fs.readdirSync(dir);
            }
            catch {
                continue;
            }
            for (const n of names) {
                if (!n.endsWith('.meta'))
                    continue;
                if (!IMAGE_EXTS.has(path.extname(n.slice(0, -5)).toLowerCase()))
                    continue;
                const src = path.join(dir, n.slice(0, -5));
                let uuid = '';
                try {
                    uuid = JSON.parse(fs.readFileSync(path.join(dir, n), 'utf8')).uuid || '';
                }
                catch {
                    continue;
                }
                if (!uuid)
                    continue;
                const key = uuid.toLowerCase();
                if (!targets.has(key))
                    continue;
                if (!res.has(key))
                    res.set(key, toPosix(src));
            }
        }
    }
    return res;
}
function writeWithRetry(file, data) {
    for (let i = 0; i < 5; i++) {
        try {
            fs.writeFileSync(file, data, 'utf8');
            return;
        }
        catch (e) {
            if (i === 4)
                throw e;
            sleepSync(200);
        }
    }
}
function removeWithRetry(file) {
    for (let i = 0; i < 5; i++) {
        try {
            fs.rmSync(file, { force: true });
            return true;
        }
        catch {
            sleepSync(200);
        }
    }
    return !fs.existsSync(file);
}
/**
 * 摘除冗余登记并删除对应 PNG。
 * 返回统计信息; 不抛错之外的行为变化都通过 warnings 反馈。
 */
function purgeNativePng(opts) {
    const log = opts.log || ((m) => console.log(m));
    const buildDir = path.resolve(opts.buildDir);
    const projectDir = path.resolve(opts.projectDir || path.join(buildDir, '..', '..'));
    const assetRoots = opts.assetRoots && opts.assetRoots.length ? opts.assetRoots : ['assets'];
    const tempDir = opts.tempDir || path.join(projectDir, 'temp');
    const requireAtlasDrop = opts.requireAtlasDrop !== false;
    const warnings = [];
    const actions = [];
    const kept = [];
    const keptByReason = {};
    // ---------- 1. 扫产物, 收集所有 native PNG ----------
    const bundles = findBundles(buildDir);
    const candidates = [];
    const cfgCache = new Map();
    for (const bundle of bundles) {
        let cfgName;
        let cfg;
        try {
            cfgName = fs.readdirSync(bundle)
                .filter(n => n.startsWith('config.') && n.endsWith('.json'))[0];
            cfg = JSON.parse(fs.readFileSync(path.join(bundle, cfgName), 'utf8'));
        }
        catch (e) {
            warnings.push(`读取 config 失败 ${bundle}: ${e?.message}`);
            continue;
        }
        const cfgPath = path.join(bundle, cfgName);
        const nativeDir = path.join(bundle, 'native');
        if (!fs.existsSync(nativeDir))
            continue;
        const uuids = Array.isArray(cfg?.uuids) ? cfg.uuids : [];
        const nat = Array.isArray(cfg?.versions?.native) ? cfg.versions.native : [];
        cfgCache.set(cfgPath, { cfg, cfgPath, uuids, nat });
        for (const sub of fs.readdirSync(nativeDir)) {
            const subDir = path.join(nativeDir, sub);
            let isDir = false;
            try {
                isDir = fs.statSync(subDir).isDirectory();
            }
            catch {
                continue;
            }
            if (!isDir)
                continue;
            for (const f of fs.readdirSync(subDir)) {
                if (!f.toLowerCase().endsWith('.png'))
                    continue;
                const png = path.join(subDir, f);
                let size = 0;
                try {
                    size = fs.statSync(png).size;
                }
                catch {
                    continue;
                }
                const stem = f.slice(0, -4);
                const dot = stem.indexOf('.');
                const uuid = dot >= 0 ? stem.slice(0, dot) : stem;
                const fileMd5 = dot >= 0 ? stem.slice(dot + 1) : '';
                candidates.push({ bundle, cfgPath, png, uuid, fileMd5, size });
            }
        }
    }
    // ---------- 2. 源侧判据: 图集目录 + uuid->源路径 ----------
    const atlasDirs = collectAtlasDirs(projectDir, assetRoots, warnings);
    const dropDirs = new Set();
    for (const [k, a] of atlasDirs) {
        if (!requireAtlasDrop) {
            dropDirs.add(k);
            continue;
        }
        if (a.removeTexture && a.removeImage)
            dropDirs.add(k);
    }
    const targets = new Set(candidates.map(c => c.uuid.toLowerCase()));
    const uuid2src = mapUuidToSource(projectDir, assetRoots, targets, warnings);
    if (uuid2src.size === 0 && candidates.length > 0) {
        // 找不到任何源 (只有 engine 内置图), 继续跑也无意义, 但仍会保留全部
        warnings.push('未从资源目录解析到任何 uuid->源路径, 全部保留; 请检查 projectDir / assetRoots');
    }
    // 统计"在 pac 目录内但因 flags 被跳过"的目录, 只报一次
    const flagOffDirs = new Set();
    // ---------- 3. 判定 ----------
    for (const c of candidates) {
        const cu = compressUuid(c.uuid);
        if (!cu) {
            kept.push({ png: toPosix(c.png), size: c.size, reason: 'bad-uuid' });
            keptByReason['bad-uuid'] = (keptByReason['bad-uuid'] || 0) + 1;
            continue;
        }
        const src = uuid2src.get(c.uuid.toLowerCase());
        if (!src) {
            kept.push({ png: toPosix(c.png), size: c.size, reason: 'no-source-meta' });
            keptByReason['no-source-meta'] = (keptByReason['no-source-meta'] || 0) + 1;
            continue;
        }
        const srcDir = toPosix(path.dirname(src)).toLowerCase();
        const atlas = atlasDirs.get(srcDir);
        if (!atlas) {
            kept.push({
                png: toPosix(c.png), size: c.size, reason: 'not-in-atlas-dir',
                source: toPosix(path.relative(projectDir, src)),
            });
            keptByReason['not-in-atlas-dir'] = (keptByReason['not-in-atlas-dir'] || 0) + 1;
            continue;
        }
        if (!dropDirs.has(srcDir)) {
            flagOffDirs.add(atlas.rel);
            kept.push({
                png: toPosix(c.png), size: c.size, reason: 'atlas-flags-off',
                source: toPosix(path.relative(projectDir, src)),
            });
            keptByReason['atlas-flags-off'] = (keptByReason['atlas-flags-off'] || 0) + 1;
            continue;
        }
        const entry = cfgCache.get(c.cfgPath);
        const uuids = entry ? entry.uuids : [];
        const nat = entry ? entry.nat : [];
        const idxs = new Set();
        for (let i = 0; i < uuids.length; i++) {
            if (uuids[i] === cu)
                idxs.add(i);
        }
        const pairs = [];
        for (let j = 0; j + 1 < nat.length; j += 2) {
            if (idxs.has(nat[j]))
                pairs.push({ pos: j, idx: nat[j], md5: nat[j + 1] });
        }
        if (!pairs.length) {
            // 登记已被摘除 (上次运行中断留下的文件), 文件本身仍冗余, 可删
            actions.push({
                bundle: c.bundle, cfgPath: c.cfgPath, png: toPosix(c.png), uuid: c.uuid,
                compress: cu, size: c.size, idx: idxs.size ? Array.from(idxs)[0] : null,
                regMd5: null, orphan: true, source: toPosix(path.relative(projectDir, src)),
                atlas: atlas.rel,
            });
            continue;
        }
        if (pairs.length > 1) {
            warnings.push(`多个 native 登记: ${c.uuid} -> ${pairs.length} 处`);
        }
        const p = pairs[0];
        if (c.fileMd5 && p.md5 !== c.fileMd5) {
            warnings.push(`md5 不一致 ${c.uuid}: 文件名=${c.fileMd5} 登记=${p.md5}`);
        }
        actions.push({
            bundle: c.bundle, cfgPath: c.cfgPath, png: toPosix(c.png), uuid: c.uuid,
            compress: cu, size: c.size, idx: p.idx, regMd5: p.md5, orphan: false,
            source: toPosix(path.relative(projectDir, src)), atlas: atlas.rel,
        });
    }
    if (flagOffDirs.size) {
        warnings.push(`以下图集未声明移除原图 (flags off), 其 ${keptByReason['atlas-flags-off'] || 0} 张图已保留: ${Array.from(flagOffDirs).join(', ')}`);
    }
    const freedBytes = actions.reduce((s, a) => s + a.size, 0);
    const byCfg = new Map();
    for (const a of actions) {
        const list = byCfg.get(a.cfgPath);
        if (list)
            list.push(a);
        else
            byCfg.set(a.cfgPath, [a]);
    }
    log(`[NativePng] 图集目录 ${atlasDirs.size} 个 (可回收 ${dropDirs.size}), bundle ${bundles.length} 个`);
    log(`[NativePng] 可清理 ${actions.length} 张 / ${(freedBytes / 1048576).toFixed(2)} MB, 保留 ${kept.length} 张 ${JSON.stringify(keptByReason)}`);
    const slug = toPosix(path.relative(projectDir, buildDir)).replace(/[:/\\]/g, '_') || path.basename(buildDir);
    const manifestPath = path.join(tempDir, `native_png_purge_${slug}.json`);
    if (opts.dryRun) {
        log(`[NativePng] DRY RUN, 未改动任何文件`);
        return {
            removed: actions.length, freedBytes, keptCount: kept.length, keptByReason,
            bundleCount: bundles.length, configCount: byCfg.size,
            atlasDirCount: atlasDirs.size, atlasDropDirCount: dropDirs.size,
            projectDir: toPosix(projectDir), assetRoots,
            warnings, manifestPath, kept,
        };
    }
    // ---------- 备份 ----------
    if (opts.backupDir && actions.length) {
        for (const a of actions) {
            const rel = path.relative(buildDir, a.png);
            const dst = path.join(opts.backupDir, rel);
            try {
                fs.mkdirSync(path.dirname(dst), { recursive: true });
                if (!fs.existsSync(dst))
                    fs.copyFileSync(a.png, dst);
            }
            catch (e) {
                warnings.push(`备份失败 ${a.png}: ${e?.message}`);
            }
        }
    }
    // ---------- 摘登记 ----------
    const writtenCfg = {};
    for (const [cfgPath, items] of byCfg) {
        try {
            const before = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
            const nat = Array.isArray(before?.versions?.native) ? before.versions.native : [];
            const beforeLen = nat.length;
            const dropPos = new Set();
            for (const it of items) {
                if (it.regMd5 === null)
                    continue; // orphan: 本就无登记可摘
                for (let j = 0; j + 1 < nat.length; j += 2) {
                    if (nat[j] === it.idx && nat[j + 1] === it.regMd5) {
                        dropPos.add(j);
                        break;
                    }
                }
            }
            const newNat = [];
            for (let j = 0; j + 1 < nat.length; j += 2) {
                if (dropPos.has(j))
                    continue;
                newNat.push(nat[j], nat[j + 1]);
            }
            before.versions.native = newNat;
            writeWithRetry(cfgPath, JSON.stringify(before));
            // 回读校验: 长度符合预期, 且除 versions 外其余字段未被改动
            const after = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
            if (after.versions.native.length !== beforeLen - 2 * dropPos.size) {
                throw new Error(`摘除数量不符 (期望 ${beforeLen - 2 * dropPos.size}, 实际 ${after.versions.native.length})`);
            }
            for (const k of Object.keys(before)) {
                if (k === 'versions')
                    continue;
                if (JSON.stringify(after[k]) !== JSON.stringify(before[k])) {
                    throw new Error(`字段被改动: ${k}`);
                }
            }
            writtenCfg[cfgPath] = { before: beforeLen, after: newNat.length, dropped: dropPos.size };
        }
        catch (e) {
            warnings.push(`回写 config 失败 ${cfgPath}: ${e?.message}`);
        }
    }
    // ---------- 删文件 ----------
    let removed = 0;
    for (const a of actions) {
        if (!fs.existsSync(a.png))
            continue;
        if (removeWithRetry(a.png))
            removed++;
        else
            warnings.push(`删除失败(被占用) ${a.png}`);
    }
    // ---------- 清单 ----------
    try {
        fs.mkdirSync(tempDir, { recursive: true });
        fs.writeFileSync(manifestPath, JSON.stringify({
            buildDir: toPosix(buildDir),
            projectDir: toPosix(projectDir),
            assetRoots,
            requireAtlasDrop,
            backup: opts.backupDir ? toPosix(opts.backupDir) : null,
            removedCount: removed,
            freedBytes,
            keptByReason,
            atlasDirs: Array.from(atlasDirs.values()).map(a => ({
                dir: a.rel, uuid: a.uuid,
                removeTexture: a.removeTexture, removeImage: a.removeImage,
                removeSpriteAtlas: a.removeSpriteAtlas, filterUnused: a.filterUnused,
                dropped: dropDirs.has(a.dirKey),
            })),
            configs: writtenCfg,
            files: actions,
            kept,
            warnings,
        }, null, 1), 'utf8');
    }
    catch (e) {
        warnings.push(`写清单失败: ${e?.message}`);
    }
    log(`[NativePng] ✅ 摘除登记并删除 ${removed} 张, 释放 ${(freedBytes / 1048576).toFixed(2)} MB (涉及 ${byCfg.size} 个 config)`);
    if (warnings.length) {
        for (const w of warnings.slice(0, 10))
            log(`[NativePng] ⚠ ${w}`);
        if (warnings.length > 10)
            log(`[NativePng] ⚠ 另有 ${warnings.length - 10} 条警告, 详见清单`);
    }
    return {
        removed, freedBytes, keptCount: kept.length, keptByReason,
        bundleCount: bundles.length, configCount: byCfg.size,
        atlasDirCount: atlasDirs.size, atlasDropDirCount: dropDirs.size,
        projectDir: toPosix(projectDir), assetRoots,
        warnings, manifestPath, kept,
    };
}
