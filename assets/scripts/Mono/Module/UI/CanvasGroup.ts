import { _decorator, Component, Node, Renderer, CCFloat} from 'cc';
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
        this.applyAlphaToChildren(this.node);
    }

    private applyAlphaToChildren(node: Node) {
        node.children.forEach(child => {
            const renderer = child.getComponent(Renderer);
            if (renderer && renderer.material) {
                const material = renderer.material;
                material.setProperty('alpha', this.alpha);
                renderer.material = material;
            }
            this.applyAlphaToChildren(child);
        });
    }
}