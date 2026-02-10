import { _decorator, Component, Node, log, error, instantiate, Label, RichText, Color } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TextColorCtrl')
export class TextColorCtrl extends Component {
    public m_text: Label;
    public m_text2: RichText;
    private m_originTextColor: Color;
    public  m_originOutlineColor: Color;


    onLoad() {
        this.m_text = this.getComponent(Label);
        if (this.m_text != null)
        {
            this.m_originTextColor = this.m_text.color;
            this.m_originOutlineColor = this.m_text.outlineColor;
        }
        else
        {
            this.m_text2 = this.getComponent(RichText);
            if(this.m_text2!=null) {
                this.m_originTextColor = this.m_text2.fontColor;
            }
        }
    }

    public static get(go: Node): TextColorCtrl
    {
        var uiTextGrey = go.getComponent<TextColorCtrl>(TextColorCtrl);
        if (uiTextGrey == null)
        {
            uiTextGrey = go.getComponent<TextColorCtrl>(TextColorCtrl);
        }

        return uiTextGrey;
    }

    public setTextColor(color: Color)
    {
        if(this.m_text!=null) this.m_text.color = color;
        if(this.m_text2!=null) this.m_text2.fontColor = color;
    }

    public clearTextColor()
    {
        if(this.m_text!=null) this.m_text.color = this.m_originTextColor;
        if(this.m_text2!=null) this.m_text2.fontColor = this.m_originTextColor;
    }

    public setOutlineColor(color: Color)
    {
        if(this.m_text != null) {
            this.m_text.outlineColor = color;
        }
    }

    public clearOutlineColor()
    {
        if(this.m_text != null) {
            this.m_text.outlineColor = this.m_originOutlineColor;
        }
    }
}