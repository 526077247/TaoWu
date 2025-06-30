import { ObjectPool } from "../ObjectPool";


export class HashSetComponent<T> extends Set<T>
{
    public static create<T>(): HashSetComponent<T> 
    {
        return ObjectPool.instance.fetch<HashSetComponent<T>>(HashSetComponent<T>);
    }

    public dispose()
    {
        this.clear();
        ObjectPool.instance.recycle(this);
    }
}