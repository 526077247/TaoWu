import { LoopGridViewItem } from "./LoopGridViewItem";

export class GridItemGroup {
    private mCount: number = 0;
    private mGroupIndex: number = -1;
    private mFirst: LoopGridViewItem = null;
    private mLast: LoopGridViewItem = null;

    public get count(): number {
        return this.mCount;
    }

    public get first(): LoopGridViewItem {
        return this.mFirst;
    }

    public get last(): LoopGridViewItem {
        return this.mLast;
    }

    public get groupIndex(): number {
        return this.mGroupIndex;
    }

    public set groupIndex(value: number) {
        this.mGroupIndex = value;
    }

    public getItemByColumn(column: number): LoopGridViewItem {
        let cur: LoopGridViewItem = this.mFirst;
        while (cur != null) {
            if (cur.column == column) {
                return cur;
            }
            cur = cur.nextItem;
        }
        return null;
    }

    public getItemByRow(row: number): LoopGridViewItem {
        let cur: LoopGridViewItem = this.mFirst;
        while (cur != null) {
            if (cur.row == row) {
                return cur;
            }
            cur = cur.nextItem;
        }
        return null;
    }

    public replaceItem(curItem: LoopGridViewItem, newItem: LoopGridViewItem): void {
        newItem.prevItem = curItem.prevItem;
        newItem.nextItem = curItem.nextItem;
        if (newItem.prevItem != null) {
            newItem.prevItem.nextItem = newItem;
        }
        if (newItem.nextItem != null) {
            newItem.nextItem.prevItem = newItem;
        }
        if (this.mFirst == curItem) {
            this.mFirst = newItem;
        }
        if (this.mLast == curItem) {
            this.mLast = newItem;
        }
    }

    public addFirst(newItem: LoopGridViewItem): void {
        newItem.prevItem = null;
        newItem.nextItem = null;
        if (this.mFirst == null) {
            this.mFirst = newItem;
            this.mLast = newItem;
            this.mFirst.prevItem = null;
            this.mFirst.nextItem = null;
            this.mCount++;
        } else {
            this.mFirst.prevItem = newItem;
            newItem.prevItem = null;
            newItem.nextItem = this.mFirst;
            this.mFirst = newItem;
            this.mCount++;
        }
    }

    public addLast(newItem: LoopGridViewItem): void {
        newItem.prevItem = null;
        newItem.nextItem = null;
        if (this.mFirst == null) {
            this.mFirst = newItem;
            this.mLast = newItem;
            this.mFirst.prevItem = null;
            this.mFirst.nextItem = null;
            this.mCount++;
        } else {
            this.mLast.nextItem = newItem;
            newItem.prevItem = this.mLast;
            newItem.nextItem = null;
            this.mLast = newItem;
            this.mCount++;
        }
    }

    public removeFirst(): LoopGridViewItem {
        let ret: LoopGridViewItem = this.mFirst;
        if (this.mFirst == null) {
            return ret;
        }
        if (this.mFirst == this.mLast) {
            this.mFirst = null;
            this.mLast = null;
            --this.mCount;
            return ret;
        }
        this.mFirst = this.mFirst.nextItem;
        this.mFirst.prevItem = null;
        --this.mCount;
        return ret;
    }

    public removeLast(): LoopGridViewItem {
        let ret: LoopGridViewItem = this.mLast;
        if (this.mFirst == null) {
            return ret;
        }
        if (this.mFirst == this.mLast) {
            this.mFirst = null;
            this.mLast = null;
            --this.mCount;
            return ret;
        }
        this.mLast = this.mLast.prevItem;
        this.mLast.nextItem = null;
        --this.mCount;
        return ret;
    }

    public clear(): void {
        let current: LoopGridViewItem = this.mFirst;
        while (current != null) {
            current.prevItem = null;
            current.nextItem = null;
            current = current.nextItem;
        }
        this.mFirst = null;
        this.mLast = null;
        this.mCount = 0;
    }
}