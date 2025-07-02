import { Camera, director, find, Node, _decorator, view, sys, Vec2, UITransform } from 'cc';
import { IManager } from "../../../Mono/Core/Manager/IManager"
import { ManagerProvider } from "../../../Mono/Core/Manager/ManagerProvider"
import { HashSetComponent } from '../../../Mono/Core/Object/HashSetComponent';
import { LinkedList } from "../../../Mono/Core/Object/LinkedList"
import { Define } from '../../../Mono/Define';
import { Log } from "../../../Mono/Module/Log/Log"
import { TimerManager } from '../../../Mono/Module/Timer/TimerManager';
import { CoroutineLockManager, CoroutineLock } from '../CoroutineLock/CoroutineLockManager';
import { CoroutineLockType } from '../CoroutineLock/CoroutineLockType';
import { IOnCreate } from './IOnCreate';
import { IOnEnable } from './IOnEnable';
import { UIBaseView } from './UIBaseView';
import { UILayer } from "./UILayer"
import { UIWindow, UIWindowLoadingState } from './UIWindow';
import * as string from "../../../Mono/Helper/StringHelper"
import { GameObjectPoolManager } from '../Resource/GameObjectPoolManager';
import { I18NManager } from '../I18N/I18NManager';
import { II18N } from '../I18N/II18N';
import { IOnWidthPaddingChange} from './IOnWidthPaddingChange'

export enum UILayerNames
{
    GameBackgroundLayer,
    BackgroundLayer,
    GameLayer,
    SceneLayer,
    NormalLayer,
    TipLayer,
    TopLayer,
}

export class UILayerDefine{
    public name : UILayerNames;
    public planeDistance : number;
    public zOrder: number;
}

const configs :UILayerDefine[] = [
    {
        name : UILayerNames.GameBackgroundLayer,
        planeDistance : 1000,
        zOrder : 0,
    },
    {
        name : UILayerNames.BackgroundLayer,//主界面、全屏的一些界面
        planeDistance : 900,
        zOrder : 1000,
    },
    {
        name : UILayerNames.GameLayer,  //游戏内的View层
        planeDistance : 800,
        zOrder : 1800,
    },
    {
        name : UILayerNames.SceneLayer,// 场景UI，如：点击建筑查看建筑信息---一般置于场景之上，界面UI之下
        planeDistance : 700,
        zOrder : 2000,
    },
    {
        name : UILayerNames.NormalLayer, //普通UI，一级、二级、三级等窗口---一般由用户点击打开的多级窗口
        planeDistance : 600,
        zOrder : 3000,
    },
    {
        name : UILayerNames.TipLayer,//提示UI，如：错误弹窗，网络连接弹窗等
        planeDistance : 500,
        zOrder : 4000,
    },
    {
        name : UILayerNames.TopLayer,//顶层UI，如：场景加载
        planeDistance : 400,
        zOrder : 5000,
    },
]
export class UIManager implements IManager {
    private static _instance: UIManager;

    public static get instance(): UIManager {
        return UIManager._instance;
    }
    private _gameObject: Node;
    private _widthPadding : number
    private uiCamera: Camera;
    private resolution: Vec2
   
    private layers: Map<UILayerNames, UILayer>;//所有可用的层级
    private windowStack: Map<UILayerNames, LinkedList<string>>;//窗口记录队列
    private windows: Map<string, UIWindow>; //所有存活的窗体  {uiName:window}
    public get screenSizeFlag()
    {
        let width = view.getVisibleSize().width;
        let height = view.getVisibleSize().height;
        var flagx = Define.DesignScreenWidth / width;
        var flagy = Define.DesignScreenHeight / height;
        return flagx > flagy ? flagx : flagy;
    }

    public init() {
        var safeArea = sys.getSafeAreaRect();
        this._widthPadding = safeArea.x;
        UIManager._instance = this;
        this.windows = new Map<string, UIWindow>();
        this.windowStack = new Map<UILayerNames, LinkedList<string>>();
        this.initLayer();
        // Messager.Instance.AddListener<int, int>(0, MessageId.OnKeyInput, OnKeyInput);
    }

    public destroy() {
        // Messager.Instance.RemoveListener<int, int>(0, MessageId.OnKeyInput, OnKeyInput);
        UIManager._instance = null;
        this.onDestroyAsync();
    }

    private async onDestroyAsync() {
        await this.destroyAllWindow();
        this.windows.clear();
        this.windows = null;
        this.windowStack.clear();
        this.windowStack = null;
        this.destroyLayer();
        Log.info("UIManagerComponent Destroy");
    }

    private initLayer() {
        Log.info("UILayersComponent Awake");
        var UIRootPath = "Global/UI";
        var uiCameraPath = UIRootPath + "/UICamera";
        this._gameObject = find(UIRootPath);
        const cTrans = find(uiCameraPath);
        this.uiCamera = cTrans.getComponent<Camera>(Camera);
        cTrans.setPosition(Define.DesignScreenWidth/2, Define.DesignScreenHeight/2, 1000);
        this.resolution = new Vec2(Define.DesignScreenWidth, Define.DesignScreenHeight);//分辨率
        this.layers = new Map<UILayerNames, UILayer>();
        for (let i = 0; i < configs.length; i++) {
            var layer = configs[i];
            const go = new Node(UILayerNames[layer.name]);
            this._gameObject.addChild(go);
            let newLayer: UILayer = ManagerProvider.registerManager<UILayer, UILayerDefine, Node>(UILayer, layer, go, null, UILayerNames[layer.name]);
            this.layers.set(layer.name,newLayer);
            this.windowStack.set(layer.name,new LinkedList<string>());
            Log.info("create layer "+UILayerNames[layer.name]);
        }
    }

    private destroyLayer(){
        for (const [key,value] of this.layers) {
            var obj = value.node;
            obj.destroy();
        }
        this.layers.clear();
        this.layers = null;
        Log.info("UILayersComponent Dispose");
    }

    
    
    public getLayer(layer: UILayerNames): UILayer
    {
        return this.layers.get(layer);
    }

    public getUICamera(): Camera
    {
        return this.uiCamera;
    }
    
    /**
     * 判断窗口打开状态
     * @param ui 
     * @param active 2打开且loading,1打开,-1关闭,0不做限制
     * @returns 
     */
    public isWindowActive<T extends UIBaseView | void>(ui: (new () => T)| string | UIBaseView, active:number = 0) {
        const uiName = this.getUIName(ui);
        let target = this.getWindow(uiName);
        if (target == null)
        {
            return false;
        }

        if (active == 0 || active * (target.active ? 1 : -1) > 0)
        {
            if (active == 2)
            {
                return target.loadingState == UIWindowLoadingState.LoadOver;
            }

            return true;
        }

        return false;
    }

    /**
     * 获取UI窗口
     * @param uiName 
     * @param active 2打开且loading,1打开，-1关闭,0不做限制
     * @returns 
     */
    public getWindow(uiName:string, active:number = 0):UIWindow{
        const target = this.windows.get(uiName);
        if (!!target)
        {
            if (active == 0 || active * (target.active ? 1 : -1) > 0)
            {
                if (active == 2)
                {
                    return target.loadingState == UIWindowLoadingState.LoadOver ? target : null;
                }
                return target;
            }
            return null;
        }
        return null;
    }

    /**
     * 获取UI窗口
     * @param type 2打开且loading，1打开，-1关闭,0不做限制
     * @param active 
     * @returns 
     */
    public getView<T extends UIBaseView>(type: new () => T,active:number = 0): T 
    {
        const uiName = type.name;
        if (this.windows != null)
        {
            const target = this.windows.get(uiName);
            if(!target)  return null;
            if (active == 0 || active * (target.active ? 1 : -1) > 0)
            {
                if (active == 2)
                {
                    return target.loadingState == UIWindowLoadingState.LoadOver ? target.view as T : null;
                }
                return target.view as T;
            }

            return null;
        }

        return null;
    }

    /**
     * 获取最上层window
     * @param ignore 忽略的层级
     * @returns 
     */
    public getTopWindow(...ignore: UILayerNames[]): UIWindow
    {
        const ignores:HashSetComponent<UILayerNames> = HashSetComponent.create<UILayerNames>()
        for (let i = 0; i < ignore.length; i++)
        {
            ignores.add(ignore[i]);
        }
        let res: UIWindow = null;
        for (let i = UILayerNames.TopLayer; i >= 0; i--)
        {
            var layer = i;
            if (!ignores.has(layer))
            {
                var win = this.getLayerTopWindow(layer);
                if (win != null) {
                    res = win;
                    break;
                }
            }
        }
        ignores.dispose();
        return res;
    }

    /**
     * 获取最上层window
     * @param layer 
     * @returns 
     */
    public getLayerTopWindow(layer: UILayerNames): UIWindow {
        var wins: LinkedList<string> = this.windowStack.get(layer);
        if (wins.size <= 0) return null;
        for (var node = wins.first; node != null; node = node.next)
        {
            var name = node.value;
            var win = this.getWindow(name, 1);
            if (win != null)
                return win;
        }

        return null;
    }

    /**
     * 打开窗口
     * @param type 
     * @param path 预制体路径
     * @param p1 
     * @param p2 
     * @param p3 
     * @param p4 
     * @param layerName UI层级
     * @returns 
     */
    public async openWindow<T extends UIBaseView & IOnCreate, P1 = void, P2 = void, P3 = void, P4 = void>
        (type: (new () => T), path:string, p1?:P1, p2?:P2, p3?:P3, p4?:P4, layerName:UILayerNames = UILayerNames.NormalLayer) {
        const uiName = this.getUIName(type);
        var target = this.getWindow(uiName);
        if (target == null)
        {
            target = this.initWindow<T>(type, path, layerName);
            this.windows.set(uiName, target);
        }
        target.layer = layerName;
        return await this.innerOpenWindow<T, P1, P2, P3, P4>(target, p1, p2, p3, p4);
    }

    /**
     * 关闭窗体
     * @param uiName 
     * @returns 
     */
    public async closeWindow<T extends UIBaseView | void>(ui: (new () => T)| string | UIBaseView) {
        var target = this.getWindow(this.getUIName(ui), 1);
        if (target == null) return;
        while (target.loadingState != UIWindowLoadingState.LoadOver)
        {
            await TimerManager.instance.waitAsync(1);
        }

        this.removeFromStack(target);
        this.innerCloseWindow(target);
    }

    /**
     * 通过层级关闭
     * @param layer 
     * @param exceptUINames 
     */
    public async closeWindowByLayer(layer: UILayerNames, ...exceptUINames: string[]) {
        const dictUINames: HashSetComponent<string>  = HashSetComponent.create<string>()
    
        if (exceptUINames != null && exceptUINames.length > 0)
        {
            for (let i = 0; i < exceptUINames.length; i++)
            {
                dictUINames.add(exceptUINames[i]);
            }
        }

        const taskScheduler:Promise<void>[] = []
        for (const [key,win] of this.windows)
        {
            if (win.layer == layer && (dictUINames == null || !dictUINames.has(key)))
            {
                taskScheduler[taskScheduler.length] = this.closeWindow(key);
            }
        }

        await Promise.all(taskScheduler);
        dictUINames.dispose();
    }

    /**
     * 销毁窗体
     * @param ui 
     * @param clear 
     */
    public async destroyWindow<T extends UIBaseView | void>(ui: (new () => T)| string | UIBaseView , clear:boolean = false){
        const uiName = this.getUIName(ui);
        let target = this.getWindow(uiName);
        if (target != null)
        {
            await this.closeWindow(uiName);
            this.innerDestroyWindow(target, clear);
            this.windows.delete(target.name);
            target.dispose();
        }
    }

    /**
     * 销毁隐藏状态的窗口
     */
    public async destroyUnShowWindow() {
        const taskScheduler:Promise<void>[] = []
        let keys = [...this.windows.keys()]
        for (const key of keys)
        {
            if (!this.windows.get(key).active)
            {
                taskScheduler[taskScheduler.length] = this.destroyWindow(key);
            }
        }

        await Promise.all(taskScheduler);
    
    }

    /**
     * 销毁除指定窗口外所有窗口
     * @param typeNames 
     */
    public async destroyWindowExceptNames(...typeNames: string[]){
        const dictUINames: HashSetComponent<string> = HashSetComponent.create<string>()
        if (typeNames != null)
        {
            for (let i = 0; i < typeNames.length; i++)
            {
                dictUINames.add(typeNames[i]);
            }
        }
        
        const taskScheduler:Promise<void>[] = []
        let keys = [...this.windows.keys()]
        for (const key of keys)
        {
            if (!dictUINames.has(key))
            {
                taskScheduler[taskScheduler.length] = this.destroyWindow(key);
            }
        }

        await Promise.all(taskScheduler);
        

        dictUINames.dispose();
    }

    /**
     * 销毁指定层级外层级所有窗口
     * @param layer 
     */
    public async destroyWindowExceptLayer(layer: UILayerNames) {
    
        const taskScheduler:Promise<void>[] = []
        let keys = [...this.windows.keys()]
        for (const key of keys)
        {
            if (this.windows.get(key)?.layer != layer)
            {
                taskScheduler[taskScheduler.length] = this.destroyWindow(key);
            }
        }
        await Promise.all(taskScheduler);
    }

    /**
     * 销毁指定层级所有窗口
     * @param layer 
     */
    public async destroyWindowByLayer(layer: UILayerNames) {
    
        const taskScheduler:Promise<void>[] = []
        let keys = [...this.windows.keys()]
        for (const key of keys)
        {
            if (this.windows.get(key)?.layer == layer)
            {
                taskScheduler[taskScheduler.length] = this.destroyWindow(key);
            }
        }
        await Promise.all(taskScheduler);
    }

    /**
     * 销毁所有窗体
     */
    public async destroyAllWindow(){
        const taskScheduler:Promise<void>[] = []
        let keys = [...this.windows.keys()]
        for (const key of keys)
        {
            taskScheduler[taskScheduler.length] = this.destroyWindow(key);
        }
        await Promise.all(taskScheduler);
    }

    /**
     * 将窗口移到当前层级最上方
     * @param ui 
     * @returns 
     */
    public moveWindowToTop<T extends UIBaseView>(ui: new() => T)
    {
        const uiName = this.getUIName(ui);
        var target = this.getWindow(uiName, 1);
        if (target == null)
        {
            return;
        }

        var layerName = target.layer;
        if (this.windowStack.get(layerName)?.contains(uiName))
        {
            this.windowStack.get(layerName).remove(uiName);
        }

        this.windowStack[layerName].AddFirst(uiName);
        this.innerAddWindowToStack(target);
    }

    /**
     * 初始化window
     * @param type 
     * @param name 
     * @param path 
     * @param layerName 
     * @returns 
     */
    private initWindow<T extends UIBaseView>(type: new() => T, path: string, layerName: UILayerNames): UIWindow {
        const window: UIWindow = UIWindow.create();
        window.name = this.getUIName(type);
        window.active = false;
        window.layer = layerName;
        window.loadingState = UIWindowLoadingState.NotStart;
        window.prefabPath = path;
        window.view = new type();
        return window;
    }

    private async innerOpenWindow<T extends UIBaseView, P1 = void, P2 = void, P3 = void, P4 = void>
        (target: UIWindow, p1?:P1, p2?:P2, p3?:P3, p4?:P4) {

        let coroutineLock: CoroutineLock = null;
        try
        {
            coroutineLock = await CoroutineLockManager.instance.wait(CoroutineLockType.UIManager, string.getHash(target.name));
            target.active = true;
            const res: T = target.view as T;
            var needLoad = target.loadingState == UIWindowLoadingState.NotStart;
            target.loadingState = UIWindowLoadingState.Loading;
            if (needLoad)
            {
                await this.innerOpenWindowGetGameObject(target.prefabPath, target);
            }

            this.innerResetWindowLayer(target);
            await this.addWindowToStack(target, p1, p2, p3);
            target.loadingState = UIWindowLoadingState.LoadOver;
            return res;
        }
        finally
        {
            coroutineLock?.dispose();
        }
    }

    private async innerOpenWindowGetGameObject(path: string, target: UIWindow)
    {
        const view = target.view;
        var go = await GameObjectPoolManager.instance.getGameObjectAsync(path);
        if (go == null)
        {
            Log.error(`UIManager InnerOpenWindow ${target.prefabPath} fail`);
            return;
        }
        var node: Node = go;
        node.setParent(this.getLayer(target.layer).node, false);

        node.name = target.name;
        view.setNode(node);
        var viewAny = view as any;
        if(!!viewAny?.onCreate){
            viewAny.onCreate();
        }
        if(!!viewAny?.onLanguageChange){
            I18NManager.instance.registerI18NEntity(viewAny as II18N);
        }
    }

    private innerResetWindowLayer(window: UIWindow)
    {
        var target = window;
        var view = target.view;
        var node = view.getNode();
        if (!!node)
        {
            var layer = this.getLayer(target.layer);
            node.setParent(layer.node, false);
        }
        if (!!((view as any).isOnWidthPaddingChange))
            this.onWidthPaddingChange(view);
    }

    /**
     * 内部关闭窗体，OnDisableSystem
     * @param target 
     */
    private innerCloseWindow(target: UIWindow)
    {
        if (target.active)
        {
            this.deactivate(target);
            target.active = false;
        }
    }

    private deactivate(target: UIWindow)
    {
        var view = target.view;
        if (!!view)
            view.setActive(false);
    }

    private innerDestroyWindow(target: UIWindow,  clear: boolean = false)
    {
        var view = target.view;
        if (view != null)
        {
            var obj = view.getNode();
            if (obj)
            {
                if (!GameObjectPoolManager.instance)
                    obj.destroy()
                else
                    GameObjectPoolManager.instance.recycleGameObject(obj, clear);
            }
            const viewAny = view as any;
            if (!!viewAny.onLanguageChange)
                I18NManager.instance?.removeI18NEntity(viewAny);
            view.beforeOnDestroy();
            if(!!viewAny.onDestroy)
                viewAny.onDestroy();
        }
    }

    private async addWindowToStack<P1 = void, P2 = void, P3 = void, P4 = void> (target: UIWindow, p1?:P1, p2?:P2, p3?:P3, p4?:P4) {
        var uiName = target.name;
        var layerName = target.layer;
        let isFirst: boolean = true;
        if (this.windowStack.get(layerName).contains(uiName))
        {
            isFirst = false;
            this.windowStack.get(layerName).remove(uiName);
        }

        this.windowStack.get(layerName).addFirst(uiName);
        this.innerAddWindowToStack(target);
        var view = target.view;
        view.setActive(true, p1, p2, p3, p4);
        if (isFirst && (layerName == UILayerNames.BackgroundLayer || layerName == UILayerNames.GameBackgroundLayer))
        {
            //如果是背景layer，则销毁所有的normal层或BackgroundLayer
            await this.closeWindowByLayer(UILayerNames.NormalLayer);
            await this.closeWindowByLayer(UILayerNames.GameLayer);
            await this.closeWindowByLayer(UILayerNames.BackgroundLayer, uiName);
            await this.closeWindowByLayer(UILayerNames.GameBackgroundLayer, uiName);
        }
    }

    private innerAddWindowToStack(target: UIWindow)
    {
        var view = target.view;
        var uiTrans: Node = view.getNode();
        if (uiTrans != null)
        {
            uiTrans.setSiblingIndex(uiTrans.parent.children.length - 1);
            // GuidanceManager.Instance?.NoticeEvent("Open_"+target.Name);
        }
    }

    /**
     * 移除
     * @param target 
     */
    private removeFromStack(target: UIWindow)
    {
        var uiName = target.name;
        var layerName = target.layer;
        if (this.windowStack.has(layerName))
        {
            this.windowStack.get(layerName).remove(uiName);
        }
        else
        {
            Log.error("not layer, name :" + layerName);
        }
    }


    /**
     * 修改边缘宽度
     * @param value 
     */
    private setWidthPadding(value: number){
        this._widthPadding = value;
        for (const layer of this.windowStack.values()) {
            if (layer != null)
            {
                for (let node = layer.first; null != node; node = node.next)
                {
                    var target = this.getWindow(node.value);
                    if (!!((target.view as any).isOnWidthPaddingChange))
                        this.onWidthPaddingChange(target.view);
                }
            }
        }
    }

    private onWidthPaddingChange(target: UIBaseView)
    {
        const rectTrans:UITransform  = target.getTransform();
        const padding = this._widthPadding;
        const safeArea = sys.getSafeAreaRect();
        const height = view.getVisibleSize().height;
        const width = view.getVisibleSize().width;
        const top = safeArea.yMin * this.screenSizeFlag;
        const bottom = (height - safeArea.yMax) * this.screenSizeFlag;
        // todo:
        // widget.offsetMin = new Vec2(padding * (1 - rectTrans.anchorMin.x), bottom * rectTrans.anchorMax.y);
        // widget.offsetMax = new Vec2(-padding * rectTrans.anchorMax.x, -top * (1 - rectTrans.anchorMin.y));
    }

    private getUIName<T extends UIBaseView | void>(ui: (new () => T)| string | UIBaseView){
        let uiName:string
        if(ui instanceof UIBaseView){
            var window = ui as UIBaseView;
            uiName = window.constructor.name;
        } else if(ui instanceof Function){
            uiName = (ui as any).name;
        }else{
            uiName = ui as string;
        }       
        return uiName;
    }

}

