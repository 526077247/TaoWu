export class MultiMap<T extends string | number | bigint, K> implements Iterable<[T, K]> {
    private _map = new Map<T, K[]>();
    private _keys: T[] = [];
    private comparator: (a: T, b: T) => number;
    
    constructor(comparator?: (a: T, b: T) => number) {
        this.comparator = comparator || ((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    }

    public get count(): number {
        return this._map.size;
    }

    public add(t: T, k: K): void {
        let list = this._map.get(t);
        if (!list) {
            list = [];
            this._map.set(t, list);
            this.insertKey(t);
        }
        list.push(k);
    }

    public remove(t: T, k: K | null = null): boolean {
        const list = this._map.get(t);
        if (!list) {
            return false;
        }
        
        if(!k){
            return this._map.delete(t);
        }

        const index = list.indexOf(k);
        if (index === -1) {
            return false;
        }

        list.splice(index, 1);
        if (list.length === 0) {
            this.delete(t);
        }
        return true;
    }

    public delete(t: T): boolean {
        const existed = this._map.delete(t);
        if (existed) {
            const index = this._keys.indexOf(t);
            if (index !== -1) {
                this._keys.splice(index, 1);
            }
        }
        return existed;
    }

    public getAll(t: T): K[] {
        const list = this._map.get(t);
        return list?.slice() ?? [];
    }

    public get(t: T): K[] {
        return this._map.get(t) ?? [];
    }

    public getOne(t: T): K | undefined {
        const list = this.get(t);
        return list.length > 0 ? list[0] : undefined;
    }

    public contains(t: T, k: K): boolean {
        const list = this.get(t);
        return list.includes(k);
    }

    /**
     * 深拷贝
     * @returns 
     */
    public getKeys(): T[] {
        return [...this._keys];
    }

    // 按排序顺序插入键
    private insertKey(key: T): void {
        const index = this.findInsertIndex(key);
        this._keys.splice(index, 0, key);
    }

    // 使用二分查找确定插入位置
    private findInsertIndex(key: T): number {
        let low = 0;
        let high = this._keys.length;

        while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (this.comparator(this._keys[mid], key) < 0) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        return low;
    }

    public clear(){
        this._map.clear();
        this._keys = [];
    }

    // 添加迭代器方法，支持 for...of 循环
    // 返回格式：[key, value] 的元组
    public *[Symbol.iterator](): IterableIterator<[T, K]> {
        for (const key of this._keys) {
            const values = this._map.get(key);
            if (values) {
                for (const value of values) {
                    yield [key, value];
                }
            }
        }
    }

    // 返回键的迭代器
    public keys(): IterableIterator<T> {
        return this._keys[Symbol.iterator]();
    }

    // 返回值的迭代器（按键排序顺序）
    public *values(): IterableIterator<K> {
        for (const key of this._keys) {
            const values = this._map.get(key);
            if (values) {
                yield* values;
            }
        }
    }

    // 返回键值对的迭代器（与默认迭代器相同）
    public *entries(): IterableIterator<[T, K]> {
        yield* this;
    }

    // 对每个键值对执行回调
    public forEach(callback: (value: K, key: T, map: MultiMap<T, K>) => void): void {
        for (const [key, value] of this) {
            callback(value, key, this);
        }
    }
}