import { Log } from "../../../../Mono/Module/Log/Log";

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

    public constructor(){
        SceneConfigCategory.instance = this;
    }

    public static instance:SceneConfigCategory;

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