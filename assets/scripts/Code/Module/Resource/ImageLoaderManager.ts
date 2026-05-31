import { native, SpriteFrame, Texture2D } from "cc";
import { IManager } from "../../../Mono/Core/Manager/IManager";
import { LruCache } from "../../../Mono/Core/Object/LruCache";
import { ResourceManager } from "./ResourceManager";
import * as string from "../../../Mono/Helper/StringHelper"
import { Log } from "../../../Mono/Module/Log/Log";
import { HttpManager } from "../../../Mono/Module/Http/HttpManager";
class SpriteValue
{
    public asset: SpriteFrame;
    public texture: Texture2D;
    public refCount: number;
}

enum SpriteType
{
    Sprite = 0,
    SpriteAtlas = 1
}
const ATLAS_KEY: string = "/atlas/";

/**
 * 图片加载系统，仅支持加载Sprite类型的图片或网络图片
 * Texture类型的通过ResourcesManager自己加载管理
 */
export class ImageLoaderManager implements IManager{
    private static _instance: ImageLoaderManager;

    public static get instance(): ImageLoaderManager{
        return ImageLoaderManager._instance;
    }

    private cacheSingleSprite: LruCache<string, SpriteValue>;
    private cacheOnlineImage: Map<string, SpriteValue> ;
    private pendingLoads: Map<string, Promise<SpriteValue>> = new Map();
    private isDestroyed = false;

    public init(){
        ImageLoaderManager._instance = this;
        this.cacheSingleSprite = new LruCache<string, SpriteValue>();
        this.cacheSingleSprite.setCheckCanPopCallback(( key: string,  value: SpriteValue) => { return value.refCount == 0; });
        this.cacheSingleSprite.setPopCallback((key, value) =>
        {
            ResourceManager.instance.releaseAsset(value.asset);
            value.asset = null;
            value.texture = null;
            value.refCount = 0;
        });
        this.cacheOnlineImage = new Map<string, SpriteValue>();
    }

    public destroy() {
        this.isDestroyed = true;
        this.clear(); // 清空缓存，释放资源
        this.pendingLoads.clear();
        this.cacheSingleSprite = null;
        this.cacheOnlineImage = null;
        this.pendingLoads = null;
        ImageLoaderManager._instance = null;
    }

    /**
     * 同步加载已缓存的图片（image 和button已经封装 外部使用时候 谨慎使用）
     * @param imagePath 
     */
    public loadSpriteSync(imagePath: string): SpriteFrame{
        return this.loadSingleImageSyncInternal(imagePath)?.asset;
    }

    /**
     * 异步加载图片（image 和button已经封装 外部使用时候 谨慎使用）
     * @param imagePath 
     */
    public async loadSpriteAsync(imagePath: string): Promise<SpriteFrame>{
        const res = this.loadSpriteSync(imagePath);
        if(res != null) return res;
        const assetType = this.getSpriteLoadInfoByPath(imagePath);
        const sv = await this.loadSingleImageAsyncInternal(imagePath, assetType);
        return sv?.asset;
    }

    /**
     * 异步加载图片 （image 和button已经封装 外部使用时候 谨慎使用）
     * @param imagePath 
     * @returns 
     */
    public async loadTextureAsync(imagePath: string): Promise<Texture2D>
    {
        const assetType = this.getSpriteLoadInfoByPath(imagePath);
        const sv = await this.loadSingleImageAsyncInternal(imagePath, assetType);
        if(sv?.texture == null){
            Log.error("不能加载图集中的图片");
        }
        return sv?.texture;
    }

    /**
     * 释放图片
     * @param imagePath 
     * @returns 
     */
    public releaseImage(imagePath: string)
    {
        if (string.isNullOrEmpty(imagePath)) return;
        const value = this.cacheSingleSprite.onlyGet(imagePath);
        if (!!value && value.refCount > 0)
        {
            value.refCount--;
        }
    }

    public cleanup()
    {
        Log.info("ImageLoaderManager Cleanup");
        this.cacheSingleSprite.cleanUp();
    }

    public clear()
    {
        for (const [key,value] of this.cacheSingleSprite) {
            ResourceManager.instance?.releaseAsset(value.asset);
            value.asset = null;
            value.texture = null;
            value.refCount = 0;
        }
        
        this.cacheSingleSprite.clear();
        Log.info("ImageLoaderManager Clear");
    }

    private loadSingleImageSyncInternal(assetAddress: string): SpriteValue
    {
        const cacheCls = this.cacheSingleSprite;
        const valueC = cacheCls.get(assetAddress);
        if (!!valueC)
        {
            if (valueC.asset == null)
            {
                cacheCls.remove(assetAddress);
            }
            else
            {
                valueC.refCount = valueC.refCount + 1;
                return valueC;
            }
        }
        return null;
    }
    private async loadSingleImageAsyncInternal(assetAddress: string, type: SpriteType): Promise<SpriteValue>
    {
        const cached = this.loadSingleImageSyncInternal(assetAddress);
        if (cached) return cached;

        const pending = this.pendingLoads.get(assetAddress);
        if (pending) {
            const result = await pending;
            if (result) {
                result.refCount++;
            }
            return result;
        }

        const loadTask = this.doLoadSingleImage(assetAddress, type);
        this.pendingLoads.set(assetAddress, loadTask);
        
        try {
            const result = await loadTask;
            return result;
        } catch(ex: any) {
            Log.error(ex)
        } finally {
            this.pendingLoads.delete(assetAddress);
        }
    }

    private async doLoadSingleImage(assetAddress: string, type: SpriteType): Promise<SpriteValue> {
        const asset = await ResourceManager.instance.loadAsync<SpriteFrame>(SpriteFrame, assetAddress + "/spriteFrame");
        if (this.isDestroyed) return null;
        if (asset == null) {
            Log.error("图片精灵不存在！请检查图片设置！\n" + assetAddress);
            return null;
        }

        let value = this.cacheSingleSprite.get(assetAddress);
        if (value) {
            value.refCount++;
        } else {
            value = new SpriteValue();
            value.asset = asset;
            if (type === SpriteType.Sprite) {
                value.texture = asset.texture as Texture2D;
            }
            value.refCount = 1;
            this.cacheSingleSprite.set(assetAddress, value);
        }
        return value;
    }


    private getSpriteLoadInfoByPath(imagePath: string): SpriteType
    {
        var index = imagePath.indexOf(ATLAS_KEY);
        return index < 0?SpriteType.Sprite:  SpriteType.SpriteAtlas;
    }

    public async getOnlineSprite(url: string, tryCount: number = 3): Promise<SpriteFrame>
    {
        await this.getOnlineTexture(url, tryCount);
        const data = this.cacheOnlineImage.get(url);
        if (!!data)
        {
            if (data.asset == null)
            {
                data.asset = new SpriteFrame();
                data.asset.texture = data.texture;
            }
            return data.asset;
        }
        return null;
    }

    public async getOnlineTexture(url: string, tryCount: number = 3): Promise<Texture2D>
    {
        if (string.isNullOrWhiteSpace(url)) return null;

        // 同步缓存命中
        let data = this.cacheOnlineImage.get(url);
        if (data) {
            data.refCount++;
            return data.texture;
        }

        // 检查 pending
        const pending = this.pendingLoads.get(url);
        if (pending) {
            const result = await pending;
            if (result) {
                result.refCount++;
            }
            return result?.texture;
        }

        // 创建加载任务
        const loadTask = this.doLoadOnlineTexture(url, tryCount);
        this.pendingLoads.set(url, loadTask);
        try {
            const result = await loadTask;
            return result?.texture;
        } catch(ex: any) {
            Log.error(ex)
        } finally {
            this.pendingLoads.delete(url);
        }
    }

    private async doLoadOnlineTexture(url: string, tryCount: number): Promise<SpriteValue> {
        let texture = await HttpManager.instance.httpGetImageOnline(url, true);
        if (this.isDestroyed) return null;
        if (!texture) {
            for (let i = 0; i < tryCount; i++) {
                texture = await HttpManager.instance.httpGetImageOnline(url, false);
                if (texture) break;
            }
        }
        if (!texture) {
            Log.error("网络无资源 " + url);
            return null;
        }

        const data = new SpriteValue();
        data.texture = texture;
        data.refCount = 1;
        this.cacheOnlineImage.set(url, data);

        try
        {
            const pixelData = this.convertToUint8Array(texture.image.data);
            if(!!pixelData){
                native.saveImageData(pixelData, texture.width, texture.height, HttpManager.instance.localFile(url)).then(()=>{
                    Log.info("Save image data success");
                }).catch(()=>{
                    Log.info("Fail to save image data");
                });
            }
        }
        catch(ex: any)
        {
            Log.error(ex);
        }
        return data;
    }


    public releaseOnlineImage(url: string, clear: boolean = true)
    {
        const data = this.cacheOnlineImage.get(url);
        data.refCount--;
        if (clear && data.refCount <= 0)
        {
            if (data.asset != null)
            {
                data.asset.destroy();
            }
            var img = data.texture.image;
            data.texture.destroy();
            img?.destroy();
            this.cacheOnlineImage.delete(url);
        }

        if (this.cacheOnlineImage.size > 10)
        {
            const temp = [];
            for (const [key,val] of this.cacheOnlineImage) 
            {
                if (val.refCount == 0)
                {
                    temp.push(key);
                }
            }
            for (let index = 0; index < temp.length; index++) {
                const data = this.cacheOnlineImage.get(temp[index]);
                if (data?.asset != null)
                {
                    data?.asset.destroy();
                }
                var img = data.texture.image;
                data.texture.destroy();
                img?.destroy();
                this.cacheOnlineImage.delete(temp[index]);
            }
        }
    }

    private convertToUint8Array(data: any): Uint8Array {
        if (data instanceof ArrayBuffer) {
            return new Uint8Array(data);
        }
        
        if (ArrayBuffer.isView(data)) {
            return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        }
        
        if (data instanceof Uint8Array) {
            return data;
        }
        
        Log.error('无法识别的图片数据类型:', typeof data);
        return new Uint8Array(0);
    }
}