"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAssetMenu = void 0;
const file_helper_1 = require("./file-helper");
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
        }
    ];
}
exports.onAssetMenu = onAssetMenu;
;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXRzLWVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9hc3NldHMtZWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLCtDQUEyQztBQUUzQyxTQUFnQixXQUFXLENBQUMsU0FBb0I7SUFDNUMsT0FBTztRQUNIO1lBQ0UsS0FBSyxFQUFFLElBQUk7WUFDWCxPQUFPLEVBQUU7Z0JBQ0w7b0JBQ0ksS0FBSyxFQUFFLE9BQU87b0JBQ2QsT0FBTyxFQUFFLFNBQVMsQ0FBQyxXQUFXO29CQUM5QixLQUFLO3dCQUNILHdCQUFVLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLElBQUksRUFBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQzlELENBQUM7aUJBQ0o7YUFDSjtTQUNGO1FBQ0Q7WUFDRSxLQUFLLEVBQUUsUUFBUTtZQUNmLE9BQU8sRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXO1lBQy9CLEtBQUs7Z0JBQ0gsSUFBSSxRQUFRLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQztnQkFDOUIsUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksRUFBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMvRCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBQ2xELElBQUcsS0FBSyxJQUFJLENBQUMsRUFBQztvQkFDWixJQUFJLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7b0JBQzFDLFFBQVEsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sR0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDNUI7Z0JBQ0QsUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDaEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDdEIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzNDLENBQUM7U0FDRjtLQUNKLENBQUM7QUFDTixDQUFDO0FBL0JELGtDQStCQztBQUFBLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBc3NldEluZm8gfSBmcm9tIFwiQGNvY29zL2NyZWF0b3ItdHlwZXMvZWRpdG9yL3BhY2thZ2VzL2Fzc2V0LWRiL0B0eXBlcy9wdWJsaWNcIjtcclxuaW1wb3J0IHsgRmlsZUhlbHBlciB9IGZyb20gXCIuL2ZpbGUtaGVscGVyXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gb25Bc3NldE1lbnUoYXNzZXRJbmZvOiBBc3NldEluZm8pIHtcclxuICAgIHJldHVybiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbGFiZWw6ICflt6XlhbcnLFxyXG4gICAgICAgICAgc3VibWVudTogW1xyXG4gICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgbGFiZWw6ICfliJvlu7rlrZDnm67lvZUnLFxyXG4gICAgICAgICAgICAgICAgICBlbmFibGVkOiBhc3NldEluZm8uaXNEaXJlY3RvcnksXHJcbiAgICAgICAgICAgICAgICAgIGNsaWNrKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIEZpbGVIZWxwZXIuY3JlYXRlQXJ0U3ViRm9sZGVyKGFzc2V0SW5mby5maWxlLGFzc2V0SW5mby51cmwpO1xyXG4gICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBsYWJlbDogJ+WkjeWItuebuOWvuei3r+W+hCcsXHJcbiAgICAgICAgICBlbmFibGVkOiAhYXNzZXRJbmZvLmlzRGlyZWN0b3J5LFxyXG4gICAgICAgICAgY2xpY2soKSB7XHJcbiAgICAgICAgICAgIGxldCBmaWxlUGF0aCA9IGFzc2V0SW5mby5maWxlO1xyXG4gICAgICAgICAgICBmaWxlUGF0aCA9IEVkaXRvci5VdGlscy5QYXRoLnNsYXNoKGZpbGVQYXRoLnJlcGxhY2UoXCJcXFxcXCIsXCIvXCIpKTtcclxuICAgICAgICAgICAgY29uc3QgaW5kZXggPSBmaWxlUGF0aC5pbmRleE9mKFwiL2Fzc2V0c1BhY2thZ2UvXCIpO1xyXG4gICAgICAgICAgICBpZihpbmRleCA+PSAwKXtcclxuICAgICAgICAgICAgICBsZXQgdnMgPSBmaWxlUGF0aC5zcGxpdCgnL2Fzc2V0c1BhY2thZ2UvJylcclxuICAgICAgICAgICAgICBmaWxlUGF0aCA9IHZzW3ZzLmxlbmd0aC0xXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmaWxlUGF0aCA9IEVkaXRvci5VdGlscy5QYXRoLnN0cmlwRXh0KGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICBFZGl0b3IuQ2xpcGJvYXJkLndyaXRlKCd0ZXh0JywgZmlsZVBhdGgpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9XHJcbiAgICBdO1xyXG59OyJdfQ==