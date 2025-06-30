import { Log } from "../../../Mono/Module/Log/Log";
import { IScene } from "../../Module/Scene/IScene";
import { SceneManagerProvider } from "../../Module/Scene/SceneManagerProvider";
import { UIManager } from "../../Module/UI/UIManager";
import { UILoadingView } from "../UI/UILoading/UILoadingView";

export class MapScene extends SceneManagerProvider implements IScene {
    public configId : number;

    public getName()
    {
        return "MapScene";
    }

    public getScenePath()
    {
        return "";
    }
    public getProgressPercent(): [number, number, number]
    {
        let cleanup = 0.2;
        let loadScene = 0.65;
        let prepare = 0.15;
        return [cleanup, loadScene, prepare]
    }
    
    private win: UILoadingView;
    private dontDestroyWindow: string[] = [UILoadingView.name];

    public getDontDestroyWindow(): string[]
    {
        return this.dontDestroyWindow;
    }

    public getScenesChangeIgnoreClean(): string[]
    {
        return [UILoadingView.PrefabPath];
    }
    public async onCreate()
    {
        
    }

    public async onEnter()
    {
        this.win = await UIManager.instance.openWindow<UILoadingView>(UILoadingView, UILoadingView.PrefabPath);
        this.win.setProgress(0);
    }

    public async onLeave()
    {
       
    }

    public async onPrepare(progressStart,progressEnd)
    {
        
    }

    public async onComplete()
    {

    }

    public async setProgress(value)
    {
        this.win.setProgress(value);
    }

    public async onSwitchSceneEnd()
    {
        await UIManager.instance.destroyWindow<UILoadingView>(UILoadingView);
        this.win = null;
        Log.info("进入场景 " + this.getScenePath());
    }
}