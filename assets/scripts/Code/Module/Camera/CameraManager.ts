import { Camera, director, Node } from "cc";
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

    private sceneMainCameraGo:Node;
    public sceneMainCamera: Camera;

    public resetSceneCamera()
    {
        this.sceneMainCameraGo = null;
        this.sceneMainCamera = null;
    }

    public setCameraStackAtLoadingStart(){
        this.resetSceneCamera();
    }
    
    public setCameraStackAtLoadingDone()
    {
        var mainCamera: Node = director.root.cameraList[0].node;
        if (mainCamera != null) //场景已有主摄像机
        {
            if (this.sceneMainCamera != null)
            {
                this.sceneMainCamera = null;
                this.sceneMainCameraGo.destroy();
            }

            this.sceneMainCamera = mainCamera.getComponent(Camera);
            this.sceneMainCameraGo = this.sceneMainCamera.node;
        }
    }
}