import { IManager } from "../../../Mono/Core/Manager/IManager";

export class CameraManager implements IManager{
    private static _instance: CameraManager;

    public static get instance(): CameraManager{
        return CameraManager._instance;
    }

    public init(){
        CameraManager._instance = this;
    }

    public destroy() {
        CameraManager._instance = null;
    }
}