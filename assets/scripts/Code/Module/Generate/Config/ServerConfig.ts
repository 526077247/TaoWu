import { Log } from "../../../../Mono/Module/Log/Log";

export class ServerConfig {
	/** Id*/
	public id: number;
	/** 标记*/
	public name: string;
	/** realm服地址*/
	public realmIp: string;
	/** 路由cdn地址*/
	public routerListUrl: string;
	/** 服务器类型*/
	public envId: number;
	/** 是否默认值*/
	public isPriority: number;

}

export class ServerConfigCategory{

    public constructor(){
        ServerConfigCategory.instance = this;
    }

    public static instance:ServerConfigCategory;

    private dict = new Map<number, ServerConfig>();

    private list:ServerConfig[] = [];

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