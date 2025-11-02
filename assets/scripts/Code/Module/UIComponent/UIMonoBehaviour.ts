import { Component } from "cc";
import { UIBaseContainer } from "../UI/UIBaseContainer";
import { Log } from "../../../Mono/Module/Log/Log";

export class UIMonoBehaviour<T extends Component> extends UIBaseContainer{

    private component: T;
    protected getConstructor(){
        return UIMonoBehaviour;
    }

    private activatingComponent(comp: (new () => T))
    {
        if (this.component == null)
        {
            this.component = this.getNode().getComponent<T>(comp);
            if (this.component == null)
            {
                Log.error(`添加UI侧组件UIMonoBehaviour时，物体${this.getNode().name}上没有找到组件`);
            }
        }
    }

    public getMonoBehaviour(comp: (new () => T)): T
    {
        this.activatingComponent(comp);
        return this.component;
    }
}