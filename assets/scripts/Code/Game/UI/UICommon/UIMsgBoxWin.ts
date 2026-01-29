import { IOnCreate } from "../../../Module/UI/IOnCreate";
import { IOnDisable } from "../../../Module/UI/IOnDisable";
import { IOnEnable } from "../../../Module/UI/IOnEnable";
import { UIBaseView } from "../../../Module/UI/UIBaseView";
import { UIButton } from "../../../Module/UIComponent/UIButton";
import { UIText } from "../../../Module/UIComponent/UIText";

export class MsgBoxPara
{
    public content: string;
    public cancelText: string;
    public confirmText: string;
    public cancelCallback:(win:UIBaseView)=> void;
    public confirmCallback:(win:UIBaseView)=> void;
}

export class UIMsgBoxWin extends UIBaseView implements IOnCreate,IOnEnable<MsgBoxPara>,IOnDisable
{
    public getConstructor(){
        return UIMsgBoxWin;
    }

    public static readonly PrefabPath:string = "ui/uicommon/prefabs/uiMsgBoxWin";

    public text: UIText;
    public btn_cancel: UIButton;
    public cancelText: UIText;
    public btn_confirm: UIButton;
    public confirmText: UIText;

    private para: MsgBoxPara;

    public onCreate(){
        this.text = this.addComponent<UIText>(UIText,"Text");
        this.btn_cancel = this.addComponent<UIButton>(UIButton,"btn_cancel");
        this.cancelText = this.addComponent<UIText>(UIText,"btn_cancel/Text");
        this.btn_confirm = this.addComponent<UIButton>(UIButton,"btn_confirm");
        this.confirmText = this.addComponent<UIText>(UIText,"btn_confirm/Text");   
    }

    public onEnable(a: MsgBoxPara){
        this.para = a;
        this.text.setText(a.content);
        this.btn_cancel.setOnClick(this.onClickCancel);
        this.btn_confirm.setOnClick(this.onClickConfirm);
        this.confirmText.setText(a.confirmText);
        this.cancelText.setText(a.cancelText);
    }

    public onDisable(){
        this.btn_cancel.removeOnClick();
        this.btn_confirm.removeOnClick();
    }

    private onClickConfirm()
    {
        if (this.para?.confirmCallback != null)
        {
            this.para.confirmCallback(this);
        }
    }
    private onClickCancel()
    {
        if (this.para?.cancelCallback != null)
        {
            this.para.cancelCallback(this);
        }
        else
        {
            this.close();
        }
    }
    
    private close()
    {
        this.closeSelf();
    }
}