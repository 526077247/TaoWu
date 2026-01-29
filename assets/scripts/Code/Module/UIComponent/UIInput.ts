import { EditBox } from "cc";
import { Log } from "../../../Mono/Module/Log/Log";
import { IOnDestroy } from "../UI/IOnDestroy";
import { UIBaseContainer } from "../UI/UIBaseContainer";

export class UIInput extends UIBaseContainer implements IOnDestroy {

    public getConstructor(){
        return UIInput;
    }
    private input: EditBox;
    private onValueChanged: () => void;
    private onEndEdit: () => void;

    public onDestroy(){
        this.removeOnValueChanged()
        this.removeOnEndEdit();
    }

    private activatingComponent()
    {
        if (this.input == null)
        {
            this.input = this.getNode().getComponent<EditBox>(EditBox);
            if (this.input == null)
            {
                Log.error(`添加UI侧组件UIInput时，物体${this.getNode().name}上没有找到EditBox组件`);
            }
        }
    }

    public getText(): string
    {
        this.activatingComponent();
        return this.input.textLabel.string;
    }

    public setText(text: string)
    {
        this.activatingComponent();
        this.input.string = text;
    }

    public setOnValueChanged(callback: () => void)
    {
        this.activatingComponent();
        this.removeOnValueChanged();
        this.onValueChanged = callback;
        this.input!.node.on('text-changed', this.onValueChangedEvent, this);
    }

    public removeOnValueChanged()
    {
        if (this.onValueChanged != null)
        {
            this.input!.node.off('text-changed', this.onValueChangedEvent, this);
            this.onValueChanged = null;
        }
    }

    private onValueChangedEvent(input: EditBox)
    {
        this.onValueChanged?.()
    }

    public setOnEndEdit(callback: () => void)
    {
        this.activatingComponent();
        this.removeOnValueChanged();
        this.onValueChanged = callback;
        this.input!.node.on('editing-did-ended', this.onEndEditEvent, this);
    }

    public removeOnEndEdit()
    {
        if (this.onEndEdit != null)
        {
            this.input!.node.off('editing-did-ended', this.onEndEditEvent, this);
            this.onEndEdit = null;
        }
    }

    private onEndEditEvent(input: EditBox)
    {
        this.onEndEdit?.()
    }
}