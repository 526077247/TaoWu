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
            const abPath = Editor.Utils.Path.resolve(selectPath, "atlas/atlas.pac");
            const dbPath = url + "/atlas/atlas.pac";
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
                                    "value": url + "/atlas/**/*"
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvZmlsZS1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsZ0RBQXdCO0FBQ3hCLHFDQUFrQztBQUdsQyxNQUFhLFVBQVU7SUFFbkI7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxVQUFrQixFQUFFLEdBQVc7UUFFbEUsTUFBTSxjQUFjLEdBQUcsQ0FBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFFLENBQUM7UUFDdEYsTUFBTSxlQUFlLEdBQUcsQ0FBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sYUFBYSxHQUFHLENBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLENBQUUsQ0FBQztRQUU3RSxJQUFJLEtBQUssR0FBRyxjQUFjLENBQUM7UUFFM0IsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFFLENBQUMsRUFDbkY7WUFDSSxLQUFLLEdBQUcsYUFBYSxDQUFDO1NBQ3pCO1FBQ0QsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsRUFDM0I7WUFDSSxLQUFLLEdBQUcsZUFBZSxDQUFDO1NBQzNCO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQ3JDO1lBQ0ksTUFBTSxNQUFN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QUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBQyxDQUFDLEdBQUcsRUFBQyxFQUFFOzRCQUN2RSxJQUFJLENBQUMsQ0FBQyxHQUFHO2dDQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7NEJBQzlCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTt3QkFDeEIsQ0FBQyxDQUFDLENBQUE7d0JBQ0YsSUFBRyxNQUFNLElBQUksRUFBQzs0QkFDVixNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQzt5QkFDdEU7cUJBQ0o7aUJBRUo7YUFDSjtTQUNKO1FBQ0QsT0FBTztRQUNQLE1BQU0sT0FBTyxHQUFHLE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUU7WUFDNUQsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQztZQUMzQixLQUFLLEVBQUUsTUFBTTtTQUNoQixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO1lBQ3ZCLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDckI7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDOztBQWxKTCxnQ0FtSkM7QUFsSjJCLGlCQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IEVUVGFzayB9IGZyb20gXCIuL2V0dGFza1wiO1xyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlSGVscGVye1xyXG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgdWlQYXRoID0gW1widWlcIiwgXCJ1aWhhbGxcIiwgXCJ1aWdhbWVcIl1cclxuICAgIC8qKlxyXG4gICAgICog5Yib5bu65a2Q5paH5Lu25aS5XHJcbiAgICAgKiBAcGFyYW0gc2VsZWN0UGF0aFxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgc3RhdGljIGFzeW5jIGNyZWF0ZUFydFN1YkZvbGRlcihzZWxlY3RQYXRoOiBzdHJpbmcsIHVybDogc3RyaW5nKVxyXG4gICAge1xyXG4gICAgICAgIGNvbnN0IEFydEZvbGRlck5hbWVzID0gWyBcImFuaW1hdGlvbnNcIiwgXCJtYXRlcmlhbHNcIiwgXCJtb2RlbHNcIiwgXCJ0ZXh0dXJlc1wiLCBcInByZWZhYnNcIiBdO1xyXG4gICAgICAgIGNvbnN0IFVuaXRGb2xkZXJOYW1lcyA9IFsgXCJhbmltYXRpb25zXCIsIFwiZWRpdFwiLCBcIm1hdGVyaWFsc1wiLCBcIm1vZGVsc1wiLCBcInRleHR1cmVzXCIsIFwicHJlZmFic1wiXTtcclxuICAgICAgICBjb25zdCBVSUZvbGRlck5hbWVzID0gWyBcImFuaW1hdGlvbnNcIiwgXCJhdGxhc1wiLCBcImRpc2NyZXRlSW1hZ2VzXCIsIFwicHJlZmFic1wiIF07XHJcbiAgICAgICAgXHJcbiAgICAgICAgdmFyIG5hbWVzID0gQXJ0Rm9sZGVyTmFtZXM7XHJcblxyXG4gICAgICAgIGlmICh1cmwuaW5kZXhPZihcInVpL1wiKT49MCB8fCB1cmwuaW5kZXhPZihcInVpaGFsbC9cIik+PTAgfHwgdXJsLmluZGV4T2YoXCJ1aWdhbWUvXCIpPj0wKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgbmFtZXMgPSBVSUZvbGRlck5hbWVzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodXJsLmluZGV4T2YoXCJ1bml0L1wiKT49MClcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIG5hbWVzID0gVW5pdEZvbGRlck5hbWVzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBuYW1lcy5sZW5ndGg7IGorKylcclxuICAgICAgICB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFiUGF0aCA9IEVkaXRvci5VdGlscy5QYXRoLnJlc29sdmUoc2VsZWN0UGF0aCwgbmFtZXNbal0pO1xyXG4gICAgICAgICAgICBjb25zdCBkYlBhdGggPSB1cmwgK1wiL1wiICsgbmFtZXNbal07XHJcbiAgICAgICAgICAgIGNvbnN0IHRhc2sgPSBFVFRhc2suY3JlYXRlPGJvb2xlYW4+KHRydWUpO1xyXG4gICAgICAgICAgICBmcy5leGlzdHMoYWJQYXRoLCAocmVzKT0+eyB0YXNrLnNldFJlc3VsdChyZXMpIH0pO1xyXG4gICAgICAgICAgICBpZighYXdhaXQgdGFzaylcclxuICAgICAgICAgICAgeyAgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYlBhdGgpO1xyXG4gICAgICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcImFzc2V0LWRiXCIsIFwiY3JlYXRlLWFzc2V0XCIsIGRiUGF0aCwgbnVsbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKG5hbWVzID09IFVJRm9sZGVyTmFtZXMpe1xyXG4gICAgICAgICAgICBjb25zdCBhYlBhdGggPSBFZGl0b3IuVXRpbHMuUGF0aC5yZXNvbHZlKHNlbGVjdFBhdGgsIFwiYXRsYXMvYXRsYXMucGFjXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBkYlBhdGggPSB1cmwgK1wiL2F0bGFzL2F0bGFzLnBhY1wiO1xyXG4gICAgICAgICAgICBjb25zdCB0YXNrID0gRVRUYXNrLmNyZWF0ZTxib29sZWFuPih0cnVlKTtcclxuICAgICAgICAgICAgZnMuZXhpc3RzKGFiUGF0aCwgKHJlcyk9PnsgdGFzay5zZXRSZXN1bHQocmVzKX0pO1xyXG4gICAgICAgICAgICBpZighYXdhaXQgdGFzaylcclxuICAgICAgICAgICAgeyAgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhkYlBhdGgpO1xyXG4gICAgICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcImFzc2V0LWRiXCIsIFwiY3JlYXRlLWFzc2V0XCIsIGRiUGF0aCwgRWRpdG9yLlV0aWxzLlBhdGguYmFzZW5hbWUoZGJQYXRoKSk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIOS4gOmUruiuvue9rlVJ5paH5Lu25aS5QULljIVcclxuICAgICAqL1xyXG4gICAgcHVibGljIHN0YXRpYyBhc3luYyBzZXR0aW5nVUlBQigpe1xyXG4gICAgICAgIGNvbnN0IHByb2plY3RQYXRoID0gRWRpdG9yLlByb2plY3QucGF0aDtcclxuICAgICAgICBjb25zdCBkaXJQYXRoID0gcGF0aC5qb2luKHByb2plY3RQYXRoLCBcImFzc2V0c1wiLCBcImFzc2V0c1BhY2thZ2VcIik7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0OmFueVtdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHRoaXMudWlQYXRoLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtUGF0aCA9IHBhdGguam9pbihkaXJQYXRoLCB0aGlzLnVpUGF0aFtpbmRleF0pO1xyXG4gICAgICAgICAgICBjb25zdCB0YXNrID0gRVRUYXNrLmNyZWF0ZTxib29sZWFuPih0cnVlKTtcclxuICAgICAgICAgICAgZnMuZXhpc3RzKGl0ZW1QYXRoLCAocmVzKT0+eyB0YXNrLnNldFJlc3VsdChyZXMpfSk7XHJcbiAgICAgICAgICAgIGlmKGF3YWl0IHRhc2spe1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goaXRlbVBhdGgpOyBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHJlc3VsdC5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IHJlc3VsdFtpbmRleF07XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gZnMucmVhZGRpclN5bmMoZWxlbWVudCk7XHJcblxyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1QYXRoID0gcGF0aC5qb2luKGVsZW1lbnQsIGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdCA9IGZzLnN0YXRTeW5jKGl0ZW1QYXRoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coaXRlbVBhdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFzayA9IEVUVGFzay5jcmVhdGU8c3RyaW5nPih0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBmcy5yZWFkRmlsZShpdGVtUGF0aCtcIi5tZXRhXCIsICd1dGY4JywgYXN5bmMgKGVyciwgZGF0YSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5zZXRSZXN1bHQoZGF0YSlcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBqc29uRGF0YSA9IEpTT04ucGFyc2UoYXdhaXQgdGFzayk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoIWpzb25EYXRhLnVzZXJEYXRhKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbkRhdGEudXNlckRhdGEgPSB7aXNCdW5kbGU6ZmFsc2V9O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11cmwnLCBqc29uRGF0YS51dWlkKTtcclxuICAgICAgICAgICAgICAgICAgICBpZighanNvbkRhdGEudXNlckRhdGEuaXNCdW5kbGUpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgdnMgPSBpdGVtUGF0aC5zcGxpdCgnXFxcXCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uRGF0YS51c2VyRGF0YS5pc0J1bmRsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25EYXRhLnVzZXJEYXRhLmJ1bmRsZU5hbWUgPSB2c1t2cy5sZW5ndGgtMl0rXCJfXCIrdnNbdnMubGVuZ3RoLTFdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25EYXRhLnVzZXJEYXRhLmJ1bmRsZUZpbHRlckNvbmZpZyA9ICBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyYW5nZVwiOiBcImluY2x1ZGVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInVybFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwYXRjaE9wdGlvblwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwYXRjaFR5cGVcIjogXCJnbG9iXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZVwiOiB1cmwgKyBcIi9wcmVmYWJzLyoqLyoucHJlZmFiXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImFzc2V0c1wiOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicmFuZ2VcIjogXCJpbmNsdWRlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJ1cmxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicGF0Y2hPcHRpb25cIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicGF0Y2hUeXBlXCI6IFwiZ2xvYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFsdWVcIjogdXJsICsgXCIvZGlzY3JldGVJbWFnZXMvKiovKlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJhc3NldHNcIjogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSx7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInJhbmdlXCI6IFwiaW5jbHVkZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwidXJsXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInBhdGNoT3B0aW9uXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInBhdGNoVHlwZVwiOiBcImdsb2JcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInZhbHVlXCI6IHVybCArIFwiL2F0bGFzLyoqLypcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiYXNzZXRzXCI6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhc2sgPSBFVFRhc2suY3JlYXRlPGJvb2xlYW4+KHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGUoaXRlbVBhdGgrXCIubWV0YVwiLEpTT04uc3RyaW5naWZ5KGpzb25EYXRhLCBudWxsLCAyKSwge30sKGVycik9PntcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWVycikgY29uc29sZS5lcnJvcihlcnIpOyBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhc2suc2V0UmVzdWx0KCFlcnIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGF3YWl0IHRhc2spe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncmVmcmVzaC1hc3NldCcsIGpzb25EYXRhLnV1aWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy90b2RvOlxyXG4gICAgICAgIGNvbnN0IGRyZXN1bHQgPSBhd2FpdCBFZGl0b3IuRGlhbG9nLmluZm8oJ+iuvue9ruWujOaIkO+8jOmDqOWIhuaWh+S7tuWkuemcgOmHjeWQr+e8lui+keWZqOWQjuWPr+ingScsIHtcclxuICAgICAgICAgICAgYnV0dG9uczogWyfnq4vljbPph43lkK8nLCAn56iN5ZCO5omL5Yqo6YeN5ZCvJ10sXHJcbiAgICAgICAgICAgIHRpdGxlOiAn6K6+572u5a6M5oiQJyxcclxuICAgICAgICB9KTtcclxuICAgICAgICBpZiAoMCA9PSBkcmVzdWx0LnJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIEVkaXRvci5BcHAucXVpdCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG59XHJcbiJdfQ==