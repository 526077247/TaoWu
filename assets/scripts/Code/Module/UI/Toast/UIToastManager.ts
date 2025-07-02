import { Label } from "cc";
import { IManager } from "../../../../Mono/Core/Manager/IManager";
import { TimerManager } from "../../../../Mono/Module/Timer/TimerManager";
import { CanvasGroup } from "../../../../Mono/Module/UI/CanvasGroup";
import { GameObjectPoolManager } from "../../Resource/GameObjectPoolManager";
import { UILayerNames, UIManager } from "../UIManager";

export class UIToastManager implements IManager{
    public static readonly PrefabPath = "ui/uicommon/prefabs/uiToast";
    private static _instance: UIToastManager;

    public static get instance(): UIToastManager{
        return UIToastManager._instance;
    }

    public init(){
        UIToastManager._instance = this;
        GameObjectPoolManager.instance.addPersistentPrefabPath(UIToastManager.PrefabPath);
        GameObjectPoolManager.instance.preLoadGameObjectAsync(UIToastManager.PrefabPath, 1);
    }

    public destroy() {
        GameObjectPoolManager.instance.cleanupWithPathArray([UIToastManager.PrefabPath]);
        UIToastManager._instance = null;
    }

    public async showToast(content: string, time: number = 1500)
    {
        var obj = await GameObjectPoolManager.instance.getGameObjectAsync(UIToastManager.PrefabPath);
        obj.setParent(UIManager.instance.getLayer(UILayerNames.TipLayer).node,false);
        var canvas = obj.getComponent(CanvasGroup);
        canvas.alpha = 1;
        var txt = obj.getComponentInChildren<Label>(Label);
        txt.string = content;
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
            canvas.alpha = 1 - (timeNow - startTime) / 500;
        }
        GameObjectPoolManager.instance.recycleGameObject(obj);
    }
}