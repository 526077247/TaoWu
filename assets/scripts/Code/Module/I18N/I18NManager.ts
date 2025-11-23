import { sys } from "cc";
import { IManager } from "../../../Mono/Core/Manager/IManager"
import { Event } from "../../../Mono/Core/Object/Event";
import { I18NBridge } from "../../../Mono/Module/I18N/I18NBridge";
import { Log } from "../../../Mono/Module/Log/Log";
import { CacheKeys } from "../Const/CacheKeys";
import { LangType } from "../Const/LangType";
import { CacheManager } from "../Player/CacheManager";
import { I18NKey } from "../Const/I18NKey";
import { II18N } from "./II18N";
import * as string from "../../../Mono/Helper/StringHelper"
import { ConfigManager } from "../Config/ConfigManager";
import { I18NConfig, I18NConfigCategory } from "./I18NConfigCategory";
import { JsonHelper } from "../../../Mono/Helper/JsonHelper";
export class I18NManager implements IManager {

    private static _instance: I18NManager;

    public static get instance(): I18NManager {
        return I18NManager._instance;
    }

    public onLanguageChangeEvt: Event = new Event();

    private _curLangType: LangType;
    public get curLangType():LangType{
        return this._curLangType;
    }

    private _i18nTextKeyDic: Map<number, string>
    private _addFonts: boolean

    public init() {
        I18NManager._instance = this;

        var lang = CacheManager.instance.getInt(CacheKeys.CurLangType, -1);
        if (lang < 0)
        {
            this._curLangType = sys.language == "zh"      
                ? LangType.Chinese
                : LangType.English;
        }
        else
        {
            this._curLangType = lang;
        }
        I18NBridge.instance.getValueByKey = this.i18NGetText.bind(this);
        this._i18nTextKeyDic = new Map<number, string>();
        this.initAsync();
    }
    public destroy() {
        this.onLanguageChangeEvt.clear();
        I18NManager._instance = null;
        this._i18nTextKeyDic.clear();
        this._i18nTextKeyDic = null;
    }

    private async initAsync()
    {
        JsonHelper.registerClass(I18NConfigCategory,'I18NConfigCategory');
        JsonHelper.registerClass(I18NConfig,'I18NConfig');
        var res = await ConfigManager.instance.loadOneConfig(I18NConfigCategory,LangType[this.curLangType]);

        for (let i = 0; i <res.getAllList().length; i++)
        {
            var item = res.getAllList()[i];
            this._i18nTextKeyDic.set(item.id, item.value);
        }
    }

    /**
     * 根据key取多语言取不到返回key
     * @param key 
     * @returns 
     */
    public i18NGetText(key: string| I18NKey| number): string
    {
        let i18nKey: number;
        if(typeof key != "number") {
            i18nKey = I18NKey[key];
        } else {
            i18nKey = key
        }
        if (!!i18nKey)
        {
            const result = this._i18nTextKeyDic.get(i18nKey);
            if(!!result)
            {
                return result;
            }
        }
        Log.error("多语言key未添加！ " + key);
        if(typeof key == "string") {
            return key;
        } else {
            return String(key);
        }
    }

    /**
     * 根据key取带参数多语言取不到返回key
     * @param key 
     * @param paras 
     * @returns 
     */
    public i18NGetParamText(key: string| I18NKey| number, ...paras: any[]){
        let i18nKey: number;
        if(typeof key != "number") {
            i18nKey = I18NKey[key];
        } else {
            i18nKey = key
        }
        
        if (!!i18nKey)
        {
            const result = this._i18nTextKeyDic.get(i18nKey);
            if(!!result)
            {
                return string.format(result, ...paras);
            }
        }
        Log.error("多语言key未添加！ " + key);
        if(typeof key == "string") {
            return key;
        } else {
            return String(key);
        }
    }

    /**
     * 切换语言,外部接口
     * @param langType 
     */
    public async wwitchLanguage(langType: number|LangType)
    {
        //修改当前语言
        CacheManager.instance.setInt(CacheKeys.CurLangType, langType);
        this._curLangType = langType;
        var res = await ConfigManager.instance.loadOneConfig(I18NConfigCategory,LangType[this.curLangType]);
        this._i18nTextKeyDic.clear();
        for (let i = 0; i <res.getAllList().length; i++)
        {
            var item = res.getAllList()[i];
            this._i18nTextKeyDic.set(item.id, item.value);
        }

        I18NBridge.instance.onLanguageChangeEvt?.emit();
        this.onLanguageChangeEvt?.emit();
    }

    public registerI18NEntity(entity: II18N)
    {
        this.onLanguageChangeEvt.subscribe(entity.onLanguageChange);
    }

    public removeI18NEntity(entity: II18N)
    {
        this.onLanguageChangeEvt.unsubscribe(entity.onLanguageChange);
    }
}