"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAssetMenu = onAssetMenu;
const file_helper_1 = require("./file-helper");
const code_generate_1 = require("./code-generate");
function onAssetMenu(assetInfo) {
    return [
        {
            label: '工具',
            submenu: [
                {
                    label: '创建子目录',
                    enabled: assetInfo.isDirectory,
                    click() {
                        file_helper_1.FileHelper.createArtSubFolder(assetInfo.file, assetInfo.url);
                    },
                }
            ],
        },
        {
            label: '复制相对路径',
            enabled: !assetInfo.isDirectory,
            click() {
                let filePath = assetInfo.file;
                filePath = Editor.Utils.Path.slash(filePath.replace("\\", "/"));
                const index = filePath.indexOf("/assetsPackage/");
                if (index >= 0) {
                    let vs = filePath.split('/assetsPackage/');
                    filePath = vs[vs.length - 1];
                }
                filePath = Editor.Utils.Path.stripExt(filePath);
                console.log(filePath);
                Editor.Clipboard.write('text', filePath);
            },
        },
        {
            label: '绑定UI节点',
            enabled: !assetInfo.isDirectory,
            async click() {
                var list = Editor.Selection.getSelected("asset");
                if (list.length > 0) {
                    for (let index = 0; index < list.length; index++) {
                        const uuid = list[index];
                        const info = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
                        if (info?.type == "cc.Prefab") {
                            await Editor.Message.request('asset-db', 'open-asset', uuid);
                            await code_generate_1.CodeGenerate.bindUINodeByPrefab();
                        }
                    }
                }
                else {
                    if (assetInfo?.type == "cc.Prefab") {
                        await Editor.Message.request('asset-db', 'open-asset', assetInfo.uuid);
                        await code_generate_1.CodeGenerate.bindUINodeByPrefab();
                    }
                }
            },
        }
    ];
}
;
