import { Button, Sprite } from "cc";
import { Log } from "../../../Mono/Module/Log/Log";
import { IOnDestroy } from "../UI/IOnDestroy";
import { UIBaseContainer } from "../UI/UIBaseContainer";

export class UIButton extends UIBaseContainer implements IOnDestroy {

    protected getConstructor(){
        return UIButton;
    }
    private button: Button;
    private onClick: () => void;

    public onDestroy(){
        this.removeOnClick()
    }

    private activatingComponent()
    {
        if (this.button == null)
        {
            this.button = this.getNode().getComponent<Button>(Button);
            if (this.button == null)
            {
                Log.error(`添加UI侧组件UIButton时，物体${this.getNode().name}上没有找到Button组件`);
            }
        }
    }
    public setOnClick(callback: () => void)
    {
        this.activatingComponent();
        this.removeOnClick();
        this.onClick = callback;
        this.button!.node.on(Button.EventType.CLICK, this.onClickEvent, this);
    }

    public removeOnClick()
    {
        if (this.onClick != null)
        {
            this.button!.node.off(Button.EventType.CLICK, this.onClickEvent, this);
            this.onClick = null;
        }
    }

    private onClickEvent(button: Button){
        //SoundComponent.Instance.PlaySound("Audio/Common/Click.mp3");
        if(this.onClick){
            this.onClick()
        }
    }

    public setInteractable(flag: boolean)
    {
        this.activatingComponent();
        this.button.interactable = flag;
    }
    
}