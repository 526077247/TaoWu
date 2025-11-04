import { assetManager, ImageAsset, native, sys, Texture2D } from "cc";
import { ETTask } from "../../../ThirdParty/ETTask/ETTask";
import { Log } from "../Log/Log";
import * as string from "../../Helper/StringHelper"
import { JsonHelper } from "../../Helper/JsonHelper";
import { StringBuilder } from "../../Core/Object/StringBuilder";

const DEFAULT_TIMEOUT: number = 10000; // 默认超时时间

export class HttpManager
{
    private static _instance: HttpManager = new HttpManager();
    public static get instance(): HttpManager {
        return HttpManager._instance;
    }

    private convertParamToStr(param: Map<string, string> ): string
    {
        if (param == null) return "";
        let builder: StringBuilder = new StringBuilder();
        let flag = 0;
        for (const item of param) {
            if (flag == 0)
            {
                builder.append(item[0] + "=" + item[1]);
                flag = 1;
            }
            else
            {
                builder.append("&" + item[0] + "=" + item[1]);
            }
        }

        return builder.toString();
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
        const md5URLString: string = string.getHashString(url.trim());
        let path = dir;
        if (sys.isNative) {
            `${native.fileUtils.getWritablePath()}/${dir}`;
        } 
        // this.checkDirAndCreateWhenNeeded(path);
        let savePath: string = path + `/${dir}/` + md5URLString + extend;
        //Log.Info("=======savePath:" + savePath);
        return savePath;
    }

    public async httpGetResult<T>(type: new (...args:any[]) => T, url: string, headers: HeadersInit, param: Map<string,string>, timeout:number = DEFAULT_TIMEOUT):Promise<T>{
        let strParam = this.convertParamToStr(param);
        if (!string.isNullOrEmpty(strParam))
            url += "?" + strParam;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        let response: Response;
        try
        {
            if(!!headers){
                headers["Content-Type"]= "application/json"
            }else{
                headers = {"Content-Type": "application/json"}
            }
            response = await fetch(url, {
                headers: headers,
                signal: controller.signal  
            });
        }
        catch(ex)
        {
            Log.info(string.format("url {0} get fail. msg: {1}",url,ex));
            return null;
        }
        clearTimeout(id);
        if(response.ok){
            var text = await response.text();
            try{
                return JsonHelper.fromJson<T>(type, text)
            }
            catch{
                Log.error("json.encode error:\n" + text);
                return null;
            }
        }else{
            Log.info(string.format("url {0} get fail.",url));
            return null;
        }
    }

    public async httpPostResult<T>(type: new (...args:any[]) => T, url: string, headers: HeadersInit, param: Map<string,any>, timeout:number = DEFAULT_TIMEOUT):Promise<T>{
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        let response: Response;
        try
        {
            if(!!headers){
                headers["Content-Type"]= "application/json"
            }else{
                headers = {"Content-Type": "application/json"}
            }
            response = await fetch(url, {
                method: "POST",
                headers: headers,
                signal: controller.signal,
                body: JSON.stringify(param),
            });
        }
        catch(ex)
        {
            Log.info(string.format("url {0} get fail. msg: {1}",url,ex));
            return null;
        }
        clearTimeout(id);
        if(response.ok){
            var text = await response.text();
            try{
                return JsonHelper.fromJson<T>(type, text)
            }
            catch{
                Log.error("json.encode error:\n" + text);
                return null;
            }
        }else{
            Log.info(string.format("url {0} get fail.",url));
            return null;
        }
    }
}