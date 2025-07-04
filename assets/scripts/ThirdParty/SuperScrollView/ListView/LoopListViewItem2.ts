import { _decorator, Component, UITransform, Prefab, Node, Vec3} from 'cc';
import { ListItemArrangeType } from '../Common/CommonDefine';
import { LoopListView2 } from './LoopListView2';
const { ccclass, property } = _decorator;

@ccclass('LoopListViewItem2')
export class LoopListViewItem2 extends Component {

    // 成员变量
    private mItemIndex: number = -1;
    private mItemId: number = -1;
    private mParentListView: LoopListView2 = null;
    private mIsInitHandlerCalled: boolean = false;
    private mItemPrefabName: string = "";

    private mPadding: number = 0;
    private mDistanceWithViewPortSnapCenter: number = 0;
    private mItemCreatedCheckFrameCount: number = 0;
    private mStartPosOffset: number = 0;

    private mUITransform: UITransform;
    
    // 用户自定义数据
    private mUserObjectData: any = null;
    private mUserIntData1: number = 0;
    private mUserIntData2: number = 0;
    private mUserStringData1: string | null = null;
    private mUserStringData2: string | null = null;

    // 公共属性访问器
    get userObjectData(): any { return this.mUserObjectData; }
    set userObjectData(value: any) { this.mUserObjectData = value; }

    get userIntData1(): number { return this.mUserIntData1; }
    set userIntData1(value: number) { this.mUserIntData1 = value; }

    get userIntData2(): number { return this.mUserIntData2; }
    set userIntData2(value: number) { this.mUserIntData2 = value; }

    get userStringData1(): string | null { return this.mUserStringData1; }
    set userStringData1(value: string | null) { this.mUserStringData1 = value; }

    get userStringData2(): string | null { return this.mUserStringData2; }
    set userStringData2(value: string | null) { this.mUserStringData2 = value; }

    get distanceWithViewPortSnapCenter(): number { return this.mDistanceWithViewPortSnapCenter; }
    set distanceWithViewPortSnapCenter(value: number) { this.mDistanceWithViewPortSnapCenter = value; }

    get startPosOffset(): number { return this.mStartPosOffset; }
    set startPosOffset(value: number) { this.mStartPosOffset = value; }

    get itemCreatedCheckFrameCount(): number { return this.mItemCreatedCheckFrameCount; }
    set itemCreatedCheckFrameCount(value: number) { this.mItemCreatedCheckFrameCount = value; }

    get padding(): number { return this.mPadding; }
    set padding(value: number) { this.mPadding = value; }


    get itemPrefabName(): string { return this.mItemPrefabName; }
    set itemPrefabName(value: string) { this.mItemPrefabName = value; }

    get itemIndex(): number { return this.mItemIndex; }
    set itemIndex(value: number) { this.mItemIndex = value; }

    get itemId(): number { return this.mItemId; }
    set itemId(value: number) { this.mItemId = value; }

    get isInitHandlerCalled(): boolean { return this.mIsInitHandlerCalled; }
    set isInitHandlerCalled(value: boolean) { this.mIsInitHandlerCalled = value; }

    get parentListView(): LoopListView2 { return this.mParentListView; }
    set parentListView(value: LoopListView2) { this.mParentListView = value; }

    // 获取节点尺寸信息
    public get uiTransform(): UITransform {
        if(!this.mUITransform)
            this.mUITransform = this.node.getComponent(UITransform)!;
        return this.mUITransform;
    }

    // 位置计算属性
    get topY(): number {
        if (!this.parentListView) return 0;
        const pos = this.node.position;
        
        if (this.parentListView.arrangeType === ListItemArrangeType.TopToBottom) {
            return pos.y - this.uiTransform.height * this.uiTransform.anchorY;
        } else if (this.parentListView.arrangeType === ListItemArrangeType.BottomToTop) {
            return pos.y + this.uiTransform.height * (1 - this.uiTransform.anchorY);
        }
        return 0;
    }

    get bottomY(): number {
        if (!this.parentListView) return 0;
        const pos = this.node.position;
        
        if (this.parentListView.arrangeType === ListItemArrangeType.TopToBottom) {
            return pos.y - this.uiTransform.height * (1 - this.uiTransform.anchorY);
        } else if (this.parentListView.arrangeType === ListItemArrangeType.BottomToTop) {
            return pos.y + this.uiTransform.height * this.uiTransform.anchorY;
        }
        return 0;
    }

    get leftX(): number {
        if (!this.parentListView) return 0;
        const pos = this.node.position;
        
        if (this.parentListView.arrangeType === ListItemArrangeType.LeftToRight) {
            return pos.x - this.uiTransform.width * this.uiTransform.anchorX;
        } else if (this.parentListView.arrangeType === ListItemArrangeType.RightToLeft) {
            return pos.x + this.uiTransform.width * (1 - this.uiTransform.anchorX);
        }
        return 0;
    }

    get rightX(): number {
        if (!this.parentListView) return 0;
        const pos = this.node.position;
        
        if (this.parentListView.arrangeType === ListItemArrangeType.LeftToRight) {
            return pos.x + this.uiTransform.width * (1 - this.uiTransform.anchorX);
        } else if (this.parentListView.arrangeType === ListItemArrangeType.RightToLeft) {
            return pos.x - this.uiTransform.width * this.uiTransform.anchorX;
        }
        return 0;
    }

    get itemSize(): number {
        if (!this.parentListView) return 0;
        return this.parentListView.isVertList ? 
            this.uiTransform.height : 
            this.uiTransform.width;
    }

    get itemSizeWithPadding(): number {
        return this.itemSize + this.mPadding;
    }

    public getWorldCorners(corners: Vec3[]): void {
        if (!this.uiTransform) return;
        
        const worldPos = this.node.worldPosition;
        const width = this.uiTransform.width;
        const height = this.uiTransform.height;
        
        corners[0] = new Vec3(worldPos.x - width / 2, worldPos.y - height / 2, 0); // 左下
        corners[1] = new Vec3(worldPos.x - width / 2, worldPos.y + height / 2, 0); // 左上
        corners[2] = new Vec3(worldPos.x + width / 2, worldPos.y + height / 2, 0); // 右上
        corners[3] = new Vec3(worldPos.x + width / 2, worldPos.y - height / 2, 0); // 右下

    }
}