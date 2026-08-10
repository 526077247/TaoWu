import { DynamicAtlasManager, _decorator, Component, director, view, ResolutionPolicy,macro, js } from 'cc';
import { ETTask } from '../ThirdParty/ETTask/ETTask';
import { ManagerProvider } from './Core/Manager/ManagerProvider';
const { ccclass, property } = _decorator;
import type { Entry } from '../Code/Entry';
import { Log } from './Module/Log/Log';
import { TimeInfo } from './Module/Timer/TimeInfo';
import { ConsoleLog } from './Module/Log/ConsoleLog';
import { BundleManager } from './Module/Resource/BundleManager';

macro.CLEANUP_IMAGE_CACHE = false;
DynamicAtlasManager.instance.enabled = true;
DynamicAtlasManager.instance.maxFrameSize = 512;

@ccclass('Init')
export class Init extends Component {

    async start() 
    {
        Log.logger = new ConsoleLog();
        Log.info("-------------------------TaoWu------------------------------");
        // 设置全局异常处理器
        ETTask.ExceptionHandler = (error) => {
            Log.error("Unhandled task exception:", error);
        };
        TimeInfo.instance.timeZone = TimeInfo.getUtcOffsetHours();
        view.setResolutionPolicy(ResolutionPolicy.SHOW_ALL)
        director.addPersistRootNode(this.node)

        
        const bm = ManagerProvider.registerManager(BundleManager);
        await bm.loadLocalManifest();

        // 加载 Code bundle，使其中脚本注册到 Cocos 类注册表
        await bm.loadBundle("code");

        // 动态获取 Entry 类并启动
        const EntryClass = js.getClassByName("Entry") as typeof Entry;
        EntryClass.start();
    }

    update(deltaTime: number)
    {
        try
        {
            ManagerProvider.update();
        }
        catch(e: any)
        {
            Log.error(e);
        }
    }

    lateUpdate(deltaTime: number)
    {
        try
        {
            ManagerProvider.lateUpdate();
        }
        catch(e: any)
        {
            Log.error(e);
        }
    }
}


