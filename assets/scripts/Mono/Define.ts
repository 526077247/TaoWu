import { _decorator, screen, sys, view } from 'cc';
import { DEBUG, EDITOR } from 'cc/env';
import { FORCE_UPDATE } from 'cc/userland/macro';

export class Define {

    private static readonly dWidth = 768;
    private static readonly dHeight = 1366;

    public static isSH: boolean = false;

    public static readonly DesignScreenWidth =
        (EDITOR?view.getDesignResolutionSize().width > view.getDesignResolutionSize().height:screen.windowSize.width > screen.windowSize.height)
         ? Math.max(Define.dWidth, Define.dHeight) : Math.min(Define.dWidth, Define.dHeight);
    public static readonly DesignScreenHeight =
        (EDITOR?view.getDesignResolutionSize().width > view.getDesignResolutionSize().height:screen.windowSize.width > screen.windowSize.height)
         ? Math.min(Define.dWidth, Define.dHeight) : Math.max(Define.dWidth, Define.dHeight);
    public static LogLevel = 1;

    public static Process = 1;

    public static readonly MinRepeatedTimerInterval: number = 100;

    public static get Debug(){
        return DEBUG;
    }

    public static get ForceUpdate(){
        if(FORCE_UPDATE){
            return true;
        }
        return false;
    }

    public static get Networked(){
        if(EDITOR) return false;
        return sys.getNetworkType() != sys.NetworkType.NONE;
    }
}