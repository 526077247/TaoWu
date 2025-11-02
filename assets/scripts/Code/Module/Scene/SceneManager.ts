import { director, resources, SceneAsset, sys } from "cc";
import { ETTask } from "../../../ThirdParty/ETTask/ETTask";
import { IManager } from "../../../Mono/Core/Manager/IManager";
import { Queue } from "../../../Mono/Core/Object/Queue";
import { ObjectPool } from "../../../Mono/Core/ObjectPool";
import { Log } from "../../../Mono/Module/Log/Log";
import { BundleManager } from "../../../Mono/Module/Resource/BundleManager";
import { TimerManager } from "../../../Mono/Module/Timer/TimerManager";
import { MapScene } from "../../Game/Scene/MapScene";
import { CameraManager } from "../Camera/CameraManager";
import { GameObjectPoolManager } from "../Resource/GameObjectPoolManager";
import { ImageLoaderManager } from "../Resource/ImageLoaderManager";
import { ResourceManager } from "../Resource/ResourceManager";
import { UIManager } from "../UI/UIManager";
import { IScene } from "./IScene";
import { LoadingScene } from "./LoadingScene";
import { UIToast } from "../../Game/UI/UICommon/UIToast";

export class SceneManager implements IManager{
    private static _instance: SceneManager;

    public static get instance(): SceneManager{
        return SceneManager._instance;
    }

    private readonly waitFinishTask: Queue<ETTask> = new Queue<ETTask>();
    private _currentScene: IScene
    private _currentSceneAsset: SceneAsset
    private _busing : boolean

    public get currentScene(): IScene{
        return this._currentScene;
    }

    public get busing(): boolean{
        return this._busing;
    }

    public init()
    {
        SceneManager._instance = this;
    }

    public destroy()
    {
        this.waitFinishTask.clear();
        SceneManager._instance = null;
    }

    public async getScene<T extends IScene>(type: new () => T) {
        const res = ObjectPool.instance.fetch<T>(type);
        await res.onCreate();
        return res;
    }

    async innerSwitchScene<T extends IScene>(type: new () => T, needClean: boolean = false, id:number = 0, ...ignoreClean: string[]){
        let slidValue = 0;
        Log.info("InnerSwitchScene start open uiLoading");
        var scene = await this.getScene<T>(type);
        if (this._currentScene != null)
        {
            await this._currentScene.onLeave();
            ObjectPool.instance.recycle(this._currentScene);
        }

        if (scene instanceof MapScene)
        {
            scene.configId = id;
        }

        let [cleanup, loadScene, prepare] = scene.getProgressPercent();
        let total = cleanup + loadScene + prepare;
        cleanup = cleanup / total * 0.9;
        loadScene = loadScene / total * 0.9;
        prepare = prepare / total * 0.9;

        await scene.onEnter();
        await scene.setProgress(slidValue);

        CameraManager.instance.setCameraStackAtLoadingStart();

        //等待资源管理器加载任务结束
        Log.info("InnerSwitchScene ProcessRunning Done ");
        while (ResourceManager.instance.isProcessRunning())
        {
            await TimerManager.instance.waitAsync(1);
        }

        slidValue += 0.01;
        await scene.setProgress(slidValue);
        await TimerManager.instance.waitAsync(1);

        //清理UI
        Log.info("InnerSwitchScene Clean UI");
        await UIManager.instance.destroyWindowExceptNames(...scene.getDontDestroyWindow());

        slidValue += 0.01;
        await scene.setProgress(slidValue);
        //清除ImageLoaderManager里的资源缓存 这里考虑到我们是单场景
        Log.info("InnerSwitchScene ImageLoaderManager Cleanup");
        ImageLoaderManager.instance.clear();
        //清除预设以及其创建出来的gameObject, 这里不能清除loading的资源
        Log.info("InnerSwitchScene GameObjectPool Cleanup");
        if (needClean)
        {
            const ignorePathArray = []
            
            if (ignoreClean != null) ignorePathArray.concat(ignoreClean);
            ignorePathArray[ignorePathArray.length] = UIToast.PrefabPath;
            GameObjectPoolManager.instance.cleanup(true, ...ignorePathArray);
            slidValue += 0.01;
            await scene.setProgress(slidValue);
            

            await BundleManager.instance.unloadUnusedBundle();
            slidValue += 0.01;
            await scene.setProgress(slidValue);
        }
        else
        {
            slidValue += 0.02;
            await scene.setProgress(slidValue);
        }

        var loadingScene = await this.getScene<LoadingScene>(LoadingScene);
        var loadingSceneAssets:SceneAsset = await ResourceManager.instance.loadSceneAsync(loadingScene.getScenePath());
        director.runScene(loadingSceneAssets);
        if(this._currentSceneAsset != null) ResourceManager.instance.releaseAsset(this._currentSceneAsset);
        this._currentSceneAsset = null;

        Log.info("LoadSceneAsync Over");
        slidValue += 0.01;
        await scene.setProgress(slidValue);
        try {
            sys.garbageCollect()
            sys.garbageCollect()
        } catch (e) {
            Log.info('Manual GC not supported:', e.message);
        }


        slidValue += cleanup;
        await scene.setProgress(slidValue);

        Log.info("异步加载目标场景 Start");
        //异步加载目标场景
        this._currentSceneAsset = await ResourceManager.instance.loadSceneAsync(scene.getScenePath());
        director.runScene(this._currentSceneAsset);
        ResourceManager.instance.releaseAsset(loadingSceneAssets);
        await scene.onComplete();
        slidValue += loadScene;
        await scene.setProgress(slidValue);
        //准备工作：预加载资源等
        await scene.onPrepare(slidValue, slidValue + prepare);

        slidValue += prepare;
        await scene.setProgress(slidValue);
        CameraManager.instance.setCameraStackAtLoadingDone();

        slidValue = 1;
        await scene.setProgress(slidValue);
        Log.info("等久点，跳的太快");
        //等久点，跳的太快
        await TimerManager.instance.waitAsync(500);
        Log.info("加载目标场景完成 Start");
        this._currentScene = scene;
        await scene.onSwitchSceneEnd();
        this.finishLoad();
    }

    /**
     * 切换场景
     * @param type 
     * @param needClean 
     * @returns 
     */
    public async switchScene<T extends IScene>(type: new () => T, needClean: boolean = true)
    {
        if (this.busing) return;
        if (this.isInTargetScene<T>(type))
            return;
        this._busing = true;
        var ignoreClean = this.currentScene?.getScenesChangeIgnoreClean()??[];
        await this.innerSwitchScene<T>(type, needClean, 0, ...ignoreClean);
        //释放loading界面引用的资源
        GameObjectPoolManager.instance.cleanupWithPathArray(ignoreClean);
        this._busing = false;
    }

    public getCurrentScene<T extends IScene>() : T
    {
        return this.currentScene as T;
    }

    public isInTargetScene<T extends IScene>(type: new () => T) 
    {
        if (this.currentScene == null) return false;
        return this.currentScene instanceof type;
    }

    public waitLoadOver():ETTask{
        const task:ETTask = ETTask.create();
        this.waitFinishTask.enqueue(task);
        return task;
    }

    public finishLoad()
    {
        let count = this.waitFinishTask.count;
        while (count-- > 0)
        {
            const task:ETTask = this.waitFinishTask.dequeue();
            task.setResult();
        }
    }
}