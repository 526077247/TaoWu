import { IManager } from "../../../Mono/Core/Manager/IManager";

export class ImageLoaderManager implements IManager{
    private static _instance: ImageLoaderManager;

    public static get instance(): ImageLoaderManager{
        return ImageLoaderManager._instance;
    }

    public init(){
        ImageLoaderManager._instance = this;
    }

    public destroy() {
        ImageLoaderManager._instance = null;
    }
}