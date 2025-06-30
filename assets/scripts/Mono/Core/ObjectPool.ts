export class ObjectPool
{
    private readonly pool: Map<new (...args: any[]) => any, any[]> = new Map();
    private poolCheck: Set<any> = new Set();

    private static _instance: ObjectPool;
    
    public static get instance(): ObjectPool {
        if (!ObjectPool._instance) {
            ObjectPool._instance = new ObjectPool();
        }
        return ObjectPool._instance;
    }

    // 获取对象（泛型版本）
    public fetch<T extends object>(type: new () => T): T {
        let queue = this.pool.get(type);

        if (!queue || queue.length === 0) {
            return new type();
        }

        const obj = queue.pop() as T;

        if (!this.poolCheck.has(obj)) {
            console.error(`对象池重复取: ${obj}`);
        }

        this.poolCheck.delete(obj);
        return obj;
    }

    // 获取对象（非泛型版本）
    public fetchNonGeneric(type: new (...args: any[]) => any): any {
        let queue = this.pool.get(type);

        if (!queue || queue.length === 0) {
            return new type();
        }

        const obj = queue.pop();

        if (!this.poolCheck.has(obj)) {
            console.error(`对象池重复取: ${obj}`);
        }

        this.poolCheck.delete(obj);
        return obj;
    }

    // 回收对象
    public recycle(obj: any): void {
        const type = obj.constructor;
        let queue = this.pool.get(type);

        if (!queue) {
            queue = [];
            this.pool.set(type, queue);
        }

        queue.push(obj);

        if (this.poolCheck.has(obj)) {
            console.error(`对象池重复回收: ${obj}`);
        }

        this.poolCheck.add(obj);
    }

    // 清空对象池
    public dispose(): void {
        this.pool.clear();
        this.poolCheck.clear();
    }
}