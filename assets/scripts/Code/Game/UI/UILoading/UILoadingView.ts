import { IUpdate } from "../../../../Mono/Module/Update/IUpdate";
import { IOnCreate } from "../../../Module/UI/IOnCreate";
import { IOnEnable } from "../../../Module/UI/IOnEnable";
import { UIBaseView, uiView } from "../../../Module/UI/UIBaseView";
import { UISlider } from "../../../Module/UIComponent/UISlider";
import { game } from "cc";

@uiView("UILoadingView")
export class UILoadingView extends UIBaseView implements IOnCreate, IOnEnable, IUpdate{

    public static readonly PrefabPath:string = "ui/uiloading/prefabs/uiLoadingView";
    private slider: UISlider

    private progress: number
    public getConstructor()
    {
        return UILoadingView;
    }

    public onCreate()
    {
        this.slider = this.addComponent(UISlider,"loadingscreen/Slider");
    }

    public onEnable() {
        this.progress = 0;
    }

    public update() {
        this.setProgress(this.progress + game.deltaTime / Math.max(5, this.progress*100));
    }

    public setProgress(value: number) {
        if (value > this.progress)
        {
            this.progress = value;
        }
        this.slider.setValue(this.progress);
    }
}