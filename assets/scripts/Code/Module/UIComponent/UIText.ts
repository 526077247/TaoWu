import { Label, math } from "cc";
import { I18NText } from "../../../Mono/Module/I18N/I18NText";
import { Log } from "../../../Mono/Module/Log/Log";
import { I18NKey } from "../Const/I18NKey";
import { I18NManager } from "../I18N/I18NManager";
import { II18N } from "../I18N/II18N";
import { UIBaseContainer } from "../UI/UIBaseContainer";
import * as string from "../../../Mono/Helper/StringHelper"

export class UIText extends UIBaseContainer implements II18N {

    protected getConstructor(){
        return UIText;
    }
    private text: Label;
    private i18nCompTouched: I18NText;
    private textKey: I18NKey|null = null;
    private keyParams : any[];

    private activatingComponent()
    {
        if (this.text == null)
        {
            this.text = this.getNode().getComponent<Label>(Label);
            if (this.text == null)
            {
                Log.error(`添加UI侧组件UIText时，物体${this.getNode().name}上没有找到Label组件`);
            }
        }
    }

    public onLanguageChange()
    {
        this.activatingComponent();
        if (!!this.textKey)
        {
            let text = I18NManager.instance.i18NGetText(this.textKey);
            if (!string.isNullOrEmpty(text) && this.keyParams != null)
                text = string.format(text, this.keyParams);
            this.text.string = text;
        }
    }

    /**
     * 当手动修改text的时候，需要将mono的i18textcomponent给禁用掉
     */
    private disableI18Component(enable: boolean = false)
    {
        this.activatingComponent();
        if (this.i18nCompTouched != null)
        {
            this.i18nCompTouched.enabled = enable;
            if (!enable)
                Log.warning(`组件${this.getNode().name}, text在逻辑层进行了修改，所以应该去掉去预设里面的I18N组件，否则会被覆盖`);
        }
    }

    public getText(): string
    {
        this.activatingComponent();
        return this.text.string;
    }

    public setText(text: string)
    {
        this.disableI18Component();
        this.textKey = null;
        this.text.string = text;
    }

    public setI18NKey(key: I18NKey, ...paras: any[])
    {
        if (key == null)
        {
            this.setText("");
            return;
        }
        this.disableI18Component();
        this.textKey = key;
        this.setI18NText(paras);
    }

    public setI18NText(...paras: any[])
    {
        if (this.textKey == null)
        {
            Log.error("there is not key ");
        }
        else
        {
            this.disableI18Component();
            this.keyParams = paras;
            let text = I18NManager.instance.i18NGetText(this.textKey);
            if (!string.isNullOrEmpty(text) && paras != null)
                text = string.format(text, paras);
            this.text.string = text;
        }
    }

    public setTextColor(color: math.Color | string)
    {
        if(color instanceof math.Color){
            this.activatingComponent();
            this.text.color = color;
            return;
        }
        if(string.isNullOrEmpty(color)) return;
        this.activatingComponent();
        this.text.color.fromHEX(color)
    }
}