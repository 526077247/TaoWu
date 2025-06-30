import { ETTask } from "../../../Mono/Core/ETTask/ETTask";
import { IManager } from "../../../Mono/Core/Manager/IManager";
import { IdGenerater } from "../../../Mono/Core/Object/IdGenerater";
import { MultiMap } from "../../../Mono/Core/Object/MultiMap";
import { Queue } from "../../../Mono/Core/Object/Queue";
import { ObjectPool } from "../../../Mono/Core/ObjectPool";
import { Log } from "../../../Mono/Module/Log/Log";
import { TimeInfo } from "../../../Mono/Module/Timer/TimeInfo";
import { IUpdate } from "../../../Mono/Module/Update/IUpdate";
import { CoroutineLockInfo, CoroutineLockQueue } from "./CoroutineLockQueue";
import { CoroutineLockQueueType } from "./CoroutineLockQueueType";
import { CoroutineLockTimer } from "./CoroutineLockTimer";
import { CoroutineLockType } from "./CoroutineLockType";

export class CoroutineLock{
    public coroutineLockType: number;
    public key: bigint;
    public level: number;
    public InstanceId: bigint;

    public static create(type: number,  k: bigint,  count: number): CoroutineLock
    {
        var res = ObjectPool.instance.fetch<CoroutineLock>(CoroutineLock);
        res.coroutineLockType = type;
        res.key = k;
        res.level = count;
        res.InstanceId = IdGenerater.instance.generateInstanceId();
        return res;
    }

    public dispose()
    {
        if (this.coroutineLockType != CoroutineLockType.None)
        {
            CoroutineLockManager.instance.runNextCoroutine(this.coroutineLockType, this.key, this.level + 1);
        }
        else
        {
            // CoroutineLockType.None说明协程锁超时了
            Log.error(`coroutine lock timeout: ${this.coroutineLockType} ${this.key} ${this.level}`);
        }
        this.coroutineLockType = CoroutineLockType.None;
        this.key = 0n;
        this.level = 0;
        ObjectPool.instance.recycle(this);
    }
}
export class CoroutineLockManager implements IManager, IUpdate{
    private static _instance: CoroutineLockManager;

    public static get instance(): CoroutineLockManager {
        return CoroutineLockManager._instance;
    }

    private list: CoroutineLockQueueType[];
    private nextFrameRun:Queue<[number, bigint, number]>  = new Queue<[number, bigint, number]>();
    private timers:MultiMap<number, CoroutineLockTimer>  = new MultiMap<number, CoroutineLockTimer>();
    private timeOutIds:Queue<number>  = new Queue<number>();
    private timerOutTimer: Queue<CoroutineLockTimer> = new Queue<CoroutineLockTimer>();
    private minTime: number;
    private timeNow: number;

    public init() {
        CoroutineLockManager._instance = this;
        this.list = [];
        for (let i = 0; i < CoroutineLockType.Max; ++i)
        {
            const coroutineLockQueueType: CoroutineLockQueueType = CoroutineLockQueueType.create();
            this.list[i] = coroutineLockQueueType;
        }
    }
    public destroy() {
        CoroutineLockManager._instance = null;
        for (let i = 0; i < this.list.length; i++)
        {
            this.list[i].dispose();
        }
        this.list = null
        this.nextFrameRun.clear();
        this.timers.clear();
        this.timeOutIds.clear();
        this.timerOutTimer.clear();
        this.minTime = 0;
    }

    public update() {
        // 检测超时的CoroutineLock
        this.timeoutCheck();

        // 循环过程中会有对象继续加入队列
        while (this.nextFrameRun.count > 0)
        {
            const item = this.nextFrameRun.dequeue();
            this.notify(item);
        }
    }

    private timeoutCheck()
    {
        // 超时的锁
        if (this.timers.count == 0)
        {
            return;
        }

        this.timeNow = TimeInfo.instance.clientFrameTime();

        if (this.timeNow < this.minTime)
        {
            return;
        }

        for (const [key,value] of this.timers) {
            if (key > this.timeNow)
            {
                this.minTime = key;
                break;
            }

            this.timeOutIds.enqueue(key);
        }
       

        this.timerOutTimer.clear();

        while (this.timeOutIds.count > 0)
        {
            const time = this.timeOutIds.dequeue();
            var list = this.timers[time];
            for (let i = 0; i < list.Count; ++i)
            {
                const coroutineLockTimer:CoroutineLockTimer = list[i];
                this.timerOutTimer.enqueue(coroutineLockTimer);
            }

            this.timers.remove(time);
        }

        while (this.timerOutTimer.count > 0)
        {
            const coroutineLockTimer:CoroutineLockTimer = this.timerOutTimer.dequeue();
            if (coroutineLockTimer.coroutineLockInstanceId != coroutineLockTimer.coroutineLock.InstanceId)
            {
                continue;
            }

            const coroutineLock:CoroutineLock = coroutineLockTimer.coroutineLock;
            // 超时直接调用下一个锁
            this.runNextCoroutine(coroutineLock.coroutineLockType, coroutineLock.key, coroutineLock.level + 1);
            coroutineLock.coroutineLockType = CoroutineLockType.None; // 上面调用了下一个, dispose不再调用
        }
    }

    public runNextCoroutine(coroutineLockType:number, key: bigint, level:number)
    {
        // 一个协程队列一帧处理超过100个,说明比较多了,打个warning,检查一下是否够正常
        if (level == 100)
        {
            Log.warning(`too much coroutine level: ${coroutineLockType} ${key}`);
        }

        this.nextFrameRun.enqueue([coroutineLockType, key, level]);
    }

    private addTimer(tillTime: number, coroutineLock: CoroutineLock)
    {
        this.timers.add(tillTime, new CoroutineLockTimer(coroutineLock));
        if (tillTime < this.minTime)
        {
            this.minTime = tillTime;
        }
    }

    public async wait(coroutineLockType:number, key:bigint, time:number = 60000)
    {
        const coroutineLockQueueType:CoroutineLockQueueType = this.list[coroutineLockType];
        const queue: CoroutineLockQueue = coroutineLockQueueType.get(key);
        if (!queue)
        {
            coroutineLockQueueType.add(key, CoroutineLockQueue.create());
            return this.createCoroutineLock(coroutineLockType, key, time, 1);
        }

        const tcs:ETTask<CoroutineLock> = ETTask.create<CoroutineLock>(true);
        queue.add(tcs, time);
        return await tcs;
    }

    private createCoroutineLock(coroutineLockType:number,  key: bigint, time:number, level:number): CoroutineLock
    {
        const coroutineLock: CoroutineLock = CoroutineLock.create(coroutineLockType, key, level);
        if (time > 0)
        {
            this.addTimer(TimeInfo.instance.clientFrameTime() + time, coroutineLock);
        }

        return coroutineLock;
    }

    private notify(data:[number, bigint, number])
    {
        const coroutineLockType = data[0];
        const key = data[1]; 
        const level = data[2];
        const coroutineLockQueueType:CoroutineLockQueueType = this.list[coroutineLockType];
        const queue: CoroutineLockQueue = coroutineLockQueueType.get(key);
        if (!queue)
        {
            return;
        }

        if (queue.count == 0)
        {
            coroutineLockQueueType.remove(key);
            return;
        }

        const coroutineLockInfo : CoroutineLockInfo = queue.dequeue();
        coroutineLockInfo.tcs.setResult(this.createCoroutineLock(coroutineLockType, key, coroutineLockInfo.time, level));
    }
}