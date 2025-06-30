import { _decorator, assetManager, AssetManager } from 'cc';
import { IManager } from '../../Core/Manager/IManager';

export class BundleManager implements IManager {
    private static _instance: BundleManager;

    public static get instance(): BundleManager{
        return BundleManager._instance;
    }

    private _cacheBundle: Map<string, AssetManager.Bundle>;
    private _cacheBundleRefCount: Map<AssetManager.Bundle, number>;
    public init() {
        BundleManager._instance = this;
        this._cacheBundle = new Map<string, AssetManager.Bundle>();
        this._cacheBundleRefCount = new Map<AssetManager.Bundle, number>();
    }

    public destroy() {
        this.cleanUp();
        this._cacheBundleRefCount = null;
        this._cacheBundle = null;
        BundleManager._instance = null;
    }

    /**
     * 加载一个ab包
     * @param name ab包名
     * @param url 远端地址
     * @returns ab包或null
     */
    public async loadBundle(name: string, url: string = null): Promise<AssetManager.Bundle> {
        if(this._cacheBundle.has(name)) {
            const bundle = this._cacheBundle.get(name);
            let count = this._cacheBundleRefCount.get(bundle);
            this._cacheBundleRefCount.set(bundle, count + 1);
            return bundle;
        }

        return await new Promise<AssetManager.Bundle>((resolve) => {
            assetManager.loadBundle(url || name, (err, bundle) => {
                if (err) {
                    console.error(err);
                    resolve(null)
                    return
                }
                this._cacheBundle[name] = bundle;
                this._cacheBundleRefCount.set(bundle, 1);
                resolve(bundle);
            });
        });
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
            this._cacheBundleRefCount.set(bundle, count);
            if(count <= 0 && clear){
                this._cacheBundle.delete(bundle.name);
                bundle.releaseAll();
                assetManager.removeBundle(bundle);
                this._cacheBundleRefCount.delete(bundle);
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


