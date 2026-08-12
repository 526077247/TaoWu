import { _decorator, assetManager, AssetManager, sys, settings } from 'cc';
import { IManager } from '../../Core/Manager/IManager';
import { ObjectPool } from '../../Core/ObjectPool';
import { Log } from '../Log/Log';
import { RawVersionManifest } from './VersionManifest';

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
    /** 包内版本清单 (可能是远端缓存版本) */
    private _localManifest: RawVersionManifest = null;
    /** 内置 manifest (始终从 cc.settings 读取) */
    private _builtinManifest: RawVersionManifest = null;
    /** 本地缓存的远端 manifest 文件名前缀 (原生平台用文件存储, 带版本号) */
    private static readonly REMOTE_MANIFEST_PREFIX = "remote_manifest_";
    /** localStorage key: 已缓存的最新远端版本号 */
    private static readonly REMOTE_VERSION_KEY = "taowu_hotupdate_remote_version";

    public init() {
        BundleManager._instance = this;
        this._cacheBundle = new Map<string, AssetManager.Bundle>();
        this._cacheBundleRefCount = new Map<AssetManager.Bundle, number>();
        this._loadingBundles = new Map<string, Promise<AssetManager.Bundle>>();
        this._remoteBundleInfos = new Map<string, string>();
    }

    /** 获取包内版本清单 (可能是远端缓存版本) */
    public get localManifest(): RawVersionManifest {
        return this._localManifest;
    }

    /** 获取内置 manifest (始终从 cc.settings 读取, 不含远端缓存) */
    public get builtinManifest(): RawVersionManifest {
        return this._builtinManifest;
    }

    /** 设置远程 URL 前缀 (由 ServerConfigManager init 后调用) */
    public setRemoteURLPrefix(prefix: string): void {
        this._remoteURLPrefix = prefix;
    }

    /**
     * 更新成功后保存最新远端 manifest
     * 原生平台写入文件 + localStorage 记录版本号; 浏览器仅 localStorage 记录版本号
     * 下次启动时 loadLocalManifest 对比版本号取最大, 实现增量热更基线
     */
    public saveRemoteManifest(manifest: RawVersionManifest): void {
        try {
            // 版本号始终存 localStorage (浏览器+原生)
            sys.localStorage.setItem(BundleManager.REMOTE_VERSION_KEY, manifest.v);

            // 原生平台额外写文件 (浏览器靠 HTTP 缓存)
            if (sys.isNative) {
                const path = this.getRemoteManifestPath(manifest.v);
                const json = JSON.stringify(manifest);
                const jsb = (globalThis as any).jsb;
                if (jsb && jsb.fileUtils) {
                    jsb.fileUtils.writeStringToFile(json, path);
                    Log.info(`[BundleManager] Saved remote manifest to file, version: ${manifest.v}, path: ${path}`);
                }
            } else {
                Log.info(`[BundleManager] Saved remote manifest version to localStorage: ${manifest.v}`);
            }
        } catch (e: any) {
            Log.error(`[BundleManager] Failed to save remote manifest: ${e?.message}`);
        }
    }

    /**
     * 读取已保存的最新远端 manifest
     * 先读 localStorage 中的版本号, 与包内版本号对比取最大
     * 原生平台从文件读取 manifest 内容; 浏览器通过 HTTP 拉取 {version}.bytes
     */
    private async loadSavedRemoteManifest(builtinVersion: number): Promise<RawVersionManifest> {
        const savedVersionStr = sys.localStorage.getItem(BundleManager.REMOTE_VERSION_KEY);
        if (!savedVersionStr) return null;
        const savedVersion = Number(savedVersionStr);
        if (isNaN(savedVersion) || savedVersion < builtinVersion) {
            sys.localStorage.setItem(BundleManager.REMOTE_VERSION_KEY, builtinVersion);
            return null;
        }

        Log.info(`[BundleManager] Saved remote version ${savedVersion} > builtin version ${builtinVersion}, loading saved manifest`);

        // 原生平台从文件读取 manifest 内容
        if (sys.isNative) {
            try {
                const jsb = (globalThis as any).jsb;
                if (!jsb || !jsb.fileUtils) return null;
                const path = this.getRemoteManifestPath(String(savedVersion));
                if (!jsb.fileUtils.isFileExist(path)) return null;
                const json = jsb.fileUtils.getStringFromFile(path);
                if (!json) return null;
                return JSON.parse(json) as RawVersionManifest;
            } catch (e: any) {
                Log.error(`[BundleManager] Failed to load saved remote manifest: ${e?.message}`);
                return null;
            }
        }

        // 浏览器平台: 通过 HTTP 拉取 {urlPrefix}/{version}.bytes
        // urlPrefix 在 loadLocalManifest 中从包内 manifest 已设置
        if (!!this._remoteURLPrefix) {
            try {
                const url = `${this._remoteURLPrefix}/${savedVersion}.bytes`;
                const text = await this.fetchRemoteText(url);
                if (!text) return null;
                const manifest = JSON.parse(text) as RawVersionManifest;
                Log.info(`[BundleManager] Loaded saved remote manifest from ${url}, version: ${manifest.v}`);
                return manifest;
            } catch (e: any) {
                Log.error(`[BundleManager] Failed to fetch saved remote manifest: ${e?.message}`);
                return null;
            }
        }

        return null;
    }

    /**
     * 通过 HTTP 拉取远端文本
     */
    private fetchRemoteText(url: string): Promise<string> {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.timeout = 15000;
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    resolve(xhr.status >= 200 && xhr.status < 400 ? xhr.responseText : null);
                }
            };
            xhr.send();
        });
    }

    /** 获取本地缓存的远端 manifest 文件路径 (原生平台, 带版本号) */
    private getRemoteManifestPath(version: string): string {
        const jsb = (globalThis as any).jsb;
        if (jsb && jsb.fileUtils) {
            return jsb.fileUtils.getWritablePath() + BundleManager.REMOTE_MANIFEST_PREFIX + version + ".json";
        }
        return "";
    }

    /**获取本地版本号 */
    public getSavedVersion(){
        return sys.localStorage.getItem(BundleManager.REMOTE_VERSION_KEY);
    }

    /**
     * 异步加载版本清单
     * 从 cc.settings (settings.json 的 assets._hotUpdate) 读取内置 manifest
     * 然后与 localStorage 中保存的最新远端版本号对比, 取版本号最大的
     */
    public async loadLocalManifest(): Promise<void> {
        // 从 cc.settings 读取内置 manifest
        const raw = settings.querySettings<RawVersionManifest>('assets', '_hotUpdate');
        if (raw) {
            this._builtinManifest = raw;
        }

        // 设置远程 URL 前缀: {server}/{channel}_{platform}/
        // - server: 从 cc.settings 读 assets.server (Cocos 内置字段)
        // - channel: 从 cc.settings 读 assets._channel (构建时写入)
        // - platform: UpdateConfig.getPlatformName()
        if (this._builtinManifest) {
            this.updateRemoteURLPrefix();
        }

        const builtinVersion = this._builtinManifest ? Number(this._builtinManifest.v) : 0;

        // 对比 localStorage 中保存的版本号, 取最大的
        const savedManifest = await this.loadSavedRemoteManifest(builtinVersion);
        this._localManifest = savedManifest || this._builtinManifest;

        if (this._localManifest) {
            this.fillRemoteBundleInfos(this._builtinManifest);
            this.updateRemoteURLPrefix();
            Log.info(`[BundleManager] Manifest loaded, version: ${this._localManifest.v}, source: ${savedManifest ? "remote-cache" : "builtin"}`);
        } else {
            Log.warning("[BundleManager] No manifest found.");
        }
    }

    /**
     * 从 cc.settings 读取 server/channel/platform, 拼接并设置远程 URL 前缀
     */
    private updateRemoteURLPrefix(): void {
        const server = settings.querySettings<string>('assets', 'server') || "";
        const channel = settings.querySettings<string>('assets', '_channel') || "default";
        const platform = BundleManager.getPlatformName();
        this.setRemoteURLPrefix(`${server}/${channel}_${platform}`);
    }

    /**
     * 把本地清单中的需要远程加载的 bundle 写入 _remoteBundleInfos
     * - !builtin 的 bundle → 远程包, 注册
     * - builtin=true 但 hash 与内置 manifest 不一致 → 内置包被热更了, 注册远程信息
     * - builtin=true 且 hash 一致 → 用内置包, 不注册
     */
    private fillRemoteBundleInfos(builtinManifest: RawVersionManifest): void {
        if (!this._localManifest) return;
        this._remoteBundleInfos.clear();
        for (const name in this._localManifest.b) {
            const [hash, builtin] = this._localManifest.b[name];
            if (!builtin) {
                // 远程包: 始终注册
                this._remoteBundleInfos.set(name, hash);
            } else {
                // 内置包: hash 与内置 manifest 不一致时注册 (热更后 builtin 包 hash 变了)
                const builtinHash = builtinManifest?.b?.[name]?.[0];
                if (builtinHash && builtinHash !== hash) {
                    this._remoteBundleInfos.set(name, hash);
                }
            }
        }
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
    private getRemoteBundleUrl(name: string): string | null {
        const hash = this._remoteBundleInfos.get(name);
        if (hash == null) return null;
        return `${this._remoteURLPrefix}/${hash}`;
    }

    /** 检查指定 bundle 是否已加载到内存 */
    public hasBundle(name: string): boolean {
        return this._cacheBundle?.has(name) ?? false;
    }

    /**
     * 加载一个ab包
     * @param name ab包名
     * @param onProgress 下载进度回调 (可选, 仅远程包有效)
     * @returns ab包或null
     */
    public async loadBundle(name: string, onProgress?: (finished: number, total: number) => void): Promise<AssetManager.Bundle> {
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

        // 若该 bundle 在远程列表中, 自动用远程 URL; 否则用内置包名
        let url: string = null;
        if (this._remoteBundleInfos?.has(name)) {
            url = this.getRemoteBundleUrl(name);
        }

        // 发起加载，存入 pending map 以去重并发请求
        const promise = this.loadBundleInternal(name, url, onProgress);
        this._loadingBundles.set(name, promise);
        try {
            return await promise;
        } finally {
            this._loadingBundles.delete(name);
        }
    }

    private async loadBundleInternal(name: string, url: string, onProgress?: (finished: number, total: number) => void): Promise<AssetManager.Bundle> {
        let bundle: AssetManager.Bundle = null;
        try {
            bundle = await new Promise<AssetManager.Bundle>((resolve) => {
                const options: Record<string, any> = {};
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

    public static getPlatformName(): string {
        if (sys.platform === sys.Platform.ANDROID) return "android";
        if (sys.platform === sys.Platform.IOS) return "ios";
        if (sys.platform === sys.Platform.WIN32) return "pc";
        return "webgl";
    }
}


