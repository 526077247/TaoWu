import { ProtoHelper, ProtoType, ProtoMember } from "../../../../Mono/Helper/ProtoHelper";
import { Log } from "../../../../Mono/Module/Log/Log";
import { ConfigManager } from "../../Config/ConfigManager";

@ProtoType("SceneConfig")
export class SceneConfig {
	/** Id*/
	@ProtoMember(1, "double")
	public id: number = 0;
	/** 名字*/
	@ProtoMember(2, "string")
	public name: string = "";
	/** 描述*/
	@ProtoMember(3, "string")
	public desc: string = "";
	/** 场景路径*/
	@ProtoMember(4, "string")
	public perfab: string = "";

}

@ProtoType("SceneConfigCategory")
export class SceneConfigCategory{

    private static _instance: SceneConfigCategory;

    public static get instance(): SceneConfigCategory {
        if (!this._instance) {
            this._instance = ConfigManager.instance.get(SceneConfigCategory,"SceneConfigCategory");
        }
        return this._instance;
    }

    @ProtoMember(1, [SceneConfig])
    private list:SceneConfig[] = [];

    private dict = new Map<number, SceneConfig>();

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