import { IManager, IManagerDestroy } from "../../../Mono/Core/Manager/IManager";
import { ManagerProvider } from "../../../Mono/Core/Manager/ManagerProvider";

export abstract class SceneManagerProvider
{
    protected abstract getName(): string;

    public getManager<T extends IManager>(classType: new (...args: any[]) => T)
    {
        return ManagerProvider.getManager<T>(classType, this.getName());
    }

    public registerManager<T extends IManager<P1,P2,P3>,P1 = void, P2 = void, P3 = void>(classType: new (...args: any[]) => T, p1?: P1, p2?: P2, p3?: P3)
    {
        return ManagerProvider.registerManager<T,P1,P2,P3>(classType, p1,p2,p3,this.getName());
    }

    public removeManager<T extends IManagerDestroy>(classType: new (...args: any[]) => T)
    {
        ManagerProvider.removeManager<T>(classType, this.getName());
    }

}
