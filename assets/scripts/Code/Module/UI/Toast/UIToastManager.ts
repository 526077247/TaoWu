import { IManager } from "../../../../Mono/Core/Manager/IManager";

export class UIToastManager implements IManager{
    public static readonly PrefabPath = "";
    private static _instance: UIToastManager;

    public static get instance(): UIToastManager{
        return UIToastManager._instance;
    }

    public init(){
        UIToastManager._instance = this;
    }

    public destroy() {
        UIToastManager._instance = null;
    }
}