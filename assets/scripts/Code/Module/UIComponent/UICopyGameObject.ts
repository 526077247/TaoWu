import { Node } from "cc";
import { Log } from "../../../Mono/Module/Log/Log";
import { CopyGameObject } from "../../../Mono/Module/UI/CopyGameObject";
import { I18NManager } from "../I18N/I18NManager";
import { IOnDestroy } from "../UI/IOnDestroy";
import { UIBaseContainer } from "../UI/UIBaseContainer";

export class UICopyGameObject extends UIBaseContainer implements IOnDestroy{
    protected getConstructor(){
        return UICopyGameObject;
    }
    private comp: CopyGameObject;

    public onDestroy()
    {
        this.comp?.clear();
    }

    private activatingComponent()
    {
        if (this.comp == null)
        {
            this.comp = this.getNode().getComponent<CopyGameObject>(CopyGameObject);
            if (this.comp == null)
            {
                Log.error(`添加UI侧组件UICopyGameObject时，物体${this.getNode().name}上没有找到CopyGameObject组件`);
            }
        }
    }

    public initListView(totalCount: number, onGetItemCallback:(index:number, node: Node)=> void = null, startSiblingIndex:number|null = null)
    {
        this.activatingComponent();
        this.comp.initListView(totalCount, onGetItemCallback, startSiblingIndex);
    }

    /**
     * item是Cocos侧的item对象，在这里创建相应的UI对象
     * @param type 
     * @param item 
     * @returns 
     */
    public addItemViewComponent<T extends UIBaseContainer>(type: new () => T,item: Node)
    {
        //保证名字不能相同 不然没法cache
        const t:T = this.addComponentNotCreate<T>(type, item.name);
        t.setNode(item);
        const componentAny = t as any;
        if (!!componentAny.onCreate)
            componentAny.onCreate();
        if (this.activeSelf)
            t.setActive(true);
        if (!!componentAny.onLanguageChange)
            I18NManager.instance?.registerI18NEntity(componentAny);
        return t;
    }

    /**
     * 根据Cocos侧item获取UI侧的item
     * @param type 
     * @param item 
     * @returns 
     */
    public getUIItemView<T extends UIBaseContainer>(type: new () => T, item: Node):T 
    {
        return this.getComponent<T>(type, item.name);
    }

    public setListItemCount(totalCount: number, startSiblingIndex:number|null = null)
    {
        this.comp.setListItemCount(totalCount, startSiblingIndex);
    }

    public refreshAllShownItem(startSiblingIndex:number|null = null)
    {
        this.comp.refreshAllShownItem(startSiblingIndex);
    }

    public getItemByIndex(index: number): Node
    {
        return this.comp.getItemByIndex(index);
    }

    public getListItemCount(): number
    {
        return this.comp.getListItemCount();
    }
}