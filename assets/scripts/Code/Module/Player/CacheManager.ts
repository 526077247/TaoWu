import { sys } from "cc";
import { IManager } from "../../../Mono/Core/Manager/IManager"
import { JsonHelper } from "../../../Mono/Helper/JsonHelper";

export class CacheManager implements IManager {

    private static _instance: CacheManager;

    public static get instance(): CacheManager {
        return CacheManager._instance;
    }

    private cacheObj: Map<string, any>

    public init() {
        this.cacheObj = new Map<string, any>();
        CacheManager._instance = this;
    }
    public destroy() {
        CacheManager._instance = null;
    }


    public getString(key: string, defaultValue: string = null): string
    {
        return sys.localStorage.getItem(key, defaultValue);
    }
    
    public getInt(key: string, defaultValue: number = 0): number
    {
        const str = sys.localStorage.getItem(key);
        if(!!str){
            const val = Number.parseInt(str);
            if(!!val && !Number.isNaN(val)){
                return val;
            }
        }
        return defaultValue;
    }
    
    public getValue<T extends object>(type: new (...args:any[]) => T,key: string): T
    {
        let data:any = this.cacheObj.get(key);
        if (!!data)
        {
            return data as T;
        }
        var jStr = sys.localStorage.getItem(key, null);
        if (jStr == null) return null;
        var res = JsonHelper.fromJson<T>(type,jStr);
        this.cacheObj[key] = res;
        return res;
    }
    
    public setString(key: string, value: string)
    {
        sys.localStorage.setItem(key, value);
    }
    
    public setInt(key: string, value: number)
    {
        sys.localStorage.setItem(key, String(value));
    }
    
    public setValue<T extends object>(type: new (...args:any[]) => T, key: string, value: T)
    {
        this.cacheObj[key] = value;
        var jStr = JsonHelper.toJson(type, value);
        sys.localStorage.setItem(key, jStr);
    }

    public deleteKey(key: string)
    {
        if (this.cacheObj.has(key))
        {
            this.cacheObj.delete(key);
        }
        sys.localStorage.removeItem(key);
    }
}