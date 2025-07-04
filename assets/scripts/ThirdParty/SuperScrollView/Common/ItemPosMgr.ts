export class ItemSizeGroup {
    public mItemSizeArray: number[];
    public mItemStartPosArray: number[];
    public mItemCount: number = 0;
    private mDirtyBeginIndex: number;
    public mGroupSize: number = 0;
    public mGroupStartPos: number = 0;
    public mGroupEndPos: number = 0;
    public mGroupIndex: number = 0;
    private mItemDefaultSize: number;
    private mMaxNoZeroIndex: number = 0;

    constructor(index: number, itemDefaultSize: number) {
        this.mGroupIndex = index;
        this.mItemDefaultSize = itemDefaultSize;
        this.mDirtyBeginIndex = ItemPosMgr.mItemMaxCountPerGroup;
        this.mItemSizeArray = new Array(ItemPosMgr.mItemMaxCountPerGroup);
        this.mItemStartPosArray = new Array(ItemPosMgr.mItemMaxCountPerGroup);
        this.init();
    }

    private init(): void {
        if (this.mItemDefaultSize !== 0) {
            for (let i = 0; i < this.mItemSizeArray.length; ++i) {
                this.mItemSizeArray[i] = this.mItemDefaultSize;
            }
        } else {
            this.mItemSizeArray.fill(0);
        }

        this.mItemStartPosArray[0] = 0;
        this.mItemCount = ItemPosMgr.mItemMaxCountPerGroup;
        this.mGroupSize = this.mItemDefaultSize * this.mItemSizeArray.length;
        this.mDirtyBeginIndex = this.mItemDefaultSize !== 0 ? 0 : ItemPosMgr.mItemMaxCountPerGroup;
    }

    public getItemStartPos(index: number): number {
        return this.mGroupStartPos + this.mItemStartPosArray[index];
    }

    public get isDirty(): boolean {
        return this.mDirtyBeginIndex < this.mItemCount;
    }

    public setItemSize(index: number, size: number): number {
        if (index > this.mMaxNoZeroIndex && size > 0) {
            this.mMaxNoZeroIndex = index;
        }
        
        const old = this.mItemSizeArray[index];
        if (old === size) {
            return 0;
        }
        
        this.mItemSizeArray[index] = size;
        if (index < this.mDirtyBeginIndex) {
            this.mDirtyBeginIndex = index;
        }
        
        const ds = size - old;
        this.mGroupSize += ds;
        return ds;
    }

    public setItemCount(count: number): void {
        if (count < this.mMaxNoZeroIndex) {
            this.mMaxNoZeroIndex = count;
        }
        if (this.mItemCount === count) {
            return;
        }
        
        this.mItemCount = count;
        this.recalcGroupSize();
    }

    public recalcGroupSize(): void {
        this.mGroupSize = 0;
        for (let i = 0; i < this.mItemCount; ++i) {
            this.mGroupSize += this.mItemSizeArray[i];
        }
    }

    public getItemIndexByPos(pos: number): number {
        if (this.mItemCount === 0) {
            return -1;
        }
        
        let low = 0;
        let high = this.mItemCount - 1;
        
        // 优化搜索范围
        if (this.mItemDefaultSize === 0) {
            if (this.mMaxNoZeroIndex < 0) {
                this.mMaxNoZeroIndex = 0;
            }
            high = this.mMaxNoZeroIndex;
        }
        
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const startPos = this.mItemStartPosArray[mid];
            const endPos = startPos + this.mItemSizeArray[mid];
            
            if (startPos <= pos && endPos >= pos) {
                return mid;
            } else if (pos > endPos) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return -1;
    }

    public updateAllItemStartPos(): void {
        if (this.mDirtyBeginIndex >= this.mItemCount) {
            return;
        }
        
        const startIndex = this.mDirtyBeginIndex < 1 ? 1 : this.mDirtyBeginIndex;
        for (let i = startIndex; i < this.mItemCount; ++i) {
            this.mItemStartPosArray[i] = this.mItemStartPosArray[i - 1] + this.mItemSizeArray[i - 1];
        }
        this.mDirtyBeginIndex = this.mItemCount;
    }

    public clearOldData(): void {
        for (let i = this.mItemCount; i < ItemPosMgr.mItemMaxCountPerGroup; ++i) {
            this.mItemSizeArray[i] = 0;
        }
    }
}

export class ItemPosMgr {
    public static readonly mItemMaxCountPerGroup: number = 100;
    
    private mItemSizeGroupList: ItemSizeGroup[] = [];
    private mDirtyBeginIndex: number = Number.MAX_SAFE_INTEGER;
    public mTotalSize: number = 0;
    public mItemDefaultSize: number = 20;
    private mMaxNotEmptyGroupIndex: number = 0;

    constructor(itemDefaultSize: number = 20) {
        this.mItemDefaultSize = itemDefaultSize;
    }

    public setItemMaxCount(maxCount: number): void {
        this.mDirtyBeginIndex = 0;
        this.mTotalSize = 0;
        
        const st = maxCount % ItemPosMgr.mItemMaxCountPerGroup;
        let lastGroupItemCount = st;
        let needMaxGroupCount = Math.floor(maxCount / ItemPosMgr.mItemMaxCountPerGroup);
        
        if (st > 0) {
            needMaxGroupCount++;
        } else {
            lastGroupItemCount = ItemPosMgr.mItemMaxCountPerGroup;
        }
        
        const currentGroupCount = this.mItemSizeGroupList.length;
        
        // 调整组数量
        if (currentGroupCount > needMaxGroupCount) {
            this.mItemSizeGroupList.splice(needMaxGroupCount, currentGroupCount - needMaxGroupCount);
        } else if (currentGroupCount < needMaxGroupCount) {
            if (currentGroupCount > 0) {
                this.mItemSizeGroupList[currentGroupCount - 1].clearOldData();
            }
            
            for (let i = currentGroupCount; i < needMaxGroupCount; ++i) {
                this.mItemSizeGroupList.push(new ItemSizeGroup(i, this.mItemDefaultSize));
            }
        } else {
            if (currentGroupCount > 0) {
                this.mItemSizeGroupList[currentGroupCount - 1].clearOldData();
            }
        }
        
        // 更新最大非空组索引
        const newGroupCount = this.mItemSizeGroupList.length;
        this.mMaxNotEmptyGroupIndex = Math.min(this.mMaxNotEmptyGroupIndex, newGroupCount - 1);
        if (this.mMaxNotEmptyGroupIndex < 0 && newGroupCount > 0) {
            this.mMaxNotEmptyGroupIndex = 0;
        }
        
        // 设置每组项目数量
        for (let i = 0; i < newGroupCount - 1; ++i) {
            this.mItemSizeGroupList[i].setItemCount(ItemPosMgr.mItemMaxCountPerGroup);
        }
        if (newGroupCount > 0) {
            this.mItemSizeGroupList[newGroupCount - 1].setItemCount(lastGroupItemCount);
        }
        
        // 计算总大小
        for (let i = 0; i < newGroupCount; ++i) {
            this.mTotalSize += this.mItemSizeGroupList[i].mGroupSize;
        }
    }

    public setItemSize(itemIndex: number, size: number): void {
        const groupIndex = Math.floor(itemIndex / ItemPosMgr.mItemMaxCountPerGroup);
        const indexInGroup = itemIndex % ItemPosMgr.mItemMaxCountPerGroup;
        
        const group = this.mItemSizeGroupList[groupIndex];
        const changedSize = group.setItemSize(indexInGroup, size);
        
        if (changedSize !== 0) {
            if (groupIndex < this.mDirtyBeginIndex) {
                this.mDirtyBeginIndex = groupIndex;
            }
        }
        
        this.mTotalSize += changedSize;
        
        if (groupIndex > this.mMaxNotEmptyGroupIndex && size > 0) {
            this.mMaxNotEmptyGroupIndex = groupIndex;
        }
    }

    public getItemPos(itemIndex: number): number {
        this.update(true);
        
        const groupIndex = Math.floor(itemIndex / ItemPosMgr.mItemMaxCountPerGroup);
        const indexInGroup = itemIndex % ItemPosMgr.mItemMaxCountPerGroup;
        
        return this.mItemSizeGroupList[groupIndex].getItemStartPos(indexInGroup);
    }

    public getItemIndexAndPosAtGivenPos(pos: number): { index: number; itemPos: number } | null {
        this.update(true);
        
        if (this.mItemSizeGroupList.length === 0) {
            return null;
        }
        
        let hitGroup: ItemSizeGroup | null = null;
        let low = 0;
        let high = this.mItemSizeGroupList.length - 1;
        
        // 优化搜索范围
        if (this.mItemDefaultSize === 0) {
            if (this.mMaxNotEmptyGroupIndex < 0) {
                this.mMaxNotEmptyGroupIndex = 0;
            }
            high = this.mMaxNotEmptyGroupIndex;
        }
        
        // 二分查找命中组
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const group = this.mItemSizeGroupList[mid];
            
            if (group.mGroupStartPos <= pos && group.mGroupEndPos >= pos) {
                hitGroup = group;
                break;
            } else if (pos > group.mGroupEndPos) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        
        if (!hitGroup) {
            return null;
        }
        
        // 在组内查找项目
        const groupLocalPos = pos - hitGroup.mGroupStartPos;
        const hitIndex = hitGroup.getItemIndexByPos(groupLocalPos);
        
        if (hitIndex < 0) {
            return null;
        }
        
        const index = hitIndex + hitGroup.mGroupIndex * ItemPosMgr.mItemMaxCountPerGroup;
        const itemPos = hitGroup.getItemStartPos(hitIndex);
        
        return { index, itemPos };
    }

    public update(updateAll: boolean): void {
        const groupCount = this.mItemSizeGroupList.length;
        if (groupCount === 0 || this.mDirtyBeginIndex >= groupCount) {
            return;
        }
        
        let loopCount = 0;
        for (let i = this.mDirtyBeginIndex; i < groupCount; ++i) {
            loopCount++;
            
            const group = this.mItemSizeGroupList[i];
            group.updateAllItemStartPos();
            
            // 更新组的起始和结束位置
            if (i === 0) {
                group.mGroupStartPos = 0;
                group.mGroupEndPos = group.mGroupSize;
            } else {
                group.mGroupStartPos = this.mItemSizeGroupList[i - 1].mGroupEndPos;
                group.mGroupEndPos = group.mGroupStartPos + group.mGroupSize;
            }
            
            if (!updateAll && loopCount > 1) {
                break;
            }
        }
        
        // 重置脏标记
        this.mDirtyBeginIndex = groupCount;
    }
}