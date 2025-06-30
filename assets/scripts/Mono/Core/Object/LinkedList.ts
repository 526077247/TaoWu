// 节点类
export class Node<T>
{
    constructor(
        public value: T,
        public prev: Node<T> | null = null,
        public next: Node<T> | null = null
    ) {}
}

// 链表类
export class LinkedList<T> implements Iterable<T>
{
    // 实现迭代器接口
    [Symbol.iterator](): Iterator<T> {
        let current = this.head;
        return {
            next: (): IteratorResult<T> => {
                if (current) {
                    const value = current.value;
                    current = current.next;
                    return { value, done: false };
                } else {
                    return { value: undefined, done: true };
                }
            }
        };
    }
    
    private head: Node<T> | null = null;
    private tail: Node<T> | null = null;
    private _size: number = 0;

    public get first(): Node<T> | null {
        return this.head;
    }

    public get last(): Node<T> | null {
        return this.tail;
    }

    // 获取链表长度
    get size(): number {
        return this._size;
    }

    // 在链表末尾添加元素
    addLast(value: T): Node<T> {
        const newNode = new Node(value);
        
        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            newNode.prev = this.tail;
            this.tail!.next = newNode;
            this.tail = newNode;
        }
        
        this._size++;
        return newNode;
    }

    // 在链表头部添加元素
    addFirst(value: T): Node<T> {
        const newNode = new Node(value);
        
        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            newNode.next = this.head;
            this.head.prev = newNode;
            this.head = newNode;
        }
        
        this._size++;
        return newNode;
    }

    // 删除头部元素并返回其值
    removeFirst(): T | null {
        if (!this.head) return null;
        
        const deletedNode = this.head;
        this.head = this.head.next;
        
        if (this.head) {
            this.head.prev = null;
        } else {
            this.tail = null;
        }
        
        this._size--;
        return deletedNode.value;
    }

    // 删除尾部元素并返回其值
    removeLast(): T | null {
        if (!this.tail) return null;
        
        const deletedNode = this.tail;
        this.tail = this.tail.prev;
        
        if (this.tail) {
            this.tail.next = null;
        } else {
            this.head = null;
        }
        
        this._size--;
        return deletedNode.value;
    }

    // 移除指定节点（按值匹配）
    remove(value: T): boolean {
        let current = this.head;
        
        while (current) {
            if (current.value === value) {
                this.removeNode(current);
                return true;
            }
            current = current.next;
        }
        
        return false;
    }
    
    // 新增：通过节点引用移除节点
    removeNode(node: Node<T>): void {
        if (node === this.head) {
            this.removeFirst();
            return;
        }
        
        if (node === this.tail) {
            this.removeLast();
            return;
        }
        
        // 更新前后节点指针
        if (node.prev) {
            node.prev.next = node.next;
        }
        
        if (node.next) {
            node.next.prev = node.prev;
        }
        
        // 清理引用
        node.prev = null;
        node.next = null;
        
        this._size--;
    }
    
    // 将链表转换为数组
    toArray(): T[] {
        const result: T[] = [];
        let current = this.head;
        
        while (current) {
            result.push(current.value);
            current = current.next;
        }
        
        return result;
    }

    // 清空链表
    clear(): void {
        // 清理所有节点的引用，帮助GC
        let current = this.head;
        while (current) {
            const next = current.next;
            current.prev = null;
            current.next = null;
            current = next;
        }
        
        this.head = null;
        this.tail = null;
        this._size = 0;
    }

    contains(val: T): boolean {

        for (let node = this.head; !!node; node = node.next) {
            if(node.value == val){
                return true;
            }
        }
        return false;
    }
}