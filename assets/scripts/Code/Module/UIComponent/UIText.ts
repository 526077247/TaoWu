import { Label, math, RichText, Tween, tween } from "cc";
import { I18NText } from "../../../Mono/Module/I18N/I18NText";
import { Log } from "../../../Mono/Module/Log/Log";
import { I18NKey } from "../Const/I18NKey";
import { I18NManager } from "../I18N/I18NManager";
import { II18N } from "../I18N/II18N";
import { UIBaseContainer } from "../UI/UIBaseContainer";
import * as string from "../../../Mono/Helper/StringHelper"

export class UIText extends UIBaseContainer implements II18N {

    public getConstructor(){
        return UIText;
    }
    private text: Label;
    private text2: RichText;
    private i18nCompTouched: I18NText;
    private textKey: I18NKey|null = null;
    private keyParams : any;

    private activatingComponent()
    {
        if (this.text == null)
        {
            this.text = this.getNode().getComponent<Label>(Label);
            if (this.text == null)
            {
                this.text2 = this.getNode().getComponent<RichText>(RichText);
                if (this.text2 == null)
                {
                    Log.error(`添加UI侧组件UIText时，物体${this.getNode().name}上没有找到Label或RichText组件`);
                }
            }
            this.i18nCompTouched = this.getNode().getComponent<I18NText>(I18NText);
        }
    }

    public onLanguageChange()
    {
        this.activatingComponent();
        if (!!this.textKey)
        {
            let text = I18NManager.instance.i18NGetText(this.textKey);
            if (!string.isNullOrEmpty(text) && this.keyParams != null)
                text = string.format(text, ...this.keyParams);
            if (this.text != null)
                this.text.string = text;
            else if (this.text2 != null)
                this.text2.string = text;
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
        if (this.text != null)
            return this.text.string;
        else if (this.text2 != null)
            return this.text2.string;
        return null;
    }

    public setText(text: string)
    {
        if(text === undefined){
            Log.error("SetText undefined")
        }
        this.disableI18Component();
        this.textKey = null;
        if (this.text != null)
            this.text.string = text;
        else if (this.text2 != null)
            this.text2.string = text;
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
        this.setI18NText(...paras);
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
            if (!string.isNullOrEmpty(text) && this.keyParams != null)
                text = string.format(text, ...this.keyParams);
            if (this.text != null)
                this.text.string = text;
            else if (this.text2 != null)
                this.text2.string = text;
        }
    }

    public setTextColor(color: math.Color | string)
    {
        if(color instanceof math.Color){
            this.activatingComponent();
            if (this.text != null)
                this.text.color = color;
            else if (this.text2 != null)
                this.text2.fontColor = color;
            return;
        }
        if(string.isNullOrEmpty(color)) return;
        this.activatingComponent();
        this.text.color.fromHEX(color)
        if (this.text != null)
            this.text.color.fromHEX(color)
        else if (this.text2 != null)
            this.text2.fontColor.fromHEX(color)
    }

    public lastNum: number = 0;
    public tween: Tween
    public setNum(number: number){
        this.disableI18Component();
        this.tween?.stop();
        if (this.text != null)
            this.text.string = String(number)
        else if (this.text2 != null)
            this.text2.string = String(number)
        this.lastNum = number;
    }
    public doNum(number: number, during:number = 0.5){
        this.disableI18Component();
        if(Math.abs(number - this.lastNum) == 1){
            this.setNum(number);
            return;
        }
        const startValue = this.lastNum
        let currentValue = startValue;
        this.tween?.stop();
        this.tween = tween({ value: startValue })
            .to(during, { value: number }, {
                onUpdate: (target) => {
                currentValue = Math.floor(target.value);
                if (this.text != null) {
                    this.text.string = String(currentValue)
                    this.lastNum = currentValue;
                }
                else if (this.text2 != null){
                    this.text2.string = currentValue.toString();
                    this.lastNum = currentValue;
                }
            },
        }).call(()=>{
            this.tween = null;
            this.lastNum = number;
        });
        this.tween.start();
    }
}