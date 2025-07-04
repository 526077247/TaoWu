import { _decorator, Node, instantiate, Prefab } from 'cc';
import { LoopGridViewItem } from './LoopGridViewItem';

export class GridItemPool {
    private _prefab: Prefab | Node = null;
    private _prefabName: string = "";
    private _initCreateCount: number = 1;
    private _tmpPooledItems: LoopGridViewItem[] = [];
    private _pooledItems: LoopGridViewItem[] = [];
    private static _curItemIdCount: number = 0;
    private _itemParent: Node = null;

    constructor() {}

    public init(prefab: Prefab | Node, createCount: number, parent: Node): void {
        this._prefab = prefab;
        if(this._prefab instanceof Prefab)
        {
            this._prefabName = (prefab as Prefab).data.name;
        }
        else
        {
            this._prefabName = prefab.name;
            this._prefab.active = false;
        }
        this._initCreateCount = createCount;
        this._itemParent = parent;
        
        for (let i = 0; i < this._initCreateCount; ++i) {
            const viewItem = this.createItem();
            this.recycleItemReal(viewItem);
        }
    }

    public clearPool(): void {
        GridItemPool._curItemIdCount = 0;
        this.destroyAllItem();
    }

    public cleanUp(beforeDestroy?: (node: Node) => void): void {
        this._pooledItems.forEach(item => {
            beforeDestroy?.(item.node);
            item.node.destroy();
        });
        this._pooledItems.length = 0;
    }

    public getItem(index: number = null): LoopGridViewItem {
        GridItemPool._curItemIdCount++;
        let item: LoopGridViewItem = null;

        if (this._tmpPooledItems.length > 0) {
            if (index !== null) {
                const idx = this._tmpPooledItems.findIndex(i => i.itemIndex === index);
                if (idx !== -1) {
                    item = this._tmpPooledItems[idx];
                    this._tmpPooledItems.splice(idx, 1);
                    item.node.active = true;
                }
            }

            if (!item) {
                item = this._tmpPooledItems.pop();
                item.node.active = true;
            }
        } else {
            if (this._pooledItems.length === 0) {
                item = this.createItem();
            } else {
                item = this._pooledItems.pop();
                item.node.active = true;
            }
        }

        item.itemId = GridItemPool._curItemIdCount;
        return item;
    }

    public destroyAllItem(): void {
        this.clearTmpRecycledItem();
        this._pooledItems.forEach(item => item.node.destroy());
        this._pooledItems.length = 0;
    }

    private createItem(): LoopGridViewItem {
        const node:Node = instantiate(this._prefab) as Node;
        node.setParent(this._itemParent);
        node.active = true;
        
        // 设置节点变换
        node.setScale(1, 1, 1);
        node.setPosition(0, 0, 0);
        node.setRotationFromEuler(0, 0, 0);
        
        // 获取或添加LoopGridViewItem组件
        let viewItem = node.getComponent(LoopGridViewItem) as LoopGridViewItem;
        if (!viewItem) {
            viewItem = node.addComponent(LoopGridViewItem);
        }
        
        viewItem.itemPrefabName = this._prefabName;
        return viewItem;
    }

    private recycleItemReal(item: LoopGridViewItem): void {
        item.node.active = false;
        this._pooledItems.push(item);
    }

    public recycleItem(item: LoopGridViewItem): void {
        item.prevItem = null;
        item.nextItem = null;
        this._tmpPooledItems.push(item);
    }

    public clearTmpRecycledItem(): void {
        this._tmpPooledItems.forEach(item => this.recycleItemReal(item));
        this._tmpPooledItems.length = 0;
    }
}