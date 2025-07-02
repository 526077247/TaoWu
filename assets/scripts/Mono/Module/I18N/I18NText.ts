import { _decorator, Component, Label, CCString } from 'cc';
import { I18NBridge } from './I18NBridge';
const { ccclass, property } = _decorator;

@ccclass('I18NText')
export class I18NText extends Component {
    @property({})
    public key: string = '';
    private _text: Label;
    start() {
        this._text = this.getComponent<Label>(Label);
    }

    onEnable() {
        I18NBridge.instance.onLanguageChangeEvt.subscribe(this.onSwitchLanguage);
    }

    onDisable(){
        I18NBridge.instance.onLanguageChangeEvt.unsubscribe(this.onSwitchLanguage);
    }

    private onSwitchLanguage()
    {
        if (this._text != null)
            this._text.string = I18NBridge.instance.getText(this.key);
    }
}


