import { _decorator, Component, Node, UITransform, Vec2, Vec3, Size, view, Enum } from 'cc';
const { ccclass, property ,requireComponent, executeInEditMode} = _decorator;

// 锚点预设枚举
export enum AnchorPreset {
    TopLeft,
    TopCenter,
    TopRight,
    MiddleLeft,
    MiddleCenter,
    MiddleRight,
    BottomLeft,
    BottomCenter,
    BottomRight,
    StretchTop,
    StretchMiddle,
    StretchBottom,
    StretchLeft,
    StretchCenter,
    StretchRight,
    StretchAll
}

@ccclass('RectTransform')
@requireComponent(UITransform)
@executeInEditMode
export class RectTransform extends Component {
    // 锚点最小值 (左下角)
    @property
    private _anchorMin: Vec2 = new Vec2(0, 0);
    
    // 锚点最大值 (右上角)
    @property
    private _anchorMax: Vec2 = new Vec2(1, 1);
    
    // 偏移最小值 (左下角偏移)
    @property
    private _offsetMin: Vec2 = new Vec2(0, 0);
    
    // 偏移最大值 (右上角偏移)
    @property
    private _offsetMax: Vec2 = new Vec2(0, 0);
    
    // 锚点预设
    @property({ type: Enum(AnchorPreset)})
    private _anchorPreset: AnchorPreset = AnchorPreset.MiddleCenter;
    
    private _uiTransform: UITransform | null = null;
    private _parentRect: RectTransform | null = null;
    private _lastParentSize: Size = new Size(0, 0);
    private _dirty: boolean = true;

    onLoad() {
        this._uiTransform = this.getComponent(UITransform);
        if (!this._uiTransform) {
            this._uiTransform = this.node.addComponent(UITransform);
        }
        
        // 监听父节点变化
        this.node.on(Node.EventType.PARENT_CHANGED, this.onParentChanged, this);
        
        // 初始更新
        this.updateRect();
    }

    onDestroy() {
        this.node.off(Node.EventType.PARENT_CHANGED, this.onParentChanged, this);
    }

    update(deltaTime: number) {
        if (!this._dirty) return;
        
        this.updateRect();
        this._dirty = false;
    }

    // 当父节点变化时
    private onParentChanged() {
        this._parentRect = this.node.parent?.getComponent(RectTransform) || null;
        this.markDirty();
    }

    // 标记需要更新
    private markDirty() {
        this._dirty = true;
    }

    // 更新矩形变换
    private updateRect() {
        if (!this._uiTransform) return;
        
        // 获取父容器尺寸
        let parentSize = new Size(0, 0);
        if (this._parentRect && this._parentRect.uiTransform) {
            parentSize = this._parentRect.uiTransform.contentSize;
        } else if (!!this.node.parent) {
            if (this.node.parent._objFlags == 512) return;
            const parentUITransform = this.node.parent.getComponent(UITransform);
            if (!!parentUITransform) {
                parentSize = parentUITransform.contentSize;
            } else {
                const visibleSize = view.getVisibleSize();
                parentSize = new Size(visibleSize.width, visibleSize.height);
            }
        } else {
            return;
        }
        
        // 计算锚点位置
        const minPos = new Vec2(
            this._anchorMin.x * parentSize.width,
            this._anchorMin.y * parentSize.height
        );
        
        const maxPos = new Vec2(
            this._anchorMax.x * parentSize.width,
            this._anchorMax.y * parentSize.height
        );
        
        // === 修正1: 正确区分拉伸模式和非拉伸模式 ===
        const isStretch = !this._anchorMin.equals(this._anchorMax);
        let positionX, positionY;
        let width = this.uiTransform.contentSize.width;
        let height = this.uiTransform.contentSize.height;
        let setSize = false;

        if (isStretch) {
            // 拉伸模式：计算四个边界
            const left = minPos.x + this._offsetMin.x;
            const right = maxPos.x - this._offsetMax.x;
            const bottom = minPos.y + this._offsetMin.y;
            const top = maxPos.y - this._offsetMax.y;
            // 计算中心位置
            positionX = (left + right) / 2 - parentSize.width / 2;
            positionY = (bottom + top) / 2 - parentSize.height / 2;
            width = right - left;
            height = top - bottom; // 修正高度计算（使用y坐标）
            setSize = true;
        } else {
            // 非拉伸模式：保持原始尺寸，仅调整位置
            positionX = this._offsetMin.x - parentSize.width / 2 + minPos.x;
            positionY = this._offsetMin.y - parentSize.height / 2 + minPos.y;
        }
        
        // 应用变换
        this.node.setPosition(new Vec3(positionX, positionY, 0));
        if (setSize) {
            this._uiTransform.setContentSize(new Size(width, height));
        }

        // 更新锚点预设
        this.updateAnchorPreset();
    }

    // 更新锚点预设
    private updateAnchorPreset() {
        if (this._anchorMin.equals(new Vec2(0, 1)) && this._anchorMax.equals(new Vec2(0, 1))) {
            this._anchorPreset = AnchorPreset.TopLeft;
        } else if (this._anchorMin.equals(new Vec2(0.5, 1)) && this._anchorMax.equals(new Vec2(0.5, 1))) {
            this._anchorPreset = AnchorPreset.TopCenter;
        } else if (this._anchorMin.equals(new Vec2(1, 1)) && this._anchorMax.equals(new Vec2(1, 1))) {
            this._anchorPreset = AnchorPreset.TopRight;
        } else if (this._anchorMin.equals(new Vec2(0, 0.5)) && this._anchorMax.equals(new Vec2(0, 0.5))) {
            this._anchorPreset = AnchorPreset.MiddleLeft;
        } else if (this._anchorMin.equals(new Vec2(0.5, 0.5)) && this._anchorMax.equals(new Vec2(0.5, 0.5))) {
            this._anchorPreset = AnchorPreset.MiddleCenter;
        } else if (this._anchorMin.equals(new Vec2(1, 0.5)) && this._anchorMax.equals(new Vec2(1, 0.5))) {
            this._anchorPreset = AnchorPreset.MiddleRight;
        } else if (this._anchorMin.equals(new Vec2(0, 0)) && this._anchorMax.equals(new Vec2(0, 0))) {
            this._anchorPreset = AnchorPreset.BottomLeft;
        } else if (this._anchorMin.equals(new Vec2(0.5, 0)) && this._anchorMax.equals(new Vec2(0.5, 0))) {
            this._anchorPreset = AnchorPreset.BottomCenter;
        } else if (this._anchorMin.equals(new Vec2(1, 0)) && this._anchorMax.equals(new Vec2(1, 0))) {
            this._anchorPreset = AnchorPreset.BottomRight;
        } else if (this._anchorMin.equals(new Vec2(0, 1)) && this._anchorMax.equals(new Vec2(1, 1))) {
            this._anchorPreset = AnchorPreset.StretchTop;
        } else if (this._anchorMin.equals(new Vec2(0, 0.5)) && this._anchorMax.equals(new Vec2(1, 0.5))) {
            this._anchorPreset = AnchorPreset.StretchMiddle;
        } else if (this._anchorMin.equals(new Vec2(0, 0)) && this._anchorMax.equals(new Vec2(1, 0))) {
            this._anchorPreset = AnchorPreset.StretchBottom;
        } else if (this._anchorMin.equals(new Vec2(0, 0)) && this._anchorMax.equals(new Vec2(0, 1))) {
            this._anchorPreset = AnchorPreset.StretchLeft;
        } else if (this._anchorMin.equals(new Vec2(0.5, 0)) && this._anchorMax.equals(new Vec2(0.5, 1))) {
            this._anchorPreset = AnchorPreset.StretchCenter;
        } else if (this._anchorMin.equals(new Vec2(1, 0)) && this._anchorMax.equals(new Vec2(1, 1))) {
            this._anchorPreset = AnchorPreset.StretchRight;
        } else if (this._anchorMin.equals(new Vec2(0, 0)) && this._anchorMax.equals(new Vec2(1, 1))) {
            this._anchorPreset = AnchorPreset.StretchAll;
        }
    }

    // ========== 公共API ==========
    
    get uiTransform(): UITransform | null {
        return this._uiTransform;
    }

    @property({ type: Vec2, tooltip: "左下角锚点 (0-1)" })
    get anchorMin(): Vec2 {
        return this._anchorMin;
    }
    
    set anchorMin(value: Vec2) {
        this._anchorMin = value;
        this.markDirty();
    }
    
    @property({ type: Vec2, tooltip: "右上角锚点 (0-1)" })
    get anchorMax(): Vec2 {
        return this._anchorMax;
    }
    
    set anchorMax(value: Vec2) {
        this._anchorMax = value;
        this.markDirty();
    }
    
    @property({ type: Vec2, tooltip: "左下角偏移" })
    get offsetMin(): Vec2 {
        return this._offsetMin;
    }
    
    set offsetMin(value: Vec2) {
        this._offsetMin = value;
        this.markDirty();
    }

    // 偏移最大值 (右上角偏移)
    @property({ type: Vec2, tooltip: "右上角偏移" })
    get offsetMax(): Vec2 {
        return this._offsetMax;
    }
    
    set offsetMax(value: Vec2) {
        this._offsetMax = value;
        this.markDirty();
    }
    
    @property({ type: Enum(AnchorPreset), tooltip: "锚点预设" })
    get anchorPreset(): AnchorPreset {
        return this._anchorPreset;
    }
    
    set anchorPreset(value: AnchorPreset) {
        this._anchorPreset = value;
        this.applyAnchorPreset();
        this.markDirty();
    }
    
    // 应用锚点预设
    private applyAnchorPreset() {
        switch (this._anchorPreset) {
            case AnchorPreset.TopLeft:
                this._anchorMin = new Vec2(0, 1);
                this._anchorMax = new Vec2(0, 1);
                break;
            case AnchorPreset.TopCenter:
                this._anchorMin = new Vec2(0.5, 1);
                this._anchorMax = new Vec2(0.5, 1);
                break;
            case AnchorPreset.TopRight:
                this._anchorMin = new Vec2(1, 1);
                this._anchorMax = new Vec2(1, 1);
                break;
            case AnchorPreset.MiddleLeft:
                this._anchorMin = new Vec2(0, 0.5);
                this._anchorMax = new Vec2(0, 0.5);
                break;
            case AnchorPreset.MiddleCenter:
                this._anchorMin = new Vec2(0.5, 0.5);
                this._anchorMax = new Vec2(0.5, 0.5);
                break;
            case AnchorPreset.MiddleRight:
                this._anchorMin = new Vec2(1, 0.5);
                this._anchorMax = new Vec2(1, 0.5);
                break;
            case AnchorPreset.BottomLeft:
                this._anchorMin = new Vec2(0, 0);
                this._anchorMax = new Vec2(0, 0);
                break;
            case AnchorPreset.BottomCenter:
                this._anchorMin = new Vec2(0.5, 0);
                this._anchorMax = new Vec2(0.5, 0);
                break;
            case AnchorPreset.BottomRight:
                this._anchorMin = new Vec2(1, 0);
                this._anchorMax = new Vec2(1, 0);
                break;
            case AnchorPreset.StretchTop:
                this._anchorMin = new Vec2(0, 1);
                this._anchorMax = new Vec2(1, 1);
                break;
            case AnchorPreset.StretchMiddle:
                this._anchorMin = new Vec2(0, 0.5);
                this._anchorMax = new Vec2(1, 0.5);
                break;
            case AnchorPreset.StretchBottom:
                this._anchorMin = new Vec2(0, 0);
                this._anchorMax = new Vec2(1, 0);
                break;
            case AnchorPreset.StretchLeft:
                this._anchorMin = new Vec2(0, 0);
                this._anchorMax = new Vec2(0, 1);
                break;
            case AnchorPreset.StretchCenter:
                this._anchorMin = new Vec2(0.5, 0);
                this._anchorMax = new Vec2(0.5, 1);
                break;
            case AnchorPreset.StretchRight:
                this._anchorMin = new Vec2(1, 0);
                this._anchorMax = new Vec2(1, 1);
                break;
            case AnchorPreset.StretchAll:
                this._anchorMin = new Vec2(0, 0);
                this._anchorMax = new Vec2(1, 1);
                break;
        }
    }
    
    // 设置锚点而不改变位置
    public setAnchor(anchor: Vec2) {
        const position = this.node.position.clone();
        const size = this._uiTransform?.contentSize.clone() || new Size(0, 0);
        
        this._anchorMin = anchor.clone();
        this._anchorMax = anchor.clone();
        
        this.updateRect();
        
        // 恢复位置
        this.node.position = position;
        
        // 调整偏移以保持位置
        if (this._uiTransform) {
            this._uiTransform.setContentSize(size);
        }
    }
    
    // 设置拉伸锚点
    public setStretchAnchor(min: Vec2, max: Vec2) {
        const position = this.node.position.clone();
        const size = this._uiTransform?.contentSize.clone() || new Size(0, 0);
        
        this._anchorMin = min;
        this._anchorMax = max;
        
        this.updateRect();
        
        // 恢复位置
        this.node.position = position;
        
        // 调整偏移以保持大小
        if (this._uiTransform) {
            this._uiTransform.setContentSize(size);
        }
    }
    
    // 获取锚点位置
    public getAnchoredPosition(): Vec3 {
        const parentSize = this.getParentSize();
        const x = (this._anchorMin.x + this._anchorMax.x) / 2 * parentSize.width + this._offsetMin.x;
        const y = (this._anchorMin.y + this._anchorMax.y) / 2 * parentSize.height + this._offsetMin.y;
        return new Vec3(x, y, 0);
    }
    
    // 设置锚点位置
    public setAnchoredPosition(position: Vec3) {
        const parentSize = this.getParentSize();
        const centerX = (this._anchorMin.x + this._anchorMax.x) / 2;
        const centerY = (this._anchorMin.y + this._anchorMax.y) / 2;
        
        this._offsetMin.x = position.x - centerX * parentSize.width;
        this._offsetMin.y = position.y - centerY * parentSize.height;
        
        // 同时更新offsetMax以保持尺寸
        const width = this._uiTransform?.contentSize.width || 0;
        const height = this._uiTransform?.contentSize.height || 0;
        this._offsetMax.x = this._offsetMin.x + width;
        this._offsetMax.y = this._offsetMin.y + height;
        
        this.markDirty();
    }
    
    // 获取父容器尺寸
    private getParentSize(): Size {
        if (this._parentRect && this._parentRect.uiTransform) {
            return this._parentRect.uiTransform.contentSize;
        } else if (this.node.parent) {
            const parentUITransform = this.node.parent.getComponent(UITransform);
            if (parentUITransform) {
                return parentUITransform.contentSize;
            }
        }
        return view.getVisibleSize();
    }
    
    // 强制立即更新
    public forceUpdate() {
        this.updateRect();
    }
}