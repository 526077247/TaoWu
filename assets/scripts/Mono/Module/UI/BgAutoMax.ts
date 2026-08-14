import { _decorator, Component, UITransform, Size, Vec2} from 'cc';
import { Define } from '../../Define';
import { EDITOR } from 'cc/env';
import { SystemInfoHelper } from '../../Helper/SystemInfoHelper';
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

@ccclass('BgAutoMax')
@requireComponent(UITransform)
@executeInEditMode(true)
export class BgAutoMax extends Component {

    rectTransform: UITransform;
    private _baseX: number = 0;
    private _baseY: number = 0;

    @property(Vec2)
    paddingMin: Vec2 = new Vec2(); // x=左边界最大扣除, y=下边界最大扣除
    @property(Vec2)
    paddingMax: Vec2 = new Vec2(); // x=右边界最大扣除, y=上边界最大扣除
    onLoad() {
        this.rectTransform = this.getComponent(UITransform);
        this._baseX = this.node.position.x;
        this._baseY = this.node.position.y;
        this.size();
    }

    size(){
        //屏幕缩放比
        var screenH = SystemInfoHelper.screenHeight;
        var screenW = SystemInfoHelper.screenWidth;
        if(EDITOR){
            screenH = Define.DesignScreenHeight;
            screenW = Define.DesignScreenWidth;
        }
        var flagx = Define.DesignScreenWidth / Define.DesignScreenHeight;
        var flagy = screenW / screenH;
        var signFlag = flagx > flagy
            ? Define.DesignScreenWidth / screenW
            : Define.DesignScreenHeight / screenH;

        var width = screenW * signFlag;
        var height = screenH * signFlag;

        var designRatio = Define.DesignScreenWidth / Define.DesignScreenHeight;
        var screenRatio = width / height;

        var offsetX = 0;
        var offsetY = 0;

        if (screenRatio > designRatio) {
            // 宽度比例偏高，按paddingMin.x(左):paddingMax.x(右)比例扣除
            var excessW = width - Define.DesignScreenWidth;
            if (excessW > 0) {
                var leftCut = this.paddingMin.x > 0 ? Math.min(excessW * this.paddingMin.x / (this.paddingMin.x + this.paddingMax.x), this.paddingMin.x) : 0;
                var rightCut = this.paddingMax.x > 0 ? Math.min(excessW - leftCut, this.paddingMax.x) : 0;
                width -= leftCut + rightCut;
                offsetX = (rightCut - leftCut) / 2;
            }
        } else if (screenRatio < designRatio) {
            // 高度比例偏高，按paddingMin.y(下):paddingMax.y(上)比例扣除
            var excessH = height - Define.DesignScreenHeight;
            if (excessH > 0) {
                var topCut = this.paddingMin.y > 0 ? Math.min(excessH * this.paddingMin.y / (this.paddingMin.y + this.paddingMax.y), this.paddingMin.y) : 0;
                var bottomCut = this.paddingMax.y > 0 ? Math.min(excessH - topCut, this.paddingMax.y) : 0;
                height -= topCut + bottomCut;
                offsetY = (topCut - bottomCut) / 2;
            }
        }

        this.rectTransform.contentSize = new Size(width, height);
        this.node.setPosition(this._baseX + offsetX, this._baseY + offsetY, this.node.position.z);
    }
}