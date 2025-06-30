export class Queue<T> implements Iterable<T> {
    private items: T[] = [];

    // 入队操作 - 将元素添加到队列尾部
    public enqueue(item: T): void {
        this.items.push(item);
    }

    // 出队操作 - 移除并返回队列头部元素
    public dequeue(): T | undefined {
        if (this.isEmpty()) {
            return undefined;
        }
        return this.items.shift();
    }

    // 查看队列头部元素但不移除
    public peek(): T | undefined {
        if (this.isEmpty()) {
            return undefined;
        }
        return this.items[0];
    }

    // 获取队列中元素的数量
    public get count(): number {
        return this.items.length;
    }

    // 检查队列是否为空
    public isEmpty(): boolean {
        return this.items.length === 0;
    }

    // 清空队列
    public clear(): void {
        this.items = [];
    }

    // 检查元素是否存在于队列中
    public contains(item: T): boolean {
        return this.items.includes(item);
    }

    // 将队列转换为数组（按出队顺序）
    public toArray(): T[] {
        return [...this.items];
    }

    // 实现迭代器接口，支持for...of循环
    [Symbol.iterator](): Iterator<T> {
        let index = 0;
        const items = this.items;

        return {
            next(): IteratorResult<T> {
                if (index < items.length) {
                    return { value: items[index++], done: false };
                } else {
                    return { value: undefined, done: true };
                }
            }
        };
    }
}