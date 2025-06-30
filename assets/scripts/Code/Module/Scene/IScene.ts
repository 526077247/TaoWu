export interface IScene 
{

    getName(): string;

    getScenePath(): string;
    /**
     * 获取各阶段进度比例
     */
    getProgressPercent(): [cleanup:number,loadScene:number,prepare:number];

    getDontDestroyWindow(): string[];
    /**
     * 场景切换中不释放，切换完毕后释放的资源列表
     */
    getScenesChangeIgnoreClean():string[];
    /**
     * 创建：初始化一些需要全局保存的状态
     */
    onCreate(): Promise<void>;

    /**
     * 加载前的初始化
     */
    onEnter(): Promise<void>;

    /**
     * 设置进度
     * @param value 
     */
    setProgress(value: number): Promise<void>;
    /**
     * 场景加载结束：后续资源准备（预加载等）
     * @param float 
     * @param progressStart 
     * @param float 
     * @param progressEnd 
     */
    onPrepare(progressStart: number,progressEnd: number): Promise<void>;

    /**
     * 场景加载完毕
     */
    onComplete(): Promise<void>;
    
    /**
     * 离开场景：清理场景资源
     */
    onLeave(): Promise<void>;

    /**
     * 转场景结束
     */
    onSwitchSceneEnd(): Promise<void>;
}