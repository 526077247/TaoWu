import { TaoWuRegistry } from "./TaoWuRegistry";

function getClassName(target: any): string {
    const ctor = target.constructor;
    return ctor.name || ctor.toString().match(/class\s+(\w+)/)?.[1] || '';
}

/** 折叠分组 */
export function FoldoutGroup(groupPath: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { foldoutGroup: groupPath });
    };
}

/** Tab 标签页分组 */
export function TabGroup(groupName: string, tabName: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { tabGroup: groupName, tabName });
    };
}

/** 盒子分组 */
export function BoxGroup(groupName: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { boxGroup: groupName });
    };
}

/** 水平分组 */
export function HorizontalGroup(groupName: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { horizontalGroup: groupName });
    };
}

/** 当指定属性值为 true 时显示 */
export function ShowIf(conditionProperty: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { showIf: conditionProperty });
    };
}

/** 当指定属性值为 true 时隐藏 */
export function HideIf(conditionProperty: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { hideIf: conditionProperty });
    };
}

/** 当指定属性值为 true 时启用编辑，为 false 时禁用 (属性仍可见但不可编辑) */
export function EnableIf(conditionProperty: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { enableIf: conditionProperty });
    };
}

/** 当指定属性值为 true 时禁用编辑，为 false 时启用 (属性仍可见但不可编辑) */
export function DisableIf(conditionProperty: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { disableIf: conditionProperty });
    };
}

/** 自定义标签文本 */
export function LabelText(text: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { labelText: text });
    };
}

/** 只读 */
export function ReadOnly() {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { readOnly: true });
    };
}

/** 属性排序 */
export function PropertyOrder(order: number) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { propertyOrder: order });
    };
}

/** 数值范围滑块 */
export function PropertyRange(min: number, max: number) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { range: { min, max } });
    };
}

/** 标题 */
export function Title(title: string, horizontalLine: boolean = true) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, {
            title, titleHorizontalLine: horizontalLine
        });
    };
}

/** 信息提示框 */
export function InfoBox(message: string, type: 'info' | 'warning' | 'error' = 'info') {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { infoBox: { message, type } });
    };
}

/** 多行文本 */
export function TextArea() {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { textarea: true });
    };
}

/** 表格列表 */
export function TableList() {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { tableList: true });
    };
}

/** 属性值变化时回调 (类似 Odin OnValueChanged) */
export function OnValueChanged(methodName: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { onValueChanged: methodName });
    };
}

/** 集合变更时回调 (类似 Odin OnCollectionChanged，数组增删时触发) */
export function OnCollectionChanged(methodName: string) {
    return function (target: any, propertyKey: string) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { onCollectionChanged: methodName });
    };
}

/** 在 Inspector 中生成按钮，点击时调用该方法 (类似 Odin Button) */
export function Button(name?: string) {
    return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
        TaoWuRegistry.register(getClassName(target), propertyKey, { button: { name } });
    };
}

/** 值下拉选择 (类似 Odin ValueDropdown)
 * @param values 字符串(方法名/字段名) 或 值数组
 * @param labels 可选标签数组
 */
export function ValueDropdown(values: string | (number | string)[], labels?: string[]) {
    return function (target: any, propertyKey: string) {
        if (typeof values === 'string') {
            TaoWuRegistry.register(getClassName(target), propertyKey, {
                valueDropdown: { memberName: values, labels }
            });
        } else {
            TaoWuRegistry.register(getClassName(target), propertyKey, {
                valueDropdown: { values, labels }
            });
        }
    };
}
