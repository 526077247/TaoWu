import * as fs from "fs";
import path from "path";
import { ETTask } from "./ettask";


export class FileHelper{
    private static readonly uiPath = ["ui", "uihall", "uigame"]
    /**
     * 创建子文件夹
     * @param selectPath
     */
    public static async createArtSubFolder(selectPath: string, url: string)
    {
        const ArtFolderNames = [ "animations", "materials", "models", "textures", "prefabs" ];
        const UnitFolderNames = [ "animations", "edit", "materials", "models", "textures", "prefabs"];
        const UIFolderNames = [ "animations", "atlas", "discreteImages", "prefabs" ];
        
        var names = ArtFolderNames;

        if (url.indexOf("ui/")>=0 || url.indexOf("uihall/")>=0 || url.indexOf("uigame/")>=0)
        {
            names = UIFolderNames;
        }
        if (url.indexOf("unit/")>=0)
        {
            names = UnitFolderNames;
        }

        for (let j = 0; j < names.length; j++)
        {
            const abPath = Editor.Utils.Path.resolve(selectPath, names[j]);
            const dbPath = url +"/" + names[j];
            const task = ETTask.create<boolean>(true);
            fs.exists(abPath, (res)=>{ task.setResult(res) });
            if(!await task)
            {  
                console.log(dbPath);
                Editor.Message.request("asset-db", "create-asset", dbPath, null);
            }
        }

        if(names == UIFolderNames){
            const abPath = Editor.Utils.Path.resolve(selectPath, "atlas/atlas.pac");
            const dbPath = url +"/atlas/atlas.pac";
            const task = ETTask.create<boolean>(true);
            fs.exists(abPath, (res)=>{ task.setResult(res)});
            if(!await task)
            {  
                console.log(dbPath);
                Editor.Message.request("asset-db", "create-asset", dbPath, Editor.Utils.Path.basename(dbPath));
            };
        }
    }


    /**
     * 一键设置UI文件夹AB包
     */
    public static async settingUIAB(){
        const projectPath = Editor.Project.path;
        const dirPath = path.join(projectPath, "assets", "assetsPackage");
        const result:any[] = [];
        for (let index = 0; index < this.uiPath.length; index++) {
            const itemPath = path.join(dirPath, this.uiPath[index]);
            const task = ETTask.create<boolean>(true);
            fs.exists(itemPath, (res)=>{ task.setResult(res)});
            if(await task){
                result.push(itemPath); 
            }
        }

        for (let index = 0; index < result.length; index++) {
            const element = result[index];
            const items = fs.readdirSync(element);

            for (const item of items) {
                const itemPath = path.join(element, item);
                const stat = fs.statSync(itemPath);

                if (stat.isDirectory()) {
                    console.log(itemPath)
                    const task = ETTask.create<string>(true);
                    fs.readFile(itemPath+".meta", 'utf8', async (err, data) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        task.setResult(data)
                    });
                    const jsonData = JSON.parse(await task);
                    if(!jsonData.userData){
                        jsonData.userData = {isBundle:false};
                    }
                    const url = await Editor.Message.request('asset-db', 'query-url', jsonData.uuid);
                    if(!jsonData.userData.isBundle){
                        let vs = itemPath.split('\\');
                        jsonData.userData.isBundle = true;
                        jsonData.userData.bundleName = vs[vs.length-2]+"_"+vs[vs.length-1]
                        jsonData.userData.bundleFilterConfig =  [{
                            "range": "include",
                            "type": "url",
                            "patchOption": {
                                "patchType": "glob",
                                "value": url + "/prefabs/**/*.prefab"
                            },
                            "assets": [
                                ""
                            ]
                        },{
                            "range": "include",
                            "type": "url",
                            "patchOption": {
                                "patchType": "glob",
                                "value": url + "/discreteImages/**/*"
                            },
                            "assets": [
                                ""
                            ]
                        },{
                            "range": "include",
                            "type": "url",
                            "patchOption": {
                                "patchType": "glob",
                                "value": url + "/atlas/**/*"
                            },
                            "assets": [
                                ""
                            ]
                        }]
                        const task = ETTask.create<boolean>(true);
                        fs.writeFile(itemPath+".meta",JSON.stringify(jsonData, null, 2), {},(err)=>{
                            if (!!err) console.error(err); 
                            task.setResult(!err)
                        })
                        if(await task){
                            Editor.Message.request('asset-db', 'refresh-asset', jsonData.uuid);
                        }
                    }
                
                }
            }
        }
        //todo:
        const dresult = await Editor.Dialog.info('设置完成，部分文件夹需重启编辑器后可见', {
            buttons: ['立即重启', '稍后手动重启'],
            title: '设置完成',
        });
        if (0 == dresult.response) {
            Editor.App.quit();
        }
        return result;
    }
}
