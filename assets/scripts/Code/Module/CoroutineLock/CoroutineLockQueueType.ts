import { ObjectPool } from "../../../Mono/Core/ObjectPool";
import { CoroutineLockQueue } from "./CoroutineLockQueue";


export class CoroutineLockQueueType{
    private dictionary: Map<bigint, CoroutineLockQueue>
    public static create(): CoroutineLockQueueType {
        var res = ObjectPool.instance.fetch<CoroutineLockQueueType>(CoroutineLockQueueType);
        res.dictionary = new Map<bigint, CoroutineLockQueue>();
        return res;
    }

    public dispose() {
        this.dictionary.clear();
        ObjectPool.instance.recycle(this);
    }

    public get(key: bigint): CoroutineLockQueue
    {
        return this.dictionary.get(key);
    }

    public remove(key: bigint) {
        const value = this.get(key);
        if(!!value){
            value.dispose();
            this.dictionary.delete(key);
        }
    }
    
    public add(key: bigint, value: CoroutineLockQueue)
    {
        this.dictionary.set(key, value);
    }
}