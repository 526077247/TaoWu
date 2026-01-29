import { EventTouch, Node, ScrollView, Vec2 } from "cc";
import { Log } from "../../../Mono/Module/Log/Log";

import { LoopListView2, LoopListViewInitParam } from "../../../ThirdParty/SuperScrollView/ListView/LoopListView2";
import { LoopListViewItem2 } from "../../../ThirdParty/SuperScrollView/ListView/LoopListViewItem2";
import { I18NManager } from "../I18N/I18NManager";
import { IOnDestroy } from "../UI/IOnDestroy";
import { UIBaseContainer } from "../UI/UIBaseContainer";

export class UILoopListView2 extends UIBaseContainer implements IOnDestroy{
    public getConstructor(){
        return UILoopListView2;
    }
    private loopListView: LoopListView2;

    public onDestroy()
    {
        if (this.loopListView != null)
        {
            this.loopListView.clearListView();
            this.loopListView = null;
        }
    }

    private activatingComponent()
    {
        if (this.loopListView == null)
        {
            this.loopListView = this.getNode().getComponent<LoopListView2>(LoopListView2);
            if (this.loopListView == null)
            {
                Log.error(`添加UI侧组件UILoopListView2时，物体${this.getNode().name}上没有找到LoopListView2组件`);
            }
        }
    }

    /**
     * 初始化列表视图
     * @param itemTotalCount 列表项总数
     * @param onGetItemByIndex 获取列表项的回调函数
     * @param initParam 初始化参数
     */
    public initListView(itemTotalCount: number,
        onGetItemByIndex: (list: LoopListView2, index: number) => LoopListViewItem2,
        initParam: LoopListViewInitParam = null): void {
        this.activatingComponent();
        this.loopListView.initListView(itemTotalCount, onGetItemByIndex, initParam);
    }

    /**
     * 为列表项添加UI组件
     * @param item 列表项
     * @returns 添加的UI组件
     */
    public addItemViewComponent<T extends UIBaseContainer>(type: new () => T,item: LoopListViewItem2): T {
        //保证名字不能相同 不然没法cache
        item.node.name = item.node.name + item.itemId;
        const t:T = this.addComponentNotCreate<T>(type, item.node.name);
        t.setNode(item.node);
        const componentAny = t as any;
        if (!!componentAny.onCreate)
            componentAny.onCreate();
        if (this.activeSelf)
            t.setActive(true);
        if (!!componentAny.onLanguageChange)
            I18NManager.instance?.registerI18NEntity(componentAny);
        return t;
    }

    /**
     * 根据列表项获取UI组件
     * @param item 列表项
     * @returns 对应的UI组件
     */
    public getUIItemView<T extends UIBaseContainer>(type: new () => T,item: LoopListViewItem2): T {
        return this.getComponent<T>(type, item.node.name);
    }

    /**
     * 设置列表项数量（注意！无限列表需要修改编译ScrollView引擎源码以支持修改滑动速度,否则滑动惯性会有问题）
     * @param itemCount 列表项数量
     * @param resetPos 是否重置位置
     */
    public setListItemCount(itemCount: number, resetPos: boolean = true): void {
        this.activatingComponent();
        this.loopListView.setListItemCount(itemCount, resetPos);
    }

    /**
     * 获取指定索引的可见列表项
     * @param itemIndex 列表项索引
     * @returns 可见的列表项，如果不存在则返回null
     */
    public getShownItemByItemIndex(itemIndex: number): LoopListViewItem2 {
        this.activatingComponent();
        return this.loopListView.getShownItemByItemIndex(itemIndex);
    }

    /**
     * 刷新所有可见的列表项
     */
    public refreshAllShownItem(): void {
        this.activatingComponent();
        this.loopListView.refreshAllShownItem();
    }

    /**
     * 设置开始拖拽回调
     * @param callback 回调函数
     */
    public setOnBeginDragAction(callback: (event: EventTouch) => void): void {
        this.activatingComponent();
        this.loopListView.onBeginDragAction = callback;
    }

    /**
     * 设置拖拽中回调
     * @param callback 回调函数
     */
    public setOnDragingAction(callback: (event: EventTouch) => void): void {
        this.activatingComponent();
        this.loopListView.onDragingAction = callback;
    }

    /**
     * 设置结束拖拽回调
     * @param callback 回调函数
     */
    public setOnEndDragAction(callback: (event: EventTouch) => void): void {
        this.activatingComponent();
        this.loopListView.onEndDragAction = callback;
    }

    /**
     * 移动面板到指定索引的列表项
     * @param index 列表项索引
     * @param offset 偏移量
     */
    public movePanelToItemIndex(index: number, offset: number = 0): void {
        this.activatingComponent();
        this.loopListView.movePanelToItemIndex(index, offset);
    }

    /**
     * 设置吸附目标列表项索引
     * @param index 列表项索引
     * @param moveMaxAbsVec 最大移动速度
     */
    public setSnapTargetItemIndex(index: number, moveMaxAbsVec: number = -1): void {
        this.activatingComponent();
        this.loopListView.setSnapTargetItemIndex(index, moveMaxAbsVec);
    }

    /**
     * 获取当前吸附目标列表项索引
     * @returns 吸附目标列表项索引
     */
    public getSnapTargetItemIndex(): number {
        this.activatingComponent();
        return this.loopListView.curSnapNearestItemIndex;
    }

    /**
     * 设置吸附最大速度
     * @param maxAbsVec 最大速度
     */
    public setSnapMaxAbsVec(maxAbsVec: number): void {
        this.activatingComponent();
        this.loopListView.snapMoveDefaultMaxAbsVec = maxAbsVec;
    }

    /**
     * 设置吸附变化回调
     * @param callback 回调函数
     */
    public setOnSnapChange(callback: (list: LoopListView2, item: LoopListViewItem2) => void): void {
        this.activatingComponent();
        this.loopListView.onSnapNearestChanged = callback;
    }

    /**
     * 获取循环列表组件
     * @returns 循环列表组件
     */
    public getLoopListView(): LoopListView2 {
        this.activatingComponent();
        return this.loopListView;
    }

    /**
     * 获取滚动组件
     * @returns 滚动组件
     */
    public getScrollView(): ScrollView {
        this.activatingComponent();
        return this.loopListView.scrollRect;
    }

    /**
     * 移除UI项的所有组件
     * @param obj 游戏对象
     */
    public removeUIItemAllComponent(obj: Node): void {
        this.removeAllComponent(obj.name);
    }

    /**
     * 清理资源
     * @param name 名称
     */
    public cleanUp(name: string): void {
        if (!this.loopListView) return;
        this.loopListView.cleanUp(name, this.removeUIItemAllComponent.bind(this));
    }    
}