import { Log } from "../../Module/Log/Log";

// 事件处理函数类型
type EventHandler<T extends any[]> = (...args: T) => void;

/**
 * 事件类，支持强类型的事件处理函数
 * @template T - 事件处理函数的参数类型
 */
export class Event<T extends any[] = []> {
    // 存储事件处理函数的Set，确保唯一性
    private handlers: Set<EventHandler<T>> = new Set();
    // 存储一次性事件处理函数的Set
    private onceHandlers: Set<EventHandler<T>> = new Set();

    /**
     * 订阅事件
     * @param handler - 事件处理函数
     */
    public subscribe(handler: EventHandler<T>): void {
        this.handlers.add(handler);
    }

    /**
     * 取消订阅事件
     * @param handler - 要移除的事件处理函数
     */
    public unsubscribe(handler: EventHandler<T>): void {
        this.handlers.delete(handler);
        this.onceHandlers.delete(handler);
    }

    /**
     * 订阅一次性事件（触发后自动取消订阅）
     * @param handler - 一次性事件处理函数
     */
    public subscribeOnce(handler: EventHandler<T>): void {
        this.onceHandlers.add(handler);
    }

    /**
     * 触发事件
     * @param args - 事件参数
     */
    public emit(...args: T): void {
        // 调用所有常规处理函数
        this.handlers.forEach(handler => {
            try {
                handler(...args);
            } catch (error) {
                Log.error("Error in event handler:", error);
            }
        });

        // 调用一次性处理函数并清除
        this.onceHandlers.forEach(handler => {
            try {
                handler(...args);
            } catch (error) {
                Log.error("Error in once event handler:", error);
            }
        });
        this.onceHandlers.clear();
    }

    /**
     * 清空所有事件处理函数
     */
    public clear(): void {
        this.handlers.clear();
        this.onceHandlers.clear();
    }

    /**
     * 获取订阅者数量
     */
    public get subscriberCount(): number {
        return this.handlers.size + this.onceHandlers.size;
    }
}