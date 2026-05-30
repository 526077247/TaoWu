import { Log } from "../../Module/Log/Log";

// 事件处理函数类型
type EventHandler<T extends any[]> = (...args: T) => void;

/**
 * 事件类，支持自动绑定 this，强类型参数
 * @template T - 事件处理函数的参数类型
 */
export class Event<T extends any[] = []> {
    // 存储普通订阅：{ handler, boundHandler, thisArg }
    private subscriptions: Array<{
        handler: EventHandler<T>;
        boundHandler: EventHandler<T>;
        thisArg?: any;
    }> = [];
    // 存储一次性订阅
    private onceSubscriptions: Array<{
        handler: EventHandler<T>;
        boundHandler: EventHandler<T>;
        thisArg?: any;
    }> = [];

    /**
     * 订阅事件（自动处理 this 绑定）
     * @param handler - 事件处理函数
     * @param thisArg - 函数运行时的 this 上下文（可选）
     * @returns 返回一个取消订阅的函数，便于手动移除
     */
    public subscribe(handler: EventHandler<T>, thisArg?: any): () => void {
        const boundHandler = thisArg ? handler.bind(thisArg) : handler;
        const sub = { handler, boundHandler, thisArg };
        this.subscriptions.push(sub);
        // 返回取消订阅函数
        return () => this.unsubscribe(handler, thisArg);
    }

    /**
     * 取消订阅
     * @param handler - 原事件处理函数（与 subscribe 时传入的相同）
     * @param thisArg - 订阅时传入的 thisArg（必须一致才能正确取消）
     */
    public unsubscribe(handler: EventHandler<T>, thisArg?: any): void {
        const filter = (sub: any) => !(sub.handler === handler && sub.thisArg === thisArg);
        this.subscriptions = this.subscriptions.filter(filter);
        this.onceSubscriptions = this.onceSubscriptions.filter(filter);
    }

    /**
     * 订阅一次性事件（自动处理 this 绑定）
     * @param handler - 一次性事件处理函数
     * @param thisArg - 函数运行时的 this 上下文（可选）
     * @returns 返回一个取消订阅的函数
     */
    public subscribeOnce(handler: EventHandler<T>, thisArg?: any): () => void {
        const boundHandler = thisArg ? handler.bind(thisArg) : handler;
        const sub = { handler, boundHandler, thisArg };
        this.onceSubscriptions.push(sub);
        return () => this.unsubscribe(handler, thisArg);
    }

    /**
     * 触发事件
     * @param args - 事件参数
     */
    public emit(...args: T): void {
        // 触发普通订阅
        for (const sub of this.subscriptions) {
            try {
                sub.boundHandler(...args);
            } catch (error) {
                Log.error("Error in event handler:", error);
            }
        }

        // 触发一次性订阅（触发后清除）
        if (this.onceSubscriptions.length) {
            const onceCopy = [...this.onceSubscriptions];
            this.onceSubscriptions = [];
            for (const sub of onceCopy) {
                try {
                    sub.boundHandler(...args);
                } catch (error) {
                    Log.error("Error in once event handler:", error);
                }
            }
        }
    }

    /**
     * 清空所有事件处理函数
     */
    public clear(): void {
        this.subscriptions = [];
        this.onceSubscriptions = [];
    }

    /**
     * 获取订阅者总数（普通 + 一次性）
     */
    public get subscriberCount(): number {
        return this.subscriptions.length + this.onceSubscriptions.length;
    }
}