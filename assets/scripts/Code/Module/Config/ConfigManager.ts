import { IManager } from "../../../Mono/Core/Manager/IManager";
import { JsonHelper } from "../../../Mono/Helper/JsonHelper";
import * as string from "../../../Mono/Helper/StringHelper"
import { ConfigLoader } from "./ConfigLoader";
import { IConfigLoader } from "./IConfigLoader";
export class ConfigManager implements IManager{

    private static _instance: ConfigManager;

    public static get instance(): ConfigManager {
        return ConfigManager._instance;
    }

    private configLoader: IConfigLoader
    private rawConfigBytes: Map<string, any> = new Map<string, any>();
    private configCache: Map<any, object> = new Map<any, object>();

    public init() {
        ConfigManager._instance = this;
        this.configLoader = new ConfigLoader();
    }

    public destroy() {
        ConfigManager._instance = null;
    }

    public async loadAsync()
    {
        this.rawConfigBytes.clear();
        this.configCache.clear();
        await this.configLoader.getAllConfigBytes(this.rawConfigBytes);
    }

    public get<T>(type: new (...args:any[]) => T, name: string = ""): T
    {
        if (this.configCache.has(type))
        {
            return this.configCache.get(type) as T;
        }
        if (string.isNullOrEmpty(name))
        {
            name = type.name;
        }
        const jObj = this.rawConfigBytes.get(name);
        const category = JsonHelper.deserialize(type, jObj);
        category.endInit()
        this.configCache.set(type, category);
        return category as T;
    }

    public async loadOneConfig<T>(type: new (...args:any[]) => T, name: string = "",  cache: boolean = false)
    {
        if (string.isNullOrEmpty(name))
            name = type.name;
        const jObj = await this.configLoader.getOneConfigBytes(name);

        const category = JsonHelper.deserialize(type, jObj);
        category.endInit()
        if(cache)
            this.configCache.set(type, category);

        return category as T;
    }
}
