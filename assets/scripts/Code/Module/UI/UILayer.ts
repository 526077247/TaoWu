import { Canvas, Node, UITransform, Vec3} from "cc";
import { IManager } from "../../../Mono/Core/Manager/IManager"
import { Define } from "../../../Mono/Define";
import { UILayerDefine, UILayerNames, UIManager } from "./UIManager"

export class UILayer implements IManager<UILayerDefine, Node>{

    public name :UILayerNames;
    public node: Node
    public canvas: Canvas
    public rectTransform: UITransform

    public init(p1?:UILayerDefine, p2?:Node){
        this.name = p1.name;
        this.node = p2;
       
        //canvas
        this.canvas = this.node.getComponent<Canvas>(Canvas)
        if (!this.canvas)
        {
            this.canvas = this.node.addComponent<Canvas>(Canvas);
        }
        
        this.node.position = new Vec3(Define.DesignScreenWidth/2,Define.DesignScreenHeight/2, p1.planeDistance)
        this.node.layer = (1 << 25)
        this.canvas.cameraComponent = UIManager.instance.getUICamera();
        this.rectTransform = this.node.getComponent<UITransform>(UITransform);
        this.rectTransform.width = Define.DesignScreenWidth;
        this.rectTransform.height = Define.DesignScreenHeight;
    }
    
    public destroy(){
        this.name = null;
        this.node = null;
        this.canvas = null;
    }
}