import { _decorator, Node, Vec3, Prefab, Enum, Vec2, ScrollView, Component, EventTouch, UITransform, math, game, Mask } from 'cc';
import { ClickEventListener } from '../Common/ClickEventListener';
import { ListItemArrangeType, SnapStatus } from '../Common/CommonDefine';
import { ItemPosMgr } from '../Common/ItemPosMgr';
import { ItemPool } from './LoopListItemPool';
import { LoopListViewItem2 } from './LoopListViewItem2';
const { ccclass, property } = _decorator;


@ccclass('ItemPrefabConfData')
export class ItemPrefabConfData {
    @property(Node)
    mItemPrefab: Node| Prefab = null;
    
    @property
    mPadding: number = 0;
    
    @property
    mInitCreateCount: number = 0;
    
    @property
    mStartPosOffset: number = 0;
}

/** 列表初始化参数 */
export class LoopListViewInitParam {
    // 所有默认值
    public distanceForRecycle0: number = 300; // mDistanceForRecycle0 应大于 mDistanceForNew0
    public distanceForNew0: number = 200;
    public distanceForRecycle1: number = 300; // mDistanceForRecycle1 应大于 mDistanceForNew1
    public distanceForNew1: number = 200;
    public smoothDumpRate: number = 0.3;
    public snapFinishThreshold: number = 0.01;
    public snapVecThreshold: number = 145;
    public itemDefaultWithPaddingSize: number = 20; // 带间距的项目默认大小

    /** 复制默认初始化参数 */
    public static copyDefaultInitParam(): LoopListViewInitParam {
        return new LoopListViewInitParam();
    }
}


class SnapData {
    mSnapStatus: SnapStatus = SnapStatus.NoTargetSet;
    mSnapTargetIndex: number = 0;
    mTargetSnapVal: number = 0;
    mCurSnapVal: number = 0;
    mIsForceSnapTo: boolean = false;
    mIsTempTarget: boolean = false;
    mTempTargetIndex: number = -1;
    mMoveMaxAbsVec: number = -1;

    clear(): void {
        this.mSnapStatus = SnapStatus.NoTargetSet;
        this.mTempTargetIndex = -1;
        this.mIsForceSnapTo = false;
        this.mMoveMaxAbsVec = -1;
    }
}

@ccclass('LoopListView2')
export class LoopListView2 extends Component {
    @property([ItemPrefabConfData])
    mItemPrefabDataList: ItemPrefabConfData[] = [];
    @property({ type: Enum(ListItemArrangeType) })
    arrangeType: ListItemArrangeType = ListItemArrangeType.TopToBottom;
    @property
    mSupportScrollBar: boolean = true;
    @property
    mItemSnapEnable: boolean = false;
    @property
    viewPortSnapPivot: Vec2 = new Vec2(0.5, 0.5);
    @property
    itemSnapPivot: Vec2 = new Vec2(0.5, 0.5);
    @property
    mSnapMoveDefaultMaxAbsVec: number = 3400;

    // 私有变量
    private mItemPoolDict: Map<string, ItemPool> = new Map();
    private mItemPoolList: ItemPool[] = [];
    private mItemList: LoopListViewItem2[] = [];
    private mContainerTrans: UITransform = null;
    private mScrollRect: ScrollView = null;
    private viewPortRectTransform: UITransform = null;
    private itemDefaultWithPaddingSize: number = 20;
    private mItemTotalCount: number = 0;
    private mIsVertList: boolean = false;
    private onGetItemByIndex: (list: LoopListView2, index: number) => LoopListViewItem2 = null;
    private itemWorldCorners: Vec3[] = [new Vec3(), new Vec3(), new Vec3(), new Vec3()];
    private viewPortRectLocalCorners: Vec3[] = [new Vec3(), new Vec3(), new Vec3(), new Vec3()];
    private curReadyMinItemIndex: number = 0;
    private curReadyMaxItemIndex: number = 0;
    private needCheckNextMinItem: boolean = true;
    private needCheckNextMaxItem: boolean = true;
    private itemPosMgr: ItemPosMgr = null;
    private distanceForRecycle0: number = 300;
    private distanceForNew0: number = 200;
    private distanceForRecycle1: number = 300;
    private distanceForNew1: number = 200;
    private mIsDraging: boolean = false;
    private pointerEventData: EventTouch = null;
    private lastItemIndex: number = 0;
    private lastItemPadding: number = 0;
    private smoothDumpVel: number = 0;
    private smoothDumpRate: number = 0.3;
    private snapFinishThreshold: number = 0.1;
    private snapVecThreshold: number = 145;
    private lastFrameContainerPos: Vec3 = new Vec3();
   
    private mCurSnapNearestItemIndex: number = -1;
    private adjustedVec: Vec2 = new Vec2();
    private needAdjustVec: boolean = false;
    private leftSnapUpdateExtraCount: number = 1;
    private scrollBarClickEventListener: ClickEventListener = null;
    private curSnapData: SnapData = new SnapData();
    private lastSnapCheckPos: Vec3 = new Vec3();
    private mListViewInited: boolean = false;
    private listUpdateCheckFrameCount: number = 0;

    public onBeginDragAction: (event: EventTouch) => void = null;
    public onDragingAction: (event: EventTouch) => void = null;
    public onEndDragAction: (event: EventTouch) => void = null;
    public onSnapItemFinished: (list: LoopListView2, item: LoopListViewItem2) => void = null;
    public onSnapNearestChanged: (list: LoopListView2, item: LoopListViewItem2) => void = null;

    // 公共属性访问器
    get curSnapNearestItemIndex(): number { return this.mCurSnapNearestItemIndex; }
    get itemPrefabDataList(): ItemPrefabConfData[] { return this.mItemPrefabDataList; }
    get itemList(): LoopListViewItem2[] { return this.mItemList; }
    get isVertList(): boolean { return this.mIsVertList; }
    get itemTotalCount(): number { return this.mItemTotalCount; }
    get containerTrans(): UITransform { return this.mContainerTrans; }
    get scrollRect(): ScrollView { return this.mScrollRect; }
    get isDraging(): boolean { return this.mIsDraging; }
    get isListViewInited(): boolean { return this.mListViewInited; }
    get itemSnapEnable(): boolean { return this.mItemSnapEnable; }
    set itemSnapEnable(value: boolean) { this.mItemSnapEnable = value; }
    get supportScrollBar(): boolean { return this.mSupportScrollBar; }
    set supportScrollBar(value: boolean) { this.mSupportScrollBar = value; }
    get snapMoveDefaultMaxAbsVec(): number { return this.mSnapMoveDefaultMaxAbsVec; }
    set snapMoveDefaultMaxAbsVec(value: number) { this.mSnapMoveDefaultMaxAbsVec = value; }

    start() {
        this.registerTouchEvents();
    }
    
    private registerTouchEvents() {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    private onTouchStart(event: EventTouch) {
        if (this.mIsDraging) return;
        
        this.mIsDraging = true;
        this.cacheDragPointerEventData(event);
        this.curSnapData.clear();
        if(this.onBeginDragAction != null)
        {
            this.onBeginDragAction(event);
        }
    }
    
    private onTouchMove(event: EventTouch) {

        this.cacheDragPointerEventData(event);
        if(this.onDragingAction != null)
        {
            this.onDragingAction(event);
        }
    }
    
    private onTouchEnd(event: EventTouch) {
        this.mIsDraging = false;
        this.pointerEventData = null;
        if (this.onEndDragAction != null)
        {
            this.onEndDragAction(event);
        }
        this.forceSnapUpdateCheck();
    }
    
    private onTouchCancel(event: EventTouch) {
        this.mIsDraging = false;
        this.pointerEventData = null;
        if (this.onEndDragAction != null)
        {
            this.onEndDragAction(event);
        }
        this.forceSnapUpdateCheck();
    }
    
    // 获取预制体配置数据
    public getItemPrefabConfData(prefabName: string): ItemPrefabConfData {
        for (const data of this.mItemPrefabDataList) {
            if (!data.mItemPrefab) {
                console.error("A item prefab is null");
                continue;
            }
            const prefab = data.mItemPrefab as Node;
            if (prefabName === prefab.name) {
                return data;
            }
        }
        return null;
    }

    // 设置回收距离
    public setDistanceForRecycle(distanceForRecycle0: number, distanceForRecycle1: number): void {
        this.distanceForRecycle0 = distanceForRecycle0;
        this.distanceForRecycle1 = distanceForRecycle1;
    }

    // 设置新建距离
    public setDistanceForNew(distanceForNew0: number, distanceForNew1: number): void {
        this.distanceForNew0 = distanceForNew0;
        this.distanceForNew1 = distanceForNew1;
    }

    // 清理列表视图
    public clearListView(): void {
        this.setListItemCount(0, true);
        for (const pool of this.mItemPoolList) {
            pool.clearPool();
        }
        this.mItemPoolList = [];
        this.mItemPoolDict.clear();
        this.onGetItemByIndex = null;
        this.mListViewInited = false;
    }

    public cleanUp(name: string = null, beforeDestroy:(node)=> void = null)
    {
        if (name == null)
        {
            let count = this.mItemPoolList.length;
            for (let i = 0; i < count; ++i)
            {
                this.mItemPoolList[i].cleanUp(beforeDestroy);
            }
        }
        else
        {
            const pool = this.mItemPoolDict.get(name);
            if(!!pool) pool.cleanUp(beforeDestroy);
        }
    }

    // 初始化列表视图
    public initListView(
        itemTotalCount: number,
        onGetItemByIndex: (list: LoopListView2, index: number) => LoopListViewItem2,
        initParam: LoopListViewInitParam = null
    ): void {
        if (initParam) {
            this.distanceForRecycle0 = initParam.distanceForRecycle0;
            this.distanceForNew0 = initParam.distanceForNew0;
            this.distanceForRecycle1 = initParam.distanceForRecycle1;
            this.distanceForNew1 = initParam.distanceForNew1;
            this.smoothDumpRate = initParam.smoothDumpRate;
            this.snapFinishThreshold = initParam.snapFinishThreshold;
            this.snapVecThreshold = initParam.snapVecThreshold;
            this.itemDefaultWithPaddingSize = initParam.itemDefaultWithPaddingSize;
        }

        this.mScrollRect = this.getComponent(ScrollView);
        if (!this.mScrollRect) {
            console.error("ListView Init Failed! ScrollRect component not found!");
            return;
        }

        if (this.distanceForRecycle0 <= this.distanceForNew0) {
            console.error("distanceForRecycle0 should be bigger than distanceForNew0");
        }
        if (this.distanceForRecycle1 <= this.distanceForNew1) {
            console.error("distanceForRecycle1 should be bigger than distanceForNew1");
        }

        this.curSnapData.clear();
        this.itemPosMgr = new ItemPosMgr(this.itemDefaultWithPaddingSize);
        this.mContainerTrans = this.mScrollRect.content.getComponent(UITransform);
        this.viewPortRectTransform = this.mScrollRect.getComponentInChildren(Mask)?.getComponent(UITransform);
        
        if (!this.viewPortRectTransform) {
            this.viewPortRectTransform = this.mScrollRect.node.getComponent(UITransform);
        }
        this.mIsVertList = (this.arrangeType === ListItemArrangeType.TopToBottom || 
                          this.arrangeType === ListItemArrangeType.BottomToTop);
        this.mScrollRect.horizontal = !this.mIsVertList;
        this.mScrollRect.vertical = this.mIsVertList;

        this.setScrollbarListener();
        this.adjustPivot(this.viewPortRectTransform);
        this.adjustAnchor(this.mContainerTrans);
        this.adjustContainerPivot(this.mContainerTrans);

        this.clearListView();
        this.initItemPool();
        this.onGetItemByIndex = onGetItemByIndex;

        if (this.mListViewInited) {
            console.error("LoopListView2.InitListView method can be called only once.");
        }
        this.mListViewInited = true;
        this.resetListView();
        this.mItemTotalCount = itemTotalCount;

        if (this.mItemTotalCount < 0) {
            this.mSupportScrollBar = false;
            if(!(this.mScrollRect as any).velocity){
                console.log("todo: 更改引擎代码以支持修改速度");
                this.mScrollRect.elastic = false;
            }
        }
        if (this.mSupportScrollBar) {
            this.itemPosMgr.setItemMaxCount(this.mItemTotalCount);
        } else {
            this.itemPosMgr.setItemMaxCount(0);
        }

        this.curReadyMaxItemIndex = 0;
        this.curReadyMinItemIndex = 0;
        this.leftSnapUpdateExtraCount = 1;
        this.needCheckNextMaxItem = true;
        this.needCheckNextMinItem = true;
        this.updateContentSize();
    }

    // 设置滚动条监听
    private setScrollbarListener(): void {
        this.scrollBarClickEventListener = null;
        let curScrollBar: Node = null;
        if (this.mIsVertList && this.mScrollRect.verticalScrollBar) {
            curScrollBar = this.mScrollRect.verticalScrollBar.node;
        } else if (!this.mIsVertList && this.mScrollRect.horizontalScrollBar) {
            curScrollBar = this.mScrollRect.horizontalScrollBar.node;
        }
        if (!curScrollBar) return;

        const listener:ClickEventListener = ClickEventListener.get(curScrollBar);
        this.scrollBarClickEventListener = listener;
        listener.setPointerUpHandler(this.onPointerUpInScrollBar.bind(this));
        listener.setPointerDownHandler(this.onPointerDownInScrollBar.bind(this));
    }

    private onPointerDownInScrollBar(): void {
        this.curSnapData.clear();
    }

    private onPointerUpInScrollBar(): void {
        this.forceSnapUpdateCheck();
    }

    // 重置列表视图
    public resetListView(resetPos: boolean = true): void {
        // 获取视口四个角的本地坐标
        const corners = [];        
        const width = this.viewPortRectTransform.width;
        const height = this.viewPortRectTransform.height;
        
        // 本地坐标（相对于节点中心）
        corners[0] = new Vec3(width * (-this.viewPortRectTransform.anchorX), height * (-this.viewPortRectTransform.anchorY), 0); // 左下
        corners[1] = new Vec3(width * (-this.viewPortRectTransform.anchorX), height * (1-this.viewPortRectTransform.anchorY), 0);  // 左上
        corners[2] = new Vec3(width * (1-this.viewPortRectTransform.anchorX), height * (1-this.viewPortRectTransform.anchorY), 0);   // 右上
        corners[3] = new Vec3(width * (1-this.viewPortRectTransform.anchorX), height * (-this.viewPortRectTransform.anchorY), 0);  // 右下

        for (let i = 0; i < 4; i++) {
            this.viewPortRectLocalCorners[i].set(corners[i]);
        }

        if (resetPos) {
            this.mContainerTrans.node.setPosition(0, 0, 0);
        }
        this.forceSnapUpdateCheck();
    }

    // 设置列表项数量
    public setListItemCount(itemCount: number, resetPos: boolean = true): void {
        if (itemCount === this.mItemTotalCount) return;

        this.curSnapData.clear();
        this.mItemTotalCount = itemCount;
        if (this.mItemTotalCount < 0) {
            this.mSupportScrollBar = false;
            if(!(this.mScrollRect as any).velocity){
                console.log("todo: 更改引擎代码以支持修改速度");
                this.mScrollRect.elastic = false;
            }
        }

        if (this.mSupportScrollBar) {
            this.itemPosMgr.setItemMaxCount(this.mItemTotalCount);
        } else {
            this.itemPosMgr.setItemMaxCount(0);
        }

        if (this.mItemTotalCount === 0) {
            this.curReadyMaxItemIndex = 0;
            this.curReadyMinItemIndex = 0;
            this.needCheckNextMaxItem = false;
            this.needCheckNextMinItem = false;
            this.recycleAllItem();
            this.clearAllTmpRecycledItem();
            this.updateContentSize();
            return;
        }

        if (this.curReadyMaxItemIndex >= this.mItemTotalCount) {
            this.curReadyMaxItemIndex = this.mItemTotalCount - 1;
        }

        this.leftSnapUpdateExtraCount = 1;
        this.needCheckNextMaxItem = true;
        this.needCheckNextMinItem = true;

        if (resetPos) {
            this.movePanelToItemIndex(0, 0);
            return;
        }

        if (this.mItemList.length === 0) {
            this.movePanelToItemIndex(0, 0);
            return;
        }

        const maxItemIndex = this.mItemTotalCount - 1;
        const lastItemIndex = this.mItemList[this.mItemList.length - 1].itemIndex;
        if (lastItemIndex <= maxItemIndex) {
            this.updateContentSize();
            this.updateAllShownItemsPos();
            return;
        }

        this.movePanelToItemIndex(maxItemIndex, 0);
    }

    // 根据索引获取显示的项
    public getShownItemByItemIndex(itemIndex: number): LoopListViewItem2 {
        const count = this.mItemList.length;
        if (count === 0) return null;
        if (itemIndex < this.mItemList[0].itemIndex || itemIndex > this.mItemList[count - 1].itemIndex) {
            return null;
        }
        const i = itemIndex - this.mItemList[0].itemIndex;
        return this.mItemList[i];
    }

    // 获取最近的显示项
    public getShownItemNearestItemIndex(itemIndex: number): LoopListViewItem2 {
        const count = this.mItemList.length;
        if (count === 0) return null;
        if (itemIndex < this.mItemList[0].itemIndex) {
            return this.mItemList[0];
        }
        if (itemIndex > this.mItemList[count - 1].itemIndex) {
            return this.mItemList[count - 1];
        }
        const i = itemIndex - this.mItemList[0].itemIndex;
        return this.mItemList[i];
    }

    // 获取显示项数量
    get shownItemCount(): number {
        return this.mItemList.length;
    }

    // 获取视口大小
    get viewPortSize(): number {
        return this.mIsVertList ? this.viewPortRectTransform.height : this.viewPortRectTransform.width;
    }

    get viewPortWidth(): number {
        return this.viewPortRectTransform.width;
    }

    get viewPortHeight(): number {
        return this.viewPortRectTransform.height;
    }

    // 根据索引获取显示项
    public getShownItemByIndex(index: number): LoopListViewItem2 {
        return (index >= 0 && index < this.mItemList.length) ? this.mItemList[index] : null;
    }

    // 在显示列表中获取项的索引
    public getIndexInShownItemList(item: LoopListViewItem2): number {
        if (!item) return -1;
        for (let i = 0; i < this.mItemList.length; i++) {
            if (this.mItemList[i] === item) return i;
        }
        return -1;
    }

    // 创建新列表项
    public newListViewItem(itemPrefabName: string, index: number = null): LoopListViewItem2 {
        const pool = this.mItemPoolDict.get(itemPrefabName);
        if (!pool) return null;

        const item = pool.getItem(index);
        const rectTrans = item.node.getComponent(UITransform);
        item.node.setParent(this.mContainerTrans.node);
        item.node.setScale(Vec3.ONE);
        rectTrans.node.setPosition(Vec3.ONE);
        item.parentListView = this;
        return item;
    }

    // 项大小变化时更新
    public onItemSizeChanged(itemIndex: number): void {
        const item = this.getShownItemByItemIndex(itemIndex);
        if (!item) return;

        if (this.mSupportScrollBar) {
            const rect = item.uiTransform;
            if (this.mIsVertList) {
                this.setItemSize(itemIndex, rect.height, item.padding);
            } else {
                this.setItemSize(itemIndex, rect.width, item.padding);
            }
        }

        this.updateContentSize();
        this.updateAllShownItemsPos();
    }

    // 刷新指定项
    public refreshItemByItemIndex(itemIndex: number): void {
        const count = this.mItemList.length;
        if (count === 0) return;
        if (itemIndex < this.mItemList[0].itemIndex || itemIndex > this.mItemList[count - 1].itemIndex) {
            return;
        }

        const firstItemIndex = this.mItemList[0].itemIndex;
        const i = itemIndex - firstItemIndex;
        const curItem = this.mItemList[i];
        const pos = curItem.node.position.clone();

        this.recycleItemTmp(curItem);
        const newItem = this.getNewItemByIndex(itemIndex);
        if (!newItem) {
            this.refreshAllShownItemWithFirstIndex(firstItemIndex);
            return;
        }

        this.mItemList[i] = newItem;
        if (this.mIsVertList) {
            pos.x = newItem.startPosOffset;
        } else {
            pos.y = newItem.startPosOffset;
        }
        newItem.node.setPosition(pos);
        this.onItemSizeChanged(itemIndex);
        this.clearAllTmpRecycledItem();
    }

    // 强制完成吸附
    public finishSnapImmediately(): void {
        this.updateSnapMove(true);
    }

    // 移动到指定项
    /**
     * 移动面板到指定索引的列表项
     * @param itemIndex 列表项索引
     * @param offset 偏移量，范围从0到滚动视图视口大小
     */
    public movePanelToItemIndex(itemIndex: number, offset: number): void {
        this.mScrollRect.stopAutoScroll();
        this.curSnapData.clear();
    
        if (this.mItemTotalCount === 0) return;
        if (itemIndex < 0 && this.mItemTotalCount > 0) return;
        
        if (itemIndex >= this.mItemTotalCount) {
            itemIndex = this.mItemTotalCount - 1;
        }
        
        if (offset < 0) offset = 0;
        
        const viewPortSize = this.viewPortSize;
        if (offset > viewPortSize) {
            offset = viewPortSize;
        }
        
        let pos: Vec3 = Vec3.ZERO;
        const containerPos = this.mContainerTrans.node.getPosition();
        
        switch (this.arrangeType) {
            case ListItemArrangeType.TopToBottom:
                const topPosY = Math.max(containerPos.y, 0);
                pos.set(0, -topPosY - offset, 0);
                break;
                
            case ListItemArrangeType.BottomToTop:
                const bottomPosY = Math.min(containerPos.y, 0);
                pos.set(0, -bottomPosY + offset, 0);
                break;
                
            case ListItemArrangeType.LeftToRight:
                const leftPosX = Math.min(containerPos.x, 0);
                pos.set(-leftPosX + offset, 0, 0);
                break;
                
            case ListItemArrangeType.RightToLeft:
                const rightPosX = Math.max(containerPos.x, 0);
                pos.set(-rightPosX - offset, 0, 0);
                break;
        }
        
        this.recycleAllItem();
        const newItem = this.getNewItemByIndex(itemIndex);
        if (!newItem) {
            this.clearAllTmpRecycledItem();
            return;
        }
        
        if (this.mIsVertList) {
            pos.x = newItem.startPosOffset;
        } else {
            pos.y = newItem.startPosOffset;
        }
        
        newItem.node.setPosition(pos);
        
        if (this.mSupportScrollBar) {
            const rect = newItem.uiTransform;
            if (this.mIsVertList) {
                this.setItemSize(itemIndex, rect.height, newItem.padding);
            } else {
                this.setItemSize(itemIndex, rect.width, newItem.padding);
            }
        }
        
        this.mItemList.push(newItem);
        this.updateContentSize();
        this.updateListView(viewPortSize + 100, viewPortSize + 100, viewPortSize, viewPortSize);
        this.adjustPanelPos();
        this.clearAllTmpRecycledItem();
        this.forceSnapUpdateCheck();
        this.updateSnapMove(false, true);
    }

    // 回收临时项
    private recycleItemTmp(item: LoopListViewItem2): void {
        if (!item || !item.itemPrefabName) return;
        const pool = this.mItemPoolDict.get(item.itemPrefabName);
        if (pool) pool.recycleItem(item);
    }

    // 清除所有临时回收项
    private clearAllTmpRecycledItem(): void {
        for (const pool of this.mItemPoolList) {
            pool.clearTmpRecycledItem();
        }
    }

    // 回收所有项
    private recycleAllItem(): void {
        for (const item of this.mItemList) {
            this.recycleItemTmp(item);
        }
        this.mItemList = [];
    }

    // 调整轴点
    private adjustPivot(rtf: UITransform): void {
        const pivot = new Vec2();
        switch (this.arrangeType) {
            case ListItemArrangeType.BottomToTop:
                pivot.set(rtf.anchorPoint.x, 0);
                break;
            case ListItemArrangeType.TopToBottom:
                pivot.set(rtf.anchorPoint.x, 1);
                break;
            case ListItemArrangeType.LeftToRight:
                pivot.set(0, rtf.anchorPoint.y);
                break;
            case ListItemArrangeType.RightToLeft:
                pivot.set(1, rtf.anchorPoint.y);
                break;
        }
        rtf.setAnchorPoint(pivot.x, pivot.y);
    }

    // 调整锚点
    private adjustAnchor(rtf: UITransform): void {
        let anchorMin: Vec2;
        let anchorMax: Vec2;
        switch (this.arrangeType) {
            case ListItemArrangeType.BottomToTop:
                anchorMin = new Vec2(rtf.anchorPoint.x, 0);
                anchorMax = new Vec2(rtf.anchorPoint.x, 0);
                break;
            case ListItemArrangeType.TopToBottom:
                anchorMin = new Vec2(rtf.anchorPoint.x, 1);
                anchorMax = new Vec2(rtf.anchorPoint.x, 1);
                break;
            case ListItemArrangeType.LeftToRight:
                anchorMin = new Vec2(0, rtf.anchorPoint.y);
                anchorMax = new Vec2(0, rtf.anchorPoint.y);
                break;
            case ListItemArrangeType.RightToLeft:
                anchorMin = new Vec2(1, rtf.anchorPoint.y);
                anchorMax = new Vec2(1, rtf.anchorPoint.y);
                break;
        }
        rtf.setAnchorPoint(anchorMin.x, anchorMin.y); // Cocos中通过setAnchorPoint设置
    }

    // 初始化项池
    private initItemPool(): void {
        for (const data of this.itemPrefabDataList) {
            if (!data.mItemPrefab) {
                console.error("A item prefab is null");
                continue;
            }

            const prefab = data.mItemPrefab as Node;
            const prefabName = prefab.name;
            if (this.mItemPoolDict.has(prefabName)) {
                console.error(`A item prefab with name ${prefabName} has existed!`);
                continue;
            }

            const rtf = prefab.getComponent(UITransform);
            if (!rtf) {
                console.error(`RectTransform component not found in prefab ${prefabName}`);
                continue;
            }

            this.adjustAnchor(rtf);
            this.adjustPivot(rtf);

            let tItem = prefab.getComponent(LoopListViewItem2);
            if (!tItem) {
                tItem = prefab.addComponent(LoopListViewItem2);
            }

            const pool = new ItemPool();
            pool.init(prefab, data.mPadding, data.mStartPosOffset, data.mInitCreateCount, this.mContainerTrans.node);
            this.mItemPoolDict.set(prefabName, pool);
            this.mItemPoolList.push(pool);
        }
    }

    private adjustPanelPos(): void {
        const count = this.mItemList.length;
        if (count === 0) {
            return;
        }
    
        this.updateAllShownItemsPos();
        const viewPortSize = this.viewPortSize;
        const contentSize = this.getContentPanelSize();
    
        switch (this.arrangeType) {
            case ListItemArrangeType.TopToBottom:
                if (contentSize <= viewPortSize) {
                    let pos = this.mContainerTrans.node.getPosition();
                    pos.y = 0;
                    this.mContainerTrans.node.setPosition(pos);
                    
                    const firstItem = this.mItemList[0];
                    firstItem.node.setPosition(firstItem.startPosOffset, 0, 0);
                    this.updateAllShownItemsPos();
                    return;
                }
    
                const tViewItem0 = this.mItemList[0];
                tViewItem0.getWorldCorners(this.itemWorldCorners);
                const topPos0 = new Vec3();
                this.viewPortRectTransform.node.inverseTransformPoint(topPos0,this.itemWorldCorners[1]);
                
                if (topPos0.y < this.viewPortRectLocalCorners[1].y) {
                    let pos = this.mContainerTrans.node.getPosition();
                    pos.y = 0;
                    this.mContainerTrans.node.setPosition(pos);
                    
                    this.mItemList[0].node.setPosition(this.mItemList[0].startPosOffset, 0, 0);
                    this.updateAllShownItemsPos();
                    return;
                }
    
                const tViewItem1 = this.mItemList[this.mItemList.length - 1];
                tViewItem1.getWorldCorners(this.itemWorldCorners);
                const downPos1 = new Vec3();
                this.viewPortRectTransform.node.inverseTransformPoint(downPos1,this.itemWorldCorners[0]);
                const d = downPos1.y - this.viewPortRectLocalCorners[0].y;
                
                if (d > 0) {
                    const pos = this.mItemList[0].node.getPosition();
                    pos.y -= d;
                    this.mItemList[0].node.setPosition(pos);
                    this.updateAllShownItemsPos();
                }
                break;
    
            case ListItemArrangeType.BottomToTop:
                if (contentSize <= viewPortSize) {
                    let pos = this.mContainerTrans.node.getPosition();
                    pos.y = 0;
                    this.mContainerTrans.node.setPosition(pos);
                    
                    this.mItemList[0].node.setPosition(this.mItemList[0].startPosOffset, 0, 0);
                    this.updateAllShownItemsPos();
                    return;
                }
    
                const btViewItem0 = this.mItemList[0];
                btViewItem0.getWorldCorners(this.itemWorldCorners);
                const downPos0 = new Vec3();
                this.viewPortRectTransform.node.inverseTransformPoint(downPos0,this.itemWorldCorners[0]);
                
                if (downPos0.y > this.viewPortRectLocalCorners[0].y) {
                    let pos = this.mContainerTrans.node.getPosition();
                    pos.y = 0;
                    this.mContainerTrans.node.setPosition(pos);
                    
                    this.mItemList[0].node.setPosition(this.mItemList[0].startPosOffset, 0, 0);
                    this.updateAllShownItemsPos();
                    return;
                }
    
                const btViewItem1 = this.mItemList[this.mItemList.length - 1];
                btViewItem1.getWorldCorners(this.itemWorldCorners);
                const topPos1 = new Vec3();
                this.viewPortRectTransform.node.inverseTransformPoint(topPos1,this.itemWorldCorners[1]);
                const bd = this.viewPortRectLocalCorners[1].y - topPos1.y;
                
                if (bd > 0) {
                    const pos = this.mItemList[0].node.getPosition();
                    pos.y += bd;
                    this.mItemList[0].node.setPosition(pos);
                    this.updateAllShownItemsPos();
                }
                break;
    
            case ListItemArrangeType.LeftToRight:
                if (contentSize <= viewPortSize) {
                    let pos = this.mContainerTrans.node.getPosition();
                    pos.x = 0;
                    this.mContainerTrans.node.setPosition(pos);
                    
                    this.mItemList[0].node.setPosition(0, this.mItemList[0].startPosOffset, 0);
                    this.updateAllShownItemsPos();
                    return;
                }
    
                const lrViewItem0 = this.mItemList[0];
                lrViewItem0.getWorldCorners(this.itemWorldCorners);
                const leftPos0 = new Vec3();
                this.viewPortRectTransform.node.inverseTransformPoint(leftPos0,this.itemWorldCorners[1]);
                
                if (leftPos0.x > this.viewPortRectLocalCorners[1].x) {
                    let pos = this.mContainerTrans.node.getPosition();
                    pos.x = 0;
                    this.mContainerTrans.node.setPosition(pos);
                    
                    this.mItemList[0].node.setPosition(0, this.mItemList[0].startPosOffset, 0);
                    this.updateAllShownItemsPos();
                    return;
                }
    
                const lrViewItem1 = this.mItemList[this.mItemList.length - 1];
                lrViewItem1.getWorldCorners(this.itemWorldCorners);
                const rightPos1 = new Vec3();
                this.viewPortRectTransform.node.inverseTransformPoint(rightPos1,this.itemWorldCorners[2]);
                const lrd = this.viewPortRectLocalCorners[2].x - rightPos1.x;
                
                if (lrd > 0) {
                    const pos = this.mItemList[0].node.getPosition();
                    pos.x += lrd;
                    this.mItemList[0].node.setPosition(pos);
                    this.updateAllShownItemsPos();
                }
                break;
    
            case ListItemArrangeType.RightToLeft:
                if (contentSize <= viewPortSize) {
                    let pos = this.mContainerTrans.node.getPosition();
                    pos.x = 0;
                    this.mContainerTrans.node.setPosition(pos);
                    
                    this.mItemList[0].node.setPosition(0, this.mItemList[0].startPosOffset, 0);
                    this.updateAllShownItemsPos();
                    return;
                }
    
                const rlViewItem0 = this.mItemList[0];
                rlViewItem0.getWorldCorners(this.itemWorldCorners);
                const rightPos0 = new Vec3();
                this.viewPortRectTransform.node.inverseTransformPoint(rightPos0,this.itemWorldCorners[2]);
                
                if (rightPos0.x < this.viewPortRectLocalCorners[2].x) {
                    let pos = this.mContainerTrans.node.getPosition();
                    pos.x = 0;
                    this.mContainerTrans.node.setPosition(pos);
                    
                    this.mItemList[0].node.setPosition(0, this.mItemList[0].startPosOffset, 0);
                    this.updateAllShownItemsPos();
                    return;
                }
    
                const rlViewItem1 = this.mItemList[this.mItemList.length - 1];
                rlViewItem1.getWorldCorners(this.itemWorldCorners);
                const leftPos1 = new Vec3();
                this.viewPortRectTransform.node.inverseTransformPoint(leftPos1,this.itemWorldCorners[1]);
                const rld = leftPos1.x - this.viewPortRectLocalCorners[1].x;
                
                if (rld > 0) {
                    const pos = this.mItemList[0].node.getPosition();
                    pos.x -= rld;
                    this.mItemList[0].node.setPosition(pos);
                    this.updateAllShownItemsPos();
                }
                break;
        }
    }

    // 更新方法
    update(dt: number): void {
        if (!this.mListViewInited) return;

        if (this.needAdjustVec) {
            this.needAdjustVec = false;
            if(!!(this.mScrollRect as any).velocity)//todo: 更改引擎代码以支持修改速度
            {
                if (this.mIsVertList) {
                    if ((this.mScrollRect as any).velocity.y * this.adjustedVec.y > 0) {
                        // 调整滚动速度
                        (this.mScrollRect as any).velocity = this.adjustedVec;
                    }
                } else {
                    if ((this.mScrollRect as any).velocity.x * this.adjustedVec.x > 0) {
                        // 调整滚动速度
                        (this.mScrollRect as any).velocity = this.adjustedVec;
                    }
                }
            }
        }

        if (this.mSupportScrollBar) {
            this.itemPosMgr.update(false);
        }

        this.updateSnapMove();
        this.updateListView(
            this.distanceForRecycle0,
            this.distanceForRecycle1,
            this.distanceForNew0,
            this.distanceForNew1
        );
        this.clearAllTmpRecycledItem();
        this.lastFrameContainerPos = this.mContainerTrans.node.position.clone();
    }

    // 核心更新逻辑
    private updateListView(
        distanceForRecycle0: number,
        distanceForRecycle1: number,
        distanceForNew0: number,
        distanceForNew1: number
    ): void {
        this.listUpdateCheckFrameCount++;
        if (this.mIsVertList) {
            let needContinueCheck = true;
            let checkCount = 0;
            const maxCount = 9999;
            while (needContinueCheck) {
                checkCount++;
                if(checkCount >= maxCount)
                {
                    console.error("UpdateListView Vertical while loop " + checkCount + " times! something is wrong!");
                    break;
                }
                needContinueCheck = this.updateForVertList(
                    distanceForRecycle0,
                    distanceForRecycle1,
                    distanceForNew0,
                    distanceForNew1
                );
            }
        } else {
            let needContinueCheck = true;
            let checkCount = 0;
            const maxCount = 9999;
            while (needContinueCheck) {
                checkCount++;
                if(checkCount >= maxCount)
                {
                    console.error("UpdateListView Horizontal while loop " + checkCount + " times! something is wrong!");
                    break;
                }
                needContinueCheck = this.updateForHorizontalList(
                    distanceForRecycle0,
                    distanceForRecycle1,
                    distanceForNew0,
                    distanceForNew1
                );
            }
        }
    }

    // 垂直列表更新
    private updateForVertList(
        distanceForRecycle0: number,
        distanceForRecycle1: number,
        distanceForNew0: number,
        distanceForNew1: number
    ): boolean {
        if (this.mItemTotalCount === 0) {
            if (this.mItemList.length > 0) {
                this.recycleAllItem();
            }
            return false;
        }
    
        if (this.arrangeType === ListItemArrangeType.TopToBottom) {
            const itemListCount = this.mItemList.length;
            if (itemListCount === 0) {
                let curY = this.mContainerTrans.node.position.y;
                if (curY < 0) {
                    curY = 0;
                }
    
                let index = 0;
                let pos = -curY;
                
                if (this.mSupportScrollBar) {
                    const res = this.getPlusItemIndexAndPosAtGivenPos(curY);
                    if (!res) {
                        return false;
                    }
                    index = res.index;
                    pos = res.itemPos;
                    pos = -pos;
                }
    
                const newItem = this.getNewItemByIndex(index);
                if (!newItem) {
                    return false;
                }
    
                if (this.mSupportScrollBar) {
                    const rect = newItem.uiTransform;
                    this.setItemSize(index, rect.height, newItem.padding);
                }
    
                this.mItemList.push(newItem);
                newItem.node.setPosition(new Vec3(newItem.startPosOffset, pos, 0));
                this.updateContentSize();
                return true;
            }
    
            const tViewItem0 = this.mItemList[0];
            tViewItem0.getWorldCorners(this.itemWorldCorners);
            
            const topPos0 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(topPos0,this.itemWorldCorners[1]);
            const downPos0 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(downPos0,this.itemWorldCorners[0]);
    
            if (!this.mIsDraging && 
                tViewItem0.itemCreatedCheckFrameCount !== this.listUpdateCheckFrameCount &&
                downPos0.y - this.viewPortRectLocalCorners[1].y > distanceForRecycle0) {
                
                this.mItemList.splice(0, 1);
                this.recycleItemTmp(tViewItem0);
                
                if (!this.mSupportScrollBar) {
                    this.updateContentSize();
                    this.checkIfNeedUpdateItemPos();
                }
                return true;
            }
    
            const tViewItem1 = this.mItemList[this.mItemList.length - 1];
            tViewItem1.getWorldCorners(this.itemWorldCorners);
            
            const topPos1 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(topPos1,this.itemWorldCorners[1]);
            const downPos1 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(downPos1,this.itemWorldCorners[0]);
    
            if (!this.mIsDraging && 
                tViewItem1.itemCreatedCheckFrameCount !== this.listUpdateCheckFrameCount &&
                this.viewPortRectLocalCorners[0].y - topPos1.y > distanceForRecycle1) {
                
                this.mItemList.pop();
                this.recycleItemTmp(tViewItem1);
                
                if (!this.mSupportScrollBar) {
                    this.updateContentSize();
                    this.checkIfNeedUpdateItemPos();
                }
                return true;
            }
            // 检查是否需要添加新的底部项
            if (this.viewPortRectLocalCorners[0].y - downPos1.y < distanceForNew1) {
                if (tViewItem1.itemIndex > this.curReadyMaxItemIndex) {
                    this.curReadyMaxItemIndex = tViewItem1.itemIndex;
                    this.needCheckNextMaxItem = true;
                }
                
                const nIndex = tViewItem1.itemIndex + 1;
                if (nIndex <= this.curReadyMaxItemIndex || this.needCheckNextMaxItem) {
                    const newItem = this.getNewItemByIndex(nIndex);
                    if (!newItem) {
                        this.curReadyMaxItemIndex = tViewItem1.itemIndex;
                        this.needCheckNextMaxItem = false;
                        this.checkIfNeedUpdateItemPos();
                    } else {
                        if (this.mSupportScrollBar) {
                            this.setItemSize(nIndex, newItem.uiTransform.height, newItem.padding);
                        }
                        
                        this.mItemList.push(newItem);
                        const y = tViewItem1.node.position.y - tViewItem1.uiTransform.height - tViewItem1.padding;
                        newItem.node.setPosition(new Vec3(newItem.startPosOffset, y, 0));
                        
                        this.updateContentSize();
                        this.checkIfNeedUpdateItemPos();
                        
                        if (nIndex > this.curReadyMaxItemIndex) {
                            this.curReadyMaxItemIndex = nIndex;
                        }
                        return true;
                    }
                }
            }
    
            // 检查是否需要添加新的顶部项
            if (topPos0.y - this.viewPortRectLocalCorners[1].y < distanceForNew0) {
                if (tViewItem0.itemIndex < this.curReadyMinItemIndex) {
                    this.curReadyMinItemIndex = tViewItem0.itemIndex;
                    this.needCheckNextMinItem = true;
                }
                const nIndex = tViewItem0.itemIndex - 1;
                if (nIndex >= this.curReadyMinItemIndex || this.needCheckNextMinItem) {
                    const newItem = this.getNewItemByIndex(nIndex);
                    if (!newItem) {
                        this.curReadyMinItemIndex = tViewItem0.itemIndex;
                        this.needCheckNextMinItem = false;
                    } else {
                        if (this.mSupportScrollBar) {
                            this.setItemSize(nIndex, newItem.uiTransform.height, newItem.padding);
                        }
                        
                        this.mItemList.unshift(newItem);
                        const y = tViewItem0.node.position.y + newItem.uiTransform.height + newItem.padding;
                        newItem.node.setPosition(new Vec3(newItem.startPosOffset, y, 0));
                        
                        this.updateContentSize();
                        this.checkIfNeedUpdateItemPos();
                        
                        if (nIndex < this.curReadyMinItemIndex) {
                            this.curReadyMinItemIndex = nIndex;
                        }
                        return true;
                    }
                }
            }
        } else { // BottomToTop 排列
            if (this.mItemList.length === 0) {
                let curY = this.mContainerTrans.node.position.y;
                if (curY > 0) {
                    curY = 0;
                }
                
                let index = 0;
                let pos = -curY;
                
                if (this.mSupportScrollBar) {
                    const res = this.getPlusItemIndexAndPosAtGivenPos(-curY);
                    if (!res) {
                        return false;
                    }
                    index = res.index;
                    pos = res.itemPos;
                }
                
                const newItem = this.getNewItemByIndex(index);
                if (!newItem) {
                    return false;
                }
                
                if (this.mSupportScrollBar) {
                    this.setItemSize(index, newItem.uiTransform.height, newItem.padding);
                }
                
                this.mItemList.push(newItem);
                newItem.node.setPosition(new Vec3(newItem.startPosOffset, pos, 0));
                this.updateContentSize();
                return true;
            }
            
            const tViewItem0 = this.mItemList[0];
            tViewItem0.getWorldCorners(this.itemWorldCorners);
            
            const topPos0 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(topPos0,this.itemWorldCorners[1]);
            const downPos0 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(downPos0,this.itemWorldCorners[0]);
    
            if (!this.mIsDraging && 
                tViewItem0.itemCreatedCheckFrameCount !== this.listUpdateCheckFrameCount &&
                this.viewPortRectLocalCorners[0].y - topPos0.y > distanceForRecycle0) {
                
                this.mItemList.splice(0, 1);
                this.recycleItemTmp(tViewItem0);
                
                if (!this.mSupportScrollBar) {
                    this.updateContentSize();
                    this.checkIfNeedUpdateItemPos();
                }
                return true;
            }
    
            const tViewItem1 = this.mItemList[this.mItemList.length - 1];
            tViewItem1.getWorldCorners(this.itemWorldCorners);
            
            const topPos1 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(topPos1,this.itemWorldCorners[1]);
            const downPos1 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(downPos1,this.itemWorldCorners[0]);
    
            if (!this.mIsDraging && 
                tViewItem1.itemCreatedCheckFrameCount !== this.listUpdateCheckFrameCount &&
                downPos1.y - this.viewPortRectLocalCorners[1].y > distanceForRecycle1) {
                
                this.mItemList.pop();
                this.recycleItemTmp(tViewItem1);
                
                if (!this.mSupportScrollBar) {
                    this.updateContentSize();
                    this.checkIfNeedUpdateItemPos();
                }
                return true;
            }
    
            // 检查是否需要添加新的底部项 (BottomToTop)
            if (topPos1.y - this.viewPortRectLocalCorners[1].y < distanceForNew1) {
                if (tViewItem1.itemIndex > this.curReadyMaxItemIndex) {
                    this.curReadyMaxItemIndex = tViewItem1.itemIndex;
                    this.needCheckNextMaxItem = true;
                }
                
                const nIndex = tViewItem1.itemIndex + 1;
                if (nIndex <= this.curReadyMaxItemIndex || this.needCheckNextMaxItem) {
                    const newItem = this.getNewItemByIndex(nIndex);
                    if (!newItem) {
                        this.needCheckNextMaxItem = false;
                        this.checkIfNeedUpdateItemPos();
                    } else {
                        if (this.mSupportScrollBar) {
                            this.setItemSize(nIndex, newItem.uiTransform.height, newItem.padding);
                        }
                        
                        this.mItemList.push(newItem);
                        const y = tViewItem1.node.position.y + tViewItem1.uiTransform.height + tViewItem1.padding;
                        newItem.node.setPosition(new Vec3(newItem.startPosOffset, y, 0));
                        
                        this.updateContentSize();
                        this.checkIfNeedUpdateItemPos();
                        
                        if (nIndex > this.curReadyMaxItemIndex) {
                            this.curReadyMaxItemIndex = nIndex;
                        }
                        return true;
                    }
                }
            }
    
            // 检查是否需要添加新的顶部项 (BottomToTop)
            if (this.viewPortRectLocalCorners[0].y - downPos0.y < distanceForNew0) {
                if (tViewItem0.itemIndex < this.curReadyMinItemIndex) {
                    this.curReadyMinItemIndex = tViewItem0.itemIndex;
                    this.needCheckNextMinItem = true;
                }

                const nIndex = tViewItem0.itemIndex - 1;
                if (nIndex >= this.curReadyMinItemIndex || this.needCheckNextMinItem) {
                    const newItem = this.getNewItemByIndex(nIndex);
                    if (!newItem) {
                        this.needCheckNextMinItem = false;
                        return false;
                    } else {
                        if (this.mSupportScrollBar) {
                            this.setItemSize(nIndex, newItem.uiTransform.height, newItem.padding);
                        }
                        
                        this.mItemList.unshift(newItem);
                        const y = tViewItem0.node.position.y - newItem.uiTransform.height - newItem.padding;
                        newItem.node.setPosition(new Vec3(newItem.startPosOffset, y, 0));
                        
                        this.updateContentSize();
                        this.checkIfNeedUpdateItemPos();
                        
                        if (nIndex < this.curReadyMinItemIndex) {
                            this.curReadyMinItemIndex = nIndex;
                        }
                        return true;
                    }
                }
            }
        }
    
        return false;
    }

    // 水平列表更新
    private updateForHorizontalList(
        distanceForRecycle0: number,
        distanceForRecycle1: number,
        distanceForNew0: number,
        distanceForNew1: number
    ): boolean {
        if (this.mItemTotalCount === 0) {
            if (this.mItemList.length > 0) {
                this.recycleAllItem();
            }
            return false;
        }
    
        if (this.arrangeType === ListItemArrangeType.LeftToRight) {
            if (this.mItemList.length === 0) {
                let curX = this.mContainerTrans.node.position.x;
                if (curX > 0) {
                    curX = 0;
                }
    
                let index = 0;
                let pos = -curX;
                
                if (this.mSupportScrollBar) {
                    const res = this.getPlusItemIndexAndPosAtGivenPos(-curX);
                    if (!res) {
                        return false;
                    }
                    index = res.index;
                    pos = res.itemPos;
                }
    
                const newItem = this.getNewItemByIndex(index);
                if (!newItem) {
                    return false;
                }
    
                if (this.mSupportScrollBar) {
                    this.setItemSize(index, newItem.uiTransform.width, newItem.padding);
                }
    
                this.mItemList.push(newItem);
                newItem.node.setPosition(new Vec3(pos, newItem.startPosOffset, 0));
                this.updateContentSize();
                return true;
            }
    
            const tViewItem0 = this.mItemList[0];
            tViewItem0.getWorldCorners(this.itemWorldCorners);
            
            const leftPos0 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(leftPos0,this.itemWorldCorners[1]);
            const rightPos0 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(rightPos0,this.itemWorldCorners[2]);
    
            if (!this.mIsDraging && 
                tViewItem0.itemCreatedCheckFrameCount !== this.listUpdateCheckFrameCount &&
                this.viewPortRectLocalCorners[1].x - rightPos0.x > distanceForRecycle0) {
                
                this.mItemList.splice(0, 1);
                this.recycleItemTmp(tViewItem0);
                
                if (!this.mSupportScrollBar) {
                    this.updateContentSize();
                    this.checkIfNeedUpdateItemPos();
                }
                return true;
            }
    
            const tViewItem1 = this.mItemList[this.mItemList.length - 1];
            tViewItem1.getWorldCorners(this.itemWorldCorners);
            
            const leftPos1 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(leftPos1,this.itemWorldCorners[1]);
            const rightPos1 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(rightPos1,this.itemWorldCorners[2]);
    
            if (!this.mIsDraging && 
                tViewItem1.itemCreatedCheckFrameCount !== this.listUpdateCheckFrameCount &&
                leftPos1.x - this.viewPortRectLocalCorners[2].x > distanceForRecycle1) {
                
                this.mItemList.pop();
                this.recycleItemTmp(tViewItem1);
                
                if (!this.mSupportScrollBar) {
                    this.updateContentSize();
                    this.checkIfNeedUpdateItemPos();
                }
                return true;
            }
    
            // 检查是否需要添加新的右侧项
            if (rightPos1.x - this.viewPortRectLocalCorners[2].x < distanceForNew1) {
                if (tViewItem1.itemIndex > this.curReadyMaxItemIndex) {
                    this.curReadyMaxItemIndex = tViewItem1.itemIndex;
                    this.needCheckNextMaxItem = true;
                }
                
                const nIndex = tViewItem1.itemIndex + 1;
                if (nIndex <= this.curReadyMaxItemIndex || this.needCheckNextMaxItem) {
                    const newItem = this.getNewItemByIndex(nIndex);
                    if (!newItem) {
                        this.curReadyMaxItemIndex = tViewItem1.itemIndex;
                        this.needCheckNextMaxItem = false;
                        this.checkIfNeedUpdateItemPos();
                    } else {
                        if (this.mSupportScrollBar) {
                            this.setItemSize(nIndex, newItem.uiTransform.width, newItem.padding);
                        }
                        
                        this.mItemList.push(newItem);
                        const x = tViewItem1.node.position.x + tViewItem1.uiTransform.width + tViewItem1.padding;
                        newItem.node.setPosition(new Vec3(x, newItem.startPosOffset, 0));
                        
                        this.updateContentSize();
                        this.checkIfNeedUpdateItemPos();
                        
                        if (nIndex > this.curReadyMaxItemIndex) {
                            this.curReadyMaxItemIndex = nIndex;
                        }
                        return true;
                    }
                }
            }
    
            // 检查是否需要添加新的左侧项
            if (this.viewPortRectLocalCorners[1].x - leftPos0.x < distanceForNew0) {
                if (tViewItem0.itemIndex < this.curReadyMinItemIndex) {
                    this.curReadyMinItemIndex = tViewItem0.itemIndex;
                    this.needCheckNextMinItem = true;
                }
                
                const nIndex = tViewItem0.itemIndex - 1;
                if (nIndex >= this.curReadyMinItemIndex || this.needCheckNextMinItem) {
                    const newItem = this.getNewItemByIndex(nIndex);
                    if (!newItem) {
                        this.curReadyMinItemIndex = tViewItem0.itemIndex;
                        this.needCheckNextMinItem = false;
                    } else {
                        if (this.mSupportScrollBar) {
                            this.setItemSize(nIndex, newItem.uiTransform.width, newItem.padding);
                        }
                        
                        this.mItemList.unshift(newItem);
                        const x = tViewItem0.node.position.x - newItem.uiTransform.width - newItem.padding;
                        newItem.node.setPosition(new Vec3(x, newItem.startPosOffset, 0));
                        
                        this.updateContentSize();
                        this.checkIfNeedUpdateItemPos();
                        
                        if (nIndex < this.curReadyMinItemIndex) {
                            this.curReadyMinItemIndex = nIndex;
                        }
                        return true;
                    }
                }
            }
        } else { // RightToLeft 排列
            if (this.mItemList.length === 0) {
                let curX = this.mContainerTrans.node.position.x;
                if (curX < 0) {
                    curX = 0;
                }
                
                let index = 0;
                let pos = -curX;
                
                if (this.mSupportScrollBar) {
                    const res = this.getPlusItemIndexAndPosAtGivenPos(curX);
                    if (!res) {
                        return false;
                    }
                    index = res.index;
                    pos = res.itemPos;
                    pos = -pos;
                }
                
                const newItem = this.getNewItemByIndex(index);
                if (!newItem) {
                    return false;
                }
                
                if (this.mSupportScrollBar) {
                    this.setItemSize(index, newItem.uiTransform.width, newItem.padding);
                }
                
                this.mItemList.push(newItem);
                newItem.node.setPosition(new Vec3(pos, newItem.startPosOffset, 0));
                this.updateContentSize();
                return true;
            }
            
            const tViewItem0 = this.mItemList[0];
            tViewItem0.getWorldCorners(this.itemWorldCorners);
            
            const leftPos0 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(leftPos0,this.itemWorldCorners[1]);
            const rightPos0 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(rightPos0,this.itemWorldCorners[2]);
    
            if (!this.mIsDraging && 
                tViewItem0.itemCreatedCheckFrameCount !== this.listUpdateCheckFrameCount &&
                leftPos0.x - this.viewPortRectLocalCorners[2].x > distanceForRecycle0) {
                
                this.mItemList.splice(0, 1);
                this.recycleItemTmp(tViewItem0);
                
                if (!this.mSupportScrollBar) {
                    this.updateContentSize();
                    this.checkIfNeedUpdateItemPos();
                }
                return true;
            }
    
            const tViewItem1 = this.mItemList[this.mItemList.length - 1];
            tViewItem1.getWorldCorners(this.itemWorldCorners);
            
            const leftPos1 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(leftPos1,this.itemWorldCorners[1]);
            const rightPos1 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(rightPos1,this.itemWorldCorners[2]);
    
            if (!this.mIsDraging && 
                tViewItem1.itemCreatedCheckFrameCount !== this.listUpdateCheckFrameCount &&
                this.viewPortRectLocalCorners[1].x - rightPos1.x > distanceForRecycle1) {
                
                this.mItemList.pop();
                this.recycleItemTmp(tViewItem1);
                
                if (!this.mSupportScrollBar) {
                    this.updateContentSize();
                    this.checkIfNeedUpdateItemPos();
                }
                return true;
            }
    
            // 检查是否需要添加新的左侧项 (RightToLeft)
            if (this.viewPortRectLocalCorners[1].x - leftPos1.x < distanceForNew1) {
                if (tViewItem1.itemIndex > this.curReadyMaxItemIndex) {
                    this.curReadyMaxItemIndex = tViewItem1.itemIndex;
                    this.needCheckNextMaxItem = true;
                }
                
                const nIndex = tViewItem1.itemIndex + 1;
                if (nIndex <= this.curReadyMaxItemIndex || this.needCheckNextMaxItem) {
                    const newItem = this.getNewItemByIndex(nIndex);
                    if (!newItem) {
                        this.curReadyMaxItemIndex = tViewItem1.itemIndex;
                        this.needCheckNextMaxItem = false;
                        this.checkIfNeedUpdateItemPos();
                    } else {
                        if (this.mSupportScrollBar) {
                            this.setItemSize(nIndex, newItem.uiTransform.width, newItem.padding);
                        }
                        
                        this.mItemList.push(newItem);
                        const x = tViewItem1.node.position.x - tViewItem1.uiTransform.width - tViewItem1.padding;
                        newItem.node.setPosition(new Vec3(x, newItem.startPosOffset, 0));
                        
                        this.updateContentSize();
                        this.checkIfNeedUpdateItemPos();
                        
                        if (nIndex > this.curReadyMaxItemIndex) {
                            this.curReadyMaxItemIndex = nIndex;
                        }
                        return true;
                    }
                }
            }
    
            // 检查是否需要添加新的右侧项 (RightToLeft)
            if (rightPos0.x - this.viewPortRectLocalCorners[2].x < distanceForNew0) {
                if (tViewItem0.itemIndex < this.curReadyMinItemIndex) {
                    this.curReadyMinItemIndex = tViewItem0.itemIndex;
                    this.needCheckNextMinItem = true;
                }
                
                const nIndex = tViewItem0.itemIndex - 1;
                if (nIndex >= this.curReadyMinItemIndex || this.needCheckNextMinItem) {
                    const newItem = this.getNewItemByIndex(nIndex);
                    if (!newItem) {
                        this.curReadyMinItemIndex = tViewItem0.itemIndex;
                        this.needCheckNextMinItem = false;
                    } else {
                        if (this.mSupportScrollBar) {
                            this.setItemSize(nIndex, newItem.uiTransform.width, newItem.padding);
                        }
                        
                        this.mItemList.unshift(newItem);
                        const x = tViewItem0.node.position.x + newItem.uiTransform.width + newItem.padding;
                        newItem.node.setPosition(new Vec3(x, newItem.startPosOffset, 0));
                        
                        this.updateContentSize();
                        this.checkIfNeedUpdateItemPos();
                        
                        if (nIndex < this.curReadyMinItemIndex) {
                            this.curReadyMinItemIndex = nIndex;
                        }
                        return true;
                    }
                }
            }
        }
    
        return false;
    }

    // 更新内容大小
    private updateContentSize(): void {
        const size = this.getContentPanelSize();
        if (this.mIsVertList) {
            if (this.mContainerTrans.height !== size) {
                this.mContainerTrans.setContentSize(new math.Size(this.mContainerTrans.width, size));
            }
        } else {
            if (this.mContainerTrans.width !== size) {
                this.mContainerTrans.setContentSize(new math.Size(size, this.mContainerTrans.height));
            }
        }
    }

    // 获取内容面板大小
    private getContentPanelSize(): number {
        if (this.mSupportScrollBar) {
            const totalSize = this.itemPosMgr.mTotalSize > 0 ? this.itemPosMgr.mTotalSize - this.lastItemPadding : 0;
            return Math.max(0, totalSize);
        }

        const count = this.mItemList.length;
        if (count === 0) return 0;
        if (count === 1) return this.mItemList[0].itemSize;
        if (count === 2) return this.mItemList[0].itemSizeWithPadding + this.mItemList[1].itemSize;

        let size = 0;
        for (let i = 0; i < count - 1; i++) {
            size += this.mItemList[i].itemSizeWithPadding;
        }
        size += this.mItemList[count - 1].itemSize;
        return size;
    }

    // 更新所有显示项位置
    private updateAllShownItemsPos(): void {
        const count = this.mItemList.length;
        if (count === 0) {
            return;
        }
    
        // 计算调整向量（用于拖动时的速度调整）
        const currentPos = this.mContainerTrans.node.position.clone();
        this.adjustedVec = currentPos.subtract(this.lastFrameContainerPos).multiplyScalar(1 / game.deltaTime).toVec2();
        
        if (this.arrangeType === ListItemArrangeType.TopToBottom) {
            let pos = 0;
            if (this.mSupportScrollBar) {
                pos = -this.getItemPos(this.mItemList[0].itemIndex);
            }
            
            const pos1 = this.mItemList[0].node.position.y;
            const d = pos - pos1;
            let curY = pos;
            for (let i = 0; i < count; i++) {
                const item = this.mItemList[i];
                item.node.setPosition(new Vec3(item.startPosOffset, curY, 0));
                curY -= item.uiTransform.height + item.padding;
            }
            
            if (d !== 0) {
                const p = this.mContainerTrans.node.position;
                this.mContainerTrans.node.setPosition(p.x, p.y - d, p.z);
            }
        } 
        else if (this.arrangeType === ListItemArrangeType.BottomToTop) {
            let pos = 0;
            if (this.mSupportScrollBar) {
                pos = this.getItemPos(this.mItemList[0].itemIndex);
            }
            
            const pos1 = this.mItemList[0].node.position.y;
            const d = pos - pos1;
            let curY = pos;
            
            for (let i = 0; i < count; i++) {
                const item = this.mItemList[i];
                item.node.setPosition(new Vec3(item.startPosOffset, curY, 0));
                curY += item.uiTransform.height + item.padding;
            }
            
            if (d !== 0) {
                const p = this.mContainerTrans.node.position;
                this.mContainerTrans.node.setPosition(p.x, p.y - d, p.z);
            }
        } 
        else if (this.arrangeType === ListItemArrangeType.LeftToRight) {
            let pos = 0;
            if (this.mSupportScrollBar) {
                pos = this.getItemPos(this.mItemList[0].itemIndex);
            }
            
            const pos1 = this.mItemList[0].node.position.x;
            const d = pos - pos1;
            let curX = pos;
            
            for (let i = 0; i < count; i++) {
                const item = this.mItemList[i];
                item.node.setPosition(new Vec3(curX, item.startPosOffset, 0));
                curX += item.uiTransform.width + item.padding;
            }
            
            if (d !== 0) {
                const p = this.mContainerTrans.node.position;
                this.mContainerTrans.node.setPosition(p.x-d, p.y, p.z);
            }
        } 
        else if (this.arrangeType === ListItemArrangeType.RightToLeft) {
            let pos = 0;
            if (this.mSupportScrollBar) {
                pos = -this.getItemPos(this.mItemList[0].itemIndex);
            }
            
            const pos1 = this.mItemList[0].node.position.x;
            const d = pos - pos1;
            let curX = pos;
            
            for (let i = 0; i < count; i++) {
                const item = this.mItemList[i];
                item.node.setPosition(new Vec3(curX, item.startPosOffset, 0));
                curX -= item.uiTransform.width + item.padding;
            }
            
            if (d !== 0) {
                const p = this.mContainerTrans.node.position;
                this.mContainerTrans.node.setPosition(p.x-d, p.y, p.z);
            }
        }
        
        // 处理拖动状态下的调整
        if (this.mIsDraging && this.pointerEventData) {
            if(!!(this.mScrollRect as any).velocity){//todo: 更改引擎代码以支持修改速度
                (this.mScrollRect as any).velocity = this.adjustedVec;
            }
            this.needAdjustVec = true;
        }
    }

    // 强制吸附检查
    private forceSnapUpdateCheck(): void {
        if (this.leftSnapUpdateExtraCount <= 0) {
            this.leftSnapUpdateExtraCount = 1;
        }
    }

    // 更新吸附移动
    private updateSnapMove(immediate: boolean = false, forceSendEvent: boolean = false): void {
        if (!this.mItemSnapEnable) return;
        if (this.mIsVertList) {
            this.updateSnapVertical(immediate, forceSendEvent);
        } else {
            this.updateSnapHorizontal(immediate, forceSendEvent);
        }
    }

    private updateSnapVertical(immediate: boolean = false, forceSendEvent: boolean = false): void {
        if (!this.mItemSnapEnable) return;
        const count = this.mItemList.length;
        if (count === 0) return;

        const pos = this.mContainerTrans.node.position.clone();
        let needCheck = !Vec3.equals(pos, this.lastSnapCheckPos);
        this.lastSnapCheckPos = pos.clone();

        if (!needCheck) {
            if (this.leftSnapUpdateExtraCount > 0) {
                this.leftSnapUpdateExtraCount--;
                needCheck = true;
            }
        }

        if (needCheck) {
            const tViewItem0 = this.mItemList[0];
            tViewItem0.getWorldCorners(this.itemWorldCorners);
            
            let curIndex = -1;
            let start = 0;
            let end = 0;
            let itemSnapCenter = 0;
            let curMinDist = Number.MAX_VALUE;
            let snapCenter = 0;
            
            if (this.arrangeType === ListItemArrangeType.TopToBottom) {
                snapCenter = -(1 - this.viewPortSnapPivot.y) * this.viewPortRectTransform.height;
                
                const topPos1 = new Vec3();
                this.viewPortRectTransform.node.inverseTransformPoint(topPos1,this.itemWorldCorners[1]);
                start = topPos1.y;
                end = start - tViewItem0.itemSizeWithPadding;
                itemSnapCenter = start - tViewItem0.itemSize * (1 - this.itemSnapPivot.y);
                
                for (let i = 0; i < count; i++) {
                    const curDist = snapCenter - itemSnapCenter;
                    const curDistAbs = Math.abs(curDist);
                    
                    if (curDistAbs < curMinDist) {
                        curMinDist = curDistAbs;
                        curIndex = i;
                    } else {
                        break;
                    }
                    
                    if (i + 1 < count) {
                        start = end;
                        end = end - this.mItemList[i + 1].itemSizeWithPadding;
                        itemSnapCenter = start - this.mItemList[i + 1].itemSize * (1 - this.itemSnapPivot.y);
                    }
                }
            } 
            else if (this.arrangeType === ListItemArrangeType.BottomToTop) {
                snapCenter = this.viewPortSnapPivot.y * this.viewPortRectTransform.height;
                
                const bottomPos1 = new Vec3();
                this.viewPortRectTransform.node.inverseTransformPoint(bottomPos1,this.itemWorldCorners[0]);
                start = bottomPos1.y;
                end = start + tViewItem0.itemSizeWithPadding;
                itemSnapCenter = start + tViewItem0.itemSize * this.itemSnapPivot.y;
                
                for (let i = 0; i < count; i++) {
                    const curDist = snapCenter - itemSnapCenter;
                    const curDistAbs = Math.abs(curDist);
                    
                    if (curDistAbs < curMinDist) {
                        curMinDist = curDistAbs;
                        curIndex = i;
                    } else {
                        break;
                    }
                    
                    if (i + 1 < count) {
                        start = end;
                        end = end + this.mItemList[i + 1].itemSizeWithPadding;
                        itemSnapCenter = start + this.mItemList[i + 1].itemSize * this.itemSnapPivot.y;
                    }
                }
            }

            if (curIndex >= 0) {
                const oldNearestItemIndex = this.mCurSnapNearestItemIndex;
                this.mCurSnapNearestItemIndex = this.mItemList[curIndex].itemIndex;
                
                if (forceSendEvent || this.mItemList[curIndex].itemIndex !== oldNearestItemIndex) {
                    if (this.onSnapNearestChanged) {
                        this.onSnapNearestChanged(this, this.mItemList[curIndex]);
                    }
                }
            } else {
                this.mCurSnapNearestItemIndex = -1;
            }
        }

        if (!this.canSnap()) {
            this.clearSnapData();
            return;
        }

        const v = Math.abs(this.mScrollRect.getScrollOffset().y);
        this.updateCurSnapData();
        
        if (this.curSnapData.mSnapStatus !== SnapStatus.SnapMoving) {
            return;
        }

        if (v > 0) {
            this.mScrollRect.stopAutoScroll();
        }

        const old = this.curSnapData.mCurSnapVal;
        if (!this.curSnapData.mIsTempTarget) {
            if (this.smoothDumpVel * this.curSnapData.mTargetSnapVal < 0) {
                this.smoothDumpVel = 0;
            }
            this.curSnapData.mCurSnapVal = this.smoothDamp(
                this.curSnapData.mCurSnapVal,
                this.curSnapData.mTargetSnapVal,
                this.smoothDumpVel,
                this.smoothDumpRate
            );
        } else {
            let maxAbsVec = this.curSnapData.mMoveMaxAbsVec;
            if (maxAbsVec <= 0) {
                maxAbsVec = this.mSnapMoveDefaultMaxAbsVec;
            }
            this.smoothDumpVel = maxAbsVec * Math.sign(this.curSnapData.mTargetSnapVal);
            this.curSnapData.mCurSnapVal = this.moveTowards(
                this.curSnapData.mCurSnapVal,
                this.curSnapData.mTargetSnapVal,
                maxAbsVec * game.deltaTime
            );
        }

        const dt = this.curSnapData.mCurSnapVal - old;
        const containerPos = this.mContainerTrans.node.position.clone();
        
        if (immediate || Math.abs(this.curSnapData.mTargetSnapVal - this.curSnapData.mCurSnapVal) < this.snapFinishThreshold) {
            containerPos.y += this.curSnapData.mTargetSnapVal - old;
            this.curSnapData.mSnapStatus = SnapStatus.SnapMoveFinish;
            
            if (this.onSnapItemFinished) {
                const targetItem = this.getShownItemByItemIndex(this.mCurSnapNearestItemIndex);
                if (targetItem) {
                    this.onSnapItemFinished(this, targetItem);
                }
            }
        } else {
            containerPos.y += dt;
        }

        // 限制容器位置在有效范围内
        if (this.arrangeType === ListItemArrangeType.TopToBottom) {
            const maxY = this.viewPortRectLocalCorners[0].y + this.mContainerTrans.height;
            containerPos.y = Math.max(0, Math.min(containerPos.y, maxY));
        } 
        else if (this.arrangeType === ListItemArrangeType.BottomToTop) {
            const minY = this.viewPortRectLocalCorners[1].y - this.mContainerTrans.height;
            containerPos.y = Math.max(minY, Math.min(containerPos.y, 0));
        }

        this.mContainerTrans.node.setPosition(containerPos);
    }

    private updateCurSnapData(): void {
        const count = this.mItemList.length;
        if (count === 0) {
            this.curSnapData.clear();
            return;
        }
    
        const snapData = this.curSnapData;
        
        if (snapData.mSnapStatus === SnapStatus.SnapMoveFinish) {
            if (snapData.mSnapTargetIndex === this.mCurSnapNearestItemIndex) {
                return;
            }
            snapData.mSnapStatus = SnapStatus.NoTargetSet;
        }
        
        if (snapData.mSnapStatus === SnapStatus.SnapMoving) {
            if (snapData.mIsForceSnapTo) {
                if (snapData.mIsTempTarget) {
                    const targetItem = this.getShownItemNearestItemIndex(snapData.mSnapTargetIndex);
                    if (!targetItem) {
                        snapData.clear();
                        return;
                    }
                    
                    if (targetItem.itemIndex === snapData.mSnapTargetIndex) {
                        this.updateAllShownItemSnapData();
                        snapData.mTargetSnapVal = targetItem.distanceWithViewPortSnapCenter;
                        snapData.mCurSnapVal = 0;
                        snapData.mIsTempTarget = false;
                        snapData.mSnapStatus = SnapStatus.SnapMoving;
                        return;
                    }
                    
                    if (snapData.mTempTargetIndex !== targetItem.itemIndex) {
                        this.updateAllShownItemSnapData();
                        snapData.mTargetSnapVal = targetItem.distanceWithViewPortSnapCenter;
                        snapData.mCurSnapVal = 0;
                        snapData.mSnapStatus = SnapStatus.SnapMoving;
                        snapData.mIsTempTarget = true;
                        snapData.mTempTargetIndex = targetItem.itemIndex;
                        return;
                    }
                }
                return;
            }
            
            if (snapData.mSnapTargetIndex === this.mCurSnapNearestItemIndex) {
                return;
            }
            
            snapData.mSnapStatus = SnapStatus.NoTargetSet;
        }
        
        if (snapData.mSnapStatus === SnapStatus.NoTargetSet) {
            const nearestItem = this.getShownItemByItemIndex(this.mCurSnapNearestItemIndex);
            if (!nearestItem) return;
            
            snapData.mSnapTargetIndex = this.mCurSnapNearestItemIndex;
            snapData.mSnapStatus = SnapStatus.TargetHasSet;
            snapData.mIsForceSnapTo = false;
        }
        
        if (snapData.mSnapStatus === SnapStatus.TargetHasSet) {
            const targetItem = this.getShownItemNearestItemIndex(snapData.mSnapTargetIndex);
            if (!targetItem) {
                snapData.clear();
                return;
            }
            
            this.updateAllShownItemSnapData();
            
            if (targetItem.itemIndex === snapData.mSnapTargetIndex) {
                snapData.mTargetSnapVal = targetItem.distanceWithViewPortSnapCenter;
                snapData.mCurSnapVal = 0;
                snapData.mIsTempTarget = false;
                snapData.mSnapStatus = SnapStatus.SnapMoving;
            } else {
                snapData.mTargetSnapVal = targetItem.distanceWithViewPortSnapCenter;
                snapData.mCurSnapVal = 0;
                snapData.mSnapStatus = SnapStatus.SnapMoving;
                snapData.mIsTempTarget = true;
                snapData.mTempTargetIndex = targetItem.itemIndex;
            }
        }
    }

    // 清除吸附数据
    public clearSnapData(): void {
        this.curSnapData.clear();
    }
    /**
     * 设置吸附目标列表项索引，并进行边界检查
     * @param itemIndex 目标索引
     * @param moveMaxAbsVec 最大移动速度，-1表示使用默认值
     */
    public setSnapTargetItemIndex(itemIndex: number, moveMaxAbsVec: number = -1): void {
        if (this.mItemTotalCount > 0) {
            // 边界检查，确保索引在有效范围内
            if (itemIndex >= this.mItemTotalCount) {
                itemIndex = this.mItemTotalCount - 1;
            }
            if (itemIndex < 0) {
                itemIndex = 0;
            }
        }
        
        // 停止当前滚动
        this.mScrollRect.stopAutoScroll();
        
        // 更新吸附数据
        this.curSnapData.mSnapTargetIndex = itemIndex;
        this.curSnapData.mSnapStatus = SnapStatus.TargetHasSet;
        this.curSnapData.mIsForceSnapTo = true;
        this.curSnapData.mMoveMaxAbsVec = moveMaxAbsVec;
    }

    // 平滑阻尼函数 (代替Mathf.SmoothDamp)
    private smoothDamp(current: number, target: number, currentVelocity: number, smoothTime: number): number {
        const deltaTime = game.deltaTime;
        const num = 2 / smoothTime;
        const num2 = num * deltaTime;
        const num3 = 1 / (1 + num2 + 0.48 * num2 * num2 + 0.235 * num2 * num2 * num2);
        const num4 = current - target;
        const num5 = target;
        const num6 = (currentVelocity + num * num4) * deltaTime;
        currentVelocity = (currentVelocity - num * num6) * num3;
        let num7 = num4 + (num6 + num4) * num3;
        
        if (num5 - current > 0 === num7 > 0) {
            num7 = num5;
            currentVelocity = (num7 - num5) / deltaTime;
        }
        
        return num7 + num5;
    }

    // 模拟MoveTowards
    private moveTowards(current: number, target: number, maxDelta: number): number {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }
        return current + Math.sign(target - current) * maxDelta;
    }

    // 更新所有显示项的吸附数据
    private updateAllShownItemSnapData(): void {
        if (!this.mItemSnapEnable) return;
        const count = this.mItemList.length;
        if (count === 0) return;
        
        const pos = this.mContainerTrans.node.position.clone();
        const tViewItem0 = this.mItemList[0];
        tViewItem0.getWorldCorners(this.itemWorldCorners);
        
        let start = 0;
        let end = 0;
        let itemSnapCenter = 0;
        let snapCenter = 0;
        
        if (this.arrangeType === ListItemArrangeType.TopToBottom) {
            snapCenter = -(1 - this.viewPortSnapPivot.y) * this.viewPortRectTransform.height;
            const topPos1 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(topPos1,this.itemWorldCorners[1]);
            start = topPos1.y;
            end = start - tViewItem0.itemSizeWithPadding;
            itemSnapCenter = start - tViewItem0.itemSize * (1 - this.itemSnapPivot.y);
            
            for (let i = 0; i < count; i++) {
                this.mItemList[i].distanceWithViewPortSnapCenter = snapCenter - itemSnapCenter;
                
                if (i + 1 < count) {
                    start = end;
                    end = end - this.mItemList[i + 1].itemSizeWithPadding;
                    itemSnapCenter = start - this.mItemList[i + 1].itemSize * (1 - this.itemSnapPivot.y);
                }
            }
        } 
        else if (this.arrangeType === ListItemArrangeType.BottomToTop) {
            snapCenter = this.viewPortSnapPivot.y * this.viewPortRectTransform.height;
            const bottomPos1 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(bottomPos1,this.itemWorldCorners[0]);
            start = bottomPos1.y;
            end = start + tViewItem0.itemSizeWithPadding;
            itemSnapCenter = start + tViewItem0.itemSize * this.itemSnapPivot.y;
            
            for (let i = 0; i < count; i++) {
                this.mItemList[i].distanceWithViewPortSnapCenter = snapCenter - itemSnapCenter;
                
                if (i + 1 < count) {
                    start = end;
                    end = end + this.mItemList[i + 1].itemSizeWithPadding;
                    itemSnapCenter = start + this.mItemList[i + 1].itemSize * this.itemSnapPivot.y;
                }
            }
        } 
        else if (this.arrangeType === ListItemArrangeType.LeftToRight) {
            snapCenter = this.viewPortSnapPivot.x * this.viewPortRectTransform.width;
            const leftPos1 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(leftPos1,this.itemWorldCorners[1]);
            start = leftPos1.x;
            end = start + tViewItem0.itemSizeWithPadding;
            itemSnapCenter = start + tViewItem0.itemSize * this.itemSnapPivot.x;
            
            for (let i = 0; i < count; i++) {
                this.mItemList[i].distanceWithViewPortSnapCenter = snapCenter - itemSnapCenter;
                
                if (i + 1 < count) {
                    start = end;
                    end = end + this.mItemList[i + 1].itemSizeWithPadding;
                    itemSnapCenter = start + this.mItemList[i + 1].itemSize * this.itemSnapPivot.x;
                }
            }
        } 
        else if (this.arrangeType === ListItemArrangeType.RightToLeft) {
            snapCenter = -(1 - this.viewPortSnapPivot.x) * this.viewPortRectTransform.width;
            const rightPos1 = new Vec3();
            this.viewPortRectTransform.node.inverseTransformPoint(rightPos1,this.itemWorldCorners[2]);
            start = rightPos1.x;
            end = start - tViewItem0.itemSizeWithPadding;
            itemSnapCenter = start - tViewItem0.itemSize * (1 - this.itemSnapPivot.x);
            
            for (let i = 0; i < count; i++) {
                this.mItemList[i].distanceWithViewPortSnapCenter = snapCenter - itemSnapCenter;
                
                if (i + 1 < count) {
                    start = end;
                    end = end - this.mItemList[i + 1].itemSizeWithPadding;
                    itemSnapCenter = start - this.mItemList[i + 1].itemSize * (1 - this.itemSnapPivot.x);
                }
            }
        }
    }

    // 检查是否可以吸附
    private canSnap(): boolean {
        if (this.mIsDraging) return false;
        
        if (this.scrollBarClickEventListener && this.scrollBarClickEventListener.isPressed) {
            return false;
        }
        
        if (this.mIsVertList) {
            if (this.mContainerTrans.height <= this.viewPortHeight) {
                return false;
            }
        } else {
            if (this.mContainerTrans.width <= this.viewPortWidth) {
                return false;
            }
        }
        
        const scrollOffset = this.mScrollRect.getScrollOffset();
        const v = this.mIsVertList ? Math.abs(scrollOffset.y) : Math.abs(scrollOffset.x);
        
        if (v > this.snapVecThreshold) {
            return false;
        }
        
        const diff = 3;
        const containerPos = this.mContainerTrans.node.position.clone();
        
        if (this.arrangeType === ListItemArrangeType.LeftToRight) {
            const minX = this.viewPortRectLocalCorners[2].x - this.mContainerTrans.width;
            if (containerPos.x < minX - diff || containerPos.x > diff) {
                return false;
            }
        } 
        else if (this.arrangeType === ListItemArrangeType.RightToLeft) {
            const maxX = this.viewPortRectLocalCorners[1].x + this.mContainerTrans.width;
            if (containerPos.x > maxX + diff || containerPos.x < -diff) {
                return false;
            }
        } 
        else if (this.arrangeType === ListItemArrangeType.TopToBottom) {
            const maxY = this.viewPortRectLocalCorners[0].y + this.mContainerTrans.height;
            if (containerPos.y > maxY + diff || containerPos.y < -diff) {
                return false;
            }
        } 
        else if (this.arrangeType === ListItemArrangeType.BottomToTop) {
            const minY = this.viewPortRectLocalCorners[1].y - this.mContainerTrans.height;
            if (containerPos.y < minY - diff || containerPos.y > diff) {
                return false;
            }
        }
        
        return true;
    }
    
    private updateSnapHorizontal(immediate: boolean = false, forceSendEvent: boolean = false): void {
        if (!this.mItemSnapEnable) return;
        const count = this.mItemList.length;
        if (count === 0) return;
    
        const pos = this.mContainerTrans.node.position.clone();
        let needCheck = !Vec3.equals(pos, this.lastSnapCheckPos);
        this.lastSnapCheckPos = pos.clone();
    
        if (!needCheck) {
            if (this.leftSnapUpdateExtraCount > 0) {
                this.leftSnapUpdateExtraCount--;
                needCheck = true;
            }
        }
    
        if (needCheck) {
            const tViewItem0 = this.mItemList[0];
            tViewItem0.getWorldCorners(this.itemWorldCorners);
            
            let curIndex = -1;
            let start = 0;
            let end = 0;
            let itemSnapCenter = 0;
            let curMinDist = Number.MAX_VALUE;
            let snapCenter = 0;
            
            if (this.arrangeType === ListItemArrangeType.RightToLeft) {
                snapCenter = -(1 - this.viewPortSnapPivot.x) * this.viewPortRectTransform.width;
                
                const rightPos1 = new Vec3();
                this.viewPortRectTransform.node.inverseTransformPoint(rightPos1, this.itemWorldCorners[2]);
                start = rightPos1.x;
                end = start - tViewItem0.itemSizeWithPadding;
                itemSnapCenter = start - tViewItem0.itemSize * (1 - this.itemSnapPivot.x);
                
                for (let i = 0; i < count; i++) {
                    const curDist = snapCenter - itemSnapCenter;
                    const curDistAbs = Math.abs(curDist);
                    
                    if (curDistAbs < curMinDist) {
                        curMinDist = curDistAbs;
                        curIndex = i;
                    } else {
                        break;
                    }
                    
                    if (i + 1 < count) {
                        start = end;
                        end = end - this.mItemList[i + 1].itemSizeWithPadding;
                        itemSnapCenter = start - this.mItemList[i + 1].itemSize * (1 - this.itemSnapPivot.x);
                    }
                }
            } 
            else if (this.arrangeType === ListItemArrangeType.LeftToRight) {
                snapCenter = this.viewPortSnapPivot.x * this.viewPortRectTransform.width;
                
                const leftPos1 = new Vec3();
                this.viewPortRectTransform.node.inverseTransformPoint(leftPos1,this.itemWorldCorners[1]);
                start = leftPos1.x;
                end = start + tViewItem0.itemSizeWithPadding;
                itemSnapCenter = start + tViewItem0.itemSize * this.itemSnapPivot.x;
                
                for (let i = 0; i < count; i++) {
                    const curDist = snapCenter - itemSnapCenter;
                    const curDistAbs = Math.abs(curDist);
                    
                    if (curDistAbs < curMinDist) {
                        curMinDist = curDistAbs;
                        curIndex = i;
                    } else {
                        break;
                    }
                    
                    if (i + 1 < count) {
                        start = end;
                        end = end + this.mItemList[i + 1].itemSizeWithPadding;
                        itemSnapCenter = start + this.mItemList[i + 1].itemSize * this.itemSnapPivot.x;
                    }
                }
            }
    
            if (curIndex >= 0) {
                const oldNearestItemIndex = this.mCurSnapNearestItemIndex;
                this.mCurSnapNearestItemIndex = this.mItemList[curIndex].itemIndex;
                
                if (forceSendEvent || this.mItemList[curIndex].itemIndex !== oldNearestItemIndex) {
                    if (this.onSnapNearestChanged) {
                        this.onSnapNearestChanged(this, this.mItemList[curIndex]);
                    }
                }
            } else {
                this.mCurSnapNearestItemIndex = -1;
            }
        }
    
        if (!this.canSnap()) {
            this.clearSnapData();
            return;
        }
    
        const scrollOffset = this.mScrollRect.getScrollOffset();
        const v = Math.abs(scrollOffset.x);
        this.updateCurSnapData();
        
        if (this.curSnapData.mSnapStatus !== SnapStatus.SnapMoving) {
            return;
        }
    
        if (v > 0) {
            this.mScrollRect.stopAutoScroll();
        }
    
        const old = this.curSnapData.mCurSnapVal;
        let maxAbsVec = this.curSnapData.mMoveMaxAbsVec;
        if (maxAbsVec <= 0) {
            maxAbsVec = this.mSnapMoveDefaultMaxAbsVec;
        }
        
        // 水平吸附使用MoveTowards方式
        if (!this.curSnapData.mIsTempTarget) {
            this.smoothDumpVel = maxAbsVec * Math.sign(this.curSnapData.mTargetSnapVal);
            this.curSnapData.mCurSnapVal = this.moveTowards(
                this.curSnapData.mCurSnapVal,
                this.curSnapData.mTargetSnapVal,
                maxAbsVec * game.deltaTime
            );
        } else {
            this.smoothDumpVel = maxAbsVec * Math.sign(this.curSnapData.mTargetSnapVal);
            this.curSnapData.mCurSnapVal = this.moveTowards(
                this.curSnapData.mCurSnapVal,
                this.curSnapData.mTargetSnapVal,
                maxAbsVec * game.deltaTime
            );
        }
    
        const dt = this.curSnapData.mCurSnapVal - old;
        const containerPos = this.mContainerTrans.node.position.clone();
        
        if (immediate || Math.abs(this.curSnapData.mTargetSnapVal - this.curSnapData.mCurSnapVal) < this.snapFinishThreshold) {
            containerPos.x += this.curSnapData.mTargetSnapVal - old;
            this.curSnapData.mSnapStatus = SnapStatus.SnapMoveFinish;
            
            if (this.onSnapItemFinished) {
                const targetItem = this.getShownItemByItemIndex(this.mCurSnapNearestItemIndex);
                if (targetItem) {
                    this.onSnapItemFinished(this, targetItem);
                }
            }
        } else {
            containerPos.x += dt;
        }
    
        // 限制容器位置在有效范围内
        if (this.arrangeType === ListItemArrangeType.LeftToRight) {
            const minX = this.viewPortRectLocalCorners[2].x - this.mContainerTrans.width;
            containerPos.x = Math.max(minX, Math.min(containerPos.x, 0));
        } 
        else if (this.arrangeType === ListItemArrangeType.RightToLeft) {
            const maxX = this.viewPortRectLocalCorners[1].x + this.mContainerTrans.width;
            containerPos.x = Math.min(maxX, Math.max(containerPos.x, 0));
        }
    
        this.mContainerTrans.node.setPosition(containerPos);
    }

    private getPlusItemIndexAndPosAtGivenPos(pos: number): {index: number, itemPos: number} {
        return this.itemPosMgr.getItemIndexAndPosAtGivenPos(pos);
    }
    
    private getItemPos(itemIndex: number): number {
        return this.itemPosMgr.getItemPos(itemIndex);
    }
    
    private checkIfNeedUpdateItemPos(): void {
        const count = this.mItemList.length;
        if (count === 0) return;
    
        const viewMaxSize = this.getContentPanelSize();
        const firstItem = this.mItemList[0];
        const lastItem = this.mItemList[count - 1];
    
        switch (this.arrangeType) {
            case ListItemArrangeType.TopToBottom:
                if (firstItem.topY > 0 || 
                    (firstItem.itemIndex === this.curReadyMinItemIndex && firstItem.topY !== 0)) {
                    this.updateAllShownItemsPos();
                } else if (-lastItem.bottomY > viewMaxSize || 
                    (lastItem.itemIndex === this.curReadyMaxItemIndex && -lastItem.bottomY !== viewMaxSize)) {
                    this.updateAllShownItemsPos();
                }
                break;
                
            case ListItemArrangeType.BottomToTop:
                if (firstItem.bottomY < 0 || 
                    (firstItem.itemIndex === this.curReadyMinItemIndex && firstItem.bottomY !== 0)) {
                    this.updateAllShownItemsPos();
                } else if (lastItem.topY > viewMaxSize || 
                    (lastItem.itemIndex === this.curReadyMaxItemIndex && lastItem.topY !== viewMaxSize)) {
                    this.updateAllShownItemsPos();
                }
                break;
                
            case ListItemArrangeType.LeftToRight:
                if (firstItem.leftX < 0 || 
                    (firstItem.itemIndex === this.curReadyMinItemIndex && firstItem.leftX !== 0)) {
                    this.updateAllShownItemsPos();
                } else if (lastItem.rightX > viewMaxSize || 
                    (lastItem.itemIndex === this.curReadyMaxItemIndex && lastItem.rightX !== viewMaxSize)) {
                    this.updateAllShownItemsPos();
                }
                break;
                
            case ListItemArrangeType.RightToLeft:
                if (firstItem.rightX > 0 || 
                    (firstItem.itemIndex === this.curReadyMinItemIndex && firstItem.rightX !== 0)) {
                    this.updateAllShownItemsPos();
                } else if (-lastItem.leftX > viewMaxSize || 
                    (lastItem.itemIndex === this.curReadyMaxItemIndex && -lastItem.leftX !== viewMaxSize)) {
                    this.updateAllShownItemsPos();
                }
                break;
        }
    }
    
    private adjustContainerPivot(rtf: UITransform): void {
        const pivot = new Vec2();
        switch (this.arrangeType) {
            case ListItemArrangeType.BottomToTop:
                pivot.set(rtf.anchorPoint.x, 0);
                break;
            case ListItemArrangeType.TopToBottom:
                pivot.set(rtf.anchorPoint.x, 1);
                break;
            case ListItemArrangeType.LeftToRight:
                pivot.set(0, rtf.anchorPoint.y);
                break;
            case ListItemArrangeType.RightToLeft:
                pivot.set(1, rtf.anchorPoint.y);
                break;
        }
        rtf.setAnchorPoint(pivot.x, pivot.y);
    }

    public refreshAllShownItem()
    {
        const count = this.mItemList.length;
        if (count == 0)
        {
            return;
        }
        this.refreshAllShownItemWithFirstIndex(this.mItemList[0].itemIndex);
    }
    
    public refreshAllShownItemWithFirstIndex(firstItemIndex: number): void {
        const count = this.mItemList.length;
        if (count === 0) return;
    
        const firstItem = this.mItemList[0];
        const pos = firstItem.node.position.clone();
        this.recycleAllItem();
       
        for (let i = 0; i < count; i++) {
            const curIndex = firstItemIndex + i;
            const newItem = this.getNewItemByIndex(curIndex);
            if (!newItem) break;
    
            if (this.mIsVertList) {
                pos.x = newItem.startPosOffset;
            } else {
                pos.y = newItem.startPosOffset;
            }
    
            newItem.node.setPosition(pos);
            if (this.mSupportScrollBar) {
                if (this.mIsVertList) {
                    this.setItemSize(curIndex, newItem.uiTransform.height, newItem.padding);
                } else {
                    this.setItemSize(curIndex, newItem.uiTransform.width, newItem.padding);
                }
            }
            this.mItemList.push(newItem);
        }
    
        this.updateContentSize();
        this.updateAllShownItemsPos();
        this.clearAllTmpRecycledItem();
    }

    private setItemSize(itemIndex: number, itemSize: number, padding: number): void {
        if (!this.mSupportScrollBar || itemIndex < 0) return;
        this.itemPosMgr.setItemSize(itemIndex, itemSize + padding);
        
        if (itemIndex >= this.lastItemIndex) {
            this.lastItemIndex = itemIndex;
            this.lastItemPadding = padding;
        }
    }

    cacheDragPointerEventData(eventData: EventTouch)
    {
        if (this.pointerEventData == null)
        {
            this.pointerEventData = eventData;
        }
    }

    private getNewItemByIndex(index: number): LoopListViewItem2 {
        if (this.mSupportScrollBar && index < 0) return null;
        if (this.mItemTotalCount > 0 && index >= this.mItemTotalCount) return null;
        
        
        const newItem = this.onGetItemByIndex(this, index);
        if (!newItem) return null;
        
        newItem.itemIndex = index;
        newItem.itemCreatedCheckFrameCount = this.listUpdateCheckFrameCount;
        return newItem;
    }
    
}