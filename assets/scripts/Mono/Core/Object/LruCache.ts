import { LinkedList } from "./LinkedList";

/**
 * LRU 缓存实现
 */
export class LruCache<TKey, TValue> implements Iterable<[TKey, TValue]> {
    private static readonly DEFAULT_capacity = 255;

    private _capacity: number;
    private dictionary: Map<TKey, TValue>;
    private linkedList: LinkedList<TKey>;
    private checkCanPopFunc: ((key: TKey, value: TValue) => boolean) | null = null;
    private popCb: ((key: TKey, value: TValue) => void) | null = null;

    constructor(_capacity: number = LruCache.DEFAULT_capacity) {
        this._capacity = Math.max(1, _capacity);
        this.dictionary = new Map<TKey, TValue>();
        this.linkedList = new LinkedList<TKey>();
    }

    public setCheckCanPopCallback(func: (key: TKey, value: TValue) => boolean): void {
        this.checkCanPopFunc = func;
    }

    public setPopCallback(func: (key: TKey, value: TValue) => void): void {
        this.popCb = func;
    }

    public set(key: TKey, value: TValue): void {
        if(!!this.checkCanPopFunc)
            this.makeFreeSpace();
        this.dictionary.set(key,value);
        this.linkedList.remove(key);
        this.linkedList.addFirst(key);
        if ( this.checkCanPopFunc==null&& this.linkedList.size > this._capacity)
        {
            const last = this.linkedList.removeLast();
            this.dictionary.delete(last);
            
        }
    }

    public remove(key: TKey) {
        this.dictionary.delete(key);
        this.linkedList.remove(key);
    }

    public onlyGet(key: TKey): TValue | null {
        return this.dictionary.get(key);
    }

    public get(key: TKey): TValue | null {
        const node = this.dictionary.get(key);
        if (!node) return null;

        // 移动到头部
        this.linkedList.remove(key);
        this.linkedList.addFirst(key);
        
        return node;
    }

    public containsKey(key: TKey): boolean {
        return this.dictionary.has(key);
    }

    public get count(): number {
        return this.dictionary.size;
    }

    public get capacity(): number {
        return this._capacity;
    }

    public set capacity(value: number) {
        if (value <= 0) return;
        
        this._capacity = value;
        while (this.linkedList.size > this._capacity) {
            this.linkedList.removeLast();
        }
    }

    public get keys(): IterableIterator<TKey> {
        return this.dictionary.keys();
    }

    public get values(): IterableIterator<TValue> {
        return this.dictionary.values();
    }

    /**
     * 深拷贝Keys
     * @returns 
     */
    public getKeys(): TKey[] {
        const result = [];
        for (const [key, node] of this.dictionary) {
            result[result.length] = key;
        }
        return result;
    }


    private makeFreeSpace(): void {
        let key = this.linkedList.last;
        const maxCheckFreeTimes = 10;
        let curCheckFreeTime = 0;

        while (this.linkedList.size + 1 > this._capacity) {
            if (!key) break;

            const prevNode = key.prev;
        
            if (!this.checkCanPopFunc || this.checkCanPopFunc(key.value, this.dictionary.get(key.value))) {
                //can pop
                const value = this.dictionary.get(key.value);
                this.linkedList.remove(key.value);
                this.dictionary.delete(key.value);
                this.popCb?.(key.value, value);
            } else {
                curCheckFreeTime++;
                if (curCheckFreeTime > maxCheckFreeTimes) {
                    break;
                }
            }

            key = prevNode;
        }
    }

    public cleanUp(): void {
        let key = this.linkedList.last;
        let count = this.linkedList.size;

        while (count > 0) {
            count--;
            if (!key) continue;

            const prevNode = key.prev;

            if (!this.checkCanPopFunc || this.checkCanPopFunc(key.value, this.dictionary.get(key.value))) {
                //can pop
                const value = this.dictionary.get(key.value);
                this.linkedList.remove(key.value);
                this.dictionary.delete(key.value);
                this.popCb?.(key.value, value);
            }

            key = prevNode;
        }
    }

    public clear(): void {
        this.dictionary.clear();
        this.linkedList.clear();
    }

    public *[Symbol.iterator](): IterableIterator<[TKey, TValue]> {
        for (const key of this.keys) {
            const value = this.dictionary.get(key);
            if (value) {
                yield [key, value];
            }
        }
    }
}
