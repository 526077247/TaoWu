import { math, screen, view, _decorator } from 'cc';

export class Define {

    private static readonly dWidth = 768;
    private static readonly dHeight = 1366;

    public static readonly DesignScreenWidth =
        screen.windowSize.width > screen.windowSize.height ? Math.max(Define.dWidth, Define.dHeight) : Math.min(Define.dWidth, Define.dHeight);
    public static readonly DesignScreenHeight =
        screen.windowSize.width > screen.windowSize.height ? Math.min(Define.dWidth, Define.dHeight) : Math.max(Define.dWidth, Define.dHeight);
    public static LogLevel = 1;

    public static Process = 1;

    public static readonly MinRepeatedTimerInterval: number = 100;

    public static readonly Debug = true;
}