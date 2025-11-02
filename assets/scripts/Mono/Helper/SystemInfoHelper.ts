import { sys, screen, Rect } from "cc";
import { Define } from "../Define";

export class SystemInfoHelper {

    public static get screenSizeFlag()
    {
        let width = screen.windowSize.width;
        let height = screen.windowSize.height;
        var flagx = Define.DesignScreenWidth / width;
        var flagy = Define.DesignScreenHeight / height;
        return flagx > flagy ? flagx : flagy;
    }

    public static get screenHeight():number {
        return screen.windowSize.height * SystemInfoHelper.screenSizeFlag
    }

    public static get screenWidth():number {
        return screen.windowSize.width * SystemInfoHelper.screenSizeFlag
    }

    public static get safeArea(){
        var screenSafeArea = sys.getSafeAreaRect();
        return new Rect(Define.DesignScreenWidth >  Define.DesignScreenHeight?-screenSafeArea.xMin:0,
            (SystemInfoHelper.screenHeight - Define.DesignScreenHeight)/2 + screenSafeArea.yMin, screenSafeArea.width, screenSafeArea.height);
    }
}