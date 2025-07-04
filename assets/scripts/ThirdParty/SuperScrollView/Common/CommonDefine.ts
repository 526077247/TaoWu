export enum SnapStatus {
    NoTargetSet = 0,
    TargetHasSet = 1,
    SnapMoving = 2,
    SnapMoveFinish = 3
}

export enum ItemCornerEnum {
    LeftBottom = 0,
    LeftTop = 1,
    RightTop = 2,
    RightBottom = 3
}

export enum ListItemArrangeType {
    TopToBottom = 0,
    BottomToTop = 1,
    LeftToRight = 2,
    RightToLeft = 3
}

export enum GridItemArrangeType {
    TopLeftToBottomRight = 0,
    BottomLeftToTopRight = 1,
    TopRightToBottomLeft = 2,
    BottomRightToTopLeft = 3
}

export enum GridFixedType {
    ColumnCountFixed = 0,
    RowCountFixed = 1
}

export class RowColumnPair {
    constructor(
        public mRow: number = 0,
        public mColumn: number = 0,
    ) {}

    equals(other: RowColumnPair): boolean {
        return this.mRow === other.mRow && this.mColumn === other.mColumn;
    }

    static equals(a: RowColumnPair, b: RowColumnPair): boolean {
        return a.mRow === b.mRow && a.mColumn === b.mColumn;
    }

    static notEquals(a: RowColumnPair, b: RowColumnPair): boolean {
        return a.mRow !== b.mRow || a.mColumn !== b.mColumn;
    }
}