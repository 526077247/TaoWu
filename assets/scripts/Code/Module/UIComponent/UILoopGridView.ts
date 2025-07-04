import { EventTouch, Node, Vec2 } from "cc";
import { Log } from "../../../Mono/Module/Log/Log";
import { LoopGridView, LoopGridViewInitParam, LoopGridViewSettingParam } from "../../../ThirdParty/SuperScrollView/GridView/LoopGridView";
import { LoopGridViewItem } from "../../../ThirdParty/SuperScrollView/GridView/LoopGridViewItem";
import { I18NManager } from "../I18N/I18NManager";
import { IOnDestroy } from "../UI/IOnDestroy";
import { UIBaseContainer } from "../UI/UIBaseContainer";

export class UILoopGridView extends UIBaseContainer implements IOnDestroy{
    protected getConstructor(){
        return UILoopGridView;
    }
    private loopGridView: LoopGridView;

    public onDestroy()
    {
        if (this.loopGridView != null)
        {
            this.loopGridView.clearListView();
            this.loopGridView = null;
        }
    }

    private activatingComponent()
    {
        if (this.loopGridView == null)
        {
            this.loopGridView = this.getNode().getComponent<LoopGridView>(LoopGridView);
            if (this.loopGridView == null)
            {
                Log.error(`添加UI侧组件UILoopGridView时，物体${this.getNode().name}上没有找到LoopGridView组件`);
            }
        }
    }

    /**
     * 初始化网格视图
     * @param itemTotalCount 
     * @param onGetItemByRowColumn 
     * @param settingParam 
     * @param initParam 
     */
    public initGridView(
        itemTotalCount: number,
        onGetItemByRowColumn: (gridView: LoopGridView, itemIndex: number, row: number, column: number) => LoopGridViewItem | null,
        settingParam?: LoopGridViewSettingParam,
        initParam?: LoopGridViewInitParam
    ): void {
        this.activatingComponent();
        if (this.loopGridView) {
            this.loopGridView.initGridView(itemTotalCount, onGetItemByRowColumn, settingParam, initParam);
        }
    }

    /**
     * item是Cocos侧的item对象，在这里创建相应的UI对象
     * @param type 
     * @param item 
     * @returns 
     */
    public addItemViewComponent<T extends UIBaseContainer>(type: new () => T,item: LoopGridViewItem)
    {
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
     * 根据Cocos侧item获取UI侧的item
     * @param type 
     * @param item 
     * @returns 
     */
    public getUIItemView<T extends UIBaseContainer>(type: new () => T, item: LoopGridViewItem):T 
    {
        return this.getComponent<T>(type, item.node.name);
    }

    /**
     * 设置列表项目数量
     * @param itemCount 
     * @param resetPos 
     */
    public setListItemCount(itemCount: number, resetPos: boolean = true): void {
        this.activatingComponent();
        if (this.loopGridView) {
            this.loopGridView.setListItemCount(itemCount, resetPos);
        }
    }

    /**
     * 获取显示的项目
     * @param itemIndex 
     * @returns 
     */
    public getShownItemByItemIndex(itemIndex: number): LoopGridViewItem | null {
        this.activatingComponent();
        return this.loopGridView ? this.loopGridView.getShownItemByItemIndex(itemIndex) : null;
    }

    /**
     * 移动面板到指定行列
     * @param row 
     * @param column 
     * @param offsetX 
     * @param offsetY 
     */
    public movePanelToItemByRowColumn(row: number, column: number, offsetX: number = 0, offsetY: number = 0): void {
        this.activatingComponent();
        if (this.loopGridView) {
            this.loopGridView.movePanelToItemByRowColumn(row, column, offsetX, offsetY);
        }
    }

    /**
     * 刷新所有显示的项目
     */
    public refreshAllShownItem(): void {
        this.activatingComponent();
        if (this.loopGridView) {
            this.loopGridView.refreshAllShownItem();
        }
    }

    /**
     * 设置项目尺寸
     * @param sizeDelta 
     */
    public setItemSize(sizeDelta: Vec2): void {
        this.activatingComponent();
        if (this.loopGridView) {
            this.loopGridView.itemSize = sizeDelta;
        }
    }

    /**
     * 设置开始拖动事件
     * @param callback 
     */
    public setOnBeginDragAction(callback: (event: EventTouch) => void): void {
        this.activatingComponent();
        if (this.loopGridView) {
            this.loopGridView.mOnBeginDragAction = callback;
        }
    }

    /**
     * 设置拖动中事件
     * @param callback 
     */
    public setOnDragingAction(callback: (event: EventTouch) => void): void {
        this.activatingComponent();
        if (this.loopGridView) {
            this.loopGridView.mOnDragingAction = callback;
        }
    }

    /**
     * 设置结束拖动事件
     * @param callback 
     */
    public setOnEndDragAction(callback: (event: EventTouch) => void): void {
        this.activatingComponent();
        if (this.loopGridView) {
            this.loopGridView.mOnEndDragAction = callback;
        }
    }
    
    /**
     * 移除UI项目所有组件
     * @param node 
     */
    public removeUIItemAllComponent(node: Node): void {
        this.removeAllComponent(node.name);
    }
                        
    /**
     * 清理资源
     * @param name 
     * @returns 
     */
    public cleanUp(name: string): void {
        if (!this.loopGridView) return;
        this.loopGridView.cleanUp(name, this.removeUIItemAllComponent.bind(this));
    }
}