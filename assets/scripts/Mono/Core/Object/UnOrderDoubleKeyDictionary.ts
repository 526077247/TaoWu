export class UnOrderDoubleKeyDictionary<T, M, N> implements Iterable<[T, Map<M, N>]>   {
    private readonly _data: Map<T, Map<M, N>> = new Map();

    // 清空字典中所有数据
    clear(): void {
        this._data.clear();
    }

    // 新增：根据一级键获取对应的二级字典
    get(t: T): Map<M, N> | undefined {
        return this._data.get(t);
    }

    tryGetDic(t: T): [boolean, Map<M, N> | undefined] {
        const dic = this._data.get(t);
        return [dic !== undefined, dic];
    }

    tryGetValue(t: T, m: M): [boolean, N | undefined] {
        const dic = this._data.get(t);
        if (!dic) return [false, undefined];
        const n = dic.get(m);
        return [n !== undefined, n];
    }

    add(t: T, m: M, n: N): void {
        let innerMap = this._data.get(t);
        if (!innerMap) {
            innerMap = new Map<M, N>();
            this._data.set(t, innerMap);
        }
        innerMap.set(m, n);
    }

    remove(t: T, m?: M): boolean {
        const innerMap = this._data.get(t);
        if (!innerMap) return false;
        
        if(m !== undefined)
        {
            const removed = innerMap.delete(m);
            if (removed && innerMap.size === 0) {
                this._data.delete(t);
            }
            return removed;
        }
        else
        {
            this._data.delete(t);
            return true;
        }
    }

    containSubKey(t: T, m: M): boolean {
        const innerMap = this._data.get(t);
        return innerMap?.has(m) ?? false;
    }

    containValue(t: T, m: M, n: N): boolean {
        const innerMap = this._data.get(t);
        return innerMap?.get(m) === n;
    }

    // 实现迭代器接口 Iterable<[T, Map<M, N>]>
    [Symbol.iterator](): Iterator<[T, Map<M, N>]> {
        const iterator = this._data.entries();
        
        return {
            next: (): IteratorResult<[T, Map<M, N>]> => {
                const result = iterator.next();
                if (result.done) {
                    return { value: undefined, done: true };
                }
                return {
                    value: result.value as [T, Map<M, N>],
                    done: false
                };
            }
        };
    }

    // 获取所有内部字典
    values(): MapIterator<Map<M, N>> {
        return this._data.values();
    }

    // 获取所有一级键 
    keys(): MapIterator<T>{
       return this._data.keys();
    }

    // 获取一级键的数量
    get size(): number {
        return this._data.size;
    }
}