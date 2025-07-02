import { assetManager, ImageAsset, native, sys, Texture2D } from "cc";
import { Md5 } from 'ts-md5';
import { ETTask } from "../../Core/ETTask/ETTask";
import { Log } from "../Log/Log";
export class HttpManager
{
    private static _instance: HttpManager = new HttpManager();
    public static get instance(): HttpManager {
        return HttpManager._instance;
    }

    public async httpGetImageOnline(url: string, local: boolean): Promise<Texture2D>
    {
        //本地是否存在图片
        if (local)
        {
            url = "file://" + this.localFile(url);
        }

        const vs = url.split("/");
        const ettask:ETTask<ImageAsset> = ETTask.create<ImageAsset>(true);
        assetManager.loadRemote<ImageAsset>(url, vs[vs.length-1].indexOf(".")>=0 ? null: { ext: '.png' }, (err: Error | null, asset: ImageAsset) => {
            if (err) {
                Log.error(err)
            }
            ettask.setResult(asset);
        });
        let image: ImageAsset = await ettask;
        if (image != null)
        {
            let texture = new Texture2D();
            texture.image = image;
            return texture;
        }
        return null
    }

    public localFile(url: string, dir: string = "downloadimage", extend: string = ".png") : string
    {
        const md5URLString: string = Md5.hashStr(url.trim());
        let path = dir;
        if (sys.isNative) {
            `${native.fileUtils.getWritablePath()}/${dir}`;
        } 
        // this.checkDirAndCreateWhenNeeded(path);
        let savePath: string = path + `/${dir}/` + md5URLString + extend;
        //Log.Info("=======savePath:" + savePath);
        return savePath;
    }

}