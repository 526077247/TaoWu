import { assetManager, AudioClip, ImageAsset, Texture2D } from "cc";
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

    private getExtFromUrl(url: string, defaultExt: string): string
    {
        const cleanUrl = url.split('?')[0].split('#')[0];
        const match = cleanUrl.match(/\.([a-zA-Z0-9]{2,5})$/);
        return match ? `.${match[1].toLowerCase()}` : defaultExt;
    }

    public async httpGetImageOnline(url: string): Promise<Texture2D>
    {
        const timeout = 5000;
        const ettask:ETTask<ImageAsset> = ETTask.create<ImageAsset>(true);
        let completed = false;
        const timer = setTimeout(() => {
            if (completed) return;
            completed = true;
            Log.error("loadRemote timeout: " + url);
            ettask.setResult(null);
        }, timeout);
        assetManager.loadRemote<ImageAsset>(url, { 
            ext: this.getExtFromUrl(url, '.png'),
            cacheAsset: true, 
            cacheEnabled: true
        }, (err: Error | null, asset: ImageAsset) => {
            if (completed) return;
            completed = true;
            clearTimeout(timer);
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

    public async httpGetSoundOnline(url: string): Promise<AudioClip>
    {
        if (string.isNullOrEmpty(url)) return null;

        const timeout = 5000;
        const ettask:ETTask<AudioClip> = ETTask.create<AudioClip>(true);
        let completed = false;
        const timer = setTimeout(() => {
            if (completed) return;
            completed = true;
            Log.error("loadRemote timeout: " + url);
            ettask.setResult(null);
        }, timeout);
        assetManager.loadRemote<AudioClip>(url, {
            ext: this.getExtFromUrl(url, '.mp3'),
            audioLoadMode: AudioClip.AudioType.WEB_AUDIO,
            cacheAsset: true,
            cacheEnabled: true
        }, (err: Error | null, asset: AudioClip) => {
            if (completed) return;
            completed = true;
            clearTimeout(timer);
            if (err) {
                Log.error(err)
            }
            ettask.setResult(asset);
        });
        return await ettask;
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
                if (Object.prototype.hasOwnProperty.call(headers, key)) {
                    const val = headers[key];
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
                if (Object.prototype.hasOwnProperty.call(headers, key)) {
                    const val = headers[key];
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