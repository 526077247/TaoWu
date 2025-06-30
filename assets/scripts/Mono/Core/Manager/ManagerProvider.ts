import { LinkedList } from "../Object/LinkedList"
import { UnOrderDoubleKeyDictionary } from "../Object/UnOrderDoubleKeyDictionary"
import { IManagerDestroy, IManager } from "./IManager"
import { IUpdate, ILateUpdate} from "../../Module/Update/IUpdate"
import { CCCLifeTimeHelper } from "../../Helper/CCCLifeTimeHelper"
export class ManagerProvider
{
    static readonly instance : ManagerProvider = new ManagerProvider();

    managersDictionary:UnOrderDoubleKeyDictionary<new (...args: any[]) => any, string, IManagerDestroy> ;
    allManagers: LinkedList<IManagerDestroy>;
    updateManagers: LinkedList<IUpdate>;
    lateUpdateManagers: LinkedList<ILateUpdate>;

    constructor()
    {
        this.allManagers = new LinkedList<IManagerDestroy>();
        this.managersDictionary = new UnOrderDoubleKeyDictionary<new (...args: any[]) => any, string, IManagerDestroy>();
        this.updateManagers = new LinkedList<IUpdate>();
        this.lateUpdateManagers = new LinkedList<ILateUpdate>();
    }
    
    public static getManager<T extends IManagerDestroy>(classType: new (...args: any[]) => T, name:string = "")
    {
        var res = ManagerProvider.instance.managersDictionary.tryGetValue(classType, name);
        if (!res[0])
        {
            return null;
        }
        return res[1] as T;
    }
    public static registerManager<T extends IManager<P1, P2, P3>, P1 = void, P2 = void, P3 = void>(classType: new (...args: any[]) => T,p1?: P1,p2?: P2,p3?: P3, name: string = ""): T
    {
        var res = ManagerProvider.instance.managersDictionary.tryGetValue(classType, name);
        if (!res[0])
        {
            res[1] = new classType() as T;
            var u = res[1] as any;
            if (!!u.update)
            {
                ManagerProvider.instance.updateManagers.addLast(u);
            }
            if (!!u.lateUpdate)
            {
                ManagerProvider.instance.lateUpdateManagers.addLast(u);
            }
            (res[1] as T).init(p1, p2, p3);
            ManagerProvider.instance.managersDictionary.add(classType,name,res[1]);
            ManagerProvider.instance.allManagers.addLast(res[1]);
        }
        return res[1] as T;
    }
    
  
    public static removeManager<T extends IManagerDestroy>(classType: new (...args: any[]) => T, name:string = "")
    {
        var res = ManagerProvider.instance.managersDictionary.tryGetValue(classType, name);
        if (!res[0])
        {
            var u = res[1] as any;
            if (!!u.update)
            {
                ManagerProvider.instance.updateManagers.remove(u);
            }
            if (!!u.lateUpdate)
            {
                ManagerProvider.instance.lateUpdateManagers.remove(u);
            }
            ManagerProvider.instance.managersDictionary.remove(classType, name);
            ManagerProvider.instance.allManagers.remove(res[1]);
            (res[1] as T)?.destroy();
        }
    }

    public static clear()
    {
        ManagerProvider.instance.managersDictionary.clear();
        ManagerProvider.instance.updateManagers.clear();
        ManagerProvider.instance.lateUpdateManagers.clear();
        for (const item of ManagerProvider.instance.allManagers)
        {
            (item as IManagerDestroy)?.destroy();
        }
        ManagerProvider.instance.allManagers.clear();
    }
    public static update()
    {
        for (var node = ManagerProvider.instance.updateManagers.first; node !=null; node = node.next)
        {
            node.value.update();
        }
        var count = CCCLifeTimeHelper.updateFinishTask.count;
        while (count-- > 0)
        {
            var task = CCCLifeTimeHelper.updateFinishTask.dequeue();
            task.setResult();
        }
    }
    public static lateUpdate()
    {
        for (var node = ManagerProvider.instance.lateUpdateManagers.first; node !=null; node = node.next)
        {
            node.value.lateUpdate();
        }
        var count = CCCLifeTimeHelper.updateFinishTask.count;
        while (count-- > 0)
        {
            var task = CCCLifeTimeHelper.updateFinishTask.dequeue();
            task.setResult();
        }
    }
}