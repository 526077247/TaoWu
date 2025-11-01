import { DynamicAtlasManager, _decorator, Component, director, view, ResolutionPolicy,macro } from 'cc';
import { ETTask } from '../ThirdParty/ETTask/ETTask';
import { ManagerProvider } from './Core/Manager/ManagerProvider';
const { ccclass, property } = _decorator;
import { Entry } from '../Code/Entry';
import { Log } from './Module/Log/Log';
import { TimeInfo } from './Module/Timer/TimeInfo';
import { ConsoleLog } from './Module/Log/ConsoleLog';

macro.CLEANUP_IMAGE_CACHE = false;
DynamicAtlasManager.instance.enabled = true;
DynamicAtlasManager.instance.maxFrameSize = 512;

@ccclass('Init')
export class Init extends Component {

    start() 
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
        Entry.start();
    }

    update(deltaTime: number)
    {
        try
        {
            ManagerProvider.update();
        }
        catch(e)
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
        catch(e)
        {
            Log.error(e);
        }
    }
}


