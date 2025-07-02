import { _decorator, Component, Node, log, error, instantiate } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CopyGameObject')
export class CopyGameObject extends Component {
    private startSiblingIndex: number
    private onGetItemCallback: (index:number, node: Node)=>void
    private showCount: number = 0
    private itemViewList: Node[] = []

    @property({type: Node})
    private item: Node

    onLoad() 
    {
        if (this.item && this.item.parent == this.node)
        {
            this.startSiblingIndex = this.item.getSiblingIndex();
        }
    }

    onEnable()
    {
        this.item.active = false;
    }

    public initListView(totalCount: number, onGetItemCallback:(index:number, node: Node)=>void = null, startSiblingIndex:number|null = null)
    {
        if (startSiblingIndex != null)
        {
            this.startSiblingIndex = startSiblingIndex;
            if (this.startSiblingIndex > this.node.children.length)
            {
                this.startSiblingIndex = this.node.children.length - 1;
            }
        }
        this.onGetItemCallback = onGetItemCallback;
        this.setListItemCount(totalCount);
    }

    public setListItemCount(totalCount: number, startSiblingIndex:number|null = null)
    {
        if (totalCount > 10) log("total_count 不建议超过10个");
        if (this.item == null) error("item is Null!!!");
        if (startSiblingIndex != null)
        {
            this.startSiblingIndex = startSiblingIndex;
            if (this.startSiblingIndex > this.node.children.length)
            {
                this.startSiblingIndex = this.node.children.length - 1;
            }
        }
        this.showCount = totalCount;
        var count = this.itemViewList.length > totalCount ? this.itemViewList.length : totalCount;
        for (let i = 0; i < count; i++)
        {
            if (i < this.itemViewList.length && i < totalCount)
            {
                this.itemViewList[i].active = true;
                if (this.startSiblingIndex != null)
                {
                    this.itemViewList[i].setSiblingIndex(this.startSiblingIndex + i);
                }
                this.onGetItemCallback?.(i, this.itemViewList[i]);
            }
            else if (i < totalCount)
            {
                const item = instantiate(this.item);
                item.parent = this.node;
                item.name += i;
                this.itemViewList[this.itemViewList.length] = item;
                if (this.startSiblingIndex != null)
                {
                    this.itemViewList[i].setSiblingIndex(this.startSiblingIndex + i);
                }
                item.active = true;
                this.onGetItemCallback?.(i, item);
            }
            else if (i < this.itemViewList.length)
            {
                this.itemViewList[i].active = false;
                if (this.startSiblingIndex != null)
                {
                    this.itemViewList[i].setSiblingIndex(this.startSiblingIndex + i);
                }
            }
        }
    }

    public refreshAllShownItem(startSiblingIndex: number| null = null)
    {
        if (startSiblingIndex != null)
        {
            this.startSiblingIndex = startSiblingIndex;
            if (this.startSiblingIndex > this.node.children.length)
            {
                this.startSiblingIndex = this.node.children.length - 1;
            }
        }
        for (let i = 0; i < this.showCount; i++)
        {
            this.onGetItemCallback?.(i, this.itemViewList[i]);
        }
    }

    public  getItemByIndex(index: number): Node
    {
        return this.itemViewList[index];
    }

    public getListItemCount(): number
    {
        return this.showCount;
    }
    
    public clear()
    {
        for (let i = this.itemViewList.length - 1; i >= 0; i--)
        {
            this.itemViewList[i].destroy();
        }
        this.itemViewList.length = 0;
    }
}


