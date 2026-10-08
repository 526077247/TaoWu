import { ProtoHelper, ProtoType, ProtoMember } from "../../../../Mono/Helper/ProtoHelper";
import { Log } from "../../../../Mono/Module/Log/Log";
import { ConfigManager } from "../../Config/ConfigManager";

@ProtoType("ServerConfig")
export class ServerConfig {
	/** Id*/
	@ProtoMember(1, "double")
	public id: number = 0;
	/** 标记*/
	@ProtoMember(2, "string")
	public name: string = "";
	/** realm服地址*/
	@ProtoMember(3, "string")
	public realmIp: string = "";
	/** 路由cdn地址*/
	@ProtoMember(4, "string")
	public routerListUrl: string = "";
	/** 服务器类型*/
	@ProtoMember(5, "double")
	public envId: number = 0;
	/** 是否默认值*/
	@ProtoMember(6, "double")
	public isPriority: number = 0;

}

@ProtoType("ServerConfigCategory")
export class ServerConfigCategory{

    private static _instance: ServerConfigCategory;

    public static get instance(): ServerConfigCategory {
        if (!this._instance) {
            this._instance = ConfigManager.instance.get(ServerConfigCategory,"ServerConfigCategory");
        }
        return this._instance;
    }

    @ProtoMember(1, [ServerConfig])
    private list:ServerConfig[] = [];

    private dict = new Map<number, ServerConfig>();

    public endInit()
    {
        for(let i =0 ;i<this.list.length;i++)
        {
            const config:ServerConfig = this.list[i];

            this.dict.set(config.id, config);
        }            
    }
    
    public get(id: number): ServerConfig
    {
        let item: ServerConfig = this.dict.get(id);
        
        if (item == null)
        {
            Log.error("配置找不到，配置表名: ServerConfig，配置id: "+id);
        }

        return item;
    }

    public contain(id: number): boolean
    {
        return this.dict.has(id);
    }

    public getAll(): Map<number, ServerConfig>
    {
        return this.dict;
    }

    public getAllList(): ServerConfig[]
    {
        return this.list;
    }
}