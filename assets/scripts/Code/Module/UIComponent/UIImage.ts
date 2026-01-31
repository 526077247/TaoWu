import { math, Size, Sprite, SpriteFrame } from "cc";
import { Log } from "../../../Mono/Module/Log/Log";
import { IOnCreate } from "../UI/IOnCreate";
import { IOnDestroy } from "../UI/IOnDestroy";
import { UIBaseContainer } from "../UI/UIBaseContainer";
import * as string from "../../../Mono/Helper/StringHelper"
import { ImageLoaderManager } from "../Resource/ImageLoaderManager";

export class UIImage extends UIBaseContainer implements IOnDestroy, IOnCreate<string> {

    public getConstructor(){
        return UIImage;
    }

    private spritePath: string;
    private image: Sprite;
    private isSetSprite: boolean;
    private version: number = 0;
    private cacheUrl: string;
    private size: Size;

    public onCreate(path: string)
    {
        this.setSpritePath(path);
    }

    public onDestroy()
    {
        this.version = 0;
        if (!string.isNullOrEmpty(this.spritePath))
        {
            this.image.spriteFrame = null;
            ImageLoaderManager.instance?.releaseImage(this.spritePath);
            this.spritePath = null;
        }

        if (this.isSetSprite)
        {
            this.image.spriteFrame = null;
            this.isSetSprite = false;
        }
        
        if (!string.isNullOrEmpty(this.cacheUrl))
        {
            ImageLoaderManager.instance?.releaseOnlineImage(this.cacheUrl);
        }
    }

    private activatingComponent()
    {
        if (this.image == null)
        {
            this.image = this.getNode().getComponent<Sprite>(Sprite);
            if (this.image == null)
            {
                Log.error(`添加UI侧组件UIImage时，物体${this.getNode().name}上没有找到Sprite组件`);
            }
            this.size = this.getTransform().contentSize.clone();
        }
    }

    /**
     * 设置图片地址（注意尽量不要和SetOnlineSpritePath混用
     * @param spritePath 
     * @param setNativeSize 
     * @returns 
     */
    public async setSpritePath(spritePath: string, setNativeSize = false): Promise<void>
    {
        this.version++;
        const thisVersion = this.version;
        if (spritePath == this.spritePath && !this.isSetSprite)
        {
            if (this.image != null) this.image.enabled = true;
            return;
        }
        this.activatingComponent();
        this.image.enabled = false;
        var baseSpritePath = this.spritePath;

        if (string.isNullOrEmpty(spritePath))
        {
            this.image.spriteFrame = null;
            this.image.enabled = true;
            this.isSetSprite = false;
            this.spritePath = spritePath;
        }
        else
        {
            var sprite = await ImageLoaderManager.instance.loadSpriteAsync(spritePath);
            if (thisVersion != this.version)
            {
                ImageLoaderManager.instance.releaseImage(spritePath);
                return;
            }
            this.spritePath = spritePath;
            this.image.enabled = true;
            this.isSetSprite = false;
            this.image.spriteFrame = sprite;
            if(setNativeSize)
                this.setNativeSize();
            else
                this.getTransform().contentSize = this.getTransform().contentSize.set(this.size);
        }
        if(!string.isNullOrEmpty(baseSpritePath))
            ImageLoaderManager.instance.releaseImage(baseSpritePath);
       
    }

    public setNativeSize(){
        if(this.image == null || this.image.spriteFrame == null) return;
        if(!!this.size){
            this.image.sizeMode = 0;
            const sprite = this.image.spriteFrame;
            const flagY = sprite.rect.height / this.size.height;
            const flagX = sprite.rect.width / this.size.width;
            const size = this.getTransform().contentSize;
            if(flagY >= flagX){
                size.set(sprite.rect.width* this.size.height/sprite.rect.height ,this.size.height);
            }else{
                size.set(this.size.width ,sprite.rect.height* this.size.width/sprite.rect.width);
            }
            this.getTransform().contentSize = size;
        }
    }

    /**
     * 设置网络图片地址（注意尽量不要和SetSpritePath混用
     * @param spritePath 
     * @param setNativeSize 
     * @param defaultSpritePath 
     */
    public async setOnlineSpritePath(url: string, setNativeSize = false, defaultSpritePath: string = null)
    {
        this.activatingComponent();
        if (!string.isNullOrEmpty(defaultSpritePath))
        {
            await this.setSpritePath(defaultSpritePath, setNativeSize);
        }
        this.version++;
        const thisVersion = this.version;
        var sprite = await ImageLoaderManager.instance.getOnlineSprite(url);
        if (sprite != null)
        {
            if (thisVersion != this.version)
            {
                ImageLoaderManager.instance.releaseOnlineImage(url);
                return;
            }
            this.setSprite(sprite);
            if (!string.isNullOrEmpty(this.cacheUrl))
            {
                ImageLoaderManager.instance.releaseOnlineImage(this.cacheUrl);
                this.cacheUrl = null;
            }
            this.cacheUrl = url;
        }
    }

    public getSpritePath()
    {
        return this.spritePath;
    }

    public setColor(color: string|math.Color)
    {
        if(color instanceof math.Color){
            this.activatingComponent();
            this.image.color = color;
            return;
        }
        if(string.isNullOrEmpty(color)) return;
        this.activatingComponent();
        this.image.color.fromHEX(color);
    }

    public getColor(): math.Color
    {
        this.activatingComponent();
        return this.image.color;
    }

    public setImageAlpha(a: number, changeChild: boolean = false)
    {
        this.activatingComponent();
        this.image.color = new math.Color(this.image.color.r,this.image.color.g, this.image.color.b,a);
        if (changeChild)
        {
            var images = this.image.getComponentsInChildren<Sprite>(Sprite);
            for (let i = 0; i < images.length; i++)
            {
                images[i].color = new math.Color(images[i].color.r,images[i].color.g, images[i].color.b,a);
            }
        }
    }

    public setEnabled(flag: boolean)
    {
        this.activatingComponent();
        this.image.enabled = flag;
    }

    public setSprite(sprite: SpriteFrame)
    {
        this.activatingComponent();
        this.image.spriteFrame = sprite;
        this.isSetSprite = true;
    }
}