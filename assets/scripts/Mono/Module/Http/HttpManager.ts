import { assetManager, ImageAsset, native, sys, Texture2D } from "cc";
import { ETTask } from "../../../ThirdParty/ETTask/ETTask";
import { Log } from "../Log/Log";
import * as string from "../../Helper/StringHelper"
import { JsonHelper } from "../../Helper/JsonHelper";
import { StringBuilder } from "../../Core/Object/StringBuilder";

const DEFAULT_TIMEOUT: number = 10; // 默认超时时间

export class HttpManager
{
    private static _instance: HttpManager = new HttpManager();
    public static get instance(): HttpManager {
        return HttpManager._instance;
    }

    private convertParamToStr(param: Record<string, string> ): string
    {
        if (param == null) return "";
        let builder: StringBuilder = new StringBuilder();
        let flag = 0;
        for (const key in param) {
            if (Object.prototype.hasOwnProperty.call(param, key)) {
                const element = param[key];
                if (flag == 0)
                {
                    builder.append(key + "=" + element);
                    flag = 1;
                }
                else
                {
                    builder.append("&" + key + "=" + element);
                }
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

    public async httpGetResult<T>(type: new (...args:any[]) => T, url: string, headers: Record<string,string>, param: Record<string,string>, timeout:number = DEFAULT_TIMEOUT):Promise<T>{
        let strParam = this.convertParamToStr(param);
        if (!string.isNullOrEmpty(strParam))
            url += "?" + strParam;
        let response = ETTask.create<string>();
        let xhr = new XMLHttpRequest();
        xhr.timeout = timeout * 1000;
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 ){
                if((xhr.status >= 200 && xhr.status < 400)) {
                    response.setResult(xhr.responseText);
                } else {
                    response.setResult("");
                }
            }
        };
        xhr.open("GET", url, true);
        xhr.setRequestHeader("Content-Type","application/json")
        if(headers!=null)
        {
            for (const key in headers) {
                if (Object.prototype.hasOwnProperty.call(param, key)) {
                    const val = param[key];
                    xhr.setRequestHeader(key, val)
                }
            }
        }
        xhr.send();
        var text = await response;;
        if(text!=null){
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

    public async httpPostResult<T>(type: new (...args:any[]) => T, url: string, headers: Record<string,string>, param: Record<string,any>, timeout:number = DEFAULT_TIMEOUT):Promise<T>{
        let response = ETTask.create<string>();
        let xhr = new XMLHttpRequest();
        xhr.timeout = timeout * 1000;
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4 ){
                if((xhr.status >= 200 && xhr.status < 400)) {
                    response.setResult(xhr.responseText);
                } else {
                    response.setResult("");
                }
            }
        };
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type","application/json")
        if(headers!=null)
        {
            for (const key in headers) {
                if (Object.prototype.hasOwnProperty.call(param, key)) {
                    const val = param[key];
                    xhr.setRequestHeader(key, val)
                }
            }
        }
        
        xhr.send(JSON.stringify(param));
        var text = await response;
        if(text!=null){
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