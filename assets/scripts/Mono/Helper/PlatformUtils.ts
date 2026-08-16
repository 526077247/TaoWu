import { sys } from "cc";

export class PlatformUtils{
    
    public static getPlatformName(): string {
        if (sys.platform === sys.Platform.ANDROID) return "android";
        if (sys.platform === sys.Platform.IOS) return "ios";
        if (sys.platform === sys.Platform.WIN32) return "pc";
        return "webgl";
    }
}