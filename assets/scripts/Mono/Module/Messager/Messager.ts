import { IManager } from "../../Core/Manager/IManager"
import {UnOrderMultiMapSet} from "../../Core/Object/UnOrderMultiMapSet"
import { UnOrderDoubleKeyDictionary } from "../../Core/Object/UnOrderDoubleKeyDictionary"

export class Messager implements IManager{

    private static _instance: Messager;

    public static get instance(): Messager {
        return Messager._instance;
    }

    readonly dict: UnOrderDoubleKeyDictionary<Function,any,any> = new UnOrderDoubleKeyDictionary<Function,any,any>();

    readonly evtGroup:Map<number, UnOrderMultiMapSet<number, Function>> =
        new Map<number, UnOrderMultiMapSet<number, Function>>();
    
    public init()
    {
        Messager._instance = this;
    }

    public destroy()
    {
        this.dict.clear();
        this.evtGroup.clear();
        Messager._instance = null;
    }

    private handler(evt: Function, target: any){
        const res = this.dict.tryGetValue(evt, target);
        if(!res[0]){
            res[1] = evt.bind(target);
            this.dict.add(evt,target,res[1])
        }
        return res[1];
    }

    private removeHandler(evt: Function, target: any){
        this.dict.remove(evt, target)
    }

    public addListener(id:number, name: number, evt: Function, target: any)
    {
        let set = this.evtGroup.get(id);
        if (!set)
        {
            set = new UnOrderMultiMapSet<number, Function>();
            this.evtGroup.set(id, set)
        }
        set.add(name, this.handler(evt,target));
    }

    public removeListener(id:number, name: number, evt: Function, target: any)
    {
        const set = this.evtGroup.get(id);
        if (!!set)
        {
            set.remove(name, this.handler(evt,target));
            this.removeHandler(evt, target);
        }
    }

    public broadcast(id:number, name: number, ...argArray: any[])
    {
        const set = this.evtGroup.get(id);
        if (!!set)
        {
            var funcs = set.getAll(name);
            for(var i = 0; i < funcs.length; i++)
            {
                funcs[i]?.(...argArray);
            }
        }
    }

}