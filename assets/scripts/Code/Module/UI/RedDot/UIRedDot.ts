import { IOnCreate } from "../IOnCreate";
import { IOnDestroy } from "../IOnDestroy";
import { UIBaseContainer } from "../UIBaseContainer";
import { RedDotManager } from "./RedDotManager";
import * as string from "../../../../Mono/Helper/StringHelper";

export class UIRedDot extends UIBaseContainer implements IOnCreate<string>,IOnDestroy{
    protected target: string;
    
    public getConstructor(){
        return UIRedDot;
    }

    public onCreate(p1: string){
        this.reSetTarget(p1);
    }

    public onDestroy(){

    }

    public reSetTarget(p1:string){
        if (this.target == p1) return;
        if (!string.isNullOrEmpty(this.target))
        {
            RedDotManager.instance?.removeUIRedDotComponent(this.target,this);
        }
        this.target = p1;
        if (!string.isNullOrEmpty(p1))
        {
            RedDotManager.instance?.addUIRedDotComponent(p1,this);
            this.refreshRedDot();
        }
        else
        {
            this.setActive(false);
        }
    }

    public refreshRedDot()
    {
        this.setActive(RedDotManager.instance?.getRedDotViewCount(this.target) > 0);
    }
}