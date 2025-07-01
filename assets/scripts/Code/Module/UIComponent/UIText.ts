import { Label } from "cc";
import { Log } from "../../../Mono/Module/Log/Log";
import { II18N } from "../I18N/II18N";
import { UIBaseContainer } from "../UI/UIBaseContainer";

export class UIText extends UIBaseContainer implements II18N {

    protected getConstructor(){
        return UIText;
    }
    private text: Label;

    public onDestroy(){
    }

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

    public onLanguageChange(){
        
    }
}