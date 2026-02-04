"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAssetMenu = void 0;
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
                        if ((info === null || info === void 0 ? void 0 : info.type) == "cc.Prefab") {
                            await Editor.Message.request('asset-db', 'open-asset', uuid);
                            await code_generate_1.CodeGenerate.bindUINodeByPrefab();
                        }
                    }
                }
                else {
                    if ((assetInfo === null || assetInfo === void 0 ? void 0 : assetInfo.type) == "cc.Prefab") {
                        await Editor.Message.request('asset-db', 'open-asset', assetInfo.uuid);
                        await code_generate_1.CodeGenerate.bindUINodeByPrefab();
                    }
                }
            },
        }
    ];
}
exports.onAssetMenu = onAssetMenu;
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXRzLWVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9hc3NldHMtZWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLCtDQUEyQztBQUMzQyxtREFBK0M7QUFFL0MsU0FBZ0IsV0FBVyxDQUFDLFNBQW9CO0lBQzVDLE9BQU87UUFDSDtZQUNFLEtBQUssRUFBRSxJQUFJO1lBQ1gsT0FBTyxFQUFFO2dCQUNMO29CQUNJLEtBQUssRUFBRSxPQUFPO29CQUNkLE9BQU8sRUFBRSxTQUFTLENBQUMsV0FBVztvQkFDOUIsS0FBSzt3QkFDSCx3QkFBVSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUM5RCxDQUFDO2lCQUNKO2FBQ0o7U0FDRjtRQUNEO1lBQ0UsS0FBSyxFQUFFLFFBQVE7WUFDZixPQUFPLEVBQUUsQ0FBQyxTQUFTLENBQUMsV0FBVztZQUMvQixLQUFLO2dCQUNILElBQUksUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUM7Z0JBQzlCLFFBQVEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDL0QsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUNsRCxJQUFHLEtBQUssSUFBSSxDQUFDLEVBQUM7b0JBQ1osSUFBSSxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO29CQUMxQyxRQUFRLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQzVCO2dCQUNELFFBQVEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2hELE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3RCLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztZQUMzQyxDQUFDO1NBQ0Y7UUFDRDtZQUNFLEtBQUssRUFBRSxRQUFRO1lBQ2YsT0FBTyxFQUFFLENBQUMsU0FBUyxDQUFDLFdBQVc7WUFDL0IsS0FBSyxDQUFDLEtBQUs7Z0JBQ1QsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2pELElBQUcsSUFBSSxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUM7b0JBQ2YsS0FBSyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUU7d0JBQ2hELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDekIsTUFBTSxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ2hGLElBQUcsQ0FBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsSUFBSSxLQUFJLFdBQVcsRUFBQzs0QkFDM0IsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDOzRCQUM3RCxNQUFNLDRCQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQzt5QkFDekM7cUJBQ0Y7aUJBQ0Y7cUJBQUk7b0JBQ0gsSUFBRyxDQUFBLFNBQVMsYUFBVCxTQUFTLHVCQUFULFNBQVMsQ0FBRSxJQUFJLEtBQUksV0FBVyxFQUFDO3dCQUNoQyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUN2RSxNQUFNLDRCQUFZLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztxQkFDekM7aUJBQ0Y7WUFDSCxDQUFDO1NBQ0Y7S0FDSixDQUFDO0FBQ04sQ0FBQztBQXJERCxrQ0FxREM7QUFBQSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXNzZXRJbmZvIH0gZnJvbSBcIkBjb2Nvcy9jcmVhdG9yLXR5cGVzL2VkaXRvci9wYWNrYWdlcy9hc3NldC1kYi9AdHlwZXMvcHVibGljXCI7XHJcbmltcG9ydCB7IEZpbGVIZWxwZXIgfSBmcm9tIFwiLi9maWxlLWhlbHBlclwiO1xyXG5pbXBvcnQgeyBDb2RlR2VuZXJhdGUgfSBmcm9tIFwiLi9jb2RlLWdlbmVyYXRlXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gb25Bc3NldE1lbnUoYXNzZXRJbmZvOiBBc3NldEluZm8pIHtcclxuICAgIHJldHVybiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbGFiZWw6ICflt6XlhbcnLFxyXG4gICAgICAgICAgc3VibWVudTogW1xyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgbGFiZWw6ICfliJvlu7rlrZDnm67lvZUnLFxyXG4gICAgICAgICAgICAgICAgICBlbmFibGVkOiBhc3NldEluZm8uaXNEaXJlY3RvcnksXHJcbiAgICAgICAgICAgICAgICAgIGNsaWNrKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIEZpbGVIZWxwZXIuY3JlYXRlQXJ0U3ViRm9sZGVyKGFzc2V0SW5mby5maWxlLGFzc2V0SW5mby51cmwpO1xyXG4gICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBsYWJlbDogJ+WkjeWItuebuOWvuei3r+W+hCcsXHJcbiAgICAgICAgICBlbmFibGVkOiAhYXNzZXRJbmZvLmlzRGlyZWN0b3J5LFxyXG4gICAgICAgICAgY2xpY2soKSB7XHJcbiAgICAgICAgICAgIGxldCBmaWxlUGF0aCA9IGFzc2V0SW5mby5maWxlO1xyXG4gICAgICAgICAgICBmaWxlUGF0aCA9IEVkaXRvci5VdGlscy5QYXRoLnNsYXNoKGZpbGVQYXRoLnJlcGxhY2UoXCJcXFxcXCIsXCIvXCIpKTtcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBmaWxlUGF0aC5pbmRleE9mKFwiL2Fzc2V0c1BhY2thZ2UvXCIpO1xyXG4gICAgICAgICAgICBpZihpbmRleCA+PSAwKXtcclxuICAgICAgICAgICAgICBsZXQgdnMgPSBmaWxlUGF0aC5zcGxpdCgnL2Fzc2V0c1BhY2thZ2UvJylcclxuICAgICAgICAgICAgICBmaWxlUGF0aCA9IHZzW3ZzLmxlbmd0aC0xXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmaWxlUGF0aCA9IEVkaXRvci5VdGlscy5QYXRoLnN0cmlwRXh0KGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICBFZGl0b3IuQ2xpcGJvYXJkLndyaXRlKCd0ZXh0JywgZmlsZVBhdGgpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGxhYmVsOiAn57uR5a6aVUnoioLngrknLFxyXG4gICAgICAgICAgZW5hYmxlZDogIWFzc2V0SW5mby5pc0RpcmVjdG9yeSxcclxuICAgICAgICAgIGFzeW5jIGNsaWNrKCkge1xyXG4gICAgICAgICAgICB2YXIgbGlzdCA9IEVkaXRvci5TZWxlY3Rpb24uZ2V0U2VsZWN0ZWQoXCJhc3NldFwiKTtcclxuICAgICAgICAgICAgaWYobGlzdC5sZW5ndGg+MCl7XHJcbiAgICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGxpc3QubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB1dWlkID0gbGlzdFtpbmRleF07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHV1aWQpO1xyXG4gICAgICAgICAgICAgICAgaWYoaW5mbz8udHlwZSA9PSBcImNjLlByZWZhYlwiKXtcclxuICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnb3Blbi1hc3NldCcsIHV1aWQpO1xyXG4gICAgICAgICAgICAgICAgICBhd2FpdCBDb2RlR2VuZXJhdGUuYmluZFVJTm9kZUJ5UHJlZmFiKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICBpZihhc3NldEluZm8/LnR5cGUgPT0gXCJjYy5QcmVmYWJcIil7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdvcGVuLWFzc2V0JywgYXNzZXRJbmZvLnV1aWQpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgQ29kZUdlbmVyYXRlLmJpbmRVSU5vZGVCeVByZWZhYigpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9XHJcbiAgICBdO1xyXG59OyJdfQ==