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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileHelper = void 0;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const ettask_1 = require("./ettask");
class FileHelper {
    static uiPath = ["ui", "uihall", "uigame"];
    static assetAddQueue = Promise.resolve();
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
    static onAssetAdd(uuid) {
        this.assetAddQueue = this.assetAddQueue.then(() => this.onAssetAddAsync(uuid));
    }
    static async onAssetAddAsync(uuid) {
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
            if (meta.subMetas != null && meta.userData.redirect) {
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
            if (meta.subMetas != null && meta.userData.redirect) {
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
