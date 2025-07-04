import { _decorator, Component, Node, director, Canvas, find } from 'cc';
import { ETTask } from '../ThirdParty/ETTask/ETTask';
import { ManagerProvider } from './Core/Manager/ManagerProvider';
const { ccclass, property } = _decorator;
import { Entry } from '../Code/Entry';
import { CCCLog } from './Module/Log/CCCLog';
import { Log } from './Module/Log/Log';
import { TimeInfo } from './Module/Timer/TimeInfo';
import { TimerManager } from './Module/Timer/TimerManager';
 
@ccclass('Init')
export class Init extends Component {

    start() {
        this.startAsync();
    }

    private async startAsync(){
        Log.logger = new CCCLog();
        Log.info("-------------------------TaoWu------------------------------");
        // 设置全局异常处理器
        ETTask.ExceptionHandler = (error) => {
            Log.error("Unhandled task exception:", error);
        };
        TimeInfo.instance.timeZone = TimeInfo.getUtcOffsetHours();

        director.addPersistRootNode(this.node)
        Entry.start();
        await TimerManager.instance.waitAsync(1);
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


