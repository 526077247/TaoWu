import { ObjectPool } from "../../../Mono/Core/ObjectPool";
import { UIBaseView } from "./UIBaseView";
import { UILayerNames } from "./UIManager";

export enum UIWindowLoadingState{
    NotStart, // 未开始
    Loading, //加载中
    LoadOver, //加载完成
}

export class UIWindow {
   
    /**
     * 窗口名字
     */
    public name:string;
    /**
     * 是否激活
     */
    public active: boolean;
    /**
     *加载状态
        */
    public loadingState: UIWindowLoadingState;
    /**
     * 预制体路径
     */
    public prefabPath: string;
    /**
     * 窗口层级
     */
    public layer: UILayerNames;

    /**
     * 窗口类型
     */
    public view: UIBaseView;

    public static create(): UIWindow
    {
        return ObjectPool.instance.fetch<UIWindow>(UIWindow);
    }

    public dispose()
    {
        this.name = null;
        this.active = false;
        this.loadingState = UIWindowLoadingState.NotStart;
        this.prefabPath = null;
        this.layer = UILayerNames.BackgroundLayer;
        this.view = null;
        ObjectPool.instance.recycle(this);
    }
}