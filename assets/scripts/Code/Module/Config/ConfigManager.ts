import { IManager } from "../../../Mono/Core/Manager/IManager";
import { JsonHelper } from "../../../Mono/Helper/JsonHelper";
import * as string from "../../../Mono/Helper/StringHelper"
import { ConfigLoader } from "./ConfigLoader";
import { IConfigLoader } from "./IConfigLoader";
import { Log } from "../../../Mono/Module/Log/Log";
import { register } from "../Generate/Config/ConfigManager.register"
export class ConfigManager implements IManager{

    private static _instance: ConfigManager;

    public static get instance(): ConfigManager {
        return ConfigManager._instance;
    }

    public configLoader: IConfigLoader
    public allConfig: Map<any, object> = new Map<any, object>();

    public init() {
        ConfigManager._instance = this;
        this.configLoader = new ConfigLoader();
    }

    public destroy() {
        ConfigManager._instance = null;
    }


    public async loadOneConfig<T>(type: new (...args:any[]) => T, name: string = "",  cache: boolean = false)
    {
        if (string.isNullOrEmpty(name))
            name = type.name;
        const jObj = await this.configLoader.getOneConfigBytes(name);

        const category = JsonHelper.deserialize(type, jObj);
        category.endInit()
        if(cache)
            this.allConfig.set(type, category);

        return category as T;
    }

    public async loadAsync()
    {
        this.allConfig.clear();
        const configBytes: Map<string, any> = new Map<string, any>();
		await this.configLoader.getAllConfigBytes(configBytes);
        register(configBytes, this.loadOneInThread.bind(this));
    }

    public loadOneInThread<T>(type: new (...args:any[]) => T, name: string = "", configBytes: Map<string, any>){
        if (string.isNullOrEmpty(name))
            name = type.name;
        const jObj = configBytes.get(name);
        const category = JsonHelper.deserialize(type, jObj);
        category.endInit()
        this.allConfig.set(type, category);
    }
}