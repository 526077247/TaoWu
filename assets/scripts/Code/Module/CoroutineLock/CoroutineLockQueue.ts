import { ETTask } from "../../../ThirdParty/ETTask/ETTask";
import { Queue } from "../../../Mono/Core/Object/Queue";
import { ObjectPool } from "../../../Mono/Core/ObjectPool";
import { CoroutineLock } from "./CoroutineLock";

export class CoroutineLockInfo{
    constructor(tcs: ETTask<CoroutineLock>,time: number)
    {
        this.tcs = tcs;
        this.time = time;
    }
    public tcs: ETTask<CoroutineLock>;
    public time: number;
}

export class CoroutineLockQueue{
    queue: Queue<CoroutineLockInfo> = new Queue<CoroutineLockInfo>

    public get count()
    {
        return this.queue.count;
    }

    public static create(): CoroutineLockQueue
    {
        return ObjectPool.instance.fetch<CoroutineLockQueue>(CoroutineLockQueue);
    }

    public dispose()
    {
        this.queue.clear();
        ObjectPool.instance.recycle(this);
    }

    public add(tcs: ETTask<CoroutineLock>, time: number)
    {
        this.queue.enqueue(new CoroutineLockInfo(tcs,time));
    }
    
    public dequeue(): CoroutineLockInfo
    {
        return this.queue.dequeue();
    }
}