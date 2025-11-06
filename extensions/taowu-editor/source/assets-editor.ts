import { AssetInfo } from "@cocos/creator-types/editor/packages/asset-db/@types/public";
import { FileHelper } from "./file-helper";

export function onAssetMenu(assetInfo: AssetInfo) {
    return [
        {
          label: '工具',
          submenu: [
              {
                  label: '创建子目录',
                  enabled: assetInfo.isDirectory,
                  click() {
                    FileHelper.createArtSubFolder(assetInfo.file,assetInfo.url);
                  },
              }
          ],
        },
        {
          label: '复制相对路径',
          enabled: !assetInfo.isDirectory,
          click() {
            let filePath = assetInfo.file;
            filePath = Editor.Utils.Path.slash(filePath.replace("\\","/"));
            const index = filePath.indexOf("/assetsPackage/");
            if(index >= 0){
              let vs = filePath.split('/assetsPackage/')
              filePath = vs[vs.length-1];
            }
            filePath = Editor.Utils.Path.stripExt(filePath);
            console.log(filePath);
            Editor.Clipboard.write('text', filePath);
          },
        }
    ];
};