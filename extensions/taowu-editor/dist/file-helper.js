"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileHelper = void 0;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const ettask_1 = require("./ettask");
class FileHelper {
    /**
     * 创建子文件夹
     * @param selectPath
     */
    static async createArtSubFolder(selectPath, url) {
        const ArtFolderNames = ["animations", "materials", "models", "textures", "prefabs"];
        const UnitFolderNames = ["animations", "edit", "materials", "models", "textures", "prefabs"];
        const UIFolderNames = ["animations", "atlas", "discreteImages", "prefabs"];
        var names = ArtFolderNames;
        if (url.indexOf("ui/") >= 0 || url.indexOf("uihall/") >= 0 || url.indexOf("uigame/") >= 0) {
            names = UIFolderNames;
        }
        if (url.indexOf("unit/") >= 0) {
            names = UnitFolderNames;
        }
        for (let j = 0; j < names.length; j++) {
            const abPath = Editor.Utils.Path.resolve(selectPath, names[j]);
            const dbPath = url + "/" + names[j];
            const task = ettask_1.ETTask.create(true);
            fs.exists(abPath, (res) => { task.setResult(res); });
            if (!await task) {
                console.log(dbPath);
                Editor.Message.request("asset-db", "create-asset", dbPath, null);
            }
        }
        if (names == UIFolderNames) {
            const abPath = Editor.Utils.Path.resolve(selectPath, "atlas.pac");
            const dbPath = url + "/atlas.pac";
            const task = ettask_1.ETTask.create(true);
            fs.exists(abPath, (res) => { task.setResult(res); });
            if (!await task) {
                console.log(dbPath);
                Editor.Message.request("asset-db", "create-asset", dbPath, Editor.Utils.Path.basename(dbPath));
            }
            ;
        }
    }
    /**
     * 一键设置UI文件夹AB包
     */
    static async settingUIAB() {
        const projectPath = Editor.Project.path;
        const dirPath = path_1.default.join(projectPath, "assets", "assetsPackage");
        const result = [];
        for (let index = 0; index < this.uiPath.length; index++) {
            const itemPath = path_1.default.join(dirPath, this.uiPath[index]);
            const task = ettask_1.ETTask.create(true);
            fs.exists(itemPath, (res) => { task.setResult(res); });
            if (await task) {
                result.push(itemPath);
            }
        }
        for (let index = 0; index < result.length; index++) {
            const element = result[index];
            const items = fs.readdirSync(element);
            for (const item of items) {
                const itemPath = path_1.default.join(element, item);
                const stat = fs.statSync(itemPath);
                if (stat.isDirectory()) {
                    console.log(itemPath);
                    const task = ettask_1.ETTask.create(true);
                    fs.readFile(itemPath + ".meta", 'utf8', async (err, data) => {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        task.setResult(data);
                    });
                    const jsonData = JSON.parse(await task);
                    if (!jsonData.userData) {
                        jsonData.userData = { isBundle: false };
                    }
                    const url = await Editor.Message.request('asset-db', 'query-url', jsonData.uuid);
                    if (!jsonData.userData.isBundle) {
                        let vs = itemPath.split('\\');
                        jsonData.userData.isBundle = true;
                        jsonData.userData.bundleName = vs[vs.length - 2] + "_" + vs[vs.length - 1];
                        jsonData.userData.bundleFilterConfig = [{
                                "range": "include",
                                "type": "url",
                                "patchOption": {
                                    "patchType": "glob",
                                    "value": url + "/prefabs/**/*.prefab"
                                },
                                "assets": [
                                    ""
                                ]
                            }, {
                                "range": "include",
                                "type": "url",
                                "patchOption": {
                                    "patchType": "glob",
                                    "value": url + "/discreteImages/**/*"
                                },
                                "assets": [
                                    ""
                                ]
                            }, {
                                "range": "include",
                                "type": "url",
                                "patchOption": {
                                    "patchType": "glob",
                                    "value": url + "/**/*.pac"
                                },
                                "assets": [
                                    ""
                                ]
                            }];
                        const task = ettask_1.ETTask.create(true);
                        fs.writeFile(itemPath + ".meta", JSON.stringify(jsonData, null, 2), {}, (err) => {
                            if (!!err)
                                console.error(err);
                            task.setResult(!err);
                        });
                        if (await task) {
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
exports.FileHelper = FileHelper;
FileHelper.uiPath = ["ui", "uihall", "uigame"];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvZmlsZS1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsZ0RBQXdCO0FBQ3hCLHFDQUFrQztBQUdsQyxNQUFhLFVBQVU7SUFFbkI7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxVQUFrQixFQUFFLEdBQVc7UUFFbEUsTUFBTSxjQUFjLEdBQUcsQ0FBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFFLENBQUM7UUFDdEYsTUFBTSxlQUFlLEdBQUcsQ0FBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sYUFBYSxHQUFHLENBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLENBQUUsQ0FBQztRQUU3RSxJQUFJLEtBQUssR0FBRyxjQUFjLENBQUM7UUFFM0IsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFFLENBQUMsRUFDbkY7WUFDSSxLQUFLLEdBQUcsYUFBYSxDQUFDO1NBQ3pCO1FBQ0QsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsRUFDM0I7WUFDSSxLQUFLLEdBQUcsZUFBZSxDQUFDO1NBQzNCO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQ3JDO1lBQ0ksTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvRCxNQUFNLE1BQU0sR0FBRyxHQUFHLEdBQUUsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQyxNQUFNLElBQUksR0FBRyxlQUFNLENBQUMsTUFBTSxDQUFVLElBQUksQ0FBQyxDQUFDO1lBQzFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxFQUFDLEVBQUUsR0FBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEQsSUFBRyxDQUFDLE1BQU0sSUFBSSxFQUNkO2dCQUNJLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BCLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3BFO1NBQ0o7UUFFRCxJQUFHLEtBQUssSUFBSSxhQUFhLEVBQUM7WUFDdEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNsRSxNQUFNLE1BQU0sR0FBRyxHQUFHLEdBQUUsWUFBWSxDQUFDO1lBQ2pDLE1BQU0sSUFBSSxHQUFHLGVBQU0sQ0FBQyxNQUFNLENBQVUsSUFBSSxDQUFDLENBQUM7WUFDMUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUMsRUFBRSxHQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUEsQ0FBQSxDQUFDLENBQUMsQ0FBQztZQUNqRCxJQUFHLENBQUMsTUFBTSxJQUFJLEVBQ2Q7Z0JBQ0ksT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDcEIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7YUFDbEc7WUFBQSxDQUFDO1NBQ0w7SUFDTCxDQUFDO0lBR0Q7O09BRUc7SUFDSSxNQUFNLENBQUMsS0FBSyxDQUFDLFdBQVc7UUFDM0IsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDeEMsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sTUFBTSxHQUFTLEVBQUUsQ0FBQztRQUN4QixLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDckQsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sSUFBSSxHQUFHLGVBQU0sQ0FBQyxNQUFNLENBQVUsSUFBSSxDQUFDLENBQUM7WUFDMUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFHLEVBQUMsRUFBRSxHQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUEsQ0FBQSxDQUFDLENBQUMsQ0FBQztZQUNuRCxJQUFHLE1BQU0sSUFBSSxFQUFDO2dCQUNWLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDekI7U0FDSjtRQUVELEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ2hELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM5QixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXRDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO2dCQUN0QixNQUFNLFFBQVEsR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFFbkMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUU7b0JBQ3BCLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7b0JBQ3JCLE1BQU0sSUFBSSxHQUFHLGVBQU0sQ0FBQyxNQUFNLENBQVMsSUFBSSxDQUFDLENBQUM7b0JBQ3pDLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTt3QkFDdEQsSUFBSSxHQUFHLEVBQUU7NEJBQ0wsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzs0QkFDbkIsT0FBTzt5QkFDVjt3QkFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUN4QixDQUFDLENBQUMsQ0FBQztvQkFDSCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7b0JBQ3hDLElBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFDO3dCQUNsQixRQUFRLENBQUMsUUFBUSxHQUFHLEVBQUMsUUFBUSxFQUFDLEtBQUssRUFBQyxDQUFDO3FCQUN4QztvQkFDRCxNQUFNLEdBQUcsR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNqRixJQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUM7d0JBQzNCLElBQUksRUFBRSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQzlCLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQzt3QkFDbEMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLEdBQUMsR0FBRyxHQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxDQUFBO3dCQUNsRSxRQUFRLENBQUMsUUFBUSxDQUFDLGtCQUFrQixHQUFJLENBQUM7Z0NBQ3JDLE9BQU8sRUFBRSxTQUFTO2dDQUNsQixNQUFNLEVBQUUsS0FBSztnQ0FDYixhQUFhLEVBQUU7b0NBQ1gsV0FBVyxFQUFFLE1BQU07b0NBQ25CLE9BQU8sRUFBRSxHQUFHLEdBQUcsc0JBQXNCO2lDQUN4QztnQ0FDRCxRQUFRLEVBQUU7b0NBQ04sRUFBRTtpQ0FDTDs2QkFDSixFQUFDO2dDQUNFLE9BQU8sRUFBRSxTQUFTO2dDQUNsQixNQUFNLEVBQUUsS0FBSztnQ0FDYixhQUFhLEVBQUU7b0NBQ1gsV0FBVyxFQUFFLE1BQU07b0NBQ25CLE9BQU8sRUFBRSxHQUFHLEdBQUcsc0JBQXNCO2lDQUN4QztnQ0FDRCxRQUFRLEVBQUU7b0NBQ04sRUFBRTtpQ0FDTDs2QkFDSixFQUFDO2dDQUNFLE9BQU8sRUFBRSxTQUFTO2dDQUNsQixNQUFNLEVBQUUsS0FBSztnQ0FDYixhQUFhLEVBQUU7b0NBQ1gsV0FBVyxFQUFFLE1BQU07b0NBQ25CLE9BQU8sRUFBRSxHQUFHLEdBQUcsV0FBVztpQ0FDN0I7Z0NBQ0QsUUFBUSxFQUFFO29DQUNOLEVBQUU7aUNBQ0w7NkJBQ0osQ0FBQyxDQUFBO3dCQUNGLE1BQU0sSUFBSSxHQUFHLGVBQU0sQ0FBQyxNQUFNLENBQVUsSUFBSSxDQUFDLENBQUM7d0JBQzFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFDLE9BQU8sRUFBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFDLENBQUMsR0FBRyxFQUFDLEVBQUU7NEJBQ3ZFLElBQUksQ0FBQyxDQUFDLEdBQUc7Z0NBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQzs0QkFDOUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO3dCQUN4QixDQUFDLENBQUMsQ0FBQTt3QkFDRixJQUFHLE1BQU0sSUFBSSxFQUFDOzRCQUNWLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxlQUFlLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO3lCQUN0RTtxQkFDSjtpQkFFSjthQUNKO1NBQ0o7UUFDRCxPQUFPO1FBQ1AsTUFBTSxPQUFPLEdBQUcsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRTtZQUM1RCxPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO1lBQzNCLEtBQUssRUFBRSxNQUFNO1NBQ2hCLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUU7WUFDdkIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUNyQjtRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2xCLENBQUM7O0FBbEpMLGdDQW1KQztBQWxKMkIsaUJBQU0sR0FBRyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgRVRUYXNrIH0gZnJvbSBcIi4vZXR0YXNrXCI7XHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVIZWxwZXJ7XHJcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSB1aVBhdGggPSBbXCJ1aVwiLCBcInVpaGFsbFwiLCBcInVpZ2FtZVwiXVxyXG4gICAgLyoqXHJcbiAgICAgKiDliJvlu7rlrZDmlofku7blpLlcclxuICAgICAqIEBwYXJhbSBzZWxlY3RQYXRoXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBzdGF0aWMgYXN5bmMgY3JlYXRlQXJ0U3ViRm9sZGVyKHNlbGVjdFBhdGg6IHN0cmluZywgdXJsOiBzdHJpbmcpXHJcbiAgICB7XHJcbiAgICAgICAgY29uc3QgQXJ0Rm9sZGVyTmFtZXMgPSBbIFwiYW5pbWF0aW9uc1wiLCBcIm1hdGVyaWFsc1wiLCBcIm1vZGVsc1wiLCBcInRleHR1cmVzXCIsIFwicHJlZmFic1wiIF07XHJcbiAgICAgICAgY29uc3QgVW5pdEZvbGRlck5hbWVzID0gWyBcImFuaW1hdGlvbnNcIiwgXCJlZGl0XCIsIFwibWF0ZXJpYWxzXCIsIFwibW9kZWxzXCIsIFwidGV4dHVyZXNcIiwgXCJwcmVmYWJzXCJdO1xyXG4gICAgICAgIGNvbnN0IFVJRm9sZGVyTmFtZXMgPSBbIFwiYW5pbWF0aW9uc1wiLCBcImF0bGFzXCIsIFwiZGlzY3JldGVJbWFnZXNcIiwgXCJwcmVmYWJzXCIgXTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgbmFtZXMgPSBBcnRGb2xkZXJOYW1lcztcclxuXHJcbiAgICAgICAgaWYgKHVybC5pbmRleE9mKFwidWkvXCIpPj0wIHx8IHVybC5pbmRleE9mKFwidWloYWxsL1wiKT49MCB8fCB1cmwuaW5kZXhPZihcInVpZ2FtZS9cIik+PTApXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBuYW1lcyA9IFVJRm9sZGVyTmFtZXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh1cmwuaW5kZXhPZihcInVuaXQvXCIpPj0wKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgbmFtZXMgPSBVbml0Rm9sZGVyTmFtZXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IG5hbWVzLmxlbmd0aDsgaisrKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgYWJQYXRoID0gRWRpdG9yLlV0aWxzLlBhdGgucmVzb2x2ZShzZWxlY3RQYXRoLCBuYW1lc1tqXSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGRiUGF0aCA9IHVybCArXCIvXCIgKyBuYW1lc1tqXTtcclxuICAgICAgICAgICAgY29uc3QgdGFzayA9IEVUVGFzay5jcmVhdGU8Ym9vbGVhbj4odHJ1ZSk7XHJcbiAgICAgICAgICAgIGZzLmV4aXN0cyhhYlBhdGgsIChyZXMpPT57IHRhc2suc2V0UmVzdWx0KHJlcykgfSk7XHJcbiAgICAgICAgICAgIGlmKCFhd2FpdCB0YXNrKVxyXG4gICAgICAgICAgICB7ICBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRiUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwiYXNzZXQtZGJcIiwgXCJjcmVhdGUtYXNzZXRcIiwgZGJQYXRoLCBudWxsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYobmFtZXMgPT0gVUlGb2xkZXJOYW1lcyl7XHJcbiAgICAgICAgICAgIGNvbnN0IGFiUGF0aCA9IEVkaXRvci5VdGlscy5QYXRoLnJlc29sdmUoc2VsZWN0UGF0aCwgXCJhdGxhcy5wYWNcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGRiUGF0aCA9IHVybCArXCIvYXRsYXMucGFjXCI7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhc2sgPSBFVFRhc2suY3JlYXRlPGJvb2xlYW4+KHRydWUpO1xyXG4gICAgICAgICAgICBmcy5leGlzdHMoYWJQYXRoLCAocmVzKT0+eyB0YXNrLnNldFJlc3VsdChyZXMpfSk7XHJcbiAgICAgICAgICAgIGlmKCFhd2FpdCB0YXNrKVxyXG4gICAgICAgICAgICB7ICBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRiUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwiYXNzZXQtZGJcIiwgXCJjcmVhdGUtYXNzZXRcIiwgZGJQYXRoLCBFZGl0b3IuVXRpbHMuUGF0aC5iYXNlbmFtZShkYlBhdGgpKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5LiA6ZSu6K6+572uVUnmlofku7blpLlBQuWMhVxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgc3RhdGljIGFzeW5jIHNldHRpbmdVSUFCKCl7XHJcbiAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xyXG4gICAgICAgIGNvbnN0IGRpclBhdGggPSBwYXRoLmpvaW4ocHJvamVjdFBhdGgsIFwiYXNzZXRzXCIsIFwiYXNzZXRzUGFja2FnZVwiKTtcclxuICAgICAgICBjb25zdCByZXN1bHQ6YW55W10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgdGhpcy51aVBhdGgubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1QYXRoID0gcGF0aC5qb2luKGRpclBhdGgsIHRoaXMudWlQYXRoW2luZGV4XSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhc2sgPSBFVFRhc2suY3JlYXRlPGJvb2xlYW4+KHRydWUpO1xyXG4gICAgICAgICAgICBmcy5leGlzdHMoaXRlbVBhdGgsIChyZXMpPT57IHRhc2suc2V0UmVzdWx0KHJlcyl9KTtcclxuICAgICAgICAgICAgaWYoYXdhaXQgdGFzayl7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChpdGVtUGF0aCk7IFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcmVzdWx0Lmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gcmVzdWx0W2luZGV4XTtcclxuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSBmcy5yZWFkZGlyU3luYyhlbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbVBhdGggPSBwYXRoLmpvaW4oZWxlbWVudCwgaXRlbSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoaXRlbVBhdGgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhpdGVtUGF0aClcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXNrID0gRVRUYXNrLmNyZWF0ZTxzdHJpbmc+KHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZzLnJlYWRGaWxlKGl0ZW1QYXRoK1wiLm1ldGFcIiwgJ3V0ZjgnLCBhc3luYyAoZXJyLCBkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrLnNldFJlc3VsdChkYXRhKVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGpzb25EYXRhID0gSlNPTi5wYXJzZShhd2FpdCB0YXNrKTtcclxuICAgICAgICAgICAgICAgICAgICBpZighanNvbkRhdGEudXNlckRhdGEpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uRGF0YS51c2VyRGF0YSA9IHtpc0J1bmRsZTpmYWxzZX07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXVybCcsIGpzb25EYXRhLnV1aWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKCFqc29uRGF0YS51c2VyRGF0YS5pc0J1bmRsZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB2cyA9IGl0ZW1QYXRoLnNwbGl0KCdcXFxcJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25EYXRhLnVzZXJEYXRhLmlzQnVuZGxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbkRhdGEudXNlckRhdGEuYnVuZGxlTmFtZSA9IHZzW3ZzLmxlbmd0aC0yXStcIl9cIit2c1t2cy5sZW5ndGgtMV1cclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbkRhdGEudXNlckRhdGEuYnVuZGxlRmlsdGVyQ29uZmlnID0gIFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInJhbmdlXCI6IFwiaW5jbHVkZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwidXJsXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInBhdGNoT3B0aW9uXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInBhdGNoVHlwZVwiOiBcImdsb2JcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInZhbHVlXCI6IHVybCArIFwiL3ByZWZhYnMvKiovKi5wcmVmYWJcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiYXNzZXRzXCI6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyYW5nZVwiOiBcImluY2x1ZGVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInVybFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwYXRjaE9wdGlvblwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwYXRjaFR5cGVcIjogXCJnbG9iXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZVwiOiB1cmwgKyBcIi9kaXNjcmV0ZUltYWdlcy8qKi8qXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImFzc2V0c1wiOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicmFuZ2VcIjogXCJpbmNsdWRlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJ1cmxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicGF0Y2hPcHRpb25cIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicGF0Y2hUeXBlXCI6IFwiZ2xvYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFsdWVcIjogdXJsICsgXCIvKiovKi5wYWNcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiYXNzZXRzXCI6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhc2sgPSBFVFRhc2suY3JlYXRlPGJvb2xlYW4+KHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGUoaXRlbVBhdGgrXCIubWV0YVwiLEpTT04uc3RyaW5naWZ5KGpzb25EYXRhLCBudWxsLCAyKSwge30sKGVycik9PntcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWVycikgY29uc29sZS5lcnJvcihlcnIpOyBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2suc2V0UmVzdWx0KCFlcnIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGF3YWl0IHRhc2spe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncmVmcmVzaC1hc3NldCcsIGpzb25EYXRhLnV1aWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy90b2RvOlxyXG4gICAgICAgIGNvbnN0IGRyZXN1bHQgPSBhd2FpdCBFZGl0b3IuRGlhbG9nLmluZm8oJ+iuvue9ruWujOaIkO+8jOmDqOWIhuaWh+S7tuWkuemcgOmHjeWQr+e8lui+keWZqOWQjuWPr+ingScsIHtcclxuICAgICAgICAgICAgYnV0dG9uczogWyfnq4vljbPph43lkK8nLCAn56iN5ZCO5omL5Yqo6YeN5ZCvJ10sXHJcbiAgICAgICAgICAgIHRpdGxlOiAn6K6+572u5a6M5oiQJyxcclxuICAgICAgICB9KTtcclxuICAgICAgICBpZiAoMCA9PSBkcmVzdWx0LnJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIEVkaXRvci5BcHAucXVpdCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG59XHJcbiJdfQ==