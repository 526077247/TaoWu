import { CanvasGroup } from "db://assets/scripts/Mono/Module/UI/CanvasGroup";
import { I18NKey } from "../../../Module/Const/I18NKey";
import { GameObjectPoolManager } from "../../../Module/Resource/GameObjectPoolManager";
import { IOnCreate } from "../../../Module/UI/IOnCreate";
import { IOnEnable } from "../../../Module/UI/IOnEnable";
import { UIMonoBehaviour } from "../../../Module/UIComponent/UIMonoBehaviour";
import { UIText } from "../../../Module/UIComponent/UIText";
import { TimerManager } from "db://assets/scripts/Mono/Module/Timer/TimerManager";
import { math } from "cc";
import { UIBaseView } from "../../../Module/UI/UIBaseView";
import { UIManager } from "../../../Module/UI/UIManager";

export class UIToast extends UIBaseView implements IOnCreate, IOnEnable<string|I18NKey, number|null>
{
    protected getConstructor(){
        return UIToast;
    }
    public static readonly PrefabPath:string = "ui/uicommon/prefabs/uiToast";

    public text: UIText;
    public canvasGroup: UIMonoBehaviour<CanvasGroup>

    public onCreate(){
        GameObjectPoolManager.instance.addPersistentPrefabPath(UIToast.PrefabPath);
        this.text = this.addComponent<UIText>(UIText,"Text");
        this.canvasGroup = this.addComponent<UIMonoBehaviour<CanvasGroup>>(UIMonoBehaviour<CanvasGroup>);
    }

    
    public onEnable(content: string|I18NKey,time: number | null) {
        if(typeof content == "string") {
            this.text.setText(content);
        }else{
            this.text.setI18NKey(content);
        }
        this.onEnableAsync(time);
    }

    private async onEnableAsync(time: number = 1500) {
        var canvas = this.canvasGroup.getMonoBehaviour(CanvasGroup);
        canvas.alpha = 1;
        await TimerManager.instance.waitAsync(time);
        var startTime = TimerManager.instance.getTimeNow();
        while (true)
        {
            await TimerManager.instance.waitAsync(1);
            var timeNow = TimerManager.instance.getTimeNow();
            if (timeNow > startTime + 500)
            {
                canvas.alpha = 0;
                break;
            }
            canvas.alpha = math.lerp(1, 0, (timeNow - startTime) / 500);
        }
        await this.closeSelf();
    }

    public static showToast(content: string, time: number = 1500) {
        UIManager.instance.openBox<UIToast,string,number>(UIToast,UIToast.PrefabPath,content,time);
    }
}