import { Event } from "../../Core/Object/Event";

export class I18NBridge
{
    private static _instance: I18NBridge = new I18NBridge();
    public static get instance(): I18NBridge {
        return I18NBridge._instance;
    }


    public onLanguageChangeEvt: Event = new Event();
    public getValueByKey :(string)=>string;

    /**
     * 通过I18NKey获取多语言文本
     * @param i18NKey 
     * @returns 
     */
    public getText(i18NKey: string):string
    {
        if(!!this.getValueByKey)
            return this.getValueByKey(i18NKey);
        return i18NKey;
    }
    
}