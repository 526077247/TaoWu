import { Sprite } from "cc";
import { Log } from "../../../Mono/Module/Log/Log";
import { IOnDestroy } from "../UI/IOnDestroy";
import { UIBaseContainer } from "../UI/UIBaseContainer";

export class UIImage extends UIBaseContainer implements IOnDestroy {

    protected getConstructor(){
        return UIImage;
    }
    private image: Sprite;

    public onDestroy(){
    }

    private activatingComponent()
    {
        if (this.image == null)
        {
            this.image = this.getNode().getComponent<Sprite>(Sprite);
            if (this.image == null)
            {
                Log.error(`添加UI侧组件UIImage时，物体${this.getNode().name}上没有找到Sprite组件`);
            }
        }
    }

    
}