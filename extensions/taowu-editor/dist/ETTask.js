"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ETTask = void 0;
// 枚举定义
var AwaiterStatus;
(function (AwaiterStatus) {
    AwaiterStatus[AwaiterStatus["Pending"] = 0] = "Pending";
    AwaiterStatus[AwaiterStatus["Succeeded"] = 1] = "Succeeded";
    AwaiterStatus[AwaiterStatus["Faulted"] = 2] = "Faulted";
})(AwaiterStatus || (AwaiterStatus = {}));
// 异常处理类
class ExceptionDispatchInfo {
    exception;
    constructor(exception) {
        this.exception = exception;
    }
    static capture(exception) {
        return new ExceptionDispatchInfo(exception);
    }
    throw() {
        throw this.exception;
    }
}
// 基础任务类
class BaseETTask {
    static ExceptionHandler;
    state = AwaiterStatus.Pending;
    callback = null;
    fromPool = false;
    get isCompleted() {
        return this.state !== AwaiterStatus.Pending;
    }
    unsafeOnCompleted(action) {
        if (this.state !== AwaiterStatus.Pending) {
            action?.();
            return;
        }
        this.callback = action;
    }
    onCompleted(action) {
        this.unsafeOnCompleted(action);
    }
}
class ETTask extends BaseETTask {
    static queue = [];
    static create(fromPool = false) {
        if (!fromPool) {
            return new ETTask();
        }
        if (this.queue.length === 0) {
            const task = new ETTask();
            task.fromPool = true;
            return task;
        }
        return this.queue.shift();
    }
    value = null;
    constructor() {
        super();
    }
    recycle() {
        if (!this.fromPool)
            return;
        this.state = AwaiterStatus.Pending;
        this.callback = null;
        this.value = null;
        if (ETTask.queue.length < 1000) {
            ETTask.queue.push(this);
        }
    }
    getAwaiter() {
        return this;
    }
    getResult() {
        switch (this.state) {
            case AwaiterStatus.Succeeded:
                const v = this.value;
                this.recycle();
                return v;
            case AwaiterStatus.Faulted:
                const c = this.callback;
                this.callback = null;
                this.recycle();
                c?.throw();
                throw new Error("Unreachable code");
            default:
                throw new Error("ETTask does not allow call GetResult directly when task not completed");
        }
    }
    setResult(result) {
        if (this.state !== AwaiterStatus.Pending) {
            throw new Error("Task already completed");
        }
        this.state = AwaiterStatus.Succeeded;
        this.value = result !== undefined ? result : null;
        const action = this.callback;
        this.callback = null;
        action?.();
    }
    setException(e) {
        if (this.state !== AwaiterStatus.Pending) {
            throw new Error("Task already completed");
        }
        this.state = AwaiterStatus.Faulted;
        const action = this.callback;
        this.callback = ExceptionDispatchInfo.capture(e);
        action?.();
        if (!action && ETTask.ExceptionHandler) {
            ETTask.ExceptionHandler(e);
        }
    }
    // 实现 PromiseLike 接口
    then(onfulfilled, onrejected) {
        return new Promise((resolve, reject) => {
            this.unsafeOnCompleted(() => {
                try {
                    const result = this.getResult();
                    resolve(result);
                }
                catch (e) {
                    reject(e);
                }
            });
        }).then(onfulfilled, onrejected);
    }
    [Symbol.toStringTag] = "ETTask";
}
exports.ETTask = ETTask;
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
