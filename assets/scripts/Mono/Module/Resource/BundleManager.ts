import { _decorator, assetManager, AssetManager, sys } from 'cc';
import { IManager } from '../../Core/Manager/IManager';
import { ObjectPool } from '../../Core/ObjectPool';
import { CoroutineLock, CoroutineLockManager } from '../../../Code/Module/CoroutineLock/CoroutineLockManager';
import { CoroutineLockType } from '../../../Code/Module/CoroutineLock/CoroutineLockType';
import * as string from '../../Helper/StringHelper'
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
    /** 远程 bundle 信息 (name → hash) */
    private _remoteBundleInfos: Map<string, string>;
    /** 远程 URL 前缀: {server}/{channel}_{platform}/ (由 ServerConfigManager init 后写入) */
    private _remoteURLPrefix: string = "";
    /** 包内版本清单 */
    private _localManifest: LocalManifest = null;

    public init() {
        BundleManager._instance = this;
        this._cacheBundle = new Map<string, AssetManager.Bundle>();
        this._cacheBundleRefCount = new Map<AssetManager.Bundle, number>();
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
     * 异步加载包内 version.manifest.json
     * 在 Entry 初始化阶段调用, 作为热更新对比基线
     */
    public async loadLocalManifest(): Promise<void> {
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

                    // 非内置 bundle (远程包) 只存 hash, URL 在 getRemoteBundleInfo 时拼接
                    if (!builtin) {
                        this._remoteBundleInfos.set(name, hash);
                    }
                }
                this._localManifest = { version: raw.v, channel, platform, server, bundles };
                Log.info(`[BundleManager] Local manifest loaded, version: ${this._localManifest.version}, channel: ${channel}, platform: ${platform}, server: ${server}`);
            } catch (e: any) {
                Log.error(`[BundleManager] Failed to parse local manifest: ${e?.message}`);
            }
        } else {
            Log.warning("[BundleManager] No local manifest found.");
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

    /**
     * 加载一个ab包
     * @param name ab包名
     * @param url 远端地址 (可选，提供则从远程加载)
     * @param version 版本hash (可选，用于缓存管理)
     * @param onProgress 下载进度回调 (可选)
     * @returns ab包或null
     */
    public async loadBundle(name: string, url: string = null, version: string = null, onProgress?: (finished: number, total: number) => void): Promise<AssetManager.Bundle> {
        let coroutineLock: CoroutineLock = null;
        let bundle: AssetManager.Bundle = null;
        try
        {
            coroutineLock = await CoroutineLockManager.instance.wait(CoroutineLockType.Bundle, string.getHash(name));

            if(this._cacheBundle.has(name)) {
                bundle = this._cacheBundle.get(name);
                let count = this._cacheBundleRefCount.get(bundle);
                this._cacheBundleRefCount.set(bundle, count + 1);
                return bundle;
            }

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
        catch (ex: any)
        {
            Log.error(ex);
            return null;
        }
        finally
        {
            coroutineLock?.dispose();
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


