import { IOnCreate } from "../../../Module/UI/IOnCreate";
import { UIBaseView } from "../../../Module/UI/UIBaseView";
import { UISlider } from "../../../Module/UIComponent/UISlider";

export class UILoadingView extends UIBaseView implements IOnCreate{

    public static readonly PrefabPath:string = "ui/uiloading/prefabs/uiLoadingView";
    private slider: UISlider
    protected getConstructor()
    {
        return UILoadingView;
    }

    public onCreate()
    {
        this.slider = this.addComponent(UISlider,"loadingscreen/Slider");
    }

    public setProgress(value: number)
    {
        this.slider.setValue(value);
    }
}