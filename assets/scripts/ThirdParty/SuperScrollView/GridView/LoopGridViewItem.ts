import { _decorator, Component, Node, UITransform } from 'cc';
import { LoopGridView } from './LoopGridView';
const { ccclass, property } = _decorator;

@ccclass('LoopGridViewItem')
export class LoopGridViewItem extends Component {
    // 项目索引 (0 到 itemTotalCount-1)
    private mItemIndex: number = -1;
    
    // 行索引
    private mRow: number = -1;
    
    // 列索引
    private mColumn: number = -1;
    
    // 项目唯一ID
    private mItemId: number = -1;
    
    // 父级网格视图
    private mParentGridView: LoopGridView | null = null;
    
    // 初始化处理程序是否已调用
    private mIsInitHandlerCalled: boolean = false;
    
    // 项目预制体名称
    private mItemPrefabName: string = '';
    
    // 缓存UITransform组件
    private mCachedUITransform: UITransform | null = null;
    
    // 项目创建检查帧计数
    private mItemCreatedCheckFrameCount: number = 0;
    
    // 用户自定义数据
    private mUserObjectData: any = null;
    private mUserIntData1: number = 0;
    private mUserIntData2: number = 0;
    private mUserStringData1: string = '';
    private mUserStringData2: string = '';
    
    // 相邻项目引用
    private mPrevItem: LoopGridViewItem | null = null;
    private mNextItem: LoopGridViewItem | null = null;

    // 用户自定义数据访问器
    public get userObjectData(): any {
        return this.mUserObjectData;
    }
    public set userObjectData(value: any) {
        this.mUserObjectData = value;
    }
    
    public get userIntData1(): number {
        return this.mUserIntData1;
    }
    public set userIntData1(value: number) {
        this.mUserIntData1 = value;
    }
    
    public get userIntData2(): number {
        return this.mUserIntData2;
    }
    public set userIntData2(value: number) {
        this.mUserIntData2 = value;
    }
    
    public get userStringData1(): string {
        return this.mUserStringData1;
    }
    public set userStringData1(value: string) {
        this.mUserStringData1 = value;
    }
    
    public get userStringData2(): string {
        return this.mUserStringData2;
    }
    public set userStringData2(value: string) {
        this.mUserStringData2 = value;
    }

    // 项目创建帧计数访问器
    public get itemCreatedCheckFrameCount(): number {
        return this.mItemCreatedCheckFrameCount;
    }
    public set itemCreatedCheckFrameCount(value: number) {
        this.mItemCreatedCheckFrameCount = value;
    }

    // UITransform访问器（缓存以提高性能）
    public get cachedUITransform(): UITransform {
        if (!this.mCachedUITransform) {
            this.mCachedUITransform = this.node.getComponent(UITransform);
        }
        return this.mCachedUITransform!;
    }

    // 项目预制体名称访问器
    public get itemPrefabName(): string {
        return this.mItemPrefabName;
    }
    public set itemPrefabName(value: string) {
        this.mItemPrefabName = value;
    }

    // 行列索引访问器
    public get row(): number {
        return this.mRow;
    }
    public set row(value: number) {
        this.mRow = value;
    }
    
    public get column(): number {
        return this.mColumn;
    }
    public set column(value: number) {
        this.mColumn = value;
    }

    // 项目索引访问器
    public get itemIndex(): number {
        return this.mItemIndex;
    }
    public set itemIndex(value: number) {
        this.mItemIndex = value;
    }

    // 项目ID访问器
    public get itemId(): number {
        return this.mItemId;
    }
    public set itemId(value: number) {
        this.mItemId = value;
    }

    // 初始化处理程序状态访问器
    public get isInitHandlerCalled(): boolean {
        return this.mIsInitHandlerCalled;
    }
    public set isInitHandlerCalled(value: boolean) {
        this.mIsInitHandlerCalled = value;
    }

    // 父级网格视图访问器
    public get parentGridView(): LoopGridView | null {
        return this.mParentGridView;
    }
    public set parentGridView(value: LoopGridView | null) {
        this.mParentGridView = value;
    }

    // 相邻项目访问器
    public get prevItem(): LoopGridViewItem | null {
        return this.mPrevItem;
    }
    public set prevItem(value: LoopGridViewItem | null) {
        this.mPrevItem = value;
    }
    
    public get nextItem(): LoopGridViewItem | null {
        return this.mNextItem;
    }
    public set nextItem(value: LoopGridViewItem | null) {
        this.mNextItem = value;
    }
}