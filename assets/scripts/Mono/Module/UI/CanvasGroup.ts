import { _decorator, Component, Node, Renderer, UIRenderer, CCFloat, math} from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;

@ccclass('CanvasGroup')
@executeInEditMode(true)
export class CanvasGroup extends Component {

    private _alpha: number = 1;
    @property({
        type: CCFloat,
        range: [0, 1],
        displayName: 'Alpha Value',
        tooltip: 'Alpha value for child nodes (0-1)'
    })
    public get alpha() {
        return this._alpha;
    }

    public set alpha(value: number) {
        if (this._alpha !== value) {
            this._alpha = value;
            this.applyAlpha();
        }
    }

    private applyAlpha() {
        const uirenderer = this.getComponent(UIRenderer);
        if (uirenderer) {
            uirenderer.color = new math.Color(uirenderer.color.r,uirenderer.color.g,uirenderer.color.b,this._alpha*255);
        }
        this.applyAlphaToChildren(this.node);
    }

    private applyAlphaToChildren(node: Node) {
        node.children.forEach(child => {
            const uirenderer = child.getComponent(UIRenderer);
            if (uirenderer) {
                uirenderer.color = new math.Color(uirenderer.color.r,uirenderer.color.g,uirenderer.color.b,this._alpha*255);
            }
            this.applyAlphaToChildren(child);
        });
    }
}