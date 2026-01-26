import { _decorator, Component, screen, Sprite, SpriteFrame, Vec2, UITransform, Size} from 'cc';
import { Define } from '../../Define';
import { EDITOR } from 'cc/env';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

@ccclass('BgAutoFit')
@requireComponent(Sprite)
@requireComponent(UITransform)
@executeInEditMode(true)
export class BgAutoFit extends Component {

    rectTransform: UITransform;
    bg: Sprite;

    @property({type: SpriteFrame})
    public bgSprite: SpriteFrame

    onLoad() {
        this.bg = this.getComponent(Sprite);
        this.rectTransform = this.getComponent(UITransform);
        this.bg.spriteFrame
        if (this.bgSprite == null)
            this.bgSprite = this.bg.spriteFrame;
        else
            this.bg.spriteFrame = this.bgSprite;
        this.size();
    }

    size(){
        if (this.bgSprite == null) return;
        //屏幕缩放比
        var screenH = screen.windowSize.height;
        var screenW = screen.windowSize.width;
        if(EDITOR && !cc.GAME_VIEW){
            screenH = Define.DesignScreenHeight;
            screenW = Define.DesignScreenWidth;
        }
        var flagx = Define.DesignScreenWidth / Define.DesignScreenHeight;
        var flagy = screenW / screenH;
        var signFlag = flagx > flagy
            ? Define.DesignScreenWidth / screenW
            : Define.DesignScreenHeight / screenH;
        //图片缩放比
        var texture = this.bgSprite;
        var flag1 = screenW / texture.width;
        var flag2 = screenH / texture.height;
        if (flag1 < flag2){
            this.rectTransform.contentSize = new Size(flag2 * texture.width * signFlag, screenH * signFlag);
        } else {
            this.rectTransform.contentSize = new Size(screenW * signFlag, flag1 * texture.height * signFlag);
        }
    }

    public setSprite(newBgSprite: SpriteFrame)
    {
        this.bgSprite = newBgSprite;
        if (this.bgSprite == null)
            this.bgSprite = this.bg.spriteFrame;
        else
            this.bg.spriteFrame = this.bgSprite;
        this.size();
    }
}