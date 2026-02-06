import { _decorator, screen, view } from 'cc';
import { EDITOR } from 'cc/env';

export class Define {

    private static readonly dWidth = 768;
    private static readonly dHeight = 1366;

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
        return EDITOR;
    }
}