import { Button, math, Size, Sprite } from "cc";
import { Log } from "../../../Mono/Module/Log/Log";
import { IOnDestroy } from "../UI/IOnDestroy";
import { UIBaseContainer } from "../UI/UIBaseContainer";
import * as string from "../../../Mono/Helper/StringHelper"
import { ImageLoaderManager } from "../Resource/ImageLoaderManager";
import { SoundManager } from "../Resource/SoundManager";

export class UIButton extends UIBaseContainer implements IOnDestroy {

    public getConstructor(){
        return UIButton;
    }
    private button: Button;
    private onClick: () => void;
    private spritePath: string;
    private image: Sprite;
    private version: number = 0;
    private playSound: boolean;
    private size: Size;

    public onDestroy(){
        this.version = 0;
        this.removeOnClick();
        if (!string.isNullOrEmpty(this.spritePath))
        {
            this.image.spriteFrame = null;
            ImageLoaderManager.instance?.releaseImage(this.spritePath);
            this.spritePath = null;
        }
    }

    private activatingComponent()
    {
        if (this.button == null)
        {
            this.button = this.getNode().getComponent<Button>(Button);
            if (this.button == null)
            {
                Log.error(`添加UI侧组件UIButton时，物体${this.getNode().name}上没有找到Button组件`);
            }
        }
    }

    private activatingImageComponent()
    {
        if (this.image == null)
        {
            this.image = this.getNode().getComponent<Sprite>(Sprite);
            if (this.image == null)
            {
                Log.error(`添加UI侧组件UIButton时，物体${this.getNode().name}上没有找到Sprite组件`);
            }
            this.size = this.getTransform().contentSize.clone();
        }
    }

    public setOnClick(callback: () => void, playSound = true)
    {
        this.activatingComponent();
        this.removeOnClick();
        this.onClick = callback;
        this.playSound = playSound;
        this.button!.node.on(Button.EventType.CLICK, this.onClickEvent, this);
    }

    public removeOnClick()
    {
        if (!!this.onClick)
        {
            this.button!.node.off(Button.EventType.CLICK, this.onClickEvent, this);
            this.onClick = null;
        }
    }

    private onClickEvent(button: Button){
        if(!!this.playSound) SoundManager.instance.playSound("audio/sound/commonclick");
        if(!!this.onClick){
            this.onClick()
        }
    }

    public setEnabled(flag: boolean)
    {
        this.activatingImageComponent();
        this.image.enabled = flag;
    }

    public setInteractable(flag: boolean)
    {
        this.activatingComponent();
        this.button.interactable = flag;
    }
    
    /**
     * 设置图片地址（注意尽量不要和SetOnlineSpritePath混用
     * @param spritePath 
     * @param setNativeSize 
     * @returns 
     */
    public async setSpritePath(spritePath: string, setNativeSize: boolean = false): Promise<void>
    {
        this.version++;
        const thisVersion = this.version;
        if (spritePath == this.spritePath)
        {
            if (this.image != null) this.image.enabled = true;
            return;
        }

        this.activatingImageComponent();
        // if (this.bgAutoFit != null) this.bgAutoFit.enabled = false;
        this.image.enabled = false;
        var baseSpritePath = this.spritePath;

        if (string.isNullOrEmpty(spritePath))
        {
            this.image.spriteFrame = null;
            this.image.enabled = true;
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

    public getSpritePath()
    {
        return this.spritePath;
    }

    public setColor(color: string|math.Color)
    {
        if(color instanceof math.Color){
            this.activatingImageComponent();
            this.image.color = color;
            return;
        }
        if(string.isNullOrEmpty(color)) return;
        this.activatingImageComponent();
        this.image.color.fromHEX(color)
    }

    public getColor(): math.Color
    {
        this.activatingImageComponent();
        return this.image.color;
    }

    public setImageAlpha(a: number, changeChild: boolean = false)
    {
        this.activatingImageComponent();
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
}