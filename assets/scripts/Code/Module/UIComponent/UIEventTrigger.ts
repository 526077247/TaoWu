import { _decorator, Component, Node, EventTouch, Input, input, macro, EventMouse } from 'cc';
import { UIBaseContainer } from "../UI/UIBaseContainer";
import { IOnDestroy } from '../UI/IOnDestroy';
import { IOnCreate } from '../UI/IOnCreate';

// 事件回调类型

// 事件类型枚举
export enum EventTriggerType {
    PointerEnter = 'pointer-enter',
    PointerExit = 'pointer-exit',
    PointerDown = 'pointer-down',
    PointerMove = 'pointer-move',
    PointerUp = 'pointer-up',
    PointerClick = 'pointer-click',
    Drag = 'drag',
    Drop = 'drop',
    Scroll = 'scroll',
    InitializePotentialDrag = 'initialize-potential-drag',
    BeginDrag = 'begin-drag',
    EndDrag = 'end-drag'
}

export class UIEventTrigger extends UIBaseContainer implements IOnDestroy, IOnCreate{
    protected getConstructor(){
        return UIEventTrigger;
    }

    private _events: Map<EventTriggerType, ((evt: any) => void)[]> = new Map();
    private _isDragging: boolean = false;
    private _dragStartPos: { x: number, y: number } = { x: 0, y: 0 };
    private _dragThreshold: number = 5; // 拖拽阈值

    /**
     * 设置事件监听器
     */
    private setupEventListeners(): void {
        // 初始化事件映射
        const eventTypes = [
            EventTriggerType.PointerEnter,
            EventTriggerType.PointerExit,
            EventTriggerType.PointerDown,
            EventTriggerType.PointerUp,
            EventTriggerType.PointerClick,
            EventTriggerType.Drag,
            EventTriggerType.Drop,
            EventTriggerType.Scroll,
            EventTriggerType.InitializePotentialDrag,
            EventTriggerType.BeginDrag,
            EventTriggerType.EndDrag
        ];
        
        eventTypes.forEach(type => {
            this._events.set(type, []);
        });
    }

     /**
     * 注册事件监听器
     */
    private registerEventListeners(): void {
        const node = this.getNode();
        if(!node) return;
        node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        node.on(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
        node.on(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
        
        // 滚轮事件
        input.on(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
    }

    /**
     * 取消注册事件监听器
     */
    private unregisterEventListeners(): void {
        const node = this.getNode()
        if(!node) return;
        node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        node.off(Node.EventType.MOUSE_ENTER, this.onMouseEnter, this);
        node.off(Node.EventType.MOUSE_LEAVE, this.onMouseLeave, this);
        
        input.off(Input.EventType.MOUSE_WHEEL, this.onMouseWheel, this);
    }

    public onCreate(){
        this.setupEventListeners();
        this.registerEventListeners();
    }

    public onDestroy() {
        this.unregisterEventListeners();
        this._events.clear();
    }

     // 事件处理函数
    private onTouchStart(event: EventTouch): void {
        this.triggerEvent(EventTriggerType.PointerDown, event);
        this.triggerEvent(EventTriggerType.InitializePotentialDrag, event);
        
        // 记录拖拽开始位置
        this._dragStartPos = event.getLocation();
        this._isDragging = false;
    }

    private onTouchMove(event: EventTouch): void {
        // 检查是否开始拖拽
        if (!this._isDragging) {
            const currentPos = event.getLocation();
            const deltaX = Math.abs(currentPos.x - this._dragStartPos.x);
            const deltaY = Math.abs(currentPos.y - this._dragStartPos.y);
            
            if (deltaX > this._dragThreshold || deltaY > this._dragThreshold) {
                this._isDragging = true;
                this.triggerEvent(EventTriggerType.BeginDrag, event);
            }
        }
        
        if (this._isDragging) {
            this.triggerEvent(EventTriggerType.Drag, event);
        }
        
        this.triggerEvent(EventTriggerType.PointerMove, event);
    }

    private onTouchEnd(event: EventTouch): void {
        this.triggerEvent(EventTriggerType.PointerUp, event);
        
        // 检查点击事件
        const currentPos = event.getLocation();
        const deltaX = Math.abs(currentPos.x - this._dragStartPos.x);
        const deltaY = Math.abs(currentPos.y - this._dragStartPos.y);
        
        if (deltaX <= this._dragThreshold && deltaY <= this._dragThreshold) {
            this.triggerEvent(EventTriggerType.PointerClick, event);
        }
        
        // 处理拖拽结束
        if (this._isDragging) {
            this.triggerEvent(EventTriggerType.Drop, event);
            this.triggerEvent(EventTriggerType.EndDrag, event);
            this._isDragging = false;
        }
    }

    private onTouchCancel(event: EventTouch): void {
        this.triggerEvent(EventTriggerType.PointerUp, event);
        
        if (this._isDragging) {
            this.triggerEvent(EventTriggerType.EndDrag, event);
            this._isDragging = false;
        }
    }

    private onMouseEnter(event: EventTouch): void {
        this.triggerEvent(EventTriggerType.PointerEnter, event);
    }

    private onMouseLeave(event: EventTouch): void {
        this.triggerEvent(EventTriggerType.PointerExit, event);
    }

    private onMouseWheel(event: EventMouse): void {
        this.triggerEvent(EventTriggerType.Scroll, event);
    }

    /**
     * 触发指定类型的所有事件
     */
    private triggerEvent(eventType: EventTriggerType, event: EventTouch|EventMouse): void {
        const callbacks = this._events.get(eventType);
        if (callbacks && callbacks.length > 0) {
            callbacks.forEach(callback => {
                try {
                    callback(event);
                } catch (error) {
                    console.error(`Error executing ${eventType} callback:`, error);
                }
            });
        }
    }

    /**
     * 添加事件监听
     */
    public addEvent(triggerType: EventTriggerType, callback: (evt:any) => void): void {
        const callbacks = this._events.get(triggerType);
        if (callbacks) {
            if (!callbacks.includes(callback)) {
                callbacks.push(callback);
            }
        } else {
            console.warn(`Unknown event type: ${triggerType}`);
        }
    }

    /**
     * 移除事件监听
     */
    public removeEvent(triggerType: EventTriggerType, callback?: (evt:any) => void): void {
        const callbacks = this._events.get(triggerType);
        if (callbacks) {
            if (callback) {
                const index = callbacks.indexOf(callback);
                if (index !== -1) {
                    callbacks.splice(index, 1);
                }
            } else {
                // 移除该类型的所有回调
                callbacks.length = 0;
            }
        }
    }

    public addOnPointerEnter(callback: (event: EventTouch) => void): void {
        this.addEvent(EventTriggerType.PointerEnter, callback);
    }
    
    public addOnPointerExit(callback: (event: EventTouch) => void): void {
        this.addEvent(EventTriggerType.PointerExit, callback);
    }
    
    public addOnDrag(callback: (event: EventTouch) => void): void {
        this.addEvent(EventTriggerType.Drag, callback);
    }
    
    public addOnDrop(callback: (event: EventTouch) => void): void {
        this.addEvent(EventTriggerType.Drop, callback);
    }
    
    public addOnPointerDown(callback: (event: EventTouch) => void): void {
        this.addEvent(EventTriggerType.PointerDown, callback);
    }
    
    public addOnPointerUp(callback: (event: EventTouch) => void): void {
        this.addEvent(EventTriggerType.PointerUp, callback);
    }
    
    public addOnPointerClick(callback: (event: EventTouch) => void): void {
        this.addEvent(EventTriggerType.PointerClick, callback);
    }

    public addOnScroll(callback: (evt:EventMouse) => void): void {
        this.addEvent(EventTriggerType.Scroll, callback);
    }
    
    public addOnInitializePotentialDrag(callback: (event: EventTouch) => void): void {
        this.addEvent(EventTriggerType.InitializePotentialDrag, callback);
    }
    
    public addOnBeginDrag(callback: (event: EventTouch) => void): void {
        this.addEvent(EventTriggerType.BeginDrag, callback);
    }
    
    public addOnEndDrag(callback: (event: EventTouch) => void): void {
        this.addEvent(EventTriggerType.EndDrag, callback);
    }
    
    public removeOnPointerEnter(callback?: (event: EventTouch) => void): void {
        this.removeEvent(EventTriggerType.PointerEnter, callback);
    }
    
    public removeOnPointerExit(callback?: (event: EventTouch) => void): void {
        this.removeEvent(EventTriggerType.PointerExit, callback);
    }
    
    public removeOnDrag(callback?: (event: EventTouch) => void): void {
        this.removeEvent(EventTriggerType.Drag, callback);
    }
    
    public removeOnDrop(callback?: (event: EventTouch) => void): void {
        this.removeEvent(EventTriggerType.Drop, callback);
    }
    
    public removeOnPointerDown(callback?: (event: EventTouch) => void): void {
        this.removeEvent(EventTriggerType.PointerDown, callback);
    }
    
    public removeOnPointerUp(callback?: (event: EventTouch) => void): void {
        this.removeEvent(EventTriggerType.PointerUp, callback);
    }
    
    public removeOnPointerClick(callback?: (event: EventTouch) => void): void {
        this.removeEvent(EventTriggerType.PointerClick, callback);
    }
    
    public removeOnScroll(callback?: (evt:EventMouse) => void): void {
        this.removeEvent(EventTriggerType.Scroll, callback);
    }
    
    public removeOnInitializePotentialDrag(callback?: (event: EventTouch) => void): void {
        this.removeEvent(EventTriggerType.InitializePotentialDrag, callback);
    }
    
    public removeOnBeginDrag(callback?: (event: EventTouch) => void): void {
        this.removeEvent(EventTriggerType.BeginDrag, callback);
    }
    
    public removeOnEndDrag(callback?: (event: EventTouch) => void): void {
        this.removeEvent(EventTriggerType.EndDrag, callback);
    }

    /**
     * 清空所有事件
     */
    public clearAllEvents(): void {
        this._events.forEach((callbacks) => {
            callbacks.length = 0;
        });
    }
}