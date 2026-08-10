import { _decorator, assetManager, AssetManager, sys } from 'cc';
import { IManager } from '../../Core/Manager/IManager';
import { ObjectPool } from '../../Core/ObjectPool';
import { Log } from '../Log/Log';
import { VersionManifest, BundleVersionInfo } from './VersionManifest';

/** 解析后的包内 version.manifest.json (继承 VersionManifest, 额外含渠道/平台/服务器地址) */
export interface LocalManifest extends VersionManifest {
    channel: string;
    platform: string;
    server: string;
}

export class BundleManager implements IManager {
    private static _instance: BundleManager;

    public static get instance(): BundleManager{
        return BundleManager._instance;
    }

    private _cacheBundle: Map<string, AssetManager.Bundle>;
    private _cacheBundleRefCount: Map<AssetManager.Bundle, number>;
    /** 正在加载中的 bundle 请求 (name → Promise), 用于去重并发加载 */
    private _loadingBundles: Map<string, Promise<AssetManager.Bundle>>;
    /** 远程 bundle 信息 (name → hash) */
    private _remoteBundleInfos: Map<string, string>;
    /** 远程 URL 前缀: {server}/{channel}_{platform}/ (由 ServerConfigManager init 后写入) */
    private _remoteURLPrefix: string = "";
    /** 包内版本清单 */
    private _localManifest: LocalManifest = null;
    /** 本地缓存的远端 manifest 文件名前缀 (原生平台用文件存储, 带版本号) */
    private static readonly REMOTE_MANIFEST_PREFIX = "remote_manifest_";

    public init() {
        BundleManager._instance = this;
        this._cacheBundle = new Map<string, AssetManager.Bundle>();
        this._cacheBundleRefCount = new Map<AssetManager.Bundle, number>();
        this._loadingBundles = new Map<string, Promise<AssetManager.Bundle>>();
        this._remoteBundleInfos = new Map<string, string>();
    }

    /** 获取包内版本清单 */
    public get localManifest(): LocalManifest {
        return this._localManifest;
    }

    /** 设置远程 URL 前缀 (由 ServerConfigManager init 后调用) */
    public setRemoteURLPrefix(prefix: string): void {
        this._remoteURLPrefix = prefix;
    }

    /**
     * 更新成功后保存最新远端 manifest 到本地文件 (仅原生平台)
     * 浏览器平台由 HTTP 缓存兜底, 不需要手动缓存
     * 下次启动时 loadLocalManifest 优先读取这里保存的版本, 实现增量热更基线
     */
    public saveRemoteManifest(manifest: LocalManifest): void {
        if (sys.isBrowser) return; // 浏览器自带缓存
        try {
            const path = this.getRemoteManifestPath(manifest.version);
            const json = JSON.stringify(manifest);
            const jsb = (globalThis as any).jsb;
            if (jsb && jsb.fileUtils) {
                jsb.fileUtils.writeStringToFile(json, path);
                Log.info(`[BundleManager] Saved remote manifest to file, version: ${manifest.version}, path: ${path}`);
            }
        } catch (e: any) {
            Log.error(`[BundleManager] Failed to save remote manifest: ${e?.message}`);
        }
    }

    /**
     * 读取已保存的最新远端 manifest (上次更新后的基线)
     * 浏览器返回 null (由 HTTP 缓存兜底), 原生扫描本地文件找最新版本
     */
    private loadSavedRemoteManifest(): LocalManifest {
        if (sys.isBrowser) return null; // 浏览器自带缓存
        try {
            const jsb = (globalThis as any).jsb;
            if (!jsb || !jsb.fileUtils) return null;
            const writablePath = jsb.fileUtils.getWritablePath();
            const files = jsb.fileUtils.listFiles ? jsb.fileUtils.listFiles(writablePath) : [];
            let latestVersion = -1;
            let latestPath = "";
            for (const file of files) {
                const name = file.split('/').pop() || file;
                if (name.startsWith(BundleManager.REMOTE_MANIFEST_PREFIX)) {
                    const ver = Number(name.substring(BundleManager.REMOTE_MANIFEST_PREFIX.length, name.length - 5));
                    if (!isNaN(ver) && ver > latestVersion) {
                        latestVersion = ver;
                        latestPath = file;
                    }
                }
            }
            if (!latestPath) return null;
            const json = jsb.fileUtils.getStringFromFile(latestPath);
            if (!json) return null;
            Log.info(`[BundleManager] Found saved remote manifest, version: ${latestVersion}, path: ${latestPath}`);
            return JSON.parse(json) as LocalManifest;
        } catch (e: any) {
            Log.error(`[BundleManager] Failed to load saved remote manifest: ${e?.message}`);
        }
        return null;
    }

    /** 获取本地缓存的远端 manifest 文件路径 (原生平台, 带版本号) */
    private getRemoteManifestPath(version: string): string {
        const jsb = (globalThis as any).jsb;
        if (jsb && jsb.fileUtils) {
            return jsb.fileUtils.getWritablePath() + BundleManager.REMOTE_MANIFEST_PREFIX + version + ".json";
        }
        return "";
    }

    /**
     * 异步加载版本清单
     * 在 Entry 初始化阶段调用, 作为热更新对比基线
     * 优先读取 localStorage 中保存的最新远端 manifest (上次更新后的基线), 没有则读取包内 version.manifest.json
     */
    public async loadLocalManifest(): Promise<void> {
        // 优先从 localStorage 读取上次更新后保存的最新远端 manifest
        const savedManifest = this.loadSavedRemoteManifest();
        if (savedManifest) {
            this._localManifest = savedManifest;
            this.fillRemoteBundleInfos();
            Log.info(`[BundleManager] Loaded saved remote manifest, version: ${savedManifest.version}, channel: ${savedManifest.channel}, platform: ${savedManifest.platform}`);
            return;
        }

        // 否则读取包内 version.manifest.json
        const text = await this.fetchLocalText("version.manifest.json");
        if (text) {
            try {
                const raw = JSON.parse(text);
                const channel = raw.c || "default";
                const platform = raw.p || "webgl";
                const server = raw.s || "";
                const bundles: Record<string, BundleVersionInfo> = {};
                for (const name in raw.b) {
                    const [hash, builtin] = raw.b[name];
                    bundles[name] = { name, hash, builtin };
                }
                this._localManifest = { version: raw.v, channel, platform, server, bundles };
                this.fillRemoteBundleInfos();
                Log.info(`[BundleManager] Local manifest loaded, version: ${this._localManifest.version}, channel: ${channel}, platform: ${platform}, server: ${server}`);
            } catch (e: any) {
                Log.error(`[BundleManager] Failed to parse local manifest: ${e?.message}`);
            }
        } else {
            Log.warning("[BundleManager] No local manifest found.");
        }
    }

    /**
     * 把本地清单中的非内置 bundle 写入 _remoteBundleInfos
     */
    private fillRemoteBundleInfos(): void {
        if (!this._localManifest) return;
        this._remoteBundleInfos.clear();
        for (const name in this._localManifest.bundles) {
            const info = this._localManifest.bundles[name];
            if (!info.builtin) {
                this._remoteBundleInfos.set(name, info.hash);
            }
        }
    }

    /**
     * 读取包内本地文件文本
     */
    private fetchLocalText(filename: string): Promise<string> {
        return new Promise((resolve) => {
            if (sys.isBrowser) {
                const xhr = new XMLHttpRequest();
                xhr.open("GET", filename, true);
                xhr.timeout = 15000;
                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4) {
                        resolve(xhr.status >= 200 && xhr.status < 400 ? xhr.responseText : null);
                    }
                };
                xhr.send();
            } else if (sys.isNative) {
                const jsb = (globalThis as any).jsb;
                const fileUtils = jsb?.fileUtils;
                if (fileUtils) {
                    const resourceRoot = fileUtils.getDefaultResourceRootPath();
                    const filePath = resourceRoot + filename;
                    if (fileUtils.isFileExist(filePath)) {
                        resolve(fileUtils.getStringFromFile(filePath));
                    } else {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    }

    public destroy() {
        this.cleanUp();
        this._cacheBundleRefCount = null;
        this._cacheBundle = null;
        this._loadingBundles = null;
        this._remoteBundleInfos = null;
        BundleManager._instance = null;
    }

    /** 设置远程 bundle hash (由热更流程调用) */
    public setRemoteBundleInfo(name: string, hash: string): void {
        this._remoteBundleInfos.set(name, hash);
    }

    /** 获取远程 bundle 信息 (URL 在此处拼接: {urlPrefix}/{hash}) */
    public getRemoteBundleInfo(name: string): { url: string; hash: string } | null {
        const hash = this._remoteBundleInfos.get(name);
        if (hash == null) return null;
        return { url: `${this._remoteURLPrefix}/${hash}`, hash };
    }

    /** 检查指定 bundle 是否已加载到内存 */
    public hasBundle(name: string): boolean {
        return this._cacheBundle?.has(name) ?? false;
    }

    /**
     * 加载一个ab包
     * @param name ab包名
     * @param url 远端地址 (可选，提供则从远程加载)
     * @param version 版本hash (可选，用于缓存管理)
     * @param onProgress 下载进度回调 (可选)
     * @returns ab包或null
     */
    public async loadBundle(name: string, url: string = null, version: string = null, onProgress?: (finished: number, total: number) => void): Promise<AssetManager.Bundle> {
        // 已缓存：直接返回并增加引用计数
        if (this._cacheBundle.has(name)) {
            const bundle = this._cacheBundle.get(name);
            let count = this._cacheBundleRefCount.get(bundle);
            this._cacheBundleRefCount.set(bundle, count + 1);
            return bundle;
        }

        // 正在加载中：等待已有请求完成，再增加引用计数
        if (this._loadingBundles.has(name)) {
            const bundle = await this._loadingBundles.get(name);
            if (bundle != null) {
                let count = this._cacheBundleRefCount.get(bundle);
                this._cacheBundleRefCount.set(bundle, count + 1);
            }
            return bundle;
        }

        // 发起加载，存入 pending map 以去重并发请求
        const promise = this.loadBundleInternal(name, url, version, onProgress);
        this._loadingBundles.set(name, promise);
        try {
            return await promise;
        } finally {
            this._loadingBundles.delete(name);
        }
    }

    private async loadBundleInternal(name: string, url: string, version: string, onProgress?: (finished: number, total: number) => void): Promise<AssetManager.Bundle> {
        let bundle: AssetManager.Bundle = null;
        try {
            bundle = await new Promise<AssetManager.Bundle>((resolve) => {
                const options: Record<string, any> = {};
                // 远程加载时 URL 已含 hash，不传 version 让 Cocos 以 URL 为缓存键
                // 内容不变 → hash 不变 → URL 不变 → 缓存命中，不重新下载
                if (version && !url) options.version = version;
                if (onProgress) options.onFileProgress = onProgress;

                const target = url || name;
                assetManager.loadBundle(target, Object.keys(options).length > 0 ? options : null, (err, bundle) => {
                    if (err) {
                        console.error(err);
                        resolve(null)
                        return
                    }
                    this._cacheBundle.set(name, bundle);
                    this._cacheBundleRefCount.set(bundle, 1);
                    resolve(bundle);
                });
            });
        }
        catch (ex: any) {
            Log.error(ex);
            return null;
        }

        if(bundle != null && ((bundle.deps?.length ?? 0) > 0)){
            const temp = ObjectPool.instance.fetch(Array<Promise<AssetManager.Bundle>>);
            for (let index = 0; index < bundle.deps.length; index++) {
                const dep = bundle.deps[index];
                temp.push(this.loadBundle(dep));
            }
            await Promise.all(temp);
            temp.length = 0;
            ObjectPool.instance.recycle(temp);
        }
        return bundle;
    }

    /**
     * 释放bundle引用
     * @param bundle 
     * @param clear 当引用计数为0时是否立即卸载ab包？
     */
    public releaseBundle(bundle: AssetManager.Bundle, clear: boolean = false) :void {
        if(!!this._cacheBundleRefCount && this._cacheBundleRefCount.has(bundle)) {
            let count = this._cacheBundleRefCount.get(bundle);
            count--;
            if(count < 0) count = 0;
            this._cacheBundleRefCount.set(bundle, count);
            const deps = (bundle.deps && bundle.deps.length > 0) ? bundle.deps.slice() : [];
            if(count <= 0 && clear){
                this._cacheBundle.delete(bundle.name);
                this._cacheBundleRefCount.delete(bundle);
                bundle.releaseAll();
                assetManager.removeBundle(bundle);
            }
            for (let index = 0; index < deps.length; index++) {
                const name = deps[index];
                if(this._cacheBundle.has(name)) {
                    const cacheBundle = this._cacheBundle.get(name);
                    this.releaseBundle(cacheBundle, clear);
                }
            }
        }
    }

    /**
     * 卸载未使用的ab包
     */
    public unloadUnusedBundle() :void {
        let tempKey = []
        for (const [key, bundle] of this._cacheBundle) {
            let count = this._cacheBundleRefCount.get(bundle);
            if(count <= 0){
                tempKey[tempKey.length] = key;
                this._cacheBundleRefCount.delete(bundle)
                bundle.releaseAll();
                assetManager.removeBundle(bundle);
            }
        }
        for (const key of tempKey) {
            this._cacheBundle.delete(key)
        }
    }

    /**
     * 卸载所有ab包
     */
    public cleanUp() :void {
        for (const [key, bundle] of this._cacheBundle) {
            bundle.releaseAll();
            assetManager.removeBundle(bundle);
        }
        this._cacheBundle.clear();
        this._cacheBundleRefCount.clear();
    }

}


