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
                Editor.Message.request("asset-db", "create-asset", dbPath, null);
            }
        }
        if (names == UIFolderNames) {
            const abPath = Editor.Utils.Path.resolve(selectPath, "atlas/atlas.pac");
            const dbPath = url + "/atlas/atlas.pac";
            const task = ettask_1.ETTask.create(true);
            fs.exists(abPath, (res) => { task.setResult(res); });
            if (!await task) {
                var info = await Editor.Message.request("asset-db", "create-asset", dbPath, Editor.Utils.Path.basename(dbPath));
                if (!!info) {
                    var meta = await Editor.Message.request('asset-db', 'query-asset-meta', info.uuid);
                    if (meta != null) {
                        meta.userData.powerOfTwo = false;
                        meta.userData.compressSettings = {
                            "useCompressTexture": true,
                            "presetId": "91I12GucVJMaomwAqK5UYN"
                        };
                    }
                    await Editor.Message.request('asset-db', 'save-asset-meta', info.uuid, JSON.stringify(meta));
                }
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
                    var meta = await Editor.Message.request('asset-db', 'query-asset-meta', itemPath);
                    if (!!meta) {
                        const url = await Editor.Message.request('asset-db', 'query-url', meta.uuid);
                        if (!meta.userData.isBundle) {
                            let vs = itemPath.split('\\');
                            meta.userData.isBundle = true;
                            meta.userData.bundleName = vs[vs.length - 2] + "_" + vs[vs.length - 1];
                            meta.userData.bundleFilterConfig = [{
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
                            await Editor.Message.request('asset-db', 'save-asset-meta', meta.uuid, JSON.stringify(meta));
                        }
                    }
                }
            }
        }
        return result;
    }
    /**
     * 批量设置图片格式
     */
    static async setImagesFormat() {
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
                    var meta = await Editor.Message.request('asset-db', 'query-asset-meta', itemPath);
                    if (!!meta) {
                        const url = await Editor.Message.request('asset-db', 'query-url', meta.uuid);
                        const atlasPath = url + "/atlas/atlas.pac";
                        var atlasmeta = await Editor.Message.request('asset-db', 'query-asset-meta', atlasPath);
                        if (atlasmeta != null) {
                            atlasmeta.userData.powerOfTwo = false;
                            atlasmeta.userData.compressSettings = {
                                "useCompressTexture": true,
                                "presetId": "91I12GucVJMaomwAqK5UYN"
                            };
                            await Editor.Message.request('asset-db', 'save-asset-meta', atlasmeta.uuid, JSON.stringify(atlasmeta));
                        }
                        const discreteImagesPath = url + "/discreteImages/**";
                        var discreteImages = await Editor.Message.request('asset-db', 'query-assets', { pattern: discreteImagesPath, ccType: 'cc.ImageAsset' });
                        for (const discreteImage of discreteImages) {
                            await this.setDiscreteImageMeta(discreteImage.uuid);
                        }
                        const atlasImagesPath = url + "/atlas/**";
                        var atlasImages = await Editor.Message.request('asset-db', 'query-assets', { pattern: atlasImagesPath, ccType: 'cc.ImageAsset' });
                        for (const atlasImage of atlasImages) {
                            await this.setAtlasImageMeta(atlasImage.uuid);
                        }
                    }
                }
            }
        }
    }
    /**
     * 当资源入库时
     * @param uuid
     * @returns
     */
    static async onAssetAdd(uuid) {
        if (uuid.indexOf('@') >= 0)
            return;
        const url = await Editor.Message.request('asset-db', 'query-url', uuid);
        if (url != null && url.indexOf('assetsPackage') >= 0) {
            if (url.indexOf('discreteImages') >= 0) {
                await this.setDiscreteImageMeta(uuid);
            }
            else if (url.indexOf('atlas') >= 0) {
                await this.setAtlasImageMeta(uuid);
            }
        }
    }
    static async setDiscreteImageMeta(uuid) {
        var meta = await Editor.Message.request('asset-db', 'query-asset-meta', uuid);
        if (meta != null) {
            meta.userData.compressSettings = {
                "useCompressTexture": true,
                "presetId": "91I12GucVJMaomwAqK5UYN"
            };
            meta.userData.type = "sprite-frame";
            if (meta.subMetas != null) {
                var vs = meta.userData.redirect.split('@');
                if (vs.length == 2) {
                    var ud = meta.subMetas[vs[1]].userData;
                    ud.wrapModeS = "clamp-to-edge";
                    ud.wrapModeT = "clamp-to-edge";
                }
            }
            await Editor.Message.request('asset-db', 'save-asset-meta', meta.uuid, JSON.stringify(meta));
        }
    }
    static async setAtlasImageMeta(uuid) {
        var meta = await Editor.Message.request('asset-db', 'query-asset-meta', uuid);
        if (meta != null) {
            meta.userData.type = "sprite-frame";
            if (meta.subMetas != null) {
                var vs = meta.userData.redirect.split('@');
                if (vs.length == 2) {
                    var ud = meta.subMetas[vs[1]].userData;
                    ud.wrapModeS = "clamp-to-edge";
                    ud.wrapModeT = "clamp-to-edge";
                }
            }
            await Editor.Message.request('asset-db', 'save-asset-meta', meta.uuid, JSON.stringify(meta));
        }
    }
}
exports.FileHelper = FileHelper;
FileHelper.uiPath = ["ui", "uihall", "uigame"];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1oZWxwZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvZmlsZS1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsZ0RBQXdCO0FBQ3hCLHFDQUFrQztBQUdsQyxNQUFhLFVBQVU7SUFFbkI7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxVQUFrQixFQUFFLEdBQVc7UUFFbEUsTUFBTSxjQUFjLEdBQUcsQ0FBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFFLENBQUM7UUFDdEYsTUFBTSxlQUFlLEdBQUcsQ0FBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzlGLE1BQU0sYUFBYSxHQUFHLENBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxTQUFTLENBQUUsQ0FBQztRQUU3RSxJQUFJLEtBQUssR0FBRyxjQUFjLENBQUM7UUFFM0IsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFFLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFFLENBQUMsRUFDbkY7WUFDSSxLQUFLLEdBQUcsYUFBYSxDQUFDO1NBQ3pCO1FBQ0QsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFFLENBQUMsRUFDM0I7WUFDSSxLQUFLLEdBQUcsZUFBZSxDQUFDO1NBQzNCO1FBRUQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQ3JDO1lBQ0ksTUFBTSxNQUFN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QUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUNoRztJQUNMLENBQUM7SUFFTyxNQUFNLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQVk7UUFDL0MsSUFBSSxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUUsSUFBRyxJQUFJLElBQUUsSUFBSSxFQUFDO1lBQ1YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEdBQUcsY0FBYyxDQUFDO1lBQ3BDLElBQUcsSUFBSSxDQUFDLFFBQVEsSUFBRSxJQUFJLEVBQUM7Z0JBQ25CLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDMUMsSUFBRyxFQUFFLENBQUMsTUFBTSxJQUFFLENBQUMsRUFBQztvQkFDWixJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtvQkFDdEMsRUFBRSxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUM7b0JBQy9CLEVBQUUsQ0FBQyxTQUFTLEdBQUcsZUFBZSxDQUFDO2lCQUNsQzthQUNKO1lBQ0QsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7U0FDaEc7SUFDTCxDQUFDOztBQTVRTCxnQ0E2UUM7QUE1UTBCLGlCQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IEVUVGFzayB9IGZyb20gXCIuL2V0dGFza1wiO1xyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlSGVscGVye1xyXG4gICAgcHVibGljIHN0YXRpYyByZWFkb25seSB1aVBhdGggPSBbXCJ1aVwiLCBcInVpaGFsbFwiLCBcInVpZ2FtZVwiXVxyXG4gICAgLyoqXHJcbiAgICAgKiDliJvlu7rlrZDmlofku7blpLlcclxuICAgICAqIEBwYXJhbSBzZWxlY3RQYXRoXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBzdGF0aWMgYXN5bmMgY3JlYXRlQXJ0U3ViRm9sZGVyKHNlbGVjdFBhdGg6IHN0cmluZywgdXJsOiBzdHJpbmcpXHJcbiAgICB7XHJcbiAgICAgICAgY29uc3QgQXJ0Rm9sZGVyTmFtZXMgPSBbIFwiYW5pbWF0aW9uc1wiLCBcIm1hdGVyaWFsc1wiLCBcIm1vZGVsc1wiLCBcInRleHR1cmVzXCIsIFwicHJlZmFic1wiIF07XHJcbiAgICAgICAgY29uc3QgVW5pdEZvbGRlck5hbWVzID0gWyBcImFuaW1hdGlvbnNcIiwgXCJlZGl0XCIsIFwibWF0ZXJpYWxzXCIsIFwibW9kZWxzXCIsIFwidGV4dHVyZXNcIiwgXCJwcmVmYWJzXCJdO1xyXG4gICAgICAgIGNvbnN0IFVJRm9sZGVyTmFtZXMgPSBbIFwiYW5pbWF0aW9uc1wiLCBcImF0bGFzXCIsIFwiZGlzY3JldGVJbWFnZXNcIiwgXCJwcmVmYWJzXCIgXTtcclxuICAgICAgICBcclxuICAgICAgICB2YXIgbmFtZXMgPSBBcnRGb2xkZXJOYW1lcztcclxuXHJcbiAgICAgICAgaWYgKHVybC5pbmRleE9mKFwidWkvXCIpPj0wIHx8IHVybC5pbmRleE9mKFwidWloYWxsL1wiKT49MCB8fCB1cmwuaW5kZXhPZihcInVpZ2FtZS9cIik+PTApXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICBuYW1lcyA9IFVJRm9sZGVyTmFtZXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh1cmwuaW5kZXhPZihcInVuaXQvXCIpPj0wKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgbmFtZXMgPSBVbml0Rm9sZGVyTmFtZXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IG5hbWVzLmxlbmd0aDsgaisrKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgY29uc3QgYWJQYXRoID0gRWRpdG9yLlV0aWxzLlBhdGgucmVzb2x2ZShzZWxlY3RQYXRoLCBuYW1lc1tqXSk7XHJcbiAgICAgICAgICAgIGNvbnN0IGRiUGF0aCA9IHVybCArXCIvXCIgKyBuYW1lc1tqXTtcclxuICAgICAgICAgICAgY29uc3QgdGFzayA9IEVUVGFzay5jcmVhdGU8Ym9vbGVhbj4odHJ1ZSk7XHJcbiAgICAgICAgICAgIGZzLmV4aXN0cyhhYlBhdGgsIChyZXMpPT57IHRhc2suc2V0UmVzdWx0KHJlcykgfSk7XHJcbiAgICAgICAgICAgIGlmKCFhd2FpdCB0YXNrKVxyXG4gICAgICAgICAgICB7ICBcclxuICAgICAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJhc3NldC1kYlwiLCBcImNyZWF0ZS1hc3NldFwiLCBkYlBhdGgsIG51bGwpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihuYW1lcyA9PSBVSUZvbGRlck5hbWVzKXtcclxuICAgICAgICAgICAgY29uc3QgYWJQYXRoID0gRWRpdG9yLlV0aWxzLlBhdGgucmVzb2x2ZShzZWxlY3RQYXRoLCBcImF0bGFzL2F0bGFzLnBhY1wiKTtcclxuICAgICAgICAgICAgY29uc3QgZGJQYXRoID0gdXJsICtcIi9hdGxhcy9hdGxhcy5wYWNcIjtcclxuICAgICAgICAgICAgY29uc3QgdGFzayA9IEVUVGFzay5jcmVhdGU8Ym9vbGVhbj4odHJ1ZSk7XHJcbiAgICAgICAgICAgIGZzLmV4aXN0cyhhYlBhdGgsIChyZXMpPT57IHRhc2suc2V0UmVzdWx0KHJlcyl9KTtcclxuICAgICAgICAgICAgaWYoIWF3YWl0IHRhc2spXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIHZhciBpbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcImFzc2V0LWRiXCIsIFwiY3JlYXRlLWFzc2V0XCIsIGRiUGF0aCwgRWRpdG9yLlV0aWxzLlBhdGguYmFzZW5hbWUoZGJQYXRoKSk7XHJcbiAgICAgICAgICAgICAgICBpZighIWluZm8pe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBtZXRhID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtbWV0YScsIGluZm8udXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYobWV0YSAhPSBudWxsKVxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0YS51c2VyRGF0YS5wb3dlck9mVHdvID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGEudXNlckRhdGEuY29tcHJlc3NTZXR0aW5ncyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidXNlQ29tcHJlc3NUZXh0dXJlXCI6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInByZXNldElkXCI6IFwiOTFJMTJHdWNWSk1hb213QXFLNVVZTlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3NhdmUtYXNzZXQtbWV0YScsIGluZm8udXVpZCwgSlNPTi5zdHJpbmdpZnkobWV0YSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIOWIm+W7uuaWh+S7tuWkuVxyXG4gICAgICogQHBhcmFtIGRpciBcclxuICAgICAqL1xyXG4gICAgcHVibGljIHN0YXRpYyBhc3luYyBjcmVhdGVEaXIoZGlyOiBzdHJpbmcpIHtcclxuICAgICAgICBkaXIgPSBFZGl0b3IuVXRpbHMuUGF0aC5zbGFzaChkaXIpO1xyXG4gICAgICAgIGNvbnN0IGVkaXRvclBhdGggPSAgRWRpdG9yLlV0aWxzLlBhdGguc2xhc2goRWRpdG9yLlByb2plY3QucGF0aClcclxuICAgICAgICBpZihkaXIgPT0gZWRpdG9yUGF0aCkgcmV0dXJuXHJcbiAgICAgICAgbGV0IHVybCA9IFwiZGI6Ly9cIjtcclxuICAgICAgICBpZihFZGl0b3IuVXRpbHMuUGF0aC5pc0Fic29sdXRlKGRpcikpe1xyXG4gICAgICAgICAgICB1cmwgPSB1cmwgKyBkaXIucmVwbGFjZShlZGl0b3JQYXRoICsgJy8nLCcnKTtcclxuICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgdXJsID0gdXJsICsgZGlyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHVybCk7XHJcbiAgICAgICAgaWYoaW5mbyAhPSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgY29uc3QgaW5kZXggPSBkaXIubGFzdEluZGV4T2YoJy8nKTtcclxuICAgICAgICBpZihpbmRleCA+IDApe1xyXG4gICAgICAgICAgICBjb25zdCBwRGlyID0gZGlyLnN1YnN0cmluZygwLCBpbmRleCk7XHJcbiAgICAgICAgICAgIGF3YWl0IEZpbGVIZWxwZXIuY3JlYXRlRGlyKHBEaXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcImFzc2V0LWRiXCIsIFwiY3JlYXRlLWFzc2V0XCIsIHVybCwgbnVsbCk7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDkuIDplK7orr7nva5VSeaWh+S7tuWkuUFC5YyFXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBzdGF0aWMgYXN5bmMgc2V0dGluZ1VJQUIoKXtcclxuICAgICAgICBjb25zdCBwcm9qZWN0UGF0aCA9IEVkaXRvci5Qcm9qZWN0LnBhdGg7XHJcbiAgICAgICAgY29uc3QgZGlyUGF0aCA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgXCJhc3NldHNcIiwgXCJhc3NldHNQYWNrYWdlXCIpO1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdDphbnlbXSA9IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCB0aGlzLnVpUGF0aC5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgY29uc3QgaXRlbVBhdGggPSBwYXRoLmpvaW4oZGlyUGF0aCwgdGhpcy51aVBhdGhbaW5kZXhdKTtcclxuICAgICAgICAgICAgY29uc3QgdGFzayA9IEVUVGFzay5jcmVhdGU8Ym9vbGVhbj4odHJ1ZSk7XHJcbiAgICAgICAgICAgIGZzLmV4aXN0cyhpdGVtUGF0aCwgKHJlcyk9PnsgdGFzay5zZXRSZXN1bHQocmVzKX0pO1xyXG4gICAgICAgICAgICBpZihhd2FpdCB0YXNrKXtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGl0ZW1QYXRoKTsgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCByZXN1bHQubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSByZXN1bHRbaW5kZXhdO1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtcyA9IGZzLnJlYWRkaXJTeW5jKGVsZW1lbnQpO1xyXG5cclxuICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtUGF0aCA9IHBhdGguam9pbihlbGVtZW50LCBpdGVtKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXQgPSBmcy5zdGF0U3luYyhpdGVtUGF0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHN0YXQuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBtZXRhID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtbWV0YScsIGl0ZW1QYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZighIW1ldGEpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11cmwnLCBtZXRhLnV1aWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZighbWV0YS51c2VyRGF0YS5pc0J1bmRsZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdnMgPSBpdGVtUGF0aC5zcGxpdCgnXFxcXCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0YS51c2VyRGF0YS5pc0J1bmRsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRhLnVzZXJEYXRhLmJ1bmRsZU5hbWUgPSB2c1t2cy5sZW5ndGgtMl0rXCJfXCIrdnNbdnMubGVuZ3RoLTFdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRhLnVzZXJEYXRhLmJ1bmRsZUZpbHRlckNvbmZpZyA9ICBbe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicmFuZ2VcIjogXCJpbmNsdWRlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ0eXBlXCI6IFwidXJsXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwYXRjaE9wdGlvblwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicGF0Y2hUeXBlXCI6IFwiZ2xvYlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInZhbHVlXCI6IHVybCArIFwiL3ByZWZhYnMvKiovKi5wcmVmYWJcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJhc3NldHNcIjogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSx7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJyYW5nZVwiOiBcImluY2x1ZGVcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInR5cGVcIjogXCJ1cmxcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInBhdGNoT3B0aW9uXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwYXRjaFR5cGVcIjogXCJnbG9iXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidmFsdWVcIjogdXJsICsgXCIvZGlzY3JldGVJbWFnZXMvKiovKlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImFzc2V0c1wiOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInJhbmdlXCI6IFwiaW5jbHVkZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwidHlwZVwiOiBcInVybFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicGF0Y2hPcHRpb25cIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInBhdGNoVHlwZVwiOiBcImdsb2JcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZVwiOiB1cmwgKyBcIi9hdGxhcy8qKi8qXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiYXNzZXRzXCI6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdzYXZlLWFzc2V0LW1ldGEnLCBtZXRhLnV1aWQsIEpTT04uc3RyaW5naWZ5KG1ldGEpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICog5om56YeP6K6+572u5Zu+54mH5qC85byPXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBzdGF0aWMgYXN5bmMgc2V0SW1hZ2VzRm9ybWF0KCl7XHJcbiAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xyXG4gICAgICAgIGNvbnN0IGRpclBhdGggPSBwYXRoLmpvaW4ocHJvamVjdFBhdGgsIFwiYXNzZXRzXCIsIFwiYXNzZXRzUGFja2FnZVwiKTtcclxuICAgICAgICBjb25zdCByZXN1bHQ6YW55W10gPSBbXTtcclxuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgdGhpcy51aVBhdGgubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1QYXRoID0gcGF0aC5qb2luKGRpclBhdGgsIHRoaXMudWlQYXRoW2luZGV4XSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhc2sgPSBFVFRhc2suY3JlYXRlPGJvb2xlYW4+KHRydWUpO1xyXG4gICAgICAgICAgICBmcy5leGlzdHMoaXRlbVBhdGgsIChyZXMpPT57IHRhc2suc2V0UmVzdWx0KHJlcyl9KTtcclxuICAgICAgICAgICAgaWYoYXdhaXQgdGFzayl7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChpdGVtUGF0aCk7IFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcmVzdWx0Lmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gcmVzdWx0W2luZGV4XTtcclxuICAgICAgICAgICAgY29uc3QgaXRlbXMgPSBmcy5yZWFkZGlyU3luYyhlbGVtZW50KTtcclxuXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbVBhdGggPSBwYXRoLmpvaW4oZWxlbWVudCwgaXRlbSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoaXRlbVBhdGgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgbWV0YSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LW1ldGEnLCBpdGVtUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoISFtZXRhKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXJsID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXJsJywgbWV0YS51dWlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0bGFzUGF0aCA9IHVybCArXCIvYXRsYXMvYXRsYXMucGFjXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhdGxhc21ldGEgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1tZXRhJywgYXRsYXNQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoYXRsYXNtZXRhICE9IG51bGwpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0bGFzbWV0YS51c2VyRGF0YS5wb3dlck9mVHdvID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdGxhc21ldGEudXNlckRhdGEuY29tcHJlc3NTZXR0aW5ncyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInVzZUNvbXByZXNzVGV4dHVyZVwiOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicHJlc2V0SWRcIjogXCI5MUkxMkd1Y1ZKTWFvbXdBcUs1VVlOXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdzYXZlLWFzc2V0LW1ldGEnLCBhdGxhc21ldGEudXVpZCwgSlNPTi5zdHJpbmdpZnkoYXRsYXNtZXRhKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpc2NyZXRlSW1hZ2VzUGF0aCA9IHVybCArXCIvZGlzY3JldGVJbWFnZXMvKipcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRpc2NyZXRlSW1hZ2VzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgIHtwYXR0ZXJuOiBkaXNjcmV0ZUltYWdlc1BhdGgsIGNjVHlwZTogJ2NjLkltYWdlQXNzZXQnfSwgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBkaXNjcmV0ZUltYWdlIG9mIGRpc2NyZXRlSW1hZ2VzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldERpc2NyZXRlSW1hZ2VNZXRhKGRpc2NyZXRlSW1hZ2UudXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGF0bGFzSW1hZ2VzUGF0aCA9IHVybCArXCIvYXRsYXMvKipcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGF0bGFzSW1hZ2VzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgIHtwYXR0ZXJuOiBhdGxhc0ltYWdlc1BhdGgsIGNjVHlwZTogJ2NjLkltYWdlQXNzZXQnfSwgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBhdGxhc0ltYWdlIG9mIGF0bGFzSW1hZ2VzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldEF0bGFzSW1hZ2VNZXRhKGF0bGFzSW1hZ2UudXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiDlvZPotYTmupDlhaXlupPml7ZcclxuICAgICAqIEBwYXJhbSB1dWlkIFxyXG4gICAgICogQHJldHVybnMgXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBzdGF0aWMgYXN5bmMgb25Bc3NldEFkZCh1dWlkOnN0cmluZyl7XHJcbiAgICAgICAgaWYodXVpZC5pbmRleE9mKCdAJyk+PTApIHJldHVyblxyXG4gICAgICAgIGNvbnN0IHVybCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXVybCcsIHV1aWQpO1xyXG4gICAgICAgIGlmKHVybCAhPSBudWxsICYmIHVybC5pbmRleE9mKCdhc3NldHNQYWNrYWdlJykgPj0gMCl7XHJcbiAgICAgICAgICAgIGlmKHVybC5pbmRleE9mKCdkaXNjcmV0ZUltYWdlcycpPj0wKXtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0RGlzY3JldGVJbWFnZU1ldGEodXVpZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZih1cmwuaW5kZXhPZignYXRsYXMnKT49MCl7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldEF0bGFzSW1hZ2VNZXRhKHV1aWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBhc3luYyBzZXREaXNjcmV0ZUltYWdlTWV0YSh1dWlkOiBzdHJpbmcpe1xyXG4gICAgICAgIHZhciBtZXRhID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtbWV0YScsIHV1aWQpO1xyXG4gICAgICAgIGlmKG1ldGEhPW51bGwpe1xyXG4gICAgICAgICAgICBtZXRhLnVzZXJEYXRhLmNvbXByZXNzU2V0dGluZ3MgPSB7XHJcbiAgICAgICAgICAgICAgICBcInVzZUNvbXByZXNzVGV4dHVyZVwiOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgXCJwcmVzZXRJZFwiOiBcIjkxSTEyR3VjVkpNYW9td0FxSzVVWU5cIlxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBtZXRhLnVzZXJEYXRhLnR5cGUgPSBcInNwcml0ZS1mcmFtZVwiO1xyXG4gICAgICAgICAgICBpZihtZXRhLnN1Yk1ldGFzIT1udWxsKXtcclxuICAgICAgICAgICAgICAgIHZhciB2cyA9IG1ldGEudXNlckRhdGEucmVkaXJlY3Quc3BsaXQoJ0AnKVxyXG4gICAgICAgICAgICAgICAgaWYodnMubGVuZ3RoPT0yKXtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdWQgPSBtZXRhLnN1Yk1ldGFzW3ZzWzFdXS51c2VyRGF0YVxyXG4gICAgICAgICAgICAgICAgICAgIHVkLndyYXBNb2RlUyA9IFwiY2xhbXAtdG8tZWRnZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIHVkLndyYXBNb2RlVCA9IFwiY2xhbXAtdG8tZWRnZVwiO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnc2F2ZS1hc3NldC1tZXRhJywgbWV0YS51dWlkLCBKU09OLnN0cmluZ2lmeShtZXRhKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc3RhdGljIGFzeW5jIHNldEF0bGFzSW1hZ2VNZXRhKHV1aWQ6IHN0cmluZyl7XHJcbiAgICAgICAgdmFyIG1ldGEgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1tZXRhJywgdXVpZCk7XHJcbiAgICAgICAgaWYobWV0YSE9bnVsbCl7XHJcbiAgICAgICAgICAgIG1ldGEudXNlckRhdGEudHlwZSA9IFwic3ByaXRlLWZyYW1lXCI7XHJcbiAgICAgICAgICAgIGlmKG1ldGEuc3ViTWV0YXMhPW51bGwpe1xyXG4gICAgICAgICAgICAgICAgdmFyIHZzID0gbWV0YS51c2VyRGF0YS5yZWRpcmVjdC5zcGxpdCgnQCcpXHJcbiAgICAgICAgICAgICAgICBpZih2cy5sZW5ndGg9PTIpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB1ZCA9IG1ldGEuc3ViTWV0YXNbdnNbMV1dLnVzZXJEYXRhXHJcbiAgICAgICAgICAgICAgICAgICAgdWQud3JhcE1vZGVTID0gXCJjbGFtcC10by1lZGdlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgdWQud3JhcE1vZGVUID0gXCJjbGFtcC10by1lZGdlXCI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnc2F2ZS1hc3NldC1tZXRhJywgbWV0YS51dWlkLCBKU09OLnN0cmluZ2lmeShtZXRhKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiJdfQ==