import { _decorator, Component, Node, director, Prefab, instantiate } from 'cc';
import { IManager } from '../../../Mono/Core/Manager/IManager';
import { CoroutineLockManager,CoroutineLock } from '../CoroutineLock/CoroutineLockManager';
import { CoroutineLockType } from '../CoroutineLock/CoroutineLockType';
import { ResourceManager } from './ResourceManager';
import * as string from "../../../Mono/Helper/StringHelper"
import { LruCache } from '../../../Mono/Core/Object/LruCache';
import { Log } from '../../../Mono/Module/Log/Log';
import { TimerManager } from '../../../Mono/Module/Timer/TimerManager';
import { Define } from '../../../Mono/Define';
/**
 * GameObject缓存池 <br/>
 * 注意：<br/>
 * - 1、所有需要预设都从这里加载，不要直接到ResourcesManager去加载，由这里统一做缓存管理<br/>
 * - 2、缓存分为两部分：从资源层加载的原始Prefab(Asset)，从GameObject实例化出来的多个Inst<br/>
 * 
 * 原则: 有借有还，再借不难，借出去的东西回收时，请不要污染(pc上会进行检测，发现则报错)<br/>
 * 
 * 何为污染？不要往里面添加什么节点，借出来的是啥样子，返回来的就是啥样子<br/>
 * 
 * GameObject内存管理，采用lru cache来管理prefab<br/>
 * 
 * 为了对prefab和其产生的go的内存进行管理，所以严格管理go生命周期<br/>
 * - 1、创建 -> GetGameObjectAsync<br/>
 * - 2、回收 -> 绝大部分的时候应该采用回收(回收go不能被污染)，对象的销毁对象池会自动管理 RecycleGameObject<br/>
 * - 3、销毁 -> 如果的确需要销毁，或一些用不到的数据想要销毁，也必须从这GameObjectPool中进行销毁，<br/>
 * 
 * 严禁直接调用GameObject.Destroy方法来进行销毁，而应该采用GameObjectPool.DestroyGameObject方法<br/>
 * 
 * 不管是销毁还是回收，都不要污染go，保证干净<br/>
 */
export class GameObjectPoolManager implements IManager {
    private static _instance: GameObjectPoolManager;

    public static get instance(): GameObjectPoolManager{
        return GameObjectPoolManager._instance;
    }

    private cacheTransRoot: Node;

    private goPool: LruCache<string, Prefab>;
    private goInstCountCache: Map<string, number>//go: inst count 用于记录go产生了多少个实例
    private goChildrenCountPool: Map<string, number> ;//path: child count 用于在editor模式下检测回收的go是否被污染 path:num
    private instCache: Map<string, Node[]>; //path: inst array

    private instPathCache: Map<Node, string>;// inst : prefab path 用于销毁和回收时反向找到inst对应的prefab TODO:这里有优化空间path太占内存
    private persistentPathCache: Set<string>;//需要持久化的资源
    private detailGoChildrenCount: Map<string, Map<string, number>> ;//记录go子控件具体数量信息

    public init() {
        GameObjectPoolManager._instance = this;
        this.cacheTransRoot = new Node("GameObjectCacheRoot");
        director.addPersistRootNode(this.cacheTransRoot);
        this.goPool = new LruCache<string, Prefab>();
        this.goInstCountCache = new Map<string, number>();
        this.goChildrenCountPool = new Map<string, number>();
        this.instCache = new Map<string, Node[]>();
        this.instPathCache = new Map<Node, string>();
        this.persistentPathCache = new Set<string>();
        this.detailGoChildrenCount = new Map<string, Map<string, number>>();
        this.goPool.setPopCallback((path, pooledGo) =>
        {
            this.releaseAsset(path);
        });
        this.goPool.setCheckCanPopCallback((path, pooledGo) =>
        {
            var cnt = this.goInstCountCache.get(path) - (this.instCache.has(path) ? this.instCache.get(path).length : 0);
            if (cnt > 0)
                Log.info(
                    `path=${path} goInstCountCache=${this.goInstCountCache.get(path)} instCache=${(this.instCache.has(path) != null ? this.instCache.get(path).length : 0)}`);
            return cnt == 0 && !this.persistentPathCache.has(path);
        });
    }

    public destroy() {
        
        GameObjectPoolManager._instance = null;
        this.cleanup();
    }
    

    /** 
     * 预加载一系列资源
     */
    public async loadDependency(res: string[]): Promise<void> {
        if (res.length <= 0) return;
        let tasks: Promise<void>[] = []
        for (let i = 0; i < res.length; i++)
        {
            tasks[i] = this.preLoadGameObjectAsync(res[i], 1);
        }
        await Promise.all(tasks)
    }

    /**
     * 预加载：可提供初始实例化个数
     * @param path 
     * @param instCount 初始实例化个数
     */
    public async preLoadGameObjectAsync(path: string, instCount: number): Promise<void> {
        let coroutineLock: CoroutineLock = null;
        try
        {
        	coroutineLock = await CoroutineLockManager.instance.wait(CoroutineLockType.Resources, string.getHash(path));
        	if (!this.checkHasCached(path)){
        		var go = await ResourceManager.instance.loadAsync<Prefab>(Prefab,path);
        		if (go != null)
        		{
        			this.cacheAndInstGameObject(path, go, instCount);
        		}
        	}
        }
        finally
        {
        	coroutineLock?.dispose();
        }
    }


    /**
     * 异步获取：必要时加载
     * @param path 
     */
    public async getGameObjectAsync(path: string): Promise<Node>
    {
        let inst: Node = this.getFromCache(path)
        if (!!inst)
        {
            this.initInst(inst);
            return inst;
        }
        await this.preLoadGameObjectAsync(path, 1);
        inst = this.getFromCache(path)
        if (!!inst)
        {
            this.initInst(inst);
            return inst;
        }

        return null;
    }

    /**
     * 同步取已加载的，没加载过则返回null
     * @param path 
     * @returns 
     */
    public getGameObjectFromPool(path: string): Node {
        const inst: Node = this.getFromCache(path)
        if (!!inst)
        {
            this.initInst(inst);
            return inst;
        }
    }

    /**
     * 回收
     * @param inst 
     * @param clearLimit 现有缓存达到多少开始销毁，-1表示不销毁
     * @returns 
     */
    public recycleGameObject(inst: Node, clearLimit: number = -1){
        if (!this.instPathCache.has(inst))
        {
            Log.error("RecycleGameObject inst not found from instPathCache");
            inst.destroy();
            return;
        }
        var path = this.instPathCache.get(inst);
        var count = 0;
        var list = this.instCache.get(path);
        if (list != null)
        {
            count = list.length;
        }
        if (clearLimit < 0 || clearLimit > count)
        {
            this.checkRecycleInstIsDirty(path, inst, null);
            inst.setParent(this.cacheTransRoot, false);
            inst.active = false;
            let list = this.instCache.get(path);
            if (!list)
            {
                list = []
                this.instCache.set(path,list);
            }
            list.push(inst)
        }
        else
        {
            this.destroyGameObject(inst);
        }

        //this.checkCleanRes(path)
    }

    /**
     * 检测回收的时候是否需要清理资源(这里是检测是否清空 inst和缓存的go)
     * 这里可以考虑加一个配置表来处理优先级问题，一些优先级较高的保留
     * @param path 
     */
    public checkCleanRes(path:string)
    {
        var cnt = this.goInstCountCache.get(path) - (this.instCache.has(path) ? this.instCache.get(path).length : 0);
        if (cnt == 0 && !this.persistentPathCache.has(path))
            this.releaseAsset(path);
    }

    /**
     * 添加需要持久化的资源
     * @param path 
     */
    public addPersistentPrefabPath(path: string){
        this.persistentPathCache.add(path);
    }

    /**
     * 清理缓存
     * @param includePooledGo 
     * @param ignorePathArray 
     */
    public cleanup(includePooledGo: boolean = true, ...ignorePathArray:string[]){
        Log.info("GameObjectPool Cleanup");
        let ignorePath:Set<string> = null;
        if (ignorePathArray != null)
        {
            ignorePath = new Set<string>();
            for (let i = 0; i < ignorePathArray.length; i++)
            {
                ignorePath.add(ignorePathArray[i]);
            }
        }
        for (const [key,value] of this.instCache) {
            if (ignorePath != null && ignorePath.has(key)) continue;
            for (let i = 0; i < value.length; i++)
            {
                var inst = value[i];
                if (inst != null)
                {
                    inst.destroy();
                    let count = this.goInstCountCache.get(key)-1;
                    this.goInstCountCache.set(key, count);
                    if (count == 0)
                    {
                        this.goInstCountCache.delete(key);
                    }
                }
                this.instPathCache.delete(inst);
            }
            value.length = 0;
        }
        

        if (includePooledGo)
        {
            const keys = this.goPool.getKeys();
            for (let i = keys.length - 1; i >= 0; i--)
            {
                var path = keys[i];
                if (ignorePath != null && ignorePath.has(path)) continue;
                const pooledGo = this.goPool.onlyGet(path);
                if (!!pooledGo && !this.persistentPathCache.has(path) &&
                    pooledGo != null && this.checkNeedUnload(path))
                {
                    ResourceManager.instance.releaseAsset(pooledGo);
                    this.goPool.remove(path);
                }

            }
        }
        Log.info("GameObjectPool Cleanup Over");
    }

    /**
     * 释放asset(包括指定为持久化的资源)
     * 注意这里需要保证外面没有引用这些path的inst了，不然会出现材质丢失的问题
     * 不要轻易调用，除非你对内部的资源的生命周期有了清晰的了解
     * @param releasePathArray 需要释放的资源路径数组
     * @param includePooledGo 是否需要将预设也释放
     * @returns 
     */
    public cleanupWithPathArray(releasePathArray: string[], includePooledGo: boolean = true) {
        if (releasePathArray == null || releasePathArray.length == 0) return;
        Log.info("GameObjectPool Cleanup");
        const dictPath:Set<string> = new Set<string>();
        
        for (let i = 0; i < releasePathArray.length; i++)
        {
            dictPath.add(releasePathArray[i]);
        }

        for (const [key,value] of this.instCache) 
        {
            if (dictPath.has(key))
            {
                for (let i = 0; i < value.length; i++)
                {
                    var inst = value[i];
                    if (inst != null)
                    {
                        inst.destroy();
                        let count = this.goInstCountCache.get(key) - 1;
                        this.goInstCountCache.set(key, count);
                        if (count == 0)
                        {
                            this.goInstCountCache.delete(key);
                        }
                    }

                    this.instPathCache.delete(inst);
                }
            }
        }

        for (let i = 0; i < releasePathArray.length; i++)
        {
            this.instCache.delete(releasePathArray[i]);
        }

        if (includePooledGo)
        {
            const keys = this.goPool.getKeys();
            for (let i = keys.length - 1; i >= 0; i--)
            {
                var path = keys[i];
                const pooledGo = this.goPool.onlyGet(path);
                if (dictPath.has(path) && !!pooledGo && this.checkNeedUnload(path))
                {
                    ResourceManager.instance.releaseAsset(pooledGo);
                    this.goPool.remove(path);
                    this.persistentPathCache.delete(path);
                }
            }
        }
    }

    
     /**
     * 尝试从缓存中获取
     * @param path 
     */
    private getFromCache(path: string): Node {
        if (!this.checkHasCached(path)) return null;
        const cachedInst= this.instCache.get(path)
        if (!!cachedInst)
        {
            if (cachedInst.length > 0)
            {
                var inst = cachedInst.pop();
                if (inst == null)
                {
                    Log.error("Something wrong, there gameObject instance in cache is null!");
                    return inst;
                }
                return inst;
            }
        }
        
        const pooledGo: Prefab = this.goPool.get(path);
        if (!!pooledGo)
        {
            var inst = instantiate(pooledGo);
            if(this.goInstCountCache.has(path))
                this.goInstCountCache[path]++;
            else 
                this.goInstCountCache[path] = 1;
            this.instPathCache.set(inst, path);
            return inst;
        }
        return null;
    }

    /**
     * 初始化inst
     * @param inst 
     */
    private initInst(inst: Node) {
        if (inst != null) {
            inst.active = true;
        }
    }

    /**
     * 检测是否已经被缓存
     * @param path 
     * @returns 
     */
    private checkHasCached(path:string) {
        if (string.isNullOrEmpty(path)) {
            Log.error("path err :\"" + path + "\"");
            return false;
        }

        if (this.instCache.has(path) && this.instCache.get(path).length > 0) {
            return true;
        }
        return this.goPool.containsKey(path);
    }

    /**
     * 缓存并实例化GameObject
     * @param path 
     * @param go 
     * @param instCount 
     */
    private cacheAndInstGameObject(path: string, go: Prefab, instCount: number) {
        this.goPool.set(path, go);
        if (instCount <= 0)
        {
            instCount = 1;
        }
        let cachedInst = this.instCache.get(path);
        if (!cachedInst)
        {
            cachedInst = [];
            this.instCache.set(path, cachedInst);
        }
        for (let i = 0; i < instCount; i++)
        {
            var inst = instantiate(go);
            inst.setParent(this.cacheTransRoot);
            inst.active = false;
            cachedInst[cachedInst.length] = inst;
            this.instPathCache.set(inst, path);
            if(i == 0) {
                this.initGoChildCount(path, inst);
            }
        }

        if (!this.goInstCountCache.has(path))
        {
            this.goInstCountCache.set(path, instCount);
        }
        else
        {
            let len = this.goInstCountCache.get(path);
            this.goInstCountCache.set(path, len + instCount);
        }
    }

    /**
     * 删除GameObject
     * @param inst 
     */
    private destroyGameObject(inst: Node)
    {
        const path = this.instPathCache.get(inst);
        if (!!path)
        {
            let count = this.goInstCountCache.get(path)
            if (!!count)
            {
                if (count <= 0)
                {
                    Log.error("goInstCountCache[path] must > 0");
                }
                else
                {
                    this.checkRecycleInstIsDirty(path, inst, () =>
                    {
                        inst.destroy();
                        let cacheCount = this.goInstCountCache.get(path) - 1;
                        this.goInstCountCache.set(path,cacheCount);
                        if (cacheCount == 0)
                        {
                            this.goInstCountCache.delete(path);
                        }
                    });
                    this.instPathCache.delete(inst);
                }
            }
        }
        else
        {
            Log.error("DestroyGameObject inst not found from instPathCache");
        }
    }

    /**
     * 检查inst是否在池子中
     * @param path 
     * @param inst 
     * @returns 
     */
    private checkInstIsInPool(path: string, inst: Node): boolean
    {
        const instArray = this.instCache.get(path);
        if (!!instArray)
        {
            for (let i = 0; i < instArray.length; i++)
            {
                if (instArray[i] == inst) return true;
            }
        }
        return false;
    }
    /**
     * 释放资源
     * @param path 
     */
    private releaseAsset(path: string)
    {
        const instCache = this.instCache.get(path)
        if (!!instCache)
        {
            for (let i = instCache.length - 1; i >= 0; i--)
            {
                this.instPathCache.delete(instCache[i]);
                instCache[i].destroy();
                instCache.splice(i, 1);
            }
            this.instCache.delete(path);
            this.goInstCountCache.delete(path);
        }
        const pooledGo = this.goPool.onlyGet(path);
        if (!!pooledGo && this.checkNeedUnload(path))
        {
            ResourceManager.instance.releaseAsset(pooledGo);
            this.goPool.remove(path);
        }
    }

    /**
     * 检查指定路径是否已经没有未回收的实例
     * @param path 
     * @returns 
     */
    private checkNeedUnload(path: string):boolean {
        for (const [key,val] of this.instPathCache) {
            if(val == path){
                return false;
            }
        }
        return true;
    }

    /**
     * 是否开启检查污染
     * @returns 
     */
    private isOpenCheck(): boolean
    {
        return Define.Debug;
    }

    /**
     * 获取GameObject的child数量
     * @param path 
     * @param go 
     * @returns 
     */
    private initGoChildCount(path: string, go: Node)
    {
        if (!this.isOpenCheck()) return;
        if (!this.goChildrenCountPool.has(path))
        {
            const childsCountMap: Map<string, number> = new Map<string, number>();
            const totalChildCount = this.recursiveGetChildCount(go, "", childsCountMap);
            this.goChildrenCountPool.set(path, totalChildCount);
            this.detailGoChildrenCount.set(path, childsCountMap);
        }
    }

    /**
     * 检查回收时是否污染
     * @param path 
     * @param inst 
     * @param callback 
     * @returns 
     */
    private checkRecycleInstIsDirty( path: string, inst: Node, callback: Function)
    {
        if (!this.isOpenCheck())
        {
            callback?.();
            return;
        }
        inst.active = false;
        this.checkAfter(path, inst);
        callback?.();
    }

    /**
     * 延迟一段时间检查
     * @param path 
     * @param inst 
     */
    async checkAfter(path: string, inst: Node)
    {
        await TimerManager.instance.waitAsync(2000);
        if (!!inst && this.checkInstIsInPool(path, inst))
        {
            var goChildCount = this.goChildrenCountPool.get(path);
            let childsCountMap = new Map<string, number>();
            const instChildCount = this.recursiveGetChildCount(inst, "", childsCountMap);
            if (goChildCount != instChildCount)
            {
                Log.error(`go child count(${ goChildCount }) must equip inst child count(${instChildCount}) path = ${path}`);
                for (const [k,v] of childsCountMap) {
                    var unfair = false;
                    if (!this.detailGoChildrenCount.get(path)?.has(k))
                        unfair = true;
                    else if (this.detailGoChildrenCount.get(path)?.get(k) != v)
                        unfair = true;
                    if (unfair)
                        Log.error(`not match path on checkrecycle = ${k}, count = ${v}`);
                }
            }
        }
    }


    /**
     * 递归取子节点数量
     * @param trans 
     * @param path 
     * @param record 
     */
    private recursiveGetChildCount(trans: Node,  path: string,  record: Map<string, number>):number{
        let totalChildCount:number = trans.children.length;
        for (let i = 0; i < trans.children.length; i++)
        {
            var child = trans.children[i];
            if (child.name.indexOf("Input Caret") >= 0)
            {
                totalChildCount --;
            }
            else
            {
                let cpath = path + "/" + child.name;
                if (record.has(cpath))
                {
                    record[cpath] += 1;
                }
                else
                {
                    record[cpath] = 1;
                }
                totalChildCount += this.recursiveGetChildCount(child, cpath, record);
            }
        }
        return totalChildCount;
    }

}


