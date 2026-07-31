/** TaoWu Inspector 属性元数据 */
export interface ITaoWuPropertyMeta {
    foldoutGroup?: string;
    tabGroup?: string;
    tabName?: string;
    boxGroup?: string;
    horizontalGroup?: string;
    showIf?: string;
    hideIf?: string;
    enableIf?: string;
    disableIf?: string;
    labelText?: string;
    readOnly?: boolean;
    title?: string;
    titleHorizontalLine?: boolean;
    infoBox?: { message: string; type: 'info' | 'warning' | 'error' };
    propertyOrder?: number;
    onValueChanged?: string;
    onCollectionChanged?: string;
    button?: { name?: string };
    range?: { min: number; max: number };
    textarea?: boolean;
    color?: boolean;
    tableList?: boolean;
}

export interface ITaoWuClassMeta {
    [propertyKey: string]: ITaoWuPropertyMeta;
}
