import { JsonHelper } from "../../../../Mono/Helper/JsonHelper";
import { Log } from "../../../../Mono/Module/Log/Log";
import { ConfigManager } from "../../Config/ConfigManager";

export class SceneConfig {
	/** Id*/
	public id: number;
	/** 名字*/
	public name: string;
	/** 描述*/
	public desc: string;
	/** 场景路径*/
	public perfab: string;

}

export class SceneConfigCategory{

    private static _instance: SceneConfigCategory;

    public static get instance(): SceneConfigCategory {
        if (!this._instance) {
            JsonHelper.registerClass(SceneConfig,"SceneConfig");
            JsonHelper.registerClass(SceneConfigCategory,"SceneConfigCategory");
            this._instance = ConfigManager.instance.get(SceneConfigCategory,"SceneConfigCategory");
        }
        return this._instance;
    }

    private dict = new Map<number, SceneConfig>();

    private list:SceneConfig[] = [];

    public endInit()
    {
        for(let i =0 ;i<this.list.length;i++)
        {
            const config:SceneConfig = this.list[i];

            this.dict.set(config.id, config);
        }            
    }
    
    public get(id: number): SceneConfig
    {
        let item: SceneConfig = this.dict.get(id);
        
        if (item == null)
        {
            Log.error("配置找不到，配置表名: SceneConfig，配置id: "+id);
        }

        return item;
    }

    public contain(id: number): boolean
    {
        return this.dict.has(id);
    }

    public getAll(): Map<number, SceneConfig>
    {
        return this.dict;
    }

    public getAllList(): SceneConfig[]
    {
        return this.list;
    }
}
