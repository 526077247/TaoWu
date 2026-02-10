import { MultiMap } from "../../../../Mono/Core/Object/MultiMap";
import { IManager } from "../../../../Mono/Core/Manager/IManager";
import type { UIRedDot } from "./UIRedDot";
import { Log } from "../../../../Mono/Module/Log/Log";
import * as string from "../../../../Mono/Helper/StringHelper";


export class RedDotManager implements IManager{
    private static _instance: RedDotManager;

    private _redDotNodeParentsDict: MultiMap<string,string> = new MultiMap<string, string>();
    private _retainViewCount:Map<string,number> = new Map<string, number>();
    private _toParentDict:Map<string,string> = new Map<string, string>();
    private _redDotMonoViewDict:MultiMap<string, UIRedDot> = new MultiMap<string, UIRedDot>();
    public static get instance(): RedDotManager {
        return RedDotManager._instance;
    }

    public init() {
        RedDotManager._instance = this;
    }

    public destroy() {
        this._redDotNodeParentsDict.clear();
        this._toParentDict.clear();
        this._redDotMonoViewDict.clear();
        this._retainViewCount.clear();
        RedDotManager._instance = null;
    }

    /**
     * 创建树————添加节点
     * @param parent 
     * @param target 
     * @returns 
     */
    private addRedDotNode(parent: string, target: string){
        if (string.isNullOrEmpty(target))
        {
            Log.error("target is null");
            return;
        }
        
        if (string.isNullOrEmpty(parent))
        {
            Log.error("parent is null");
            return;
        }

        if (this._toParentDict.has(target))
        {
            Log.error(target+ " is already exist!");
            return;
        }

        this._toParentDict.set(target, parent);

        if (!this._retainViewCount.has(target))
        {
            this._retainViewCount.set(target, 0);
        }
        
        this._redDotNodeParentsDict.add(parent, target);
    }

    /**
     * 创建树————移除节点
     * @param target 
     * @returns 
     */
    private removeRedDotNode(target: string){
        const parent = this._toParentDict.get(target);
        if (string.isNullOrEmpty(parent))
        {
            return;
        }

        if (!this.isLeafNode(target))
        {
            Log.error("can not remove parent node!");
            return ;
        }
        
        this._toParentDict.delete(target);
        if (!string.isNullOrEmpty(parent))
        {
            this._redDotNodeParentsDict[parent].Remove(target);
        }
    }


    /**
     * 添加UI红点
     * @param target 
     * @param uiRedDotComponent 
     */
    public addUIRedDotComponent(target: string, uiRedDotComponent: UIRedDot){
        this._redDotMonoViewDict.add(target,uiRedDotComponent);
    }

    /**
     * 移除UI红点
     * @param target 
     * @param uiRedDotComponent 
     */
    public removeUIRedDotComponent(target: string, uiRedDotComponent: UIRedDot){
        this._redDotMonoViewDict.remove(target, uiRedDotComponent);
    }

    /**
     * 是否是子节点
     * @param target 
     */
    private isLeafNode(target: string): boolean{
        const res = this._redDotNodeParentsDict.get(target);
        return res != null;
    }

    public getRedDotViewCount(target: string){
        return this._retainViewCount.get(target)??0;
    }

    /**
     * 刷新红点数量
     * @param target 
     * @param count 
     */
    public refreshRedDotViewCount(target: string, count: number){
        if (!this.isLeafNode(target))
        {
            Log.error("can not refresh parent node view count");
            return;
        }
        
        this._retainViewCount.set(target,count);
        let comps = this._redDotMonoViewDict.get(target);
        if (comps != null)
        {
            for (let i = 0; i < comps.length; i++)
            {
                comps[i].refreshRedDot();
            }
        }

        let parent = this._toParentDict.get(target);
        let isParentExist = !string.isNullOrEmpty(parent);
        while (isParentExist)
        {
            var viewCount = 0;
            const nodes = this._redDotNodeParentsDict.get(parent);
            for (var childNode of nodes)
            {
                viewCount += this._retainViewCount.get(childNode)??0;
            }

            this._retainViewCount.set(parent,viewCount);
            let comps = this._redDotMonoViewDict.get(parent);
            if (comps != null)
            {
                for (let i = 0; i < comps.length; i++)
                {
                    comps[i].refreshRedDot();
                }
            }
            parent = this._toParentDict.get(parent);
            isParentExist = !string.isNullOrEmpty(parent);
        }
    }
}