import { _decorator, Component, Node, Vec2, Vec3, instantiate, Prefab, ScrollView, UITransform, EventTouch, Mask, Enum, ScrollBar } from 'cc';
import { ClickEventListener } from '../Common/ClickEventListener';
import { GridFixedType, GridItemArrangeType, RowColumnPair, SnapStatus } from '../Common/CommonDefine';
import { GridItemGroup } from './GridItemGroup';
import { GridItemPool } from './GridItemPool';
import { LoopGridViewItem } from './LoopGridViewItem';
const { ccclass, property } = _decorator;

@ccclass('GridViewItemPrefabConfData')
export class GridViewItemPrefabConfData {
    @property(Node)
    public mItemPrefab: Node | Prefab = null;
    @property
    public mInitCreateCount: number = 0;
}

export class LoopGridViewInitParam {
    public mSmoothDumpRate: number = 0.3;
    public mSnapFinishThreshold: number = 0.01;
    public mSnapVecThreshold: number = 145;

    public static copyDefaultInitParam(): LoopGridViewInitParam {
        return new LoopGridViewInitParam();
    }
}

export class LoopGridViewSettingParam {
    public mItemSize: any = null;
    public mPadding: any = null;
    public mItemPadding: any = null;
    public mGridFixedType: any = null;
    public mFixedRowOrColumnCount: any = null;
}

class SnapData {
    public mSnapStatus: SnapStatus = SnapStatus.NoTargetSet;
    public mSnapTarget: RowColumnPair = new RowColumnPair();
    public mSnapNeedMoveDir: Vec2 = new Vec2();
    public mTargetSnapVal: number = 0;
    public mCurSnapVal: number = 0;
    public mIsForceSnapTo: boolean = false;
    
    public clear(): void {
        this.mSnapStatus = SnapStatus.NoTargetSet;
        this.mIsForceSnapTo = false;
    }
}

class ItemRangeData {
    public mMaxRow: number = 0;
    public mMinRow: number = 0;
    public mMaxColumn: number = 0;
    public mMinColumn: number = 0;
    public mCheckedPosition: Vec2 = new Vec2();
}


@ccclass('LoopGridView')
export class LoopGridView extends Component {
    private mitemPoolDict: Map<string, GridItemPool> = new Map();
    private mitemPoolList: GridItemPool[] = [];
    
    @property([GridViewItemPrefabConfData])
    private mitemPrefabDataList: GridViewItemPrefabConfData[] = [];
    
    @property({type: Enum(GridItemArrangeType)})
    private marrangeType: GridItemArrangeType = GridItemArrangeType.TopLeftToBottomRight;
    
    private mcontainerTrans: UITransform | null = null;
    private mscrollView: ScrollView | null = null;
    private mscrollViewTransform: UITransform | null = null;
    private mviewPortTransform: UITransform | null = null;
    private mitemTotalCount: number = 0;
    
    @property
    private mfixedRowOrColumnCount: number = 0;
    
    @property
    private mpadding: any = { left: 0, right: 0, top: 0, bottom: 0 }; // 简化版RectOffset
    
    @property
    private mitemPadding: Vec2 = new Vec2(0, 0);
    
    @property
    private mitemSize: Vec2 = new Vec2(0, 0);
    
    @property
    private mitemRecycleDistance: Vec2 = new Vec2(50, 50);
    
    private mitemSizeWithPadding: Vec2 = new Vec2(0, 0);
    private mstartPadding: Vec2 = new Vec2(0, 0);
    private mendPadding: Vec2 = new Vec2(0, 0);
    
    private monGetItemByRowColumn: (gridView: LoopGridView, index: number, row: number, column: number) => LoopGridViewItem | null = null;
    private mitemGroupObjPool: GridItemGroup[] = [];
    private mitemGroupList: GridItemGroup[] = [];
    
    private mIsDraging: boolean = false;
    private mrowCount: number = 0;
    private mcolumnCount: number = 0;
    
    public mOnBeginDragAction: (eventData: any) => void = null;
    public mOnDragingAction: (eventData: any) => void = null;
    public mOnEndDragAction: (eventData: any) => void = null;
    
    private msmoothDumpVel: number = 0;
    private msmoothDumpRate: number = 0.3;
    private msnapFinishThreshold: number = 0.1;
    private msnapVecThreshold: number = 145;
    
    @property
    private mitemSnapEnable: boolean = false;
    
    @property({type: Enum(GridFixedType)})
    private mgridFixedType: GridFixedType = GridFixedType.ColumnCountFixed;
    
    public mOnSnapItemFinished: (gridView: LoopGridView, item: LoopGridViewItem) => void = null;
    public mOnSnapNearestChanged: (gridView: LoopGridView) => void = null;
    
    private mleftSnapUpdateExtraCount: number = 1;
    
    @property
    private mviewPortSnapPivot: Vec2 = new Vec2(0, 0);
    
    @property
    private mitemSnapPivot: Vec2 = new Vec2(0, 0);
    
    private mcurSnapData: SnapData = new SnapData();
    private mlastSnapCheckPos: Vec2 = new Vec2();
    private mlistViewInited: boolean = false;
    private mlistUpdateCheckFrameCount: number = 0;
    private mcurFrameItemRangeData: ItemRangeData = new ItemRangeData();
    private mneedCheckContentPosLeftCount: number = 1;
    private mscrollBarClickEventListener1: ClickEventListener | null = null;
    private mscrollBarClickEventListener2: ClickEventListener | null = null;
    
    private mcurSnapNearestItemRowColumn: RowColumnPair = new RowColumnPair(-1, -1);
    
    public get itemPrefabDataList(): GridViewItemPrefabConfData[] {
        return this.mitemPrefabDataList;
    }
    
    public get itemTotalCount(): number {
        return this.mitemTotalCount;
    }
    
    public get containerTrans(): UITransform | null {
        return this.mcontainerTrans;
    }
    
    public get viewPortWidth(): number {
        return this.mviewPortTransform ? this.mviewPortTransform.contentSize.width : 0;
    }
    
    public get viewPortHeight(): number {
        return this.mviewPortTransform ? this.mviewPortTransform.contentSize.height : 0;
    }
    
    public get scrollView(): ScrollView | null {
        return this.mscrollView;
    }
    
    public get isDraging(): boolean {
        return this.mIsDraging;
    }
    
    public get itemSnapEnable(): boolean {
        return this.mitemSnapEnable;
    }
    
    public set itemSnapEnable(value: boolean) {
        this.mitemSnapEnable = value;
    }
    
    public get itemSize(): Vec2 {
        return this.mitemSize;
    }
    
    public set itemSize(value: Vec2) {
        this.setItemSize(value);
    }
    
    public get itemPadding(): Vec2 {
        return this.mitemPadding;
    }
    
    public set itemPadding(value: Vec2) {
        this.setItemPadding(value);
    }
    
    public get itemSizeWithPadding(): Vec2 {
        return this.mitemSizeWithPadding;
    }
    
    public get padding(): any {
        return this.mpadding;
    }
    
    public set padding(value: any) {
        this.setPadding(value);
    }
    
    private _lastScrollOffset: Vec2 = new Vec2();
    private _lastScrollOffsetTime: number = 0;
    private _currentVelocity: Vec2 = new Vec2();


    public getItemPrefabConfData(prefabName: string): GridViewItemPrefabConfData | null {
        for (const data of this.mitemPrefabDataList) {
            if (!data.mItemPrefab) {
                console.error("A item prefab is null");
                continue;
            }
            if(data.mItemPrefab instanceof Prefab){
                if (prefabName === data.mItemPrefab.data.name) {
                    return data;
                }
            }else{
                if (prefabName === data.mItemPrefab.name) {
                    return data;
                }
            }
            
        }
        return null;
    }
    
    public initGridView(itemTotalCount: number, 
                        onGetItemByRowColumn: (gridView: LoopGridView, index: number, row: number, column: number) => LoopGridViewItem | null, 
                        settingParam: LoopGridViewSettingParam = null,
                        initParam: LoopGridViewInitParam = null): void {
        if (this.mlistViewInited) {
            console.error("LoopGridView.InitListView method can be called only once.");
            return;
        }
        
        this.mlistViewInited = true;
        
        if (itemTotalCount < 0) {
            console.error("itemTotalCount is < 0");
            itemTotalCount = 0;
        }
        
        if (!!settingParam) {
            this.updateFromSettingParam(settingParam);
        }
        
        if (!!initParam) {
            this.msmoothDumpRate = initParam.mSmoothDumpRate;
            this.msnapFinishThreshold = initParam.mSnapFinishThreshold;
            this.msnapVecThreshold = initParam.mSnapVecThreshold;
        }
        
        this.mscrollView = this.node.getComponent(ScrollView);
        if (!this.mscrollView) {
            console.error("ListView Init Failed! ScrollView component not found!");
            return;
        }
        
        this.mcurSnapData.clear();
        this.mscrollViewTransform = this.mscrollView.node.getComponent(UITransform);
        this.mcontainerTrans = this.mscrollView.content.getComponent(UITransform);
        this.mviewPortTransform = this.mscrollView.getComponentInChildren(Mask)?.getComponent(UITransform);
        
        if (!this.mviewPortTransform) {
            this.mviewPortTransform = this.mscrollViewTransform;
        }
        
        this.setScrollbarListener();
        this.adjustViewPortPivot();
        this.adjustContainerAnchorAndPivot();
        this.initItemPool();
        this.monGetItemByRowColumn = onGetItemByRowColumn;
        this.mneedCheckContentPosLeftCount = 4;
        this.mcurSnapData.clear();
        this.mitemTotalCount = itemTotalCount;
        this.updateAllGridSetting();

        this._lastScrollOffset = this.scrollView.getScrollOffset().clone();
        this._lastScrollOffsetTime = Date.now();
    }
    
    public clearListView(): void {
        this.setListItemCount(0, true);
        
        for (const pool of this.mitemPoolList) {
            pool.clearPool();
        }
        
        this.mitemPoolList.length = 0;
        this.mitemPoolDict.clear();
        this.monGetItemByRowColumn = null;
        this.mlistViewInited = false;
    }
    
    public cleanUp(name: string = null, beforeDestroy: (node: Node) => void = null): void {
        if (!name) {
            for (const pool of this.mitemPoolList) {
                pool.cleanUp(beforeDestroy);
            }
        } else if (this.mitemPoolDict.has(name)) {
            const pool = this.mitemPoolDict.get(name);
            pool.cleanUp(beforeDestroy);
        }
    }
    
    public setListItemCount(itemCount: number, resetPos: boolean = true): void {
        if (itemCount < 0) {
            return;
        }
        
        if (itemCount === this.mitemTotalCount) {
            return;
        }
        
        this.mcurSnapData.clear();
        this.mitemTotalCount = itemCount;
        this.updateColumnRowCount();
        this.updateContentSize();
        this.forceToCheckContentPos();
        
        if (this.mitemTotalCount === 0) {
            this.recycleAllItem();
            this.clearAllTmpRecycledItem();
            return;
        }
        
        this.vaildAndSetContainerPos();
        this.updateGridViewContent();
        this.clearAllTmpRecycledItem();
        
        if (resetPos) {
            this.movePanelToItemByRowColumn(0, 0);
        }
    }
    
    public newListViewItem(itemPrefabName: string, index: number = null): LoopGridViewItem | null {
        const pool = this.mitemPoolDict.get(itemPrefabName);
        if (!pool) {
            return null;
        }
        
        const item = pool.getItem(index) as LoopGridViewItem;
        item.node.setParent(this.mcontainerTrans.node);
        item.node.setScale(1, 1, 1);
        item.node.setPosition(0, 0, 0);
        item.node.setRotationFromEuler(0, 0, 0);
        item.parentGridView = this;
        return item;
    }
    
    public refreshItemByItemIndex(itemIndex: number): void {
        if (itemIndex < 0 || itemIndex >= this.itemTotalCount) {
            return;
        }
        
        const count = this.mitemGroupList.length;
        if (count === 0) {
            return;
        }
        
        const val = this.getRowColumnByItemIndex(itemIndex);
        this.refreshItemByRowColumn(val.mRow, val.mColumn);
    }
    
    public refreshItemByRowColumn(row: number, column: number): void {
        const count = this.mitemGroupList.length;
        if (count === 0) {
            return;
        }
        
        if (this.mgridFixedType === GridFixedType.ColumnCountFixed) {
            const group = this.getShownGroup(row);
            if (!group) {
                return;
            }
            
            const curItem = group.getItemByColumn(column);
            if (!curItem) {
                return;
            }
            
            const newItem = this.getNewItemByRowColumn(row, column);
            if (!newItem) {
                return;
            }
            
            const pos = curItem.cachedUITransform.node.getPosition();
            group.replaceItem(curItem, newItem);
            this.recycleItemTmp(curItem);
            newItem.cachedUITransform.node.setPosition(pos);
            this.clearAllTmpRecycledItem();
        } else {
            const group = this.getShownGroup(column);
            if (!group) {
                return;
            }
            
            const curItem = group.getItemByRow(row);
            if (!curItem) {
                return;
            }
            
            const newItem = this.getNewItemByRowColumn(row, column);
            if (!newItem) {
                return;
            }
            
            const pos = curItem.cachedUITransform.node.getPosition();
            group.replaceItem(curItem, newItem);
            this.recycleItemTmp(curItem);
            newItem.cachedUITransform.node.setPosition(pos);
            this.clearAllTmpRecycledItem();
        }
    }
    
    public clearSnapData(): void {
        this.mcurSnapData.clear();
    }
    
    public setSnapTargetItemRowColumn(row: number, column: number): void {
        if (row < 0) {
            row = 0;
        }
        
        if (column < 0) {
            column = 0;
        }
        
        this.mcurSnapData.mSnapTarget.mRow = row;
        this.mcurSnapData.mSnapTarget.mColumn = column;
        this.mcurSnapData.mSnapStatus = SnapStatus.TargetHasSet;
        this.mcurSnapData.mIsForceSnapTo = true;
    }
    
    public get curSnapNearestItemRowColumn(): RowColumnPair {
        return this.mcurSnapNearestItemRowColumn;
    }
    
    public forceSnapUpdateCheck(): void {
        if (this.mleftSnapUpdateExtraCount <= 0) {
            this.mleftSnapUpdateExtraCount = 1;
        }
    }
    
    public forceToCheckContentPos(): void {
        if (this.mneedCheckContentPosLeftCount <= 0) {
            this.mneedCheckContentPosLeftCount = 1;
        }
    }
    
    public movePanelToItemByIndex(itemIndex: number, offsetX: number = 0, offsetY: number = 0): void {
        if (this.itemTotalCount === 0) {
            return;
        }
        
        if (itemIndex >= this.itemTotalCount) {
            itemIndex = this.itemTotalCount - 1;
        }
        
        if (itemIndex < 0) {
            itemIndex = 0;
        }
        
        const val = this.getRowColumnByItemIndex(itemIndex);
        this.movePanelToItemByRowColumn(val.mRow, val.mColumn, offsetX, offsetY);
    }
    
    public movePanelToItemByRowColumn(row: number, column: number, offsetX: number = 0, offsetY: number = 0): void {
        if (this.mscrollView) {
            this.mscrollView.stopAutoScroll();
        }
        
        this.mcurSnapData.clear();
        
        if (this.mitemTotalCount === 0) {
            return;
        }
        
        const itemPos = this.getItemPos(row, column);
        let pos = this.mcontainerTrans.node.getPosition();
        
        if (this.mscrollView.horizontal) {
            const maxCanMoveX = Math.max(this.mcontainerTrans.contentSize.width - this.viewPortWidth, 0);
            if (maxCanMoveX > 0) {
                let x = -itemPos.x + offsetX;
                x = Math.min(Math.abs(x), maxCanMoveX) * Math.sign(x);
                pos.x = x;
            }
        }
        
        if (this.mscrollView.vertical) {
            const maxCanMoveY = Math.max(this.mcontainerTrans.contentSize.height - this.viewPortHeight, 0);
            if (maxCanMoveY > 0) {
                let y = -itemPos.y + offsetY;
                y = Math.min(Math.abs(y), maxCanMoveY) * Math.sign(y);
                pos.y = y;
            }
        }
        
        if (pos.x !== this.mcontainerTrans.node.getPosition().x || 
            pos.y !== this.mcontainerTrans.node.getPosition().y) {
            this.mcontainerTrans.node.setPosition(pos);
        }
        
        this.vaildAndSetContainerPos();
        this.forceToCheckContentPos();
    }
    
    public refreshAllShownItem(): void {
        const count = this.mitemGroupList.length;
        if (count === 0) {
            return;
        }
        
        this.forceToCheckContentPos();
        this.recycleAllItem();
        this.updateGridViewContent();
    }
    
    public onTouchBegan(event: EventTouch): void {
        this.mcurSnapData.clear();
        this.mIsDraging = true;
        
        if (this.mOnBeginDragAction) {
            this.mOnBeginDragAction(event);
        }
    }
    
    public onTouchEnded(event: EventTouch): void {
        this.mIsDraging = false;
        this.forceSnapUpdateCheck();
        
        if (this.mOnEndDragAction) {
            this.mOnEndDragAction(event);
        }
    }
    
    public onTouchMoved(event: EventTouch): void {
        if (this.mOnDragingAction) {
            this.mOnDragingAction(event);
        }
    }
    
    public getItemIndexByRowColumn(row: number, column: number): number {
        if (this.mgridFixedType === GridFixedType.ColumnCountFixed) {
            return row * this.mfixedRowOrColumnCount + column;
        } else {
            return column * this.mfixedRowOrColumnCount + row;
        }
    }
    
    public getRowColumnByItemIndex(itemIndex: number): RowColumnPair {
        if (itemIndex < 0) {
            itemIndex = 0;
        }
        
        if (this.mgridFixedType === GridFixedType.ColumnCountFixed) {
            const row = Math.floor(itemIndex / this.mfixedRowOrColumnCount);
            const column = itemIndex % this.mfixedRowOrColumnCount;
            return new RowColumnPair(row, column);
        } else {
            const column = Math.floor(itemIndex / this.mfixedRowOrColumnCount);
            const row = itemIndex % this.mfixedRowOrColumnCount;
            return new RowColumnPair(row, column);
        }
    }
    
    public getItemAbsPos(row: number, column: number): Vec2 {
        const x = this.mstartPadding.x + column * this.mitemSizeWithPadding.x;
        const y = this.mstartPadding.y + row * this.mitemSizeWithPadding.y;
        return new Vec2(x, y);
    }
    
    public getItemPos(row: number, column: number): Vec2 {
        const absPos = this.getItemAbsPos(row, column);
        let x = absPos.x;
        let y = absPos.y;
        
        if (this.marrangeType === GridItemArrangeType.TopLeftToBottomRight) {
            return new Vec2(x, -y);
        } else if (this.marrangeType === GridItemArrangeType.BottomLeftToTopRight) {
            return new Vec2(x, y);
        } else if (this.marrangeType === GridItemArrangeType.TopRightToBottomLeft) {
            return new Vec2(-x, -y);
        } else if (this.marrangeType === GridItemArrangeType.BottomRightToTopLeft) {
            return new Vec2(-x, y);
        }
        
        return new Vec2(0, 0);
    }
    
    public getShownItemByItemIndex(itemIndex: number): LoopGridViewItem | null {
        if (itemIndex < 0 || itemIndex >= this.itemTotalCount) {
            return null;
        }
        
        if (this.mitemGroupList.length === 0) {
            return null;
        }
        
        const val = this.getRowColumnByItemIndex(itemIndex);
        return this.getShownItemByRowColumn(val.mRow, val.mColumn);
    }
    
    public getShownItemByRowColumn(row: number, column: number): LoopGridViewItem | null {
        if (this.mitemGroupList.length === 0) {
            return null;
        }
        
        if (this.mgridFixedType === GridFixedType.ColumnCountFixed) {
            const group = this.getShownGroup(row);
            if (!group) {
                return null;
            }
            return group.getItemByColumn(column);
        } else {
            const group = this.getShownGroup(column);
            if (!group) {
                return null;
            }
            return group.getItemByRow(row);
        }
    }
    
    public updateAllGridSetting(): void {
        this.updateStartEndPadding();
        this.updateItemSize();
        this.updateColumnRowCount();
        this.updateContentSize();
        this.forceSnapUpdateCheck();
        this.forceToCheckContentPos();
    }
    
    public setGridFixedGroupCount(fixedType: GridFixedType, count: number): void {
        if (this.mgridFixedType === fixedType && this.mfixedRowOrColumnCount === count) {
            return;
        }
        
        this.mgridFixedType = fixedType;
        this.mfixedRowOrColumnCount = count;
        this.updateColumnRowCount();
        this.updateContentSize();
        
        if (this.mitemGroupList.length === 0) {
            return;
        }
        
        this.recycleAllItem();
        this.forceSnapUpdateCheck();
        this.forceToCheckContentPos();
    }
    
    public setItemSize(newSize: Vec2): void {
        if (newSize.equals(this.mitemSize)) {
            return;
        }
        
        this.mitemSize = newSize;
        this.updateItemSize();
        this.updateContentSize();
        
        if (this.mitemGroupList.length === 0) {
            return;
        }
        
        this.recycleAllItem();
        this.forceSnapUpdateCheck();
        this.forceToCheckContentPos();
    }
    
    public setItemPadding(newPadding: Vec2): void {
        if (newPadding.equals(this.mitemPadding)) {
            return;
        }
        
        this.mitemPadding = newPadding;
        this.updateItemSize();
        this.updateContentSize();
        
        if (this.mitemGroupList.length === 0) {
            return;
        }
        
        this.recycleAllItem();
        this.forceSnapUpdateCheck();
        this.forceToCheckContentPos();
    }
    
    public setPadding(newPadding: any): void {
        if (newPadding === this.mpadding) {
            return;
        }
        
        this.mpadding = newPadding;
        this.updateStartEndPadding();
        this.updateContentSize();
        
        if (this.mitemGroupList.length === 0) {
            return;
        }
        
        this.recycleAllItem();
        this.forceSnapUpdateCheck();
        this.forceToCheckContentPos();
    }
    
    public updateContentSize(): void {
        const width = this.mstartPadding.x + this.mcolumnCount * this.mitemSizeWithPadding.x - this.mitemPadding.x + this.mendPadding.x;
        const height = this.mstartPadding.y + this.mrowCount * this.mitemSizeWithPadding.y - this.mitemPadding.y + this.mendPadding.y;
        
        // 直接设置UITransform的内容尺寸
        this.mcontainerTrans.setContentSize(width, height);
    }
    
    public vaildAndSetContainerPos(): void {
        const pos = this.mcontainerTrans.node.getPosition();
        const validPos = this.getContainerVaildPos(pos.x, pos.y);
        this.mcontainerTrans.node.setPosition(validPos.x, validPos.y, pos.z);
    }
    
    public clearAllTmpRecycledItem(): void {
        for (const pool of this.mitemPoolList) {
            pool.clearTmpRecycledItem();
        }
    }
    
    public recycleAllItem(): void {
        for (const group of this.mitemGroupList) {
            this.recycleItemGroupTmp(group);
        }
        
        this.mitemGroupList.length = 0;
    }
    
    public updateGridViewContent(): void {
        this.mlistUpdateCheckFrameCount++;
        
        if (this.mitemTotalCount === 0) {
            if (this.mitemGroupList.length > 0) {
                this.recycleAllItem();
            }
            return;
        }
        
        this.updateCurFrameItemRangeData();
        
        if (this.mgridFixedType === GridFixedType.ColumnCountFixed) {
            let groupCount = this.mitemGroupList.length;
            const minRow = this.mcurFrameItemRangeData.mMinRow;
            const maxRow = this.mcurFrameItemRangeData.mMaxRow;
            
            for (let i = groupCount - 1; i >= 0; --i) {
                const group = this.mitemGroupList[i];
                if (group.groupIndex < minRow || group.groupIndex > maxRow) {
                    this.recycleItemGroupTmp(group);
                    this.mitemGroupList.splice(i, 1);
                }
            }
            
            if (this.mitemGroupList.length === 0) {
                const group = this.createItemGroup(minRow);
                this.mitemGroupList.push(group);
            }
            
            while (this.mitemGroupList[0].groupIndex > minRow) {
                const group = this.createItemGroup(this.mitemGroupList[0].groupIndex - 1);
                this.mitemGroupList.unshift(group);
            }
            
            while (this.mitemGroupList[this.mitemGroupList.length - 1].groupIndex < maxRow) {
                const group = this.createItemGroup(this.mitemGroupList[this.mitemGroupList.length - 1].groupIndex + 1);
                this.mitemGroupList.push(group);
            }
            
            for (const group of this.mitemGroupList) {
                this.updateRowItemGroupForRecycleAndNew(group);
            }
        } else {
            let groupCount = this.mitemGroupList.length;
            const minColumn = this.mcurFrameItemRangeData.mMinColumn;
            const maxColumn = this.mcurFrameItemRangeData.mMaxColumn;
            
            for (let i = groupCount - 1; i >= 0; --i) {
                const group = this.mitemGroupList[i];
                if (group.groupIndex < minColumn || group.groupIndex > maxColumn) {
                    this.recycleItemGroupTmp(group);
                    this.mitemGroupList.splice(i, 1);
                }
            }
            
            if (this.mitemGroupList.length === 0) {
                const group = this.createItemGroup(minColumn);
                this.mitemGroupList.push(group);
            }
            
            while (this.mitemGroupList[0].groupIndex > minColumn) {
                const group = this.createItemGroup(this.mitemGroupList[0].groupIndex - 1);
                this.mitemGroupList.unshift(group);
            }
            
            while (this.mitemGroupList[this.mitemGroupList.length - 1].groupIndex < maxColumn) {
                const group = this.createItemGroup(this.mitemGroupList[this.mitemGroupList.length - 1].groupIndex + 1);
                this.mitemGroupList.push(group);
            }
            
            for (const group of this.mitemGroupList) {
                this.updateColumnItemGroupForRecycleAndNew(group);
            }
        }
    }
    
    public updateStartEndPadding(): void {
        if (this.marrangeType === GridItemArrangeType.TopLeftToBottomRight) {
            this.mstartPadding.x = this.mpadding.left;
            this.mstartPadding.y = this.mpadding.top;
            this.mendPadding.x = this.mpadding.right;
            this.mendPadding.y = this.mpadding.bottom;
        } else if (this.marrangeType === GridItemArrangeType.BottomLeftToTopRight) {
            this.mstartPadding.x = this.mpadding.left;
            this.mstartPadding.y = this.mpadding.bottom;
            this.mendPadding.x = this.mpadding.right;
            this.mendPadding.y = this.mpadding.top;
        } else if (this.marrangeType === GridItemArrangeType.TopRightToBottomLeft) {
            this.mstartPadding.x = this.mpadding.right;
            this.mstartPadding.y = this.mpadding.top;
            this.mendPadding.x = this.mpadding.left;
            this.mendPadding.y = this.mpadding.bottom;
        } else if (this.marrangeType === GridItemArrangeType.BottomRightToTopLeft) {
            this.mstartPadding.x = this.mpadding.right;
            this.mstartPadding.y = this.mpadding.bottom;
            this.mendPadding.x = this.mpadding.left;
            this.mendPadding.y = this.mpadding.top;
        }
    }
    
    public updateItemSize(): void {
        let tempNode: Node | null = null;
    
        try {
            if (this.mitemSize.x > 0 && this.mitemSize.y > 0) {
                this.mitemSizeWithPadding = new Vec2(
                    this.mitemSize.x + this.mitemPadding.x,
                    this.mitemSize.y + this.mitemPadding.y
                );
                return;
            }
            
            if (this.mitemPrefabDataList.length > 0) {
                const prefab = this.mitemPrefabDataList[0].mItemPrefab;
                if (prefab) {
                    tempNode = instantiate(prefab) as Node;
                    const transform = tempNode.getComponent(UITransform);
                    if (transform) {
                        this.mitemSize = new Vec2(transform.contentSize.width,transform.contentSize.height);
                        this.mitemSizeWithPadding = new Vec2(
                            this.mitemSize.x + this.mitemPadding.x,
                            this.mitemSize.y + this.mitemPadding.y
                        );
                    }
                }
            }
        } finally {
            // 确保销毁临时节点
            if (tempNode) {
                tempNode.destroy();
            }
        }
    }
    
    public updateColumnRowCount(): void {
        if (this.mgridFixedType === GridFixedType.ColumnCountFixed) {
            this.mcolumnCount = this.mfixedRowOrColumnCount;
            this.mrowCount = Math.floor(this.mitemTotalCount / this.mcolumnCount);
            
            if (this.mitemTotalCount % this.mcolumnCount > 0) {
                this.mrowCount++;
            }
            
            if (this.mitemTotalCount <= this.mcolumnCount) {
                this.mcolumnCount = this.mitemTotalCount;
            }
        } else {
            this.mrowCount = this.mfixedRowOrColumnCount;
            this.mcolumnCount = Math.floor(this.mitemTotalCount / this.mrowCount);
            
            if (this.mitemTotalCount % this.mrowCount > 0) {
                this.mcolumnCount++;
            }
            
            if (this.mitemTotalCount <= this.mrowCount) {
                this.mrowCount = this.mitemTotalCount;
            }
        }
    }
    
    private isContainerTransCanMove(): boolean {
        if (this.mitemTotalCount === 0) {
            return false;
        }
        
        if (this.mscrollView.horizontal && 
            this.mcontainerTrans.contentSize.width > this.viewPortWidth) {
            return true;
        }
        
        if (this.mscrollView.vertical && 
            this.mcontainerTrans.contentSize.height > this.viewPortHeight) {
            return true;
        }
        
        return false;
    }
    
    private recycleItemGroupTmp(group: GridItemGroup): void {
        if (!group) return;
        
        while (group.first) {
            const item = group.removeFirst();
            this.recycleItemTmp(item);
        }
        
        group.clear();
        this.recycleOneItemGroupObj(group);
    }
    
    private recycleItemTmp(item: LoopGridViewItem): void {
        if (!item || !item.itemPrefabName) return;
        
        const pool = this.mitemPoolDict.get(item.itemPrefabName);
        if (pool) {
            pool.recycleItem(item);
        }
    }
    
    private adjustViewPortPivot(): void {
        if (!this.mviewPortTransform) return;
        
        switch (this.marrangeType) {
            case GridItemArrangeType.TopLeftToBottomRight:
                this.mviewPortTransform.anchorPoint = new Vec2(0, 1);
                break;
            case GridItemArrangeType.BottomLeftToTopRight:
                this.mviewPortTransform.anchorPoint = new Vec2(0, 0);
                break;
            case GridItemArrangeType.TopRightToBottomLeft:
                this.mviewPortTransform.anchorPoint = new Vec2(1, 1);
                break;
            case GridItemArrangeType.BottomRightToTopLeft:
                this.mviewPortTransform.anchorPoint = new Vec2(1, 0);
                break;
        }
    }
    
    private adjustContainerAnchorAndPivot(): void {
        if (!this.mcontainerTrans) return;
        
        switch (this.marrangeType) {
            case GridItemArrangeType.TopLeftToBottomRight:
                this.mcontainerTrans.anchorPoint = new Vec2(0, 1);
                break;
            case GridItemArrangeType.BottomLeftToTopRight:
                this.mcontainerTrans.anchorPoint = new Vec2(0, 0);
                break;
            case GridItemArrangeType.TopRightToBottomLeft:
                this.mcontainerTrans.anchorPoint = new Vec2(1, 1);
                break;
            case GridItemArrangeType.BottomRightToTopLeft:
                this.mcontainerTrans.anchorPoint = new Vec2(1, 0);
                break;
        }
    }
    
    private adjustItemAnchorAndPivot(transform: UITransform): void {
        switch (this.marrangeType) {
            case GridItemArrangeType.TopLeftToBottomRight:
                transform.anchorPoint = new Vec2(0, 1);
                break;
            case GridItemArrangeType.BottomLeftToTopRight:
                transform.anchorPoint = new Vec2(0, 0);
                break;
            case GridItemArrangeType.TopRightToBottomLeft:
                transform.anchorPoint = new Vec2(1, 1);
                break;
            case GridItemArrangeType.BottomRightToTopLeft:
                transform.anchorPoint = new Vec2(1, 0);
                break;
        }
    }
    
    private initItemPool(): void {
        for (const data of this.mitemPrefabDataList) {
            if (!data.mItemPrefab) {
                console.error("A item prefab is null");
                continue;
            }
            
            const prefabName = data.mItemPrefab.name;
            if (this.mitemPoolDict.has(prefabName)) {
                console.error(`A item prefab with name ${prefabName} has existed!`);
                continue;
            }
            
            // 创建实例并调整布局
            const node = instantiate(data.mItemPrefab) as Node;
            const transform = node.getComponent(UITransform);
            if (!transform) {
                console.error(`UITransform component not found in ${prefabName}`);
                continue;
            }
            
            this.adjustItemAnchorAndPivot(transform);
            
            // 添加或获取LoopGridViewItem组件
            let item = node.getComponent(LoopGridViewItem);
            if (!item) {
                item = node.addComponent(LoopGridViewItem);
            }
            
            // 初始化对象池
            const pool = new GridItemPool();
            pool.init(data.mItemPrefab, data.mInitCreateCount, this.mcontainerTrans.node);
            this.mitemPoolDict.set(prefabName, pool);
            this.mitemPoolList.push(pool);
        }
    }
    
    private getNewItemByRowColumn(row: number, column: number): LoopGridViewItem | null {
        const itemIndex = this.getItemIndexByRowColumn(row, column);
        if (itemIndex < 0 || itemIndex >= this.itemTotalCount) {
            return null;
        }
        
        const newItem = this.monGetItemByRowColumn(this, itemIndex, row, column);
        if (!newItem) return null;
        
        newItem.nextItem = null;
        newItem.prevItem = null;
        newItem.row = row;
        newItem.column = column;
        newItem.itemIndex = itemIndex;
        return newItem;
    }
    
    private getCeilItemRowColumnAtGivenAbsPos(ax: number, ay: number): RowColumnPair {
        ax = Math.abs(ax);
        ay = Math.abs(ay);
        
        let row = Math.ceil((ay - this.mstartPadding.y) / this.mitemSizeWithPadding.y) - 1;
        let column = Math.ceil((ax - this.mstartPadding.x) / this.mitemSizeWithPadding.x) - 1;
        
        row = Math.max(0, Math.min(row, this.mrowCount - 1));
        column = Math.max(0, Math.min(column, this.mcolumnCount - 1));
        
        return new RowColumnPair(row, column);
    }
    
    protected update(dt: number): void {
        if (!this.mlistViewInited) return;
        const now = Date.now();
        const deltaTimeMs = now - this._lastScrollOffsetTime;
        if (deltaTimeMs > 0) {
            const currentOffset = this.scrollView.getScrollOffset();
            const deltaTimeSec = deltaTimeMs / 1000;
            const velocityX = (currentOffset.x - this._lastScrollOffset.x) / deltaTimeSec;
            const velocityY = (currentOffset.y - this._lastScrollOffset.y) / deltaTimeSec;
            this._currentVelocity.set(velocityX, velocityY);
            
            this._lastScrollOffset.set(currentOffset);
            this._lastScrollOffsetTime = now;
        }
        this.updateSnapMove();
        this.updateGridViewContent();
        this.clearAllTmpRecycledItem();
    }
    
    private createItemGroup(groupIndex: number): GridItemGroup {
        const ret = this.getOneItemGroupObj();
        ret.groupIndex = groupIndex;
        return ret;
    }
    
    private getContainerMovedDistance(): Vec2 {
        const pos = this.mcontainerTrans.node.getPosition();
        const validPos = this.getContainerVaildPos(pos.x, pos.y);
        return new Vec2(Math.abs(validPos.x), Math.abs(validPos.y));
    }
    
    private getContainerVaildPos(curX: number, curY: number): Vec2 {
        const maxCanMoveX = Math.max(this.mcontainerTrans.contentSize.width - this.viewPortWidth, 0);
        const maxCanMoveY = Math.max(this.mcontainerTrans.contentSize.height - this.viewPortHeight, 0);
        
        // Cocos坐标系Y轴向下为正，需要调整计算
        let newX = curX;
        let newY = curY;
        
        switch (this.marrangeType) {
            case GridItemArrangeType.TopLeftToBottomRight:
                newX = Math.max(Math.min(newX, 0), -maxCanMoveX);
                newY = Math.min(Math.max(newY, 0), maxCanMoveY);
                break;
            case GridItemArrangeType.BottomLeftToTopRight:
                newX = Math.max(Math.min(newX, 0), -maxCanMoveX);
                newY = Math.max(Math.min(newY, 0), -maxCanMoveY);
                break;
            case GridItemArrangeType.BottomRightToTopLeft:
                newX = Math.min(Math.max(newX, 0), maxCanMoveX);
                newY = Math.max(Math.min(newY, 0), -maxCanMoveY);
                break;
            case GridItemArrangeType.TopRightToBottomLeft:
                newX = Math.min(Math.max(newX, 0), maxCanMoveX);
                newY = Math.min(Math.max(newY, 0), maxCanMoveY);
                break;
        }
        
        return new Vec2(newX, newY);
    }
    
    private updateCurFrameItemRangeData(): void {
        const distVector2 = this.getContainerMovedDistance();
        
        if (this.mneedCheckContentPosLeftCount <= 0 && 
            distVector2.equals(this.mcurFrameItemRangeData.mCheckedPosition)) {
            return;
        }
        
        if (this.mneedCheckContentPosLeftCount > 0) {
            this.mneedCheckContentPosLeftCount--;
        }
        
        let distX = distVector2.x - this.mitemRecycleDistance.x;
        let distY = distVector2.y - this.mitemRecycleDistance.y;
        
        distX = Math.max(distX, 0);
        distY = Math.max(distY, 0);
        
        let val = this.getCeilItemRowColumnAtGivenAbsPos(distX, distY);
        this.mcurFrameItemRangeData.mMinColumn = val.mColumn;
        this.mcurFrameItemRangeData.mMinRow = val.mRow;
        
        distX = distVector2.x + this.mitemRecycleDistance.x + this.viewPortWidth;
        distY = distVector2.y + this.mitemRecycleDistance.y + this.viewPortHeight;
        
        val = this.getCeilItemRowColumnAtGivenAbsPos(distX, distY);
        this.mcurFrameItemRangeData.mMaxColumn = val.mColumn;
        this.mcurFrameItemRangeData.mMaxRow = val.mRow;
        this.mcurFrameItemRangeData.mCheckedPosition = distVector2;
    }
    
    private updateRowItemGroupForRecycleAndNew(group: GridItemGroup): void {
        const minColumn = this.mcurFrameItemRangeData.mMinColumn;
        const maxColumn = this.mcurFrameItemRangeData.mMaxColumn;
        const row = group.groupIndex;
        
        // 回收超出范围的项
        while (group.first && group.first.column < minColumn) {
            this.recycleItemTmp(group.removeFirst());
        }
        
        while (group.last && 
              (group.last.column > maxColumn || group.last.itemIndex >= this.itemTotalCount)) {
            this.recycleItemTmp(group.removeLast());
        }
        
        // 添加新项
        if (!group.first) {
            const item = this.getNewItemByRowColumn(row, minColumn);
            if (item) {
                item.node.setPosition(this.getItemPos(item.row, item.column).toVec3());
                group.addFirst(item);
            }
        }
        
        // 在左侧添加缺失的项
        while (group.first && group.first.column > minColumn) {
            const newColumn = group.first.column - 1;
            const item = this.getNewItemByRowColumn(row, newColumn);
            if (!item) break;
            
            item.node.setPosition(this.getItemPos(item.row, item.column).toVec3());
            group.addFirst(item);
        }
        
        // 在右侧添加缺失的项
        while (group.last && group.last.column < maxColumn) {
            const newColumn = group.last.column + 1;
            const item = this.getNewItemByRowColumn(row, newColumn);
            if (!item) break;
            
            item.node.setPosition(this.getItemPos(item.row, item.column).toVec3());
            group.addLast(item);
        }
    }
    
    private updateColumnItemGroupForRecycleAndNew(group: GridItemGroup): void {
        const minRow = this.mcurFrameItemRangeData.mMinRow;
        const maxRow = this.mcurFrameItemRangeData.mMaxRow;
        const column = group.groupIndex;
        
        // 回收超出范围的项
        while (group.first && group.first.row < minRow) {
            this.recycleItemTmp(group.removeFirst());
        }
        
        while (group.last && 
              (group.last.row > maxRow || group.last.itemIndex >= this.itemTotalCount)) {
            this.recycleItemTmp(group.removeLast());
        }
        
        // 添加新项
        if (!group.first) {
            const item = this.getNewItemByRowColumn(minRow, column);
            if (item) {
                item.node.setPosition(this.getItemPos(item.row, item.column).toVec3());
                group.addFirst(item);
            }
        }
        
        // 在上方添加缺失的项
        while (group.first && group.first.row > minRow) {
            const newRow = group.first.row - 1;
            const item = this.getNewItemByRowColumn(newRow, column);
            if (!item) break;
            
            item.node.setPosition(this.getItemPos(item.row, item.column).toVec3());
            group.addFirst(item);
        }
        
        // 在下方添加缺失的项
        while (group.last && group.last.row < maxRow) {
            const newRow = group.last.row + 1;
            const item = this.getNewItemByRowColumn(newRow, column);
            if (!item) break;
            
            item.node.setPosition(this.getItemPos(item.row, item.column).toVec3());
            group.addLast(item);
        }
    }
    
    private setScrollbarListener(): void {
        if (!this.mitemSnapEnable) return;

        // 清除旧监听器
        this.mscrollBarClickEventListener1 = null;
        this.mscrollBarClickEventListener2 = null;

        let curScrollBar1: ScrollBar = null;
        let curScrollBar2: ScrollBar = null;
        if (this.mscrollView.vertical && this.mscrollView.verticalScrollBar != null)
        {
            curScrollBar1 = this.mscrollView.verticalScrollBar;
        }
        if (this.mscrollView.horizontal && this.mscrollView.horizontalScrollBar != null)
        {
            curScrollBar2 = this.mscrollView.horizontalScrollBar;
        }

        // Cocos中需要获取滚动条节点并添加触摸事件
        if (!!curScrollBar1) {
            const listener:ClickEventListener = ClickEventListener.get(curScrollBar1.node);
            this.mscrollBarClickEventListener1 = listener;
            listener.setPointerUpHandler(this.onPointerUpInScrollBar.bind(this));
            listener.setPointerDownHandler(this.onPointerDownInScrollBar.bind(this));
        }

        if (!!curScrollBar2) {
            const listener:ClickEventListener = ClickEventListener.get(curScrollBar2.node);
            this.mscrollBarClickEventListener2 = listener;
            listener.setPointerUpHandler(this.onPointerUpInScrollBar.bind(this));
            listener.setPointerDownHandler(this.onPointerDownInScrollBar.bind(this));
        }
    }
    
    private onPointerDownInScrollBar(obj: Node)
    {
        this.mcurSnapData.clear();
    }

    private onPointerUpInScrollBar(obj: Node)
    {
        this.forceSnapUpdateCheck();
    }
    
    private findNearestItemWithLocalPos(x: number, y: number): RowColumnPair {
        const targetPos = new Vec2(x, y);
        let val = this.getCeilItemRowColumnAtGivenAbsPos(targetPos.x, targetPos.y);
        const row = val.mRow;
        const column = val.mColumn;
        
        let minDistance = Number.MAX_VALUE;
        const ret = new RowColumnPair(-1, -1);
        
        for (let r = row - 1; r <= row + 1; r++) {
            for (let c = column - 1; c <= column + 1; c++) {
                if (r >= 0 && r < this.mrowCount && c >= 0 && c < this.mcolumnCount) {
                    const pos = this.getItemSnapPivotLocalPos(r, c);
                    const distance = pos.subtract(targetPos).lengthSqr();
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        ret.mRow = r;
                        ret.mColumn = c;
                    }
                }
            }
        }
        
        return ret;
    }
    
    private getItemSnapPivotLocalPos(row: number, column: number): Vec2 {
        const absPos = this.getItemAbsPos(row, column);
        let x = 0, y = 0;
        
        switch (this.marrangeType) {
            case GridItemArrangeType.TopLeftToBottomRight:
                x = absPos.x + this.mitemSize.x * this.mitemSnapPivot.x;
                y = -absPos.y - this.mitemSize.y * (1 - this.mitemSnapPivot.y);
                break;
            case GridItemArrangeType.BottomLeftToTopRight:
                x = absPos.x + this.mitemSize.x * this.mitemSnapPivot.x;
                y = absPos.y + this.mitemSize.y * this.mitemSnapPivot.y;
                break;
            case GridItemArrangeType.TopRightToBottomLeft:
                x = -absPos.x - this.mitemSize.x * (1 - this.mitemSnapPivot.x);
                y = -absPos.y - this.mitemSize.y * (1 - this.mitemSnapPivot.y);
                break;
            case GridItemArrangeType.BottomRightToTopLeft:
                x = -absPos.x - this.mitemSize.x * (1 - this.mitemSnapPivot.x);
                y = absPos.y + this.mitemSize.y * this.mitemSnapPivot.y;
                break;
        }
        
        return new Vec2(x, y);
    }
    
    private getViewPortSnapPivotLocalPos(pos: Vec2): Vec2 {
        let pivotLocalPosX = 0;
        let pivotLocalPosY = 0;
        
        switch (this.marrangeType) {
            case GridItemArrangeType.TopLeftToBottomRight:
                pivotLocalPosX = -pos.x + this.viewPortWidth * this.mviewPortSnapPivot.x;
                pivotLocalPosY = -pos.y - this.viewPortHeight * (1 - this.mviewPortSnapPivot.y);
                break;
            case GridItemArrangeType.BottomLeftToTopRight:
                pivotLocalPosX = -pos.x + this.viewPortWidth * this.mviewPortSnapPivot.x;
                pivotLocalPosY = -pos.y + this.viewPortHeight * this.mviewPortSnapPivot.y;
                break;
            case GridItemArrangeType.TopRightToBottomLeft:
                pivotLocalPosX = -pos.x - this.viewPortWidth * (1 - this.mviewPortSnapPivot.x);
                pivotLocalPosY = -pos.y - this.viewPortHeight * (1 - this.mviewPortSnapPivot.y);
                break;
            case GridItemArrangeType.BottomRightToTopLeft:
                pivotLocalPosX = -pos.x - this.viewPortWidth * (1 - this.mviewPortSnapPivot.x);
                pivotLocalPosY = -pos.y + this.viewPortHeight * this.mviewPortSnapPivot.y;
                break;
        }
        
        return new Vec2(pivotLocalPosX, pivotLocalPosY);
    }
    
    private updateNearestSnapItem(forceSendEvent: boolean = false): void {
        if (!this.mitemSnapEnable) return;
        if (this.mitemGroupList.length === 0) return;
        if (!this.isContainerTransCanMove()) return;
        
        const pos = this.mcontainerTrans.node.getPosition();
        const posV2 = new Vec2(pos.x, pos.y);
        
        let needCheck = !posV2.equals(this.mlastSnapCheckPos);
        this.mlastSnapCheckPos = posV2;
        
        if (!needCheck && this.mleftSnapUpdateExtraCount > 0) {
            this.mleftSnapUpdateExtraCount--;
            needCheck = true;
        }
        
        if (needCheck) {
            const snapTargetPos = this.getViewPortSnapPivotLocalPos(posV2);
            const curVal = this.findNearestItemWithLocalPos(snapTargetPos.x, snapTargetPos.y);
            
            if (curVal.mRow >= 0) {
                const oldNearestItem = this.mcurSnapNearestItemRowColumn;
                this.mcurSnapNearestItemRowColumn = curVal;
                
                if (forceSendEvent || !oldNearestItem.equals(curVal)) {
                    if (this.mOnSnapNearestChanged) {
                        this.mOnSnapNearestChanged(this);
                    }
                }
            } else {
                this.mcurSnapNearestItemRowColumn.mRow = -1;
                this.mcurSnapNearestItemRowColumn.mColumn = -1;
            }
        }
    }
    
    private updateFromSettingParam(param: LoopGridViewSettingParam): void {
        if (!param) return;
        
        if (param.mItemSize) {
            this.mitemSize = param.mItemSize as Vec2;
        }
        
        if (param.mItemPadding) {
            this.mitemPadding = param.mItemPadding as Vec2;
        }
        
        if (param.mPadding) {
            this.mpadding = param.mPadding;
        }
        
        if (param.mGridFixedType) {
            this.mgridFixedType = param.mGridFixedType as GridFixedType;
        }
        
        if (param.mFixedRowOrColumnCount) {
            this.mfixedRowOrColumnCount = param.mFixedRowOrColumnCount as number;
        }
    }
    
    public finishSnapImmediately(): void {
        this.updateSnapMove(true);
    }
    
    private updateSnapMove(immediate: boolean = false, forceSendEvent: boolean = false): void {
        if (!this.mitemSnapEnable) return;
        
        this.updateNearestSnapItem(false);
        const pos = this.mcontainerTrans.node.getPosition();
        
        if (!this.canSnap()) {
            this.clearSnapData();
            return;
        }
        
        this.updateCurSnapData();
        if (this.mcurSnapData.mSnapStatus !== SnapStatus.SnapMoving) {
            return;
        }
        
        // 停止滚动
        if (this.mscrollView) {
            this.mscrollView.stopAutoScroll();
        }
        
        const old = this.mcurSnapData.mCurSnapVal;
        this.mcurSnapData.mCurSnapVal = this.lerp(
            this.mcurSnapData.mCurSnapVal,
            this.mcurSnapData.mTargetSnapVal,
            this.msmoothDumpRate
        );
        
        const dt = this.mcurSnapData.mCurSnapVal - old;
        
        if (immediate || 
            Math.abs(this.mcurSnapData.mTargetSnapVal - this.mcurSnapData.mCurSnapVal) < this.msnapFinishThreshold) {
            
            const newPos = pos.add(
                new Vec3(
                    (this.mcurSnapData.mTargetSnapVal - old) * this.mcurSnapData.mSnapNeedMoveDir.x,
                    (this.mcurSnapData.mTargetSnapVal - old) * this.mcurSnapData.mSnapNeedMoveDir.y,
                    0
                )
            );
            
            this.mcurSnapData.mSnapStatus = SnapStatus.SnapMoveFinish;
            this.mcontainerTrans.node.setPosition(newPos);
            
            if (this.mOnSnapItemFinished) {
                const targetItem = this.getShownItemByRowColumn(
                    this.mcurSnapNearestItemRowColumn.mRow, 
                    this.mcurSnapNearestItemRowColumn.mColumn
                );
                
                if (targetItem) {
                    this.mOnSnapItemFinished(this, targetItem);
                }
            }
        } else {
            const newPos = pos.add(
                new Vec3(
                    dt * this.mcurSnapData.mSnapNeedMoveDir.x,
                    dt * this.mcurSnapData.mSnapNeedMoveDir.y,
                    0
                )
            );
            
            this.mcontainerTrans.node.setPosition(newPos);
        }
    }
    
    private getShownGroup(groupIndex: number): GridItemGroup | null {
        if (groupIndex < 0) return null;
        if (this.mitemGroupList.length === 0) return null;
        
        const firstIndex = this.mitemGroupList[0].groupIndex;
        const lastIndex = this.mitemGroupList[this.mitemGroupList.length - 1].groupIndex;
        
        if (groupIndex < firstIndex || groupIndex > lastIndex) {
            return null;
        }
        
        return this.mitemGroupList[groupIndex - firstIndex];
    }
    
    private fillCurSnapData(row: number, column: number): void {
        const itemSnapPivotLocalPos = this.getItemSnapPivotLocalPos(row, column);
        const containerPos = this.mcontainerTrans.node.getPosition();
        const containerPosV2 = new Vec2(containerPos.x, containerPos.y);
        
        const snapTargetPos = this.getViewPortSnapPivotLocalPos(containerPosV2);
        let dir = snapTargetPos.subtract(itemSnapPivotLocalPos);
        
        if (!this.mscrollView.horizontal) {
            dir.x = 0;
        }
        
        if (!this.mscrollView.vertical) {
            dir.y = 0;
        }
        
        this.mcurSnapData.mTargetSnapVal = dir.length();
        this.mcurSnapData.mCurSnapVal = 0;
        this.mcurSnapData.mSnapNeedMoveDir = dir.normalize();
    }
    
    private updateCurSnapData(): void {
        if (this.mitemGroupList.length === 0) {
            this.mcurSnapData.clear();
            return;
        }
        
        // 处理各种吸附状态
        switch (this.mcurSnapData.mSnapStatus) {
            case SnapStatus.SnapMoveFinish:
                if (!this.mcurSnapData.mSnapTarget.equals(this.mcurSnapNearestItemRowColumn)) {
                    this.mcurSnapData.mSnapStatus = SnapStatus.NoTargetSet;
                }
                break;
                
            case SnapStatus.SnapMoving:
                if (!this.mcurSnapData.mSnapTarget.equals(this.mcurSnapNearestItemRowColumn) && 
                    !this.mcurSnapData.mIsForceSnapTo) {
                    this.mcurSnapData.mSnapStatus = SnapStatus.NoTargetSet;
                }
                break;
                
            case SnapStatus.NoTargetSet:
                const nearestItem = this.getShownItemByRowColumn(
                    this.mcurSnapNearestItemRowColumn.mRow,
                    this.mcurSnapNearestItemRowColumn.mColumn
                );
                
                if (nearestItem) {
                    this.mcurSnapData.mSnapTarget = this.mcurSnapNearestItemRowColumn;
                    this.mcurSnapData.mSnapStatus = SnapStatus.TargetHasSet;
                    this.mcurSnapData.mIsForceSnapTo = false;
                }
                break;
                
            case SnapStatus.TargetHasSet:
                const targetItem = this.getShownItemByRowColumn(
                    this.mcurSnapData.mSnapTarget.mRow,
                    this.mcurSnapData.mSnapTarget.mColumn
                );
                
                if (targetItem) {
                    this.fillCurSnapData(targetItem.row, targetItem.column);
                    this.mcurSnapData.mSnapStatus = SnapStatus.SnapMoving;
                } else {
                    this.mcurSnapData.clear();
                }
                break;
        }
    }
    
    private canSnap(): boolean {
        if (this.mIsDraging) return false;
        if (!this.isContainerTransCanMove()) return false;
        
        // 检查滚动速度
        if (this.mscrollView) {
            const velocity = new Vec2(
                this.mscrollView.getScrollOffset().x,
                this.mscrollView.getScrollOffset().y
            );
            if (Math.abs(velocity.x) > this.msnapVecThreshold) return false;
            if (Math.abs(velocity.y) > this.msnapVecThreshold) return false;
        }
        
        // 检查位置是否有效
        const pos = this.mcontainerTrans.node.getPosition();
        const validPos = this.getContainerVaildPos(pos.x, pos.y);
        
        if (Math.abs(pos.x - validPos.x) > 3) return false;
        if (Math.abs(pos.y - validPos.y) > 3) return false;
        
        return true;
    }
    
    private getOneItemGroupObj(): GridItemGroup {
        if (this.mitemGroupObjPool.length > 0) {
            return this.mitemGroupObjPool.pop();
        }
        return new GridItemGroup();
    }
    
    private recycleOneItemGroupObj(obj: GridItemGroup): void {
        this.mitemGroupObjPool.push(obj);
    }
    
    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }
}