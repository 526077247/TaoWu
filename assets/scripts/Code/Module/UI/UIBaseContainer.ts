import { Node, UITransform } from "cc";
import { EDITOR } from "cc/env";
import {UnOrderDoubleKeyDictionary} from "../../../Mono/Core/Object/UnOrderDoubleKeyDictionary"
import { Log } from "../../../Mono/Module/Log/Log";
import { TimerManager } from "../../../Mono/Module/Timer/TimerManager";
import { TimerType } from "../../../Mono/Module/Timer/TimerType";
import { ReferenceCollector } from "../../../Mono/Module/UI/ReferenceCollector";
import { I18NManager } from "../I18N/I18NManager";
import * as string from "../../../Mono/Helper/StringHelper"
import { RectTransform } from "../../../Mono/Module/UI/RectTransfrom";
export abstract class UIBaseContainer {

    public abstract getConstructor(): new () => UIBaseContainer;

    private parent: UIBaseContainer;
    private components : UnOrderDoubleKeyDictionary<string, new (...args: any[]) => any, UIBaseContainer>; //[path]:[component_name:UIBaseContainer]
    private length: number = 0;
    private transform: UITransform;
    private rectTransform: RectTransform;
    private node : Node;
    private parentNode : Node;
    private path: string;
    private timerId: bigint = 0n;
    private _activeSelf: boolean = false;

    public get activeSelf(): boolean{
        return this._activeSelf;
    }

    public setNode(node: Node)
    {
        this.node = node;
    }

    public getNode(): Node
    {
        this.activatingNode();
        return this.node;
    }

    public getTransform(): UITransform
    {
        if (this.transform == null)
        {
            this.transform = this.getNode().getComponent<UITransform>(UITransform);
        }

        return this.transform;
    }

    public getRectTransform(): RectTransform
    {
        if (this.rectTransform == null)
        {
            this.rectTransform = this.getNode().getComponent<RectTransform>(RectTransform);
        }
        if (this.rectTransform == null)
        {
            this.rectTransform = this.getNode().addComponent<RectTransform>(RectTransform);
        }
        return this.rectTransform;
    }

    private activatingNode(): Node
    {
        if (this.node == null)
        {
            var pTrans: Node = this.getParentNode();
            if (pTrans != null)
            {
                var rc = pTrans.getComponent<ReferenceCollector>(ReferenceCollector);
                if (rc != null)
                {
                    this.node = rc.get(Node, this.path);
                }

                if (this.node == null)
                {
                    this.node = pTrans.getChildByPath(this.path);
                    if(EDITOR)
                    {
                        if (this.node != null && !string.isNullOrEmpty(this.path) && rc != null)
                        {
                            rc.add(this.path, this.node);
                        }
                    }
                }
            }
            if (this.node == null)
            {
                Log.error(this.parent.getConstructor().name + "路径错误:" + this.path);
            }
        }

        return this.node;
    }

    private getParentNode(): Node
    {
        if (this.parentNode == null)
        {
            var pui = this.parent;
            if (pui == null)
            {
                Log.error("ParentTransform is null Path:" + this.path);
            }
            else
            {
                pui.activatingNode();
                this.parentNode = pui.node;
            }
        }

        return this.parentNode;
    }

    private afterOnEnable()
    {
        this.walk((component) =>
        {
            const componentAny = component as any;
            if (!!componentAny.onEnable) componentAny.onEnable();
            component._activeSelf = true;
            component.afterOnEnable();
        });
        const thisAny = this as any;
        if (!!thisAny.update)
        {
            if(TimerManager.instance.remove(this.timerId)){
                this.timerId = 0n;
            }
            this.timerId = TimerManager.instance.newFrameTimer(TimerType.ComponentUpdate, thisAny.update, this);
        }
    }

    private beforeOnDisable()
    {
        const thisAny = this as any;
        if (!!thisAny.update)
        {
            if(TimerManager.instance.remove(this.timerId))
            {
                this.timerId = 0n;
            }
        }
        this.walk((component) =>
        {
            component.beforeOnDisable();
            const componentAny = component as any;
            if (!!componentAny.onDisable) componentAny.onDisable();
        });
    }

    public beforeOnDestroy()
    {
        const thisAny = this as any;
        if (!!thisAny.update)
        {
            if(TimerManager.instance.remove(this.timerId))
            {
                this.timerId = 0n;
            }
        }
        if (this.components != null)
        {
            const keys1 = Array.from(this.components.keys());
            for (let i = keys1.length - 1; i >= 0; i--)
            {
                const [res, map] = this.components.tryGetDic(keys1[i])
                if (res)
                {
                    const keys2 = Array.from(map.keys());
                    for (let j = keys2.length - 1; j >= 0; j--)
                    {
                        var component = map.get(keys2[j]);
                        component.beforeOnDestroy();
                        const componentAny = component as any;
                        if (!!componentAny.onLanguageChange)
                            I18NManager.instance?.removeI18NEntity(componentAny);
                        if (!!componentAny.onDestroy) componentAny.onDestroy();
                    }
                }
            }
        }

        this.length--;
        if (this.length <= 0)
        {
            if (this.parent != null && !!this.path)
                this.parent.innerRemoveComponent(this, this.path);
            else
                Log.info("Close window here, type name: " + this.getConstructor().name);
        }
        else
            Log.error(this.getConstructor().name + "OnDestroy fail, length = "+ this.length);
    }


    /**
     * 遍历：注意，这里是无序的
     * @param callback 
     * @returns 
     */
    private walk(callback: (compent:UIBaseContainer) => void)
    {
        if (this.components == null) return;
        for (const [key, val] of this.components) 
        {
            if (!!val)
            {
                for (const [key2, val2] of val) {
                    callback(val2);
                }
            }
        }
    }

    /**
     * 记录Component
     * @param name 
     * @param componentClass 
     * @param component 
     * @returns 
     */
    private recordUIComponent(name: string, componentClass: new (...args: any[]) => any, component: UIBaseContainer)
    {
        if (this.components == null) this.components = new UnOrderDoubleKeyDictionary<string, new (...args: any[]) => any, UIBaseContainer>();
        if (this.components.containSubKey(name, componentClass))
        {
            Log.error("Already exist component_class : " + componentClass.name);
            return;
        }

        this.components.add(name, componentClass, component);
    }


    /**
     * 添加组件
     * @param type 类型
     * @param name 游戏物体名称
     * @returns 
     */
    public addComponentNotCreate<T extends UIBaseContainer>(type: new () => T, name: string): T
    {
        const componentInst: T = new type();
        componentInst.path = name;
        componentInst.parent = this;
        this.recordUIComponent(name, type, componentInst);
        this.length++;
        return componentInst;
    }

    /**
     * 添加组件
     * @param type 类型
     * @param name 游戏物体名称
     * @returns 
     */
    public addComponent<T extends UIBaseContainer, A = void, B = void, C = void>(type: new () => T, path: string = "", a?:A, b?:B, c?:C) : T
    {
        const componentInst: T = new type();
        componentInst.path = path;
        componentInst.parent = this;
        const componentAny = componentInst as any;
        if (!!componentAny.onCreate)
            componentAny.onCreate(a,b,c);
        if (!!componentAny.onLanguageChange)
            I18NManager.instance?.registerI18NEntity(componentAny);
        this.recordUIComponent(path, type, componentInst);
        this.length++;
        return componentInst;
    }

    /**
     * 获取组件
     * @param type 
     * @param path 
     * @returns 
     */
    public getComponent<T extends UIBaseContainer>(type: (new () => T),path: string = ""): T
    {
        if (this.components == null) return null;
        const [res, component] = this.components.tryGetValue(path, type);
        if (res)
        {
            return component as T;
        }
        return null;
    }

    /**
     * 移除组件
     * @param type 
     * @param path 
     */
    public removeComponent<T extends UIBaseContainer>(type: new () => T,path: string = "")
    {
        var component = this.getComponent<T>(type, path);
        if (component != null)
        {
            const componentAny = component as any;
            component.beforeOnDisable();
            if(!!componentAny.onDisable) componentAny.onDisable();
            component.beforeOnDestroy();
            if (!!componentAny.onLanguageChange)
                I18NManager.instance?.removeI18NEntity(componentAny);
            if(!!componentAny.onDestroy) componentAny.onDestroy();
            this.components.remove(path, type);
        }
    }

    /**
     * 移除所有组件
     * @param string 
     * @param path 
     */
    public removeAllComponent(path: string = ""){
        if (this.components == null) return;
        const [res, dic] = this.components.tryGetDic(path);
        if (res)
        {
            const list = [...dic.values()];
            for (const component of list) {
                if (component != null)
                {
                    const componentAny = component as any;
                    component.beforeOnDisable();
                    if(!!componentAny.onDisable) componentAny.onDisable();
                    component.beforeOnDestroy();
                    if (!!componentAny.onLanguageChange)
                        I18NManager.instance?.removeI18NEntity(componentAny);
                    if(!!componentAny.onDestroy) componentAny.onDestroy();
                }
            }
        }
        this.components.remove(path);
    }

    private innerRemoveComponent(component: UIBaseContainer, path: string)
    {
        if (component != null)
        {
            this.components.remove(path, component.getConstructor());
            this.length--;
        }
    }

    private innerSetActive(active: boolean)
    {
        this._activeSelf = active;
        if (this.getNode() != null && this.node.active != active)
            this.node.active = active;
    }

    public setActive<P1 = void, P2 = void, P3 = void, P4 = void>(active: boolean, p1?: P1, p2?:P2, p3?: P3, p4?: P4)
    {
        const thisAny = this as any;
        if (active)
        {
            if(!!thisAny.onEnable) thisAny.onEnable(p1,p2,p3,p4);
            this.afterOnEnable();
            this.innerSetActive(active);
        }
        else
        {
            this.innerSetActive(active);
            this.beforeOnDisable();
            if(!!thisAny.onDisable) thisAny.onDisable();
        }
    }

}