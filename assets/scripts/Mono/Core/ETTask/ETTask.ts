// 枚举定义
enum AwaiterStatus {
    Pending,
    Succeeded,
    Faulted
}

// 异常处理类
class ExceptionDispatchInfo {
    private constructor(private readonly exception: any) {}

    static capture(exception: any): ExceptionDispatchInfo {
        return new ExceptionDispatchInfo(exception);
    }

    throw(): void {
        throw this.exception;
    }
}

// 基础任务类
abstract class BaseETTask {
    static ExceptionHandler?: (error: any) => void;

    protected state: AwaiterStatus = AwaiterStatus.Pending;
    protected callback: any = null;
    protected fromPool: boolean = false;

    abstract recycle(): void;

    get isCompleted(): boolean {
        return this.state !== AwaiterStatus.Pending;
    }

    unsafeOnCompleted(action: () => void): void {
        if (this.state !== AwaiterStatus.Pending) {
            action?.();
            return;
        }
        this.callback = action;
    }

    onCompleted(action: () => void): void {
        this.unsafeOnCompleted(action);
    }
}

export class ETTask<T = void> extends BaseETTask implements PromiseLike<T> {
    private static readonly queue: ETTask<any>[] = [];

    static create<T = void>(fromPool: boolean = false): ETTask<T> {
        if (!fromPool) {
            return new ETTask<T>();
        }

        if (this.queue.length === 0) {
            const task = new ETTask<T>();
            task.fromPool = true;
            return task;
        }

        return this.queue.shift()! as ETTask<T>;
    }

    private value: T | null = null;
    constructor() {
        super();
    }

    recycle(): void {
        if (!this.fromPool) return;

        this.state = AwaiterStatus.Pending;
        this.callback = null;
        this.value = null;


        if (ETTask.queue.length < 1000) {
            ETTask.queue.push(this);
        }
    }

    getAwaiter(): this {
        return this;
    }

    getResult(): T {
        switch (this.state) {
            case AwaiterStatus.Succeeded:
                const v = this.value;
                this.recycle();
                return v!;
            case AwaiterStatus.Faulted:
                const c = this.callback as ExceptionDispatchInfo;
                this.callback = null;
                this.recycle();
                c?.throw();
                throw new Error("Unreachable code");
            default:
                throw new Error("ETTask does not allow call GetResult directly when task not completed");
        }
    }

    setResult(result?: T): void {
        if (this.state !== AwaiterStatus.Pending) {
            throw new Error("Task already completed");
        }

        this.state = AwaiterStatus.Succeeded;
        this.value = result !== undefined ? result : null as any;
        const action = this.callback as (() => void) | null;
        this.callback = null;
        action?.();
    }

    setException(e: any): void {
        if (this.state !== AwaiterStatus.Pending) {
            throw new Error("Task already completed");
        }

        this.state = AwaiterStatus.Faulted;
        const action = this.callback as (() => void) | null;
        this.callback = ExceptionDispatchInfo.capture(e);
        action?.();

        if (!action && ETTask.ExceptionHandler) {
            ETTask.ExceptionHandler(e);
        }
    }

    // 实现 PromiseLike 接口
    then<TResult1 = T, TResult2 = never>(
        onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined
    ): PromiseLike<TResult1 | TResult2> {
        return new Promise<T>((resolve, reject) => {
            this.unsafeOnCompleted(() => {
                try {
                    const result = this.getResult();
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
        }).then(onfulfilled, onrejected);
    }
    
    readonly [Symbol.toStringTag]: string = "ETTask";
}

// 使用示例
// async function main() {
//     // 设置全局异常处理器
//     ETTask.ExceptionHandler = (error) => {
//         console.error("Unhandled task exception:", error);
//     };
//
//     // 创建并完成一个任务
//     const task1 = ETTask.create();
//     setTimeout(() => {
//         task1.setResult();
//     }, 100);
//     await task1;
//     console.log("Task 1 completed");
//
//     // 创建带返回值的任务
//     const task2 = ETTask.create<string>();
//     setTimeout(() => {
//         task2.setResult("Hello World");
//     }, 100);
//     const result = await task2;
//     console.log("Task 2 result:", result);
//
//     // 异常处理
//     const task3 = ETTask.create();
//     setTimeout(() => {
//         try {
//             throw new Error("Task failed");
//         } catch (e) {
//             task3.setException(e);
//         }
//     }, 100);
//
//     try {
//         await task3;
//     } catch (e) {
//         console.error("Task 3 error:", e);
//     }
//
//     // 对象池测试
//     const task4 = ETTask.create(true);
//     setTimeout(() => {
//         task4.setResult();
//     }, 50);
//     await task4;
//     console.log("Task 4 completed (from pool)");
//
//     const task5 = ETTask.create(true);
//     console.log("Task 5 reused:", task4 === task5);
// }
//
// // 运行示例
// main().catch(e => console.error("Main error:", e));