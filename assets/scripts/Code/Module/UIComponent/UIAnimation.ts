import { Animation, AnimationClip } from "cc";
import { UIBaseContainer } from "../UI/UIBaseContainer";
import { Log } from "../../../Mono/Module/Log/Log";
import { TimerManager } from "../../../Mono/Module/Timer/TimerManager";

export class UIAnimation extends UIBaseContainer{
    public getConstructor(){
        return UIAnimation;
    }

    private anim: Animation;
    private clips: Map<string, AnimationClip>;
    private activatingComponent()
    {
        if (this.anim == null)
        {
            this.anim = this.getNode().getComponent<Animation>(Animation);
            if (this.anim == null)
            {
                Log.error(`添加UI侧组件UIAnimation时，物体${this.getNode().name}上没有找到Animation组件`);
            }else{
                this.clips = new Map<string, AnimationClip>();
                if(this.anim.clips!= null){
                    for (let index = 0; index < this.anim.clips.length; index++) {
                        const element = this.anim.clips[index];
                        this.clips.set(element.name, element);
                    }
                }
            }
        }
    }

    public async play(name: string)
    {
        this.activatingComponent();
        this.anim.play(name);
        const clip = this.clips.get(name);
        if(!!clip){
            await TimerManager.instance.waitAsync(clip.duration * 1000);
        }
    }

    public crossFade(name: string, during: number = 0.5){
        this.activatingComponent();
        this.anim.crossFade(name, during);
    }
    
}