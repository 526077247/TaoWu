import { Toggle } from "cc";
import { Log } from "../../../Mono/Module/Log/Log";
import { IOnDestroy } from "../UI/IOnDestroy";
import { UIBaseContainer } from "../UI/UIBaseContainer";


export class UIToggle extends UIBaseContainer implements IOnDestroy {

    public getConstructor(){
        return UIToggle;
    }
    private toggle: Toggle;
    private onValueChange: (val: boolean) => void;

    public onDestroy(){
        this.removeOnValueChange();

    }

    private activatingComponent()
    {
        if (this.toggle == null)
        {
            this.toggle = this.getNode().getComponent<Toggle>(Toggle);
            if (this.toggle == null)
            {
                Log.error(`添加UI侧组件UIToggle时，物体${this.getNode().name}上没有找到Toggle组件`);
            }
        }
    }


    public setOnValueChange(callback: (val: boolean) => void)
    {
        this.activatingComponent();
        this.removeOnValueChange();
        this.onValueChange = callback;
        this.toggle!.node.on(Toggle.EventType.TOGGLE, this.onToggleEvent, this);
    }

    public removeOnValueChange()
    {
        if (!!this.onValueChange)
        {
            this.toggle!.node.off(Toggle.EventType.TOGGLE, this.onToggleEvent, this);
            this.onValueChange = null;
        }
    }

    private onToggleEvent(toggle: Toggle){
        if(!!this.onValueChange){
            this.onValueChange(toggle.isChecked)
        }
    }
}