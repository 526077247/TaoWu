import { UIBaseView } from "../../../Module/UI/UIBaseView";
import { IOnCreate } from "../../../Module/UI/IOnCreate";
import { IOnEnable } from "../../../Module/UI/IOnEnable";
import { UISlider } from "../../../Module/UIComponent/UISlider";
import { UpdateTask } from "../../../Module/Update/UpdateTask";
import { UpdateRes } from "../../../Module/Update/UpdateRes";
import { SetUpdateListProcess } from "../../../Module/Update/UpdateProcess/SetUpdateListProcess";
import { AppUpdateProcess } from "../../../Module/Update/UpdateProcess/AppUpdateProcess";
import { BundleUpdateProcess } from "../../../Module/Update/UpdateProcess/BundleUpdateProcess";
import { Log } from "../../../../Mono/Module/Log/Log";

export class UIUpdateView extends UIBaseView implements IOnCreate, IOnEnable<VoidFunction> {

    public static readonly PrefabPath: string = "ui/uiloading/prefabs/uiLoadingView";

    private slider: UISlider;
    private onOver: VoidFunction;

    public getConstructor() {
        return UIUpdateView;
    }

    public onCreate() {
        this.slider = this.addComponent(UISlider, "loadingscreen/Slider");
    }

    public onEnable(func: VoidFunction) {
        this.onOver = func;
        this.slider.setValue(0);
        this.startCheckUpdate();
    }

    private async startCheckUpdate() {
        const task = new UpdateTask();
        await task.init(this.updateProgress.bind(this),
            new SetUpdateListProcess(),
            new AppUpdateProcess(),
            new BundleUpdateProcess(true)//可选不在此处下载，后续则自动按需下载
        );

        const res = await task.process();

        if (res === UpdateRes.Restart) {
            Log.info("[HotUpdate] 更新完成，准备重启");
            UpdateTask.restartGame();
        } else if (res === UpdateRes.Over) {
            Log.info("[HotUpdate] 不需要重启，直接进入游戏");
            this.onOver?.();
        } else {
            Log.error("[HotUpdate] UpdateTask fail");
            // 失败也继续进入游戏 (降级处理)
            this.onOver?.();
        }
    }

    private updateProgress(total: number, current: number){
        const percent = total > 0 ? current / total : 0;
        this.slider.setValue(percent);
        Log.info(`[HotUpdate] ${(percent * 100).toFixed(1)}% (${current}/${total})`);
    }
}
