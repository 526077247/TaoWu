import { UIBaseContainer }  from "./UIBaseContainer"
export abstract class UIBaseView extends UIBaseContainer {

    public get canBack(): boolean{
        return false;
    }
    
    /**
     * 关闭自身
     */
    public async closeSelf(): Promise<void>
    {
        const { UIManager } = await import("./UIManager");
        var close = await UIManager.instance.closeBox(this);
        if(!close) await UIManager.instance.closeWindow(this);
    }

    public onInputKeyBack(): Promise<void>
    {
        return this.closeSelf();
    }
}