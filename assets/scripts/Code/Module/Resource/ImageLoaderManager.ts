import { Asset, assetManager, ImageAsset, native, RenderTexture, SpriteFrame, Texture2D } from "cc";
import { IManager } from "../../../Mono/Core/Manager/IManager";
import { LruCache } from "../../../Mono/Core/Object/LruCache";
import { CoroutineLock, CoroutineLockManager } from "../CoroutineLock/CoroutineLockManager";
import { CoroutineLockType } from "../CoroutineLock/CoroutineLockType";
import { ResourceManager } from "./ResourceManager";
import * as string from "../../../Mono/Helper/StringHelper"
import { Log } from "../../../Mono/Module/Log/Log";
import { ETTask } from "../../../ThirdParty/ETTask/ETTask";
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
        ImageLoaderManager._instance = null;
    }

    /**
     * 异步加载图片（image 和button已经封装 外部使用时候 谨慎使用）
     * @param imagePath 
     */
    public async loadSpriteAsync(imagePath: string): Promise<SpriteFrame>{
        let coroutineLock: CoroutineLock = null;
        try
        {
            coroutineLock = await CoroutineLockManager.instance.wait(CoroutineLockType.Resources, string.getHash(imagePath));
            const assetType = this.getSpriteLoadInfoByPath(imagePath);
            var sv = await this.loadSingleImageAsyncInternal(imagePath, assetType);
            return sv.asset;
        }
        catch (ex)
        {
            Log.error(ex);
        }
        finally
        {
            coroutineLock?.dispose();
        }
    }

    /**
     * 异步加载图片 （image 和button已经封装 外部使用时候 谨慎使用）
     * @param imagePath 
     * @returns 
     */
    public async loadTextureAsync(imagePath: string): Promise<Texture2D>
    {
        let coroutineLock: CoroutineLock = null;
        try
        {
            coroutineLock = await CoroutineLockManager.instance.wait(CoroutineLockType.Resources, string.getHash(imagePath));
            const assetType = this.getSpriteLoadInfoByPath(imagePath);
            var sv = await this.loadSingleImageAsyncInternal(imagePath, assetType);
            if(sv.texture == null){
                Log.error("不能加载图集中的图片");
            }
            return sv.texture;
        }
        catch (ex)
        {
            Log.error(ex);
        }
        finally
        {
            coroutineLock?.dispose();
        }
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

    private async loadSingleImageAsyncInternal(assetAddress: string, type: SpriteType): Promise<SpriteValue>
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
        const asset: SpriteFrame = await ResourceManager.instance.loadAsync<SpriteFrame>(SpriteFrame,assetAddress+"/spriteFrame");
        if (asset != null)
        {
            let value = cacheCls.get(assetAddress);
            if (!!value)
            {
                value.refCount++;
            }
            else
            {
                value = new SpriteValue();
                value.asset = asset;
                if(type == SpriteType.Sprite){
                    value.texture = asset.texture as Texture2D;
                }
                value.refCount = 1
                cacheCls.set(assetAddress, value);
                return value;
            }
        }
        else
        {
            Log.error("图片精灵不存在！请检查图片设置！\n" + assetAddress);
        }

        return null;
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
        let coroutineLock: CoroutineLock = null;
        try
        {
            coroutineLock = await CoroutineLockManager.instance.wait(CoroutineLockType.Resources, string.getHash(url));
            let data = this.cacheOnlineImage.get(url);
            if (!!data)
            {
                data.refCount++;
                return data.texture;
            }
            let texture = await HttpManager.instance.httpGetImageOnline(url, true);
            if (texture != null)
            {
                data = new SpriteValue();
                data.texture = texture;
                data.refCount = 1;
                this.cacheOnlineImage.set(url, data);
                return data.texture;
            }
            else
            {
                for (let i = 0; i < tryCount; i++)
                {
                    texture = await HttpManager.instance.httpGetImageOnline(url, false);
                    if (texture != null) break;
                }
                if (texture != null)
                {
                    data = new SpriteValue();
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
                    catch(ex)
                    {
                        Log.error(ex);
                    }
                    return data.texture;
                }
                else
                {
                    Log.error("网络无资源 " + url);
                }
            }
        }
        catch (ex)
        {
            Log.error(ex);
        }
        finally
        {
            coroutineLock?.dispose();
        }
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
                    temp[temp.length-1] = key;
                }
            }
            for (let index = 0; index < temp.length; index++) {
                const data = this.cacheOnlineImage[temp[index]];
                if (data.asset != null)
                {
                    data.asset.destroy();
                }
                var img = data.texture.image;
                data.texture.destroy();
                img?.destroy();
                this.cacheOnlineImage.delete(url);
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