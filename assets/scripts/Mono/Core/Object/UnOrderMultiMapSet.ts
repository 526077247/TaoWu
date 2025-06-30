export class UnOrderMultiMapSet<T, K> {
    private readonly _map: Map<T, Set<K>> = new Map();
    private readonly _emptySet: ReadonlySet<K> = new Set<K>();

    add(t: T, k: K): void {
        let set = this._map.get(t);
        if (!set) {
            set = new Set<K>();
            this._map.set(t, set);
        }
        set.add(k);
    }

    remove(t: T, k: K): boolean {
        const set = this._map.get(t);
        if (!set) {
            return false;
        }

        const removed = set.delete(k);
        if (removed && set.size === 0) {
            this._map.delete(t);
        }
        return removed;
    }

    getAll(t: T): K[] {
        const set = this._map.get(t);
        if (!set) {
            return [];
        }
        return Array.from(set);
    }

    getSet(t: T): ReadonlySet<K> {
        const set = this._map.get(t);
        return set || this._emptySet;
    }

    getOne(t: T): K | undefined {
        const set = this._map.get(t);
        if (set && set.size > 0) {
            return set.values().next().value;
        }
        return undefined;
    }

    contains(t: T, k: K): boolean {
        const set = this._map.get(t);
        return set ? set.has(k) : false;
    }

    // 可选：添加 clear 方法
    clear(): void {
        this._map.clear();
    }

    // 可选：添加获取所有键的方法
    keys(): IterableIterator<T> {
        return this._map.keys();
    }

    // 可选：添加获取所有值的方法
    values(): IterableIterator<Set<K>> {
        return this._map.values();
    }
}