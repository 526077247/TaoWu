import { _decorator, Asset, __private, AssetManager, SceneAsset } from 'cc';
import { BundleManager } from "../../../Mono/Module/Resource/BundleManager"
import { IManager } from '../../../Mono/Core/Manager/IManager';
import { ETTask } from '../../../Mono/Core/ETTask/ETTask';
import * as string from '../../../Mono/Helper/StringHelper'
import { Log } from '../../../Mono/Module/Log/Log';
/**
* 资源管理系统：提供资源加载管理<br/>
*
* 注意：<br/>
* - 1、只提供异步接口，即使内部使用的是同步操作，对外来说只有异步<br/>
* - 2、对于串行执行一连串的异步操作，建议使用协程（用同步形式的代码写异步逻辑），回调方式会使代码难读<br/>
* - 3、理论上做到逻辑层脚本对AB名字是完全透明的，所有资源只有packagePath的概念，这里对路径进行处理<br/>
*/
export class ResourceManager implements IManager {
    private static _instance: ResourceManager;

    public static get instance(): ResourceManager{
        return ResourceManager._instance;
    }

    private assetMap: Map<Asset, AssetManager.Bundle>;

    private loadingOpCount: number;
    private currentSceneAssets: SceneAsset;

    public init(): void {
        ResourceManager._instance = this;
        this.assetMap = new Map<Asset, AssetManager.Bundle>;
    }

    public destroy(): void {
        this.clearAssetsCache();
        this.assetMap = null;
        ResourceManager._instance = null;
    }

    public isProcessRunning(): boolean {
        return this.loadingOpCount > 0;
    }

    public getBundleAndAssetName(packagePath: string): [bundle:string,asset:string] {
        var vs = packagePath.split('/');
        if (vs.length <= 2) {
           return [packagePath.length == 2?packagePath[0]:"" ,packagePath[packagePath.length-1]];
        }
        
        let res = ""
        for (let index = 2; index < vs.length; index++) {
            const element = vs[index];
            if(index!=2){
                res += '/';
            }
            res += element;
        }
        return [vs[0] + "_"+ vs[1], res]
    }


    public async loadBundleByAssetPath(bundleName: string): Promise<AssetManager.Bundle> {
        return await BundleManager.instance.loadBundle(bundleName);
    }

    public async loadAsync<T extends Asset>(type: __private.__types_globals__Constructor<T> | null, path: string): Promise<T> {
        this.loadingOpCount++;
        const [bundleNmae,assetName] = this.getBundleAndAssetName(path);
        const bundle = await this.loadBundleByAssetPath(bundleNmae);
        if(bundle == null) {
            this.loadingOpCount--;
            return null;
        }
        return await new Promise<T>((resolve) => {
            bundle.load<T>(assetName, type,(err,data)=> {
                this.loadingOpCount--;
                if (err) {
                    console.error(err);
                    resolve(null);
                    BundleManager.instance.releaseBundle(bundle);
                    return null;
                }
                if(!this.assetMap){
                    resolve(null);
                    BundleManager.instance.releaseBundle(bundle);
                    data.addRef();
                    data.decRef();
                    return null;
                }
                this.assetMap.set(data, bundle);
                data.addRef();
                resolve(data);
            });
        });
    }

    public releaseAsset(pooledGo: Asset){
        if (this.assetMap.has(pooledGo)){
            var bundle = this.assetMap.get(pooledGo);
            BundleManager.instance.releaseBundle(bundle);
            pooledGo.decRef();
            this.assetMap.delete(pooledGo);
        }
    }

    public clearAssetsCache(){
        for (const [asset,bundle] of this.assetMap) {
            BundleManager.instance.releaseBundle(bundle);
            asset.decRef();
        }
        this.assetMap.clear();
    }

    /**
     * 加载场景
     * @param path 
     * @param isAdditive 
     * @returns 
     */
    public async loadSceneAsync(path: string) : Promise<SceneAsset>
    {
        this.loadingOpCount++;
        const [bundleNmae,assetName] = this.getBundleAndAssetName(path);
        const bundle = await this.loadBundleByAssetPath(bundleNmae);
        if(bundle == null) {
            this.loadingOpCount--;
            return null;
        }
        return await new Promise<SceneAsset>((resolve) => {
            bundle.loadScene(assetName, (err,data)=> {
                this.loadingOpCount--;
                if (err) {
                    console.error(err);
                    resolve(null);
                    BundleManager.instance.releaseBundle(bundle);
                    return null;
                }
                if(!this.assetMap){
                    resolve(null);
                    BundleManager.instance.releaseBundle(bundle);
                    data.addRef();
                    data.decRef();
                    return null;
                }
                this.assetMap.set(data, bundle);
                data.addRef();
                resolve(data);
            });
        });
    }
}


