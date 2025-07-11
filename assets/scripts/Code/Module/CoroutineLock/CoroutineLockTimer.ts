import { CoroutineLock } from "./CoroutineLockManager";

export class CoroutineLockTimer{
    public coroutineLock: CoroutineLock;
    public coroutineLockInstanceId: bigint;

    public constructor(coroutineLock: CoroutineLock)
    {
        this.coroutineLock = coroutineLock;
        this.coroutineLockInstanceId = coroutineLock.InstanceId;
    }
}