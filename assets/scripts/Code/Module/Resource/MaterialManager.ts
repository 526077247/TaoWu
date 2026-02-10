import { Material } from "cc";
import { IManager } from "../../../Mono/Core/Manager/IManager";
import { ResourceManager } from "./ResourceManager";
import { CoroutineLock, CoroutineLockManager } from "../CoroutineLock/CoroutineLockManager";
import { CoroutineLockType } from "../CoroutineLock/CoroutineLockType";
import * as string from "../../../Mono/Helper/StringHelper"

export class MaterialManager implements IManager{
    private static _instance: MaterialManager;

    public static get instance(): MaterialManager{
        return MaterialManager._instance;
    }

    private _cacheMaterial: Map<string, Material>;

    public init(): void {
        MaterialManager._instance = this;
        this._cacheMaterial = new Map<string, Material>;
    }

    public destroy(): void {
        for (var item of this._cacheMaterial)
        {
            ResourceManager.instance.releaseAsset(item[1]);
        }
        this._cacheMaterial.clear();
        MaterialManager._instance = null;
    }

    public getFromCache(address: string){
        const res = this._cacheMaterial.get(address);
        return res;
    }

    public async preLoadMaterial(address: string){
        let res = null;
        let coroutineLock: CoroutineLock = null;
        try{
            coroutineLock = await CoroutineLockManager.instance.wait(CoroutineLockType.Resources, string.getHash(address));
            res = this._cacheMaterial.get(address);
            if(res == null){
                res = await ResourceManager.instance.loadAsync(Material, address);
                if(res != null){
                    this._cacheMaterial.set(address, res);
                }
            }
        } finally{
            coroutineLock?.dispose();
        }
    }

    public async loadMaterialAsync(address: string){
        let res = null;
        let coroutineLock: CoroutineLock = null;
        try{
            coroutineLock = await CoroutineLockManager.instance.wait(CoroutineLockType.Resources, string.getHash(address));
            res = this._cacheMaterial.get(address);
            if(res == null){
                res = await ResourceManager.instance.loadAsync(Material, address);
                if(res != null){
                    this._cacheMaterial.set(address, res);
                }
            }
        } finally{
            coroutineLock?.dispose();
        }
        return res;
    }
}