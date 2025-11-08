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
     * 创建文件夹
     * @param dir
     */
    static async createDir(dir) {
        dir = Editor.Utils.Path.slash(dir);
        const editorPath = Editor.Utils.Path.slash(Editor.Project.path);
        if (dir == editorPath)
            return;
        let url = "db://";
        if (Editor.Utils.Path.isAbsolute(dir)) {
            url = url + dir.replace(editorPath + '/', '');
        }
        else {
            url = url + dir;
        }
        const info = await Editor.Message.request('asset-db', 'query-asset-info', url);
        if (info != null)
            return;
        const index = dir.lastIndexOf('/');
        if (index > 0) {
            const pDir = dir.substring(0, index);
            await FileHelper.createDir(pDir);
        }
        return await Editor.Message.request("asset-db", "create-asset", url, null);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvZmlsZS1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsZ0RBQXdCO0FBQ3hCLHFDQUFrQztBQUdsQyxNQUFhLFVBQVU7SUFFbkI7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxVQUFrQixFQUFFLEdBQVc7UUFFbEUsTUFBTSxjQUFjLEdBQUcsQ0FBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFFLENBQUM7UUFDdEYsTUFBTSxlQUFlLEdBQUcsQ0FBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sYUFBYSxHQUFHLENBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLENBQUUsQ0FBQztRQUU3RSxJQUFJLEtBQUssR0FBRyxjQUFjLENBQUM7UUFFM0IsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFFLENBQUMsRUFDbkY7WUFDSSxLQUFLLEdBQUcsYUFBYSxDQUFDO1NBQ3pCO1FBQ0QsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsRUFDM0I7WUFDSSxLQUFLLEdBQUcsZUFBZSxDQUFDO1NBQzNCO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQ3JDO1lBQ0ksTUFBTSxNQUFN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QyxPQUFPLEVBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBQyxDQUFDLEdBQUcsRUFBQyxFQUFFOzRCQUN2RSxJQUFJLENBQUMsQ0FBQyxHQUFHO2dDQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7NEJBQzlCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTt3QkFDeEIsQ0FBQyxDQUFDLENBQUE7d0JBQ0YsSUFBRyxNQUFNLElBQUksRUFBQzs0QkFDVixNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsZUFBZSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQzt5QkFDdEU7cUJBQ0o7aUJBRUo7YUFDSjtTQUNKO1FBQ0QsT0FBTztRQUNQLE1BQU0sT0FBTyxHQUFHLE1BQU0sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUU7WUFDNUQsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQztZQUMzQixLQUFLLEVBQUUsTUFBTTtTQUNoQixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFO1lBQ3ZCLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7U0FDckI7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDOztBQXpLTCxnQ0EwS0M7QUF6SzBCLGlCQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IEVUVGFzayB9IGZyb20gXCIuL2V0dGFza1wiO1xyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlSGVscGVye1xyXG4gICAgcHVibGljIHN0YXRpYyByZWFkb25seSB1aVBhdGggPSBbXCJ1aVwiLCBcInVpaGFsbFwiLCBcInVpZ2FtZVwiXVxyXG4gICAgLyoqXHJcbiAgICAgKiDliJvlu7rlrZDmlofku7blpLlcclxuICAgICAqIEBwYXJhbSBzZWxlY3RQYXRoXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBzdGF0aWMgYXN5bmMgY3JlYXRlQXJ0U3ViRm9sZGVyKHNlbGVjdFBhdGg6IHN0cmluZywgdXJsOiBzdHJpbmcpXHJcbiAgICB7XHJcbiAgICAgICAgY29uc3QgQXJ0Rm9sZGVyTmFtZXMgPSBbIFwiYW5pbWF0aW9uc1wiLCBcIm1hdGVyaWFsc1wiLCBcIm1vZGVsc1wiLCBcInRleHR1cmVzXCIsIFwicHJlZmFic1wiIF07XHJcbiAgICAgICAgY29uc3QgVW5pdEZvbGRlck5hbWVzID0gWyBcImFuaW1hdGlvbnNcIiwgXCJlZGl0XCIsIFwibWF0ZXJpYWxzXCIsIFwibW9kZWxzXCIsIFwidGV4dHVyZXNcIiwgXCJwcmVmYWJzXCJdO1xyXG4gICAgICAgIGNvbnN0IFVJRm9sZGVyTmFtZXMgPSBbIFwiYW5pbWF0aW9uc1wiLCBcImF0bGFzXCIsIFwiZGlzY3JldGVJbWFnZXNcIiwgXCJwcmVmYWJzXCIgXTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgbmFtZXMgPSBBcnRGb2xkZXJOYW1lcztcclxuXHJcbiAgICAgICAgaWYgKHVybC5pbmRleE9mKFwidWkvXCIpPj0wIHx8IHVybC5pbmRleE9mKFwidWloYWxsL1wiKT49MCB8fCB1cmwuaW5kZXhPZihcInVpZ2FtZS9cIik+PTApXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBuYW1lcyA9IFVJRm9sZGVyTmFtZXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh1cmwuaW5kZXhPZihcInVuaXQvXCIpPj0wKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgbmFtZXMgPSBVbml0Rm9sZGVyTmFtZXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IG5hbWVzLmxlbmd0aDsgaisrKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgYWJQYXRoID0gRWRpdG9yLlV0aWxzLlBhdGgucmVzb2x2ZShzZWxlY3RQYXRoLCBuYW1lc1tqXSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGRiUGF0aCA9IHVybCArXCIvXCIgKyBuYW1lc1tqXTtcclxuICAgICAgICAgICAgY29uc3QgdGFzayA9IEVUVGFzay5jcmVhdGU8Ym9vbGVhbj4odHJ1ZSk7XHJcbiAgICAgICAgICAgIGZzLmV4aXN0cyhhYlBhdGgsIChyZXMpPT57IHRhc2suc2V0UmVzdWx0KHJlcykgfSk7XHJcbiAgICAgICAgICAgIGlmKCFhd2FpdCB0YXNrKVxyXG4gICAgICAgICAgICB7ICBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRiUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwiYXNzZXQtZGJcIiwgXCJjcmVhdGUtYXNzZXRcIiwgZGJQYXRoLCBudWxsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYobmFtZXMgPT0gVUlGb2xkZXJOYW1lcyl7XHJcbiAgICAgICAgICAgIGNvbnN0IGFiUGF0aCA9IEVkaXRvci5VdGlscy5QYXRoLnJlc29sdmUoc2VsZWN0UGF0aCwgXCJhdGxhcy9hdGxhcy5wYWNcIik7XHJcbiAgICAgICAgICAgIGNvbnN0IGRiUGF0aCA9IHVybCArXCIvYXRsYXMvYXRsYXMucGFjXCI7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhc2sgPSBFVFRhc2suY3JlYXRlPGJvb2xlYW4+KHRydWUpO1xyXG4gICAgICAgICAgICBmcy5leGlzdHMoYWJQYXRoLCAocmVzKT0+eyB0YXNrLnNldFJlc3VsdChyZXMpfSk7XHJcbiAgICAgICAgICAgIGlmKCFhd2FpdCB0YXNrKVxyXG4gICAgICAgICAgICB7ICBcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGRiUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KFwiYXNzZXQtZGJcIiwgXCJjcmVhdGUtYXNzZXRcIiwgZGJQYXRoLCBFZGl0b3IuVXRpbHMuUGF0aC5iYXNlbmFtZShkYlBhdGgpKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDliJvlu7rmlofku7blpLlcclxuICAgICAqIEBwYXJhbSBkaXIgXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBzdGF0aWMgYXN5bmMgY3JlYXRlRGlyKGRpcjogc3RyaW5nKSB7XHJcbiAgICAgICAgZGlyID0gRWRpdG9yLlV0aWxzLlBhdGguc2xhc2goZGlyKTtcclxuICAgICAgICBjb25zdCBlZGl0b3JQYXRoID0gIEVkaXRvci5VdGlscy5QYXRoLnNsYXNoKEVkaXRvci5Qcm9qZWN0LnBhdGgpXHJcbiAgICAgICAgaWYoZGlyID09IGVkaXRvclBhdGgpIHJldHVyblxyXG4gICAgICAgIGxldCB1cmwgPSBcImRiOi8vXCI7XHJcbiAgICAgICAgaWYoRWRpdG9yLlV0aWxzLlBhdGguaXNBYnNvbHV0ZShkaXIpKXtcclxuICAgICAgICAgICAgdXJsID0gdXJsICsgZGlyLnJlcGxhY2UoZWRpdG9yUGF0aCArICcvJywnJyk7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHVybCA9IHVybCArIGRpcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCB1cmwpO1xyXG4gICAgICAgIGlmKGluZm8gIT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgICAgIGNvbnN0IGluZGV4ID0gZGlyLmxhc3RJbmRleE9mKCcvJyk7XHJcbiAgICAgICAgaWYoaW5kZXggPiAwKXtcclxuICAgICAgICAgICAgY29uc3QgcERpciA9IGRpci5zdWJzdHJpbmcoMCwgaW5kZXgpO1xyXG4gICAgICAgICAgICBhd2FpdCBGaWxlSGVscGVyLmNyZWF0ZURpcihwRGlyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJhc3NldC1kYlwiLCBcImNyZWF0ZS1hc3NldFwiLCB1cmwsIG51bGwpO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5LiA6ZSu6K6+572uVUnmlofku7blpLlBQuWMhVxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgc3RhdGljIGFzeW5jIHNldHRpbmdVSUFCKCl7XHJcbiAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xyXG4gICAgICAgIGNvbnN0IGRpclBhdGggPSBwYXRoLmpvaW4ocHJvamVjdFBhdGgsIFwiYXNzZXRzXCIsIFwiYXNzZXRzUGFja2FnZVwiKTtcclxuICAgICAgICBjb25zdCByZXN1bHQ6YW55W10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgdGhpcy51aVBhdGgubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1QYXRoID0gcGF0aC5qb2luKGRpclBhdGgsIHRoaXMudWlQYXRoW2luZGV4XSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhc2sgPSBFVFRhc2suY3JlYXRlPGJvb2xlYW4+KHRydWUpO1xyXG4gICAgICAgICAgICBmcy5leGlzdHMoaXRlbVBhdGgsIChyZXMpPT57IHRhc2suc2V0UmVzdWx0KHJlcyl9KTtcclxuICAgICAgICAgICAgaWYoYXdhaXQgdGFzayl7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChpdGVtUGF0aCk7IFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcmVzdWx0Lmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gcmVzdWx0W2luZGV4XTtcclxuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSBmcy5yZWFkZGlyU3luYyhlbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbVBhdGggPSBwYXRoLmpvaW4oZWxlbWVudCwgaXRlbSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoaXRlbVBhdGgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhpdGVtUGF0aClcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXNrID0gRVRUYXNrLmNyZWF0ZTxzdHJpbmc+KHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZzLnJlYWRGaWxlKGl0ZW1QYXRoK1wiLm1ldGFcIiwgJ3V0ZjgnLCBhc3luYyAoZXJyLCBkYXRhKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrLnNldFJlc3VsdChkYXRhKVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGpzb25EYXRhID0gSlNPTi5wYXJzZShhd2FpdCB0YXNrKTtcclxuICAgICAgICAgICAgICAgICAgICBpZighanNvbkRhdGEudXNlckRhdGEpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uRGF0YS51c2VyRGF0YSA9IHtpc0J1bmRsZTpmYWxzZX07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXVybCcsIGpzb25EYXRhLnV1aWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKCFqc29uRGF0YS51c2VyRGF0YS5pc0J1bmRsZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCB2cyA9IGl0ZW1QYXRoLnNwbGl0KCdcXFxcJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25EYXRhLnVzZXJEYXRhLmlzQnVuZGxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbkRhdGEudXNlckRhdGEuYnVuZGxlTmFtZSA9IHZzW3ZzLmxlbmd0aC0yXStcIl9cIit2c1t2cy5sZW5ndGgtMV1cclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbkRhdGEudXNlckRhdGEuYnVuZGxlRmlsdGVyQ29uZmlnID0gIFt7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInJhbmdlXCI6IFwiaW5jbHVkZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwidXJsXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInBhdGNoT3B0aW9uXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInBhdGNoVHlwZVwiOiBcImdsb2JcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInZhbHVlXCI6IHVybCArIFwiL3ByZWZhYnMvKiovKi5wcmVmYWJcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiYXNzZXRzXCI6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyYW5nZVwiOiBcImluY2x1ZGVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInVybFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwYXRjaE9wdGlvblwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwYXRjaFR5cGVcIjogXCJnbG9iXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZVwiOiB1cmwgKyBcIi9kaXNjcmV0ZUltYWdlcy8qKi8qXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImFzc2V0c1wiOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicmFuZ2VcIjogXCJpbmNsdWRlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJ1cmxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicGF0Y2hPcHRpb25cIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicGF0Y2hUeXBlXCI6IFwiZ2xvYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFsdWVcIjogdXJsICsgXCIvYXRsYXMvKiovKlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJhc3NldHNcIjogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfV1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFzayA9IEVUVGFzay5jcmVhdGU8Ym9vbGVhbj4odHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZShpdGVtUGF0aCtcIi5tZXRhXCIsSlNPTi5zdHJpbmdpZnkoanNvbkRhdGEsIG51bGwsIDIpLCB7fSwoZXJyKT0+e1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhZXJyKSBjb25zb2xlLmVycm9yKGVycik7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFzay5zZXRSZXN1bHQoIWVycilcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYXdhaXQgdGFzayl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdyZWZyZXNoLWFzc2V0JywganNvbkRhdGEudXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvL3RvZG86XHJcbiAgICAgICAgY29uc3QgZHJlc3VsdCA9IGF3YWl0IEVkaXRvci5EaWFsb2cuaW5mbygn6K6+572u5a6M5oiQ77yM6YOo5YiG5paH5Lu25aS56ZyA6YeN5ZCv57yW6L6R5Zmo5ZCO5Y+v6KeBJywge1xyXG4gICAgICAgICAgICBidXR0b25zOiBbJ+eri+WNs+mHjeWQrycsICfnqI3lkI7miYvliqjph43lkK8nXSxcclxuICAgICAgICAgICAgdGl0bGU6ICforr7nva7lrozmiJAnLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGlmICgwID09IGRyZXN1bHQucmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgRWRpdG9yLkFwcC5xdWl0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcbn1cclxuIl19