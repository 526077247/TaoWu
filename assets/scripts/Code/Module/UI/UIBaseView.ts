import { UIBaseContainer }  from "./UIBaseContainer"
import { UIManager } from "./UIManager";
export abstract class UIBaseView extends UIBaseContainer {

    public get canBack(): boolean{
        return false;
    }
    
    /**
     * 关闭自身
     */
    public async closeSelf(): Promise<void>
    {
        await UIManager.instance.closeWindow(this);
    }

    public onInputKeyBack(): Promise<void>
    {
        return this.closeSelf();
    }
}