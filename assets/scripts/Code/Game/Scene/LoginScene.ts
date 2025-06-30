import { IScene } from "../../Module/Scene/IScene";
import { UIManager } from "../../Module/UI/UIManager";
import { UILoadingView } from "../UI/UILoading/UILoadingView";

export class HomeScene implements IScene
{
    private win: UILoadingView;
    private dontDestroyWindow: string[] = [UILoadingView.name];

    public getName(): string
    {
        return "login";
    }

    public getScenePath()
    {
        return "scenes/loginScene/login";
    }

    /**
     * 获取各阶段进度比例
     */
    public getProgressPercent(): [cleanup:number,loadScene:number,prepare:number]{
        const cleanup = 0.2;
        const loadScene = 0.65;
        const prepare = 0.15;
        return[cleanup, loadScene, prepare]
    }
    
    public getDontDestroyWindow(): string[]{
        return this.dontDestroyWindow;
    }
    /**
     * 场景切换中不释放，切换完毕后释放的资源列表
     */
    public getScenesChangeIgnoreClean():string[]{
        return [UILoadingView.PrefabPath]
    }
    /**
     * 创建：初始化一些需要全局保存的状态
     */
    public async onCreate(): Promise<void>{}

    /**
     * 加载前的初始化
     */
    public async onEnter(): Promise<void>{
        this.win = await UIManager.instance.openWindow<UILoadingView>(UILoadingView,UILoadingView.PrefabPath);
        this.win.setProgress(0);
    }

    /**
     * 设置进度
     * @param value 
     */
    public async setProgress(value: number): Promise<void>{
        this.win.setProgress(value);
    }
    /**
     * 场景加载结束：后续资源准备（预加载等）
     * @param float 
     * @param progressStart 
     * @param float 
     * @param progressEnd 
     */
    public async onPrepare(progressStart: number,progressEnd: number): Promise<void>{}

    /**
     * 场景加载完毕
     */
    public async onComplete(): Promise<void>{}
    
    /**
     * 离开场景：清理场景资源
     */
    public async onLeave(): Promise<void>{}

    /**
     * 转场景结束
     */
    public async onSwitchSceneEnd(): Promise<void>{
        await UIManager.instance.destroyWindow<UILoadingView>(UILoadingView);
        this.win = null;
    }
}