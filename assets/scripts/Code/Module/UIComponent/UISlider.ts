import { Slider } from "cc";
import { Log } from "../../../Mono/Module/Log/Log";
import { IOnDestroy } from "../UI/IOnDestroy";
import { UIBaseContainer } from "../UI/UIBaseContainer";

export class UISlider extends UIBaseContainer implements IOnDestroy {

    protected getConstructor(){
        return UISlider;
    }
    private slider: Slider;
    private onValueChanged: (val:number) => void;
    private isWholeNumbers: boolean;
    private valueList: [];

    private min: number = 0;
    private max: number = 1;

    private isSetting: boolean = false;

    private get sliderValue():number{
        return this.min + this.slider.progress*(this.max - this.min)
    }

    public onDestroy(){
        this.removeOnValueChanged()
    }

    private activatingComponent()
    {
        if (this.slider == null)
        {
            this.slider = this.getNode().getComponent<Slider>(Slider);
            if (this.slider == null)
            {
                Log.error(`添加UI侧组件UISlider时，物体${this.getNode().name}上没有找到Slider组件`);
            }
        }
    }
    public setOnValueChanged(callback: (val:number) => void)
    {
        this.activatingComponent();
        this.removeOnValueChanged();
        this.onValueChanged = callback;
        this.slider!.node.on('slide', this.onValueChangedEvent, this);
    }

    public removeOnValueChanged()
    {
        if (this.onValueChanged != null)
        {
            this.slider!.node.off('slide', this.onValueChangedEvent, this);
            this.onValueChanged = null;
        }
    }

    private onValueChangedEvent(slider: Slider){
        if(this.isSetting) return;
        if(this.isWholeNumbers){
            this.isSetting = true;
            let val = this.sliderValue;
            val = Math.floor(val+0.5)
            this.setValue(val)
            this.isSetting= false;
        }
        if(this.onValueChanged){
            this.onValueChanged(this.sliderValue)
        }
    }

    public setWholeNumbers(wholeNumbers: boolean)
    {
        this.activatingComponent();
        this.isWholeNumbers = wholeNumbers;
    }

    public setValueList(valueList: [])
    {
        this.valueList = valueList;
        this.setWholeNumbers(true);
        this.setMinValue(0);
        this.setMaxValue(valueList.length - 1);
    }

    public getValueList():[]
    {
        return this.valueList;
    }
   
    public setWholeNumbersValue(value)
    {
        this.activatingComponent();
        if (!this.isWholeNumbers)
        {
            Log.warning("请先设置WholeNumbers为true");
            return;
        }

        for (let i = 0; i < this.valueList.length; i++)
        {
            if (this.valueList[i] == value)
            {
                this.slider.progress = i/(this.valueList.length-1);
                return;
            }
        }
    }

    public getWholeNumbersValue(): any
    {
        this.activatingComponent();
        if (!this.isWholeNumbers)
        {
            Log.warning("请先设置WholeNumbers为true");
            return null;
        }
        var index = this.sliderValue;
        return this.valueList[index];
    }
   
    /**
     * 设置进度
     * @param value wholeNumbers 时value是ui侧的index
     */
    public setValue(value: number)
    {
        this.activatingComponent();
        if (!this.isWholeNumbers){
            this.slider.progress = (value - this.min) / (this.max - this.min);
        }else{
            this.slider.progress = (Math.floor(value) - this.min) / (this.max - this.min);
        }
       
    }

    public getValue(): number
    {
        this.activatingComponent();
        return this.sliderValue;
    }

    /**
     * 设置进度
     * @param value 
     * @return
     */
    public setNormalizedValue(value: number)
    {
        this.activatingComponent();
        this.slider.progress = value;
    }
    
    public getNormalizedValue(): number
    {
        this.activatingComponent();
        return this.slider.progress;
    }

    public setMaxValue(value: number)
    {
        this.activatingComponent();
        this.max = value;
    }

    public setMinValue(value: number)
    {
        this.activatingComponent();
        this.min = value;
    }
}