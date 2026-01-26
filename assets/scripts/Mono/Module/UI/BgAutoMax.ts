import { _decorator, Component, screen, Sprite, UITransform, Size} from 'cc';
import { Define } from '../../Define';
import { EDITOR } from 'cc/env';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

@ccclass('BgAutoMax')
@requireComponent(UITransform)
@executeInEditMode(true)
export class BgAutoMax extends Component {

    rectTransform: UITransform;

    onLoad() {
        this.rectTransform = this.getComponent(UITransform);
        this.size();
    }

    size(){
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

        this.rectTransform.contentSize = new Size(screenW * signFlag, screenH * signFlag);
    }
}