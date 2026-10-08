import { ProtoMember, ProtoType } from "../../../Mono/Helper/ProtoHelper";
import { Log } from "../../../Mono/Module/Log/Log";

@ProtoType("I18NConfig")
export class I18NConfig {
    /** Id */
    @ProtoMember(1, "int32")
    public id: number
    /** 内容  */
    @ProtoMember(3, "string")
    public value: string
}

@ProtoType("I18NConfigCategory")
export class I18NConfigCategory{

    private dict = new Map<number, I18NConfig>();

    @ProtoMember(1, [I18NConfig])
    private list:I18NConfig[] = [];

    public endInit()
    {
        for(let i =0 ;i<this.list.length;i++)
        {
            const config:I18NConfig = this.list[i];

            this.dict.set(config.id, config);
        }            
    }
    
    public get(id: number): I18NConfig
    {
        let item: I18NConfig = this.dict.get(id);
        
        if (item == null)
        {
            Log.error("配置找不到，配置表名: I18NConfig，配置id: "+id);
        }

        return item;
    }

    public contain(id: number): boolean
    {
        return this.dict.has(id);
    }

    public getAll(): Map<number, I18NConfig>
    {
        return this.dict;
    }

    public getAllList(): I18NConfig[]
    {
        return this.list;
    }
}