import { _decorator, Component, Node, EventTouch } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ClickEventListener')
export class ClickEventListener extends Component {
    private _clickedHandler: (node: Node) => void = null;
    private _doubleClickedHandler: (node: Node) => void = null;
    private _pointerDownHandler: (node: Node) => void = null;
    private _pointerUpHandler: (node: Node) => void = null;
    private _isPressed: boolean = false;
    private _clickCount: number = 0;
    private _clickTimer: number = null;
    private _doubleClickInterval: number = 0.3; // 双击间隔时间(秒)

    public static get(node: Node): ClickEventListener {
        let listener = node.getComponent(ClickEventListener);
        if (!listener) {
            listener = node.addComponent(ClickEventListener);
        }
        return listener;
    }

    get isPressed(): boolean {
        return this._isPressed;
    }

    onLoad() {
        this.node.on(Node.EventType.TOUCH_START, this._onTouchBegan, this);
        this.node.on(Node.EventType.TOUCH_END, this._onTouchEnded, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._onTouchCancelled, this);
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this._onTouchBegan, this);
        this.node.off(Node.EventType.TOUCH_END, this._onTouchEnded, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this._onTouchCancelled, this);
        
        if (this._clickTimer !== null) {
            clearTimeout(this._clickTimer);
            this._clickTimer = null;
        }
    }

    public setClickEventHandler(handler: (node: Node) => void): void {
        this._clickedHandler = handler;
    }

    public setDoubleClickEventHandler(handler: (node: Node) => void): void {
        this._doubleClickedHandler = handler;
    }

    public setPointerDownHandler(handler: (node: Node) => void): void {
        this._pointerDownHandler = handler;
    }

    public setPointerUpHandler(handler: (node: Node) => void): void {
        this._pointerUpHandler = handler;
    }

    private _onTouchBegan(event: EventTouch): void {
        this._isPressed = true;
        this._pointerDownHandler?.call(null, this.node);
    }

    private _onTouchEnded(event: EventTouch): void {
        this._isPressed = false;
        this._pointerUpHandler?.call(null, this.node);
        
        // 处理点击计数
        this._clickCount++;
        
        if (this._clickCount === 1) {
            this._clickTimer = setTimeout(() => {
                this._clickedHandler?.call(null, this.node);
                this._clickCount = 0;
                this._clickTimer = null;
            }, this._doubleClickInterval * 1000) as unknown as number;
        } else if (this._clickCount === 2) {
            clearTimeout(this._clickTimer);
            this._doubleClickedHandler?.call(null, this.node);
            this._clickCount = 0;
            this._clickTimer = null;
        }
    }

    private _onTouchCancelled(event: EventTouch): void {
        this._isPressed = false;
        this._clickCount = 0;
        if (this._clickTimer !== null) {
            clearTimeout(this._clickTimer);
            this._clickTimer = null;
        }
    }
}