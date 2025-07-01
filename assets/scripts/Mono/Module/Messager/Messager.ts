import { IManager } from "../../Core/Manager/IManager"
import {UnOrderMultiMapSet} from "../../Core/Object/UnOrderMultiMapSet"
export class Messager implements IManager{

    private static _instance: Messager;

    public static get instance(): Messager {
        return Messager._instance;
    }
    
    readonly evtGroup:Map<number, UnOrderMultiMapSet<number, Function>> =
        new Map<number, UnOrderMultiMapSet<number, Function>>();
    
    public init()
    {
        Messager._instance = this;
    }

    public destroy()
    {
        this.evtGroup.clear();
        Messager._instance = null;
    }

    public AddListener(id:number, name: number, evt: Function)
    {
        if (!this.evtGroup[id])
        {
            this.evtGroup[id] = new UnOrderMultiMapSet<number, Function>();
        }
        this.evtGroup[id].add(name, evt);
    }

    public RemoveListener(id:number, name: number, evt: Function)
    {
        if (!!this.evtGroup[id])
        {
            this.evtGroup[id].remove(name, evt);
        }
    }

    public Broadcast(id:number, name: number, ...argArray: any[])
    {
        if(!!this.evtGroup[id])
        {
            var funcs = this.evtGroup[id]?.getAll(name);
            for(var i = 0; i < funcs.length; i++)
            {
                funcs[i](...argArray);
            }
        }
    }

}