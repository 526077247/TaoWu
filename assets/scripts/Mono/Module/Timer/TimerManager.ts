import { _decorator } from 'cc';
import { IManager } from "../../Core/Manager/IManager";
import { MultiMap } from "../../Core/Object/MultiMap";
import { Queue } from "../../Core/Object/Queue";
import { IUpdate } from "../Update/IUpdate"
import { Log } from "../Log/Log";
import { ETTask } from "../../../ThirdParty/ETTask/ETTask";
import { ETCancellationToken } from "../../../ThirdParty/ETTask/ETCancellationToken";
import { TimeInfo } from "./TimeInfo"
import { Define } from "../../Define"
import { ObjectPool } from '../../Core/ObjectPool';
import { IdGenerater } from '../../Core/Object/IdGenerater';

export enum TimerClass
{
    None,
    OnceTimer,
    OnceWaitTimer,
    RepeatedTimer,
}
class TimerAction
{
    public timerClass:TimerClass;

    public type: number;
    public object: any | ETTask<boolean>;
    public time: number;
    public func: () => void;
    public id: bigint;
    public static create(timerClass:TimerClass, type:number, time:number, func:() => void, object: any | ETTask<boolean>):TimerAction
    {
        var res = ObjectPool.instance.fetch<TimerAction>(TimerAction);
        res.timerClass = timerClass;
        res.object = object;
        res.func = func;
        res.time = time;
        res.type = type;
        res.id = IdGenerater.instance.generateId();
        return res;
    }

    public dispose()
    {
        this.id = null;
        this.object = null;
        this.time = 0;
        this.timerClass = TimerClass.None;
        this.func = null;
        this.type = 0 ;
        ObjectPool.instance.recycle(this);
    }
}

export class TimerManager implements IManager,IUpdate {
    private static _instance: TimerManager;
    public static get instance(): TimerManager {
        return TimerManager._instance;
    }

    protected childs: Map<bigint, TimerAction> = new Map<bigint, TimerAction>();
    /// <summary>
    /// key: time, value: timer id
    /// </summary>
    protected readonly timeId: MultiMap<number, bigint> = new MultiMap<number, bigint>();

    protected readonly timeOutTime: Queue<number> = new Queue<number>();

    protected readonly timeOutTimerIds: Queue<bigint> = new Queue<bigint>();

    protected readonly everyFrameTimer: Queue<bigint> = new Queue<bigint>();

    // 记录最小时间，不用每次都去MultiMap取第一个值
    protected minTime: number;


    public init() {
        TimerManager._instance = this;
    }

    public destroy() {
        TimerManager._instance = null;
        for (const [key, value] of this.childs) {
            value.dispose();
        }
        this.childs.clear();
        this.timeId.clear();
        this.timeOutTime.clear();
        this.timeOutTimerIds.clear();
        this.everyFrameTimer.clear();
    }

    public update() {
        // 每帧执行的timer，不用foreach TimeId，减少GC
        const count = this.everyFrameTimer.count;
        for (let i = 0; i < count; ++i) {
            const timerId = this.everyFrameTimer.dequeue();
            const timerAction = this.getChild(timerId);
            if (timerAction == null) {
                continue;
            }

            this.run(timerAction);
        }
        if (this.timeId.count == 0) {
            return;
        }

        var timeNow = this.getTimeNow();

        if (timeNow < this.minTime) {
            return;
        }

        for (var [key, val] of this.timeId) {
            if (key > timeNow) {
                this.minTime = key;
                break;
            }

            this.timeOutTime.enqueue(key);
        }

        while (this.timeOutTime.count > 0) {
            const time = this.timeOutTime.dequeue();
            var list = this.timeId.get(time);
            for (let i = 0; i < list.length; ++i) {
                const timerId = list[i];
                this.timeOutTimerIds.enqueue(timerId);
            }

            this.timeId.remove(time);
        }

        while (this.timeOutTimerIds.count > 0) {
            const timerId = this.timeOutTimerIds.dequeue();

            const timerAction = this.getChild(timerId);
            if (timerAction == null) {
                continue;
            }

            this.run(timerAction);
        }
    }


    protected run(timerAction: TimerAction) {
        switch (timerAction.timerClass) {
            case TimerClass.OnceTimer: {
                var type = timerAction.type;
                let timer = timerAction.func;
                if (timer == null) {
                    Log.error(`"not found timer action: ${type}`);
                    return;
                }
                let obj = timerAction.object;
                this.remove(timerAction.id);
                timer.call(obj);
                break;
            }
            case TimerClass.OnceWaitTimer: {
                var tcs = timerAction.object as ETTask<boolean>;
                this.remove(timerAction.id);
                tcs.setResult(true);
                break;
            }
            case TimerClass.RepeatedTimer: {
                var type = timerAction.type;
                var tillTime = this.getTimeNow() + timerAction.time;
                this.addTimer(tillTime, timerAction);

                var timer = timerAction.func;
                if (timer == null) {
                    Log.error(`not found timer action: ${type}`);
                    return;
                }
                timer.call(timerAction.object);
                break;
            }
        }
    }

    private addTimer(tillTime: number, timer: TimerAction) {
        if (timer.timerClass == TimerClass.RepeatedTimer && timer.time == 0) {
            this.everyFrameTimer.enqueue(timer.id);
            return;
        }
        this.timeId.add(tillTime, timer.id);
        if (tillTime < this.minTime) {
            this.minTime = tillTime;
        }
    }


    public remove(id: bigint): boolean {
        if (id == null || id == BigInt(0)) {
            return false;
        }

        var timerAction = this.getChild(id);
        if (timerAction == null) {
            return false;
        }

        this.removeChild(id);
        return true;
    }

    public async waitTillAsync(tillTime: number, cancellationToken: ETCancellationToken | null = null): Promise<boolean> {
        if (this.getTimeNow() >= tillTime) {
            return true;
        }

        const tcs = ETTask.create<boolean>(true);
        const timer = this.addChild(TimerClass.OnceWaitTimer, tillTime - this.getTimeNow(), 0, null, tcs);
        this.addTimer(tillTime, timer);
        const timerId = timer.id;

        const CancelAction = () => {
            if (this.remove(timerId)) {
                tcs.setResult(false);
            }
        }

        let ret;
        try {
            cancellationToken?.add(CancelAction);
            ret = await tcs;
        } catch (ex) {
            ret = false;
            Log.error(ex);
        } finally {
            cancellationToken?.remove(CancelAction);
        }
        return ret;
    }

    public async waitFrameAsync(cancellationToken: ETCancellationToken | null = null): Promise<boolean> {
        var ret = await this.waitAsync(1, cancellationToken);
        return ret;
    }

    public async waitAsync(time: number, cancellationToken: ETCancellationToken | null = null): Promise<boolean> {
        if (time === 0) {
            return true;
        }

        const tillTime = this.getTimeNow() + time;
        const tcs = ETTask.create<boolean>(true);

        const timer = this.addChild(TimerClass.OnceWaitTimer, time, 0, null, tcs);

        this.addTimer(tillTime, timer);
        const timerId = timer.id;

        const cancelAction = () => {
            if (this.remove(timerId)) {
                tcs.setResult(false);
            }
        };

        let ret: boolean;
        try {
            cancellationToken?.add(cancelAction);
            ret = await tcs;
        } catch (ex) {
            ret = false;
            Log.error(ex);
        } finally {
            // 移除取消回调
            cancellationToken?.remove(cancelAction);
        }

        return ret;
    }

    public newOnceTimer(tillTime: number, type: number, func: () => void, target: any): bigint {
        if (tillTime < this.getTimeNow()) {
            Log.warning(`"new once time too small: ${tillTime}`);
        }
        const timer = this.addChild(TimerClass.OnceTimer, tillTime, type, func, target);
        this.addTimer(tillTime, timer);
        return timer.id;
    }

    public newFrameTimer(type: number, func: () => void, target: any): bigint {
        return this.newRepeatedTimerInner(0, type, func, target);
    }

    /**
     * 创建一个RepeatedTimer
     * @param time 
     * @param type 
     * @param func 
     * @param target 
     * @returns 
     */
    private newRepeatedTimerInner(time: number, type: number, func: () => void, target: any): bigint {
        const tillTime = this.getTimeNow() + time;
        const timer = this.addChild(TimerClass.RepeatedTimer, time, type, func, target);

        // 每帧执行的不用加到timerId中，防止遍历
        this.addTimer(tillTime, timer);
        return timer.id;
    }

    public newRepeatedTimer(time: number, type: number, func: () => void, target: any): bigint {
        if (time < Define.MinRepeatedTimerInterval) {
            Log.error(`time too small: ${time}`);
            return BigInt(0);
        }
        return this.newRepeatedTimer(time, type, func, target);
    }

    public addChild(timerClass: TimerClass, time: number, type: number, func: () => void, target: any): TimerAction {
        let timer = TimerAction.create(timerClass, type, time, func, target);
        this.childs.set(timer.id, timer);
        return timer;
    }


    public getChild(id: bigint): TimerAction {
        return this.childs.get(id);
    }

    public removeChild(id: bigint) {
        var timer = this.getChild(id);
        if (timer != null) {
            this.childs.delete(id);
            timer.dispose();
        }
    }

    public getTimeNow(): number {
        return TimeInfo.instance.serverNow();
    }
}