import { _decorator, Node, instantiate, Vec3, UITransform } from 'cc';
import { LoopListViewItem2 } from './LoopListViewItem2'; // 假设有这个组件

export class ItemPool {
    private mPrefabObj: Node | null = null;
    private mPrefabName: string = "";
    private mInitCreateCount: number = 1;
    private mPadding: number = 0;
    private mStartPosOffset: number = 0;
    private mTmpPooledItemList: LoopListViewItem2[] = [];
    private mPooledItemList: LoopListViewItem2[] = [];
    private static mCurItemIdCount: number = 0;
    private mItemParent: Node | null = null;

    public init(prefabObj: Node, padding: number, startPosOffset: number, 
                createCount: number, parent: Node): void {
        this.mPrefabObj = prefabObj;
        this.mPrefabName = prefabObj.name;
        this.mInitCreateCount = createCount;
        this.mPadding = padding;
        this.mStartPosOffset = startPosOffset;
        this.mItemParent = parent;
        prefabObj.active = false;
        
        for (let i = 0; i < this.mInitCreateCount; ++i) {
            const item = this.createItem();
            this.recycleItemReal(item);
        }
    }

    public clearPool(): void {
        ItemPool.mCurItemIdCount = 0;
        this.destroyAllItem();
    }

    public cleanUp(beforeDestroy?: (node: Node) => void): void {
        const count = this.mPooledItemList.length;
        for (let i = 0; i < count; ++i) {
            const item = this.mPooledItemList[i];
            if (beforeDestroy) beforeDestroy(item.node);
            item.node.destroy();
        }
        this.mPooledItemList = [];
    }

    public getItem(index?: number): LoopListViewItem2 | null {
        if (!this.mPrefabObj) return null;
        
        ItemPool.mCurItemIdCount++;
        let item: LoopListViewItem2 | null = null;

        // 尝试从临时池中查找
        if (this.mTmpPooledItemList.length > 0) {
            if (index !== undefined) {
                for (let i = 0; i < this.mTmpPooledItemList.length; i++) {
                    if (this.mTmpPooledItemList[i].itemIndex === index) {
                        item = this.mTmpPooledItemList[i];
                        this.mTmpPooledItemList.splice(i, 1);
                        item.node.active = true;
                        break;
                    }
                }
            }

            if (!item) {
                const lastIndex = this.mTmpPooledItemList.length - 1;
                item = this.mTmpPooledItemList[lastIndex];
                this.mTmpPooledItemList.splice(lastIndex, 1);
                item.node.active = true;
            }
        } 
        // 从主池中获取
        else {
            if (this.mPooledItemList.length === 0) {
                item = this.createItem();
            } else {
                const lastIndex = this.mPooledItemList.length - 1;
                item = this.mPooledItemList[lastIndex];
                this.mPooledItemList.splice(lastIndex, 1);
                item.node.active = true;
            }
        }

        if (item) {
            item.padding = this.mPadding;
            item.itemId = ItemPool.mCurItemIdCount;
        }
        return item;
    }

    public destroyAllItem(): void {
        this.clearTmpRecycledItem();
        const count = this.mPooledItemList.length;
        for (let i = 0; i < count; ++i) {
            this.mPooledItemList[i].node.destroy();
        }
        this.mPooledItemList = [];
    }

    private createItem(): LoopListViewItem2 {
        if (!this.mPrefabObj || !this.mItemParent) {
            throw new Error("ItemPool not initialized properly");
        }

        const newNode = instantiate(this.mPrefabObj);
        newNode.parent = this.mItemParent;
        newNode.setPosition(Vec3.ZERO);
        newNode.setScale(Vec3.ONE);
        newNode.setRotationFromEuler(Vec3.ZERO);
        
        const itemComp = newNode.getComponent(LoopListViewItem2);
        if (!itemComp) {
            throw new Error("LoopListViewItem2 component missing on prefab");
        }
        
        itemComp.itemPrefabName = this.mPrefabName;
        itemComp.startPosOffset = this.mStartPosOffset;
        newNode.active = true;
        
        return itemComp;
    }

    private recycleItemReal(item: LoopListViewItem2): void {
        item.node.active = false;
        this.mPooledItemList.push(item);
    }

    public recycleItem(item: LoopListViewItem2): void {
        this.mTmpPooledItemList.push(item);
    }

    public clearTmpRecycledItem(): void {
        const count = this.mTmpPooledItemList.length;
        if (count === 0) return;

        for (let i = 0; i < count; ++i) {
            this.recycleItemReal(this.mTmpPooledItemList[i]);
        }
        this.mTmpPooledItemList = [];
    }
}