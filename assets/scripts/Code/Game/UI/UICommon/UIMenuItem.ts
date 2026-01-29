import { IOnCreate } from "../../../Module/UI/IOnCreate";
import { UIBaseContainer } from "../../../Module/UI/UIBaseContainer";
import { UIButton } from "../../../Module/UIComponent/UIButton";
import { UIImage } from "../../../Module/UIComponent/UIImage";
import { UIText } from "../../../Module/UIComponent/UIText";
import { MenuPara } from "./UIMenu";
import * as string from "../../../../Mono/Helper/StringHelper"
import { math } from "cc";
export class UIMenuItem extends UIBaseContainer implements IOnCreate{
    public getConstructor(){
        return UIMenuItem;
    }

    public para: MenuPara;
    public index: number;
    public onClick: (id:number, index: number)=>void;

    public text: UIText;
    public tabFocus: UIImage;
    public btn: UIButton;

    public onCreate(): void 
    {
        this.text = this.addComponent<UIText>(UIText,"Content/Text");
        this.tabFocus = this.addComponent<UIImage>(UIImage,"TabFocus");
        this.btn = this.addComponent<UIButton>(UIButton);
        this.btn.setOnClick(this.onClickSelf.bind(this));
    }

    private onClickSelf(){
        this.onClick?.(this.para.id, this.index);
    }

    public setData(para: MenuPara, index: number, onClick: (id:number, index: number)=>void, isActive: boolean = false)
    {
        this.onClick = onClick;
        this.index = index;
        this.para = para;
        this.text.setActive(!string.isNullOrEmpty(para.name));
        this.text.setText(para.name);
        this.setIsActive(isActive);
    }
    
    /**
     * 设置是否选择状态
     */
    public setIsActive(isActive: boolean = true)
    {
        this.tabFocus.setActive(isActive);
        this.text.setTextColor(isActive ?math.Color.WHITE : math.Color.BLACK);
    }
}