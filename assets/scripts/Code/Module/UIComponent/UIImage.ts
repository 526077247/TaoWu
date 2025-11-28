import { math, Sprite, SpriteFrame } from "cc";
import { Log } from "../../../Mono/Module/Log/Log";
import { IOnCreate } from "../UI/IOnCreate";
import { IOnDestroy } from "../UI/IOnDestroy";
import { UIBaseContainer } from "../UI/UIBaseContainer";
import * as string from "../../../Mono/Helper/StringHelper"
import { ImageLoaderManager } from "../Resource/ImageLoaderManager";

export class UIImage extends UIBaseContainer implements IOnDestroy, IOnCreate<string> {

    protected getConstructor(){
        return UIImage;
    }

    private spritePath: string;
    private image: Sprite;
    private isSetSprite: boolean;
    private version: number = 0;
    private cacheUrl: string;

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
        }
    }

    /**
     * 设置图片地址（注意尽量不要和SetOnlineSpritePath混用
     * @param spritePath 
     * @param sizeMode 
     * @returns 
     */
    public async setSpritePath(spritePath: string, sizeMode = Sprite.SizeMode.CUSTOM): Promise<void>
    {
        this.version++;
        const thisVersion = this.version;
        if (spritePath == this.spritePath && !this.isSetSprite)
        {
            if (this.image != null) this.image.enabled = true;
            return;
        }
        this.activatingComponent();
        // if (this.bgAutoFit != null) this.bgAutoFit.enabled = false;
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
            this.image.spriteFrame = sprite;
            this.isSetSprite = false;
            this,this.image.sizeMode = sizeMode;
            // if (this.bgAutoFit != null)
            // {
            //     this.bgAutoFit.SetSprite(sprite);
            //     this.bgAutoFit.enabled = true;
            // }
        }
        if(!string.isNullOrEmpty(baseSpritePath))
            ImageLoaderManager.instance.releaseImage(baseSpritePath);
       
    }

    /**
     * 设置网络图片地址（注意尽量不要和SetSpritePath混用
     * @param spritePath 
     * @param sizeMode 
     * @param defaultSpritePath 
     */
    public async setOnlineSpritePath(url: string, sizeMode = Sprite.SizeMode.CUSTOM, defaultSpritePath: string = null)
    {
        this.activatingComponent();
        if (!string.isNullOrEmpty(defaultSpritePath))
        {
            await this.setSpritePath(defaultSpritePath, sizeMode);
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