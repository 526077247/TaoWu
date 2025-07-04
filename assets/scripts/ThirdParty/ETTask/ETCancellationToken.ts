import { ETTask } from "./ETTask"
import { Log } from "../../Mono/Module/Log/Log"
export class ETCancellationToken {
    private actions: Set<() => void> | null = new Set();
    private _isCancellationRequested = false;

    public get isCancellationRequested(): boolean {
        return this._isCancellationRequested;
    }

    // 添加回调函数，若为空则抛出异常
    public add(callback: () => void): void {
        if (callback === null || callback === undefined) {
            throw new Error("Callback cannot be null when adding to CancellationToken");
        }

        // 使用闭包模拟C#的lock机制
        this.synchronized(() => {
            if (this.actions === null) {
                throw new Error("Object is disposed and cannot accept new callbacks");
            }
            this.actions.add(callback);
        });
    }

    // 移除回调函数
    public remove(callback: () => void): void {
        if (callback === null || callback === undefined) return;

        this.synchronized(() => {
            this.actions?.delete(callback);
        });
    }

    // 检查令牌是否已释放
    public isDisposed(): boolean {
        return this.actions === null;
    }

    // 触发取消操作，执行所有回调
    public cancel(): void {
        let actionsToInvoke: Set<() => void> | null = null;

        this.synchronized(() => {
            if (this.actions === null) {
                return;
            }

            this._isCancellationRequested = true;
            actionsToInvoke = this.actions;
            this.actions = null;
        });

        if (actionsToInvoke) {
            this.invokeActions(actionsToInvoke);
        }
    }

    // 执行所有回调并处理异常
    private invokeActions(actions: Set<() => void>): void {
        try {
            actions.forEach(action => {
                action();
            });
        } catch (e) {
            // 假设ETTask.ExceptionHandler在TypeScript中有等效实现
            if (ETTask.ExceptionHandler) {
                ETTask.ExceptionHandler(e);
            } else {
                Log.error("Unhandled exception in cancellation token callbacks:", e);
            }
        }
    }

    // 模拟C#的lock机制
    private synchronized<T>(action: () => T): T {
        return action();
    }
}