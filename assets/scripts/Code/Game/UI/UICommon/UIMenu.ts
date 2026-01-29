import { Node } from "cc";
import { IOnCreate } from "../../../Module/UI/IOnCreate";
import { UIBaseContainer } from "../../../Module/UI/UIBaseContainer";
import { UICopyGameObject } from "../../../Module/UIComponent/UICopyGameObject";
import { UIMenuItem } from "./UIMenuItem";

export class MenuPara
{
    public id: number;
    public name: string;
    public imgPath: string;
}
export class UIMenu extends UIBaseContainer implements IOnCreate
{
    public getConstructor(){
        return UIMenu;
    }
    public space: UICopyGameObject;

    public paras: MenuPara[];
    public uiMenuItems: UIMenuItem[];
    public activeIndex;
    private onActiveIndexChanged: (para: MenuPara)=>void;

    public onCreate()
    {
        this.space = this.addComponent<UICopyGameObject>(UICopyGameObject);
        this.space.initListView(0,this.onGetItemByIndex.bind(this));
    }


    public onGetItemByIndex(index:number, go: Node)
    {
        var para = this.paras[index];
        var item = this.space.getUIItemView<UIMenuItem>(UIMenuItem, go);
        if (item == null)
        {
            item = this.space.addItemViewComponent<UIMenuItem>(UIMenuItem, go);
        }
        this.uiMenuItems[index] = item;
        item.setData(para, index, (type, inx) =>
        {
            this.setActiveIndex(inx);
        }, index == this.activeIndex);
    }


    public setData(paras: MenuPara[], onActiveIndexChanged: (para: MenuPara)=>void, activeIndex:number = -1)
    {
        this.onActiveIndexChanged = onActiveIndexChanged;
        this.paras = paras;
        this.uiMenuItems = [];
        this.space.setListItemCount(this.paras.length);
        this.space.refreshAllShownItem();
        this.setActiveIndex(activeIndex);
    }
    
    public setActiveIndex(index:number, force: boolean = false)
    {
        if (!force && (index < 0 || this.activeIndex == index)) return;
        if (this.activeIndex >= 0)
            this.uiMenuItems[this.activeIndex].setIsActive(false);
        this.activeIndex = index;
        this.uiMenuItems[this.activeIndex].setIsActive(true);
        this.onActiveIndexChanged(this.paras[index]);
    }
}
