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
exports.CodeGenerate = void 0;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const ettask_1 = require("./ettask");
const file_helper_1 = require("./file-helper");
class CodeGenerate {
    static async getPath(node) {
        var _a, _b;
        let path = node.name.value;
        if (((_a = node.parent) === null || _a === void 0 ? void 0 : _a.value) == null)
            return path;
        var parentNode = await Editor.Message.request('scene', 'query-node', node.parent.value.uuid);
        if (parentNode == null || parentNode.name.value == "should_hide_in_hierarchy")
            return path;
        while (((_b = parentNode.parent) === null || _b === void 0 ? void 0 : _b.value) != null) {
            node = parentNode;
            parentNode = await Editor.Message.request('scene', 'query-node', parentNode.parent.value.uuid);
            if (parentNode == null || parentNode.name.value == "should_hide_in_hierarchy")
                break;
            path = node.name.value + "/" + path;
        }
        return path;
    }
    /**
     * 根据选择节点生成UI代码
     */
    static async generateUICode(nodes) {
        var _a;
        if (!nodes || nodes.length <= 0) {
            console.error("未选中节点");
            return;
        }
        var root = await Editor.Message.request('scene', 'query-node', nodes[0]);
        while (((_a = root.parent) === null || _a === void 0 ? void 0 : _a.value) != null) {
            var pNode = await Editor.Message.request('scene', 'query-node', root.parent.value.uuid);
            if (pNode.name.value == "should_hide_in_hierarchy")
                break;
            root = pNode;
        }
        if (root.__type__ == "cc.Scene")
            return;
        if (root.__prefab__ != null) {
            const rootPath = await Editor.Message.request('asset-db', 'query-path', root.__prefab__.uuid);
            if (rootPath != null && rootPath != "") {
                if (rootPath.indexOf("assetsPackage") < 0) {
                    console.error("非UI资源");
                    return;
                }
                const prefabPath = Editor.Utils.Path.slash(rootPath).split("/assetsPackage/");
                const sub = prefabPath[1].split("/");
                let subUI = null;
                for (let index = 0; index < CodeGenerate.uiPath.length; index++) {
                    if (CodeGenerate.uiPath[index].toUpperCase() == sub[0].toUpperCase()) {
                        subUI = CodeGenerate.uiScriptPath[index];
                        break;
                    }
                }
                if (!subUI) {
                    console.error("非UI资源");
                    return;
                }
                const projectPath = Editor.Project.path;
                let csPath = path_1.default.join(projectPath, "assets", "scripts", "Code", "Game", subUI);
                let count = 0;
                for (let index = 1; index < sub.length; index++) {
                    let element = sub[index].replace("ui", "UI");
                    if (element.indexOf(".") >= 0)
                        break;
                    if (element.toLowerCase() == "prefabs")
                        continue;
                    if (element.startsWith("UI")) {
                        element = "UI" + element.charAt(2).toUpperCase() + element.slice(3);
                    }
                    else {
                        element = element.charAt(0).toUpperCase() + element.slice(1);
                    }
                    csPath = path_1.default.join(csPath, element);
                    count++;
                }
                let fileName = Editor.Utils.Path.stripExt(Editor.Utils.Path.basename(rootPath).replace("ui", "UI"));
                if (fileName.startsWith("UI")) {
                    fileName = "UI" + fileName.charAt(2).toUpperCase() + fileName.slice(3);
                }
                else {
                    fileName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
                }
                csPath = path_1.default.join(csPath, fileName + ".ts");
                console.log(csPath);
                const task = ettask_1.ETTask.create(true);
                fs.exists(csPath, (res) => { task.setResult(res); });
                let exists = await task;
                if (exists) {
                    console.info("文件已存在, 将不会直接输出文件" + csPath);
                }
                let points = "../../";
                for (let index = 0; index < count; index++) {
                    points += "../";
                }
                const line = `
`;
                let header = `
import { Node } from "cc";
import { IOnCreate } from "${points}Module/UI/IOnCreate";
import { IOnEnable } from "${points}Module/UI/IOnEnable";
import { UIBaseView } from "${points}Module/UI/UIBaseView";
`;
                let fields = "";
                let onCreate = "";
                let onEnable = "";
                let func = "";
                const uiTypes = new Set();
                const names = new Set();
                for (let index = 0; index < nodes.length; index++) {
                    var node = await Editor.Message.request('scene', 'query-node', nodes[index]);
                    let baseName = node.name.value;
                    if (baseName == null || baseName == '')
                        continue;
                    baseName = baseName.replace(' ', '');
                    baseName = baseName.charAt(0).toLowerCase() + baseName.slice(1);
                    let nodeName = baseName;
                    let i = 1;
                    while (names.has(nodeName)) {
                        nodeName = baseName + i;
                        i++;
                    }
                    const upperName = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
                    names.add(nodeName);
                    const path = await CodeGenerate.getPath(node);
                    let uiType = null;
                    for (let j = 0; j < node.__comps__.length; j++) {
                        const comp = node.__comps__[j];
                        if ((comp === null || comp === void 0 ? void 0 : comp.type) != null) {
                            var thisType = CodeGenerate.typeMap.get(comp.type);
                            if (thisType == null)
                                continue;
                            if (uiType != null) {
                                for (const element of CodeGenerate.typeMap) {
                                    if (element[1] == uiType) {
                                        break;
                                    }
                                    if (element[1] == thisType) {
                                        uiType = thisType;
                                        break;
                                    }
                                }
                            }
                            else {
                                uiType = thisType;
                            }
                        }
                    }
                    if (uiType != null) {
                        uiTypes.add(uiType);
                        fields += `    public ${nodeName}: ${uiType};${line}`;
                        onCreate += `        this.${nodeName} = this.addComponent(${uiType}, "${path}");${line}`;
                        if (uiType == "UIButton") {
                            onEnable += `        this.${nodeName}.setOnClick(this.onClick${upperName}.bind(this));${line}`;
                            func += `    private onClick${upperName}(){${line}${line}    }${line}${line}`;
                        }
                        else if (uiType == "UILoopGridView") {
                            onCreate += `        this.${nodeName}.initGridView(0, this.onGet${upperName}ItemByIndex.bind(this));${line}`;
                            func += `    private onGet${upperName}ItemByIndex(gridView: LoopGridView, index: number, row: number, column: number): LoopGridViewItem {${line}        return null;${line}    }${line}${line}`;
                        }
                        else if (uiType == "UILoopListView2") {
                            onCreate += `        this.${nodeName}.initListView(0, this.onGet${upperName}ItemByIndex.bind(this));${line}`;
                            func += `    private onGet${upperName}ItemByIndex(listView: LoopListView2, index: number): LoopListViewItem2 {${line}        return null;${line}    }${line}${line}`;
                        }
                        else if (uiType == "UICopyGameObject") {
                            onCreate += `        this.${nodeName}.initListView(0, this.onGet${upperName}ItemByIndex.bind(this));${line}`;
                            func += `    private onGet${upperName}ItemByIndex(index: number, go: Node){${line}${line}    }${line}${line}`;
                        }
                    }
                    else {
                        uiTypes.add("UIEmptyView");
                        fields += `    public ${nodeName}: UIEmptyView;${line}`;
                        onCreate += `        this.${nodeName} = this.addComponent(UIEmptyView, "${path}");${line}`;
                    }
                }
                for (const element of uiTypes) {
                    header += `import { ${element} } from "${points}Module/UIComponent/${element}";${line}`;
                    if (element == "UILoopListView2") {
                        header += `import { LoopListView2 } from "${points}../ThirdParty/SuperScrollView/ListView/LoopListView2";
import { LoopListViewItem2 } from "${points}../ThirdParty/SuperScrollView/ListView/LoopListViewItem2";${line}`;
                    }
                    else if (element == "UILoopGridView") {
                        header += `import { LoopGridView } from "${points}../ThirdParty/SuperScrollView/GridView/LoopGridView";
import { LoopGridViewItem } from "${points}../ThirdParty/SuperScrollView/GridView/LoopGridViewItem";${line}`;
                    }
                }
                let content = `
${header}
export class ${fileName} extends UIBaseView implements IOnCreate, IOnEnable {

    public static readonly PrefabPath:string = "${Editor.Utils.Path.stripExt(prefabPath[1])}";

    protected getConstructor()
    {
        return ${fileName};
    }

${fields}
    public onCreate()
    {
${onCreate}
    }

    public onEnable()
    {
${onEnable}
    }

${func}
}
`;
                Editor.Clipboard.write('text', content);
                console.log("生成代码成功，已复制到剪粘板");
                if (!exists) {
                    const dir = Editor.Utils.Path.dirname(csPath);
                    await file_helper_1.FileHelper.createDir(dir);
                    fs.writeFile(csPath, content, {}, (err) => {
                        if (!!err)
                            console.error(err);
                        task.setResult(!err);
                    });
                }
            }
        }
    }
}
exports.CodeGenerate = CodeGenerate;
CodeGenerate.uiPath = file_helper_1.FileHelper.uiPath;
CodeGenerate.uiScriptPath = ["UI", "UIHall", "UIGame"];
CodeGenerate.typeMap = new Map([
    ["CopyGameObject", "UICopyGameObject"],
    ["LoopListView2", "UILoopListView2"],
    ["LoopGridView", "UILoopGridView"],
    ["cc.Button", "UIButton"],
    ["cc.EditBox", "UIInput"],
    ["cc.Slider", "UISilder"],
    ["cc.Sprite", "UIImage"],
    ["cc.Label", "UIText"],
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1nZW5lcmF0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9jb2RlLWdlbmVyYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUNBQXlCO0FBQ3pCLGdEQUF3QjtBQUN4QixxQ0FBa0M7QUFFbEMsK0NBQTJDO0FBRTNDLE1BQWEsWUFBWTtJQWNkLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVc7O1FBQ25DLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQzNCLElBQUcsQ0FBQSxNQUFBLElBQUksQ0FBQyxNQUFNLDBDQUFFLEtBQUssS0FBSSxJQUFJO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDM0MsSUFBSSxVQUFVLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdGLElBQUcsVUFBVSxJQUFJLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSwwQkFBMEI7WUFBRSxPQUFPLElBQUksQ0FBQztRQUMxRixPQUFNLENBQUEsTUFBQSxVQUFVLENBQUMsTUFBTSwwQ0FBRSxLQUFLLEtBQUksSUFBSSxFQUFDO1lBQ25DLElBQUksR0FBRyxVQUFVLENBQUM7WUFDbEIsVUFBVSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvRixJQUFHLFVBQVUsSUFBSSxJQUFJLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksMEJBQTBCO2dCQUFFLE1BQU07WUFDcEYsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUM7U0FDdkM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNoQixDQUFDO0lBQ0Q7O09BRUc7SUFDSSxNQUFNLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUFlOztRQUM5QyxJQUFHLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUcsQ0FBQyxFQUFFO1lBQzNCLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdEIsT0FBTztTQUNWO1FBQ0QsSUFBSSxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pFLE9BQU0sQ0FBQSxNQUFBLElBQUksQ0FBQyxNQUFNLDBDQUFFLEtBQUssS0FBSSxJQUFJLEVBQUM7WUFDN0IsSUFBSSxLQUFLLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hGLElBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksMEJBQTBCO2dCQUFFLE1BQU07WUFDekQsSUFBSSxHQUFHLEtBQUssQ0FBQTtTQUNmO1FBQ0QsSUFBRyxJQUFJLENBQUMsUUFBUSxJQUFJLFVBQVU7WUFBRSxPQUFPO1FBRXZDLElBQUcsSUFBSSxDQUFDLFVBQVUsSUFBRSxJQUFJLEVBQUM7WUFDckIsTUFBTSxRQUFRLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOUYsSUFBRyxRQUFRLElBQUksSUFBSSxJQUFJLFFBQVEsSUFBRSxFQUFFLEVBQUM7Z0JBQ2hDLElBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBQyxDQUFDLEVBQUU7b0JBQ3BDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7b0JBQ3RCLE9BQU07aUJBQ1Q7Z0JBQ0QsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUM5RSxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUE7Z0JBQ2hCLEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDN0QsSUFBRyxZQUFZLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBQzt3QkFDaEUsS0FBSyxHQUFHLFlBQVksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7d0JBQ3pDLE1BQU07cUJBQ1Q7aUJBQ0o7Z0JBQ0QsSUFBRyxDQUFDLEtBQUssRUFBRTtvQkFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUN0QixPQUFNO2lCQUNUO2dCQUVELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDO2dCQUN4QyxJQUFJLE1BQU0sR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFDLE1BQU0sRUFBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQzlFLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztnQkFDZCxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDN0MsSUFBSSxPQUFPLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLENBQUM7b0JBQzVDLElBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBRyxDQUFDO3dCQUFHLE1BQU07b0JBQ3BDLElBQUcsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLFNBQVM7d0JBQUcsU0FBUztvQkFDakQsSUFBRyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFDO3dCQUN4QixPQUFPLEdBQUcsSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtxQkFDdEU7eUJBQUk7d0JBQ0QsT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtxQkFDL0Q7b0JBQ0QsTUFBTSxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO29CQUNuQyxLQUFLLEVBQUUsQ0FBQztpQkFDWDtnQkFDRCxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDbkcsSUFBRyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUMxQixRQUFRLEdBQUcsSUFBSSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtpQkFDekU7cUJBQUk7b0JBQ0QsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDbkU7Z0JBRUQsTUFBTSxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFFBQVEsR0FBRSxLQUFLLENBQUMsQ0FBQztnQkFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDbkIsTUFBTSxJQUFJLEdBQUcsZUFBTSxDQUFDLE1BQU0sQ0FBVSxJQUFJLENBQUMsQ0FBQztnQkFDMUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUMsRUFBRSxHQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbEQsSUFBSSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUE7Z0JBQ3ZCLElBQUcsTUFBTSxFQUNUO29CQUNJLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEdBQUMsTUFBTSxDQUFDLENBQUM7aUJBQzNDO2dCQUVELElBQUksTUFBTSxHQUFHLFFBQVEsQ0FBQztnQkFDdEIsS0FBSyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtvQkFDeEMsTUFBTSxJQUFHLEtBQUssQ0FBQTtpQkFDakI7Z0JBQ0QsTUFBTSxJQUFJLEdBQUc7Q0FDNUIsQ0FBQTtnQkFDZSxJQUFJLE1BQU0sR0FDMUI7OzZCQUU2QixNQUFNOzZCQUNOLE1BQU07OEJBQ0wsTUFBTTtDQUNuQyxDQUFBO2dCQUNlLElBQUksTUFBTSxHQUFHLEVBQUUsQ0FBQTtnQkFDZixJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUE7Z0JBQ2pCLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQTtnQkFDakIsSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFBO2dCQUNiLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7Z0JBRWxDLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7Z0JBRWhDLEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFO29CQUMvQyxJQUFJLElBQUksR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQzdFLElBQUksUUFBUSxHQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBZ0IsQ0FBQztvQkFDM0MsSUFBRyxRQUFRLElBQUUsSUFBSSxJQUFJLFFBQVEsSUFBSSxFQUFFO3dCQUFFLFNBQVM7b0JBQzlDLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsQ0FBQztvQkFDcEMsUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDaEUsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDO29CQUN4QixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ1YsT0FBTSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFDO3dCQUN0QixRQUFRLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQzt3QkFDeEIsQ0FBQyxFQUFFLENBQUM7cUJBQ1A7b0JBQ0QsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN2RSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNwQixNQUFNLElBQUksR0FBRyxNQUFNLFlBQVksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQzlDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQztvQkFDbEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO3dCQUM1QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUMvQixJQUFHLENBQUEsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLElBQUksS0FBSSxJQUFJLEVBQUU7NEJBQ25CLElBQUksUUFBUSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDbkQsSUFBRyxRQUFRLElBQUksSUFBSTtnQ0FBRSxTQUFTOzRCQUM5QixJQUFHLE1BQU0sSUFBSSxJQUFJLEVBQUM7Z0NBQ2QsS0FBSyxNQUFNLE9BQU8sSUFBSSxZQUFZLENBQUMsT0FBTyxFQUFFO29DQUN4QyxJQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLEVBQUU7d0NBQ3JCLE1BQU07cUNBQ1Q7b0NBQ0QsSUFBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksUUFBUSxFQUFFO3dDQUN2QixNQUFNLEdBQUcsUUFBUSxDQUFDO3dDQUNsQixNQUFNO3FDQUNUO2lDQUNKOzZCQUNKO2lDQUFJO2dDQUNELE1BQU0sR0FBRyxRQUFRLENBQUM7NkJBQ3JCO3lCQUNKO3FCQUVKO29CQUNELElBQUcsTUFBTSxJQUFJLElBQUksRUFBRTt3QkFDZixPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO3dCQUNuQixNQUFNLElBQUksY0FBYyxRQUFRLEtBQUssTUFBTSxJQUFJLElBQUksRUFBRSxDQUFDO3dCQUN0RCxRQUFRLElBQUksZ0JBQWdCLFFBQVEsd0JBQXdCLE1BQU0sTUFBTSxJQUFJLE1BQU0sSUFBSSxFQUFFLENBQUM7d0JBQ3pGLElBQUcsTUFBTSxJQUFJLFVBQVUsRUFBQzs0QkFDcEIsUUFBUSxJQUFJLGdCQUFnQixRQUFRLDJCQUEyQixTQUFTLGdCQUFnQixJQUFJLEVBQUUsQ0FBQzs0QkFDL0YsSUFBSSxJQUFJLHNCQUFzQixTQUFTLE1BQU0sSUFBSSxHQUFHLElBQUksUUFBUSxJQUFJLEdBQUcsSUFBSSxFQUFFLENBQUE7eUJBQ2hGOzZCQUFNLElBQUcsTUFBTSxJQUFJLGdCQUFnQixFQUFDOzRCQUNqQyxRQUFRLElBQUksZ0JBQWdCLFFBQVEsOEJBQThCLFNBQVMsMkJBQTJCLElBQUksRUFBRSxDQUFDOzRCQUM3RyxJQUFJLElBQUksb0JBQW9CLFNBQVMsc0dBQXNHLElBQUksdUJBQXVCLElBQUksUUFBUSxJQUFJLEdBQUcsSUFBSSxFQUFFLENBQUE7eUJBQ2xNOzZCQUFNLElBQUcsTUFBTSxJQUFJLGlCQUFpQixFQUFDOzRCQUNsQyxRQUFRLElBQUksZ0JBQWdCLFFBQVEsOEJBQThCLFNBQVMsMkJBQTJCLElBQUksRUFBRSxDQUFDOzRCQUM3RyxJQUFJLElBQUksb0JBQW9CLFNBQVMsMkVBQTJFLElBQUksdUJBQXVCLElBQUksUUFBUSxJQUFJLEdBQUcsSUFBSSxFQUFFLENBQUE7eUJBQ3ZLOzZCQUFNLElBQUcsTUFBTSxJQUFJLGtCQUFrQixFQUFDOzRCQUNuQyxRQUFRLElBQUksZ0JBQWdCLFFBQVEsOEJBQThCLFNBQVMsMkJBQTJCLElBQUksRUFBRSxDQUFDOzRCQUM3RyxJQUFJLElBQUksb0JBQW9CLFNBQVMsd0NBQXdDLElBQUksR0FBRyxJQUFJLFFBQVEsSUFBSSxHQUFHLElBQUksRUFBRSxDQUFBO3lCQUNoSDtxQkFDSjt5QkFBTTt3QkFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO3dCQUMxQixNQUFNLElBQUksY0FBYyxRQUFRLGlCQUFpQixJQUFJLEVBQUUsQ0FBQzt3QkFDeEQsUUFBUSxJQUFJLGdCQUFnQixRQUFRLHNDQUFzQyxJQUFJLE1BQU0sSUFBSSxFQUFFLENBQUM7cUJBQzlGO2lCQUNKO2dCQUVELEtBQUssTUFBTSxPQUFPLElBQUksT0FBTyxFQUFFO29CQUMzQixNQUFNLElBQUksWUFBWSxPQUFPLFlBQVksTUFBTSxzQkFBc0IsT0FBTyxLQUFLLElBQUksRUFBRSxDQUFBO29CQUN2RixJQUFHLE9BQU8sSUFBSSxpQkFBaUIsRUFBQzt3QkFDNUIsTUFBTSxJQUFJLGtDQUFrQyxNQUFNO3FDQUNyQyxNQUFNLDZEQUE2RCxJQUFJLEVBQUUsQ0FBQTtxQkFDekY7eUJBQU0sSUFBRyxPQUFPLElBQUksZ0JBQWdCLEVBQUM7d0JBQ2xDLE1BQU0sSUFBSSxpQ0FBaUMsTUFBTTtvQ0FDckMsTUFBTSw0REFBNEQsSUFBSSxFQUFFLENBQUE7cUJBQ3ZGO2lCQUNKO2dCQUVELElBQUksT0FBTyxHQUMzQjtFQUNFLE1BQU07ZUFDTyxRQUFROztrREFFMkIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7OztpQkFJMUUsUUFBUTs7O0VBR3ZCLE1BQU07OztFQUdOLFFBQVE7Ozs7O0VBS1IsUUFBUTs7O0VBR1IsSUFBSTs7Q0FFTCxDQUFBO2dCQUVlLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO2dCQUM3QixJQUFHLENBQUMsTUFBTSxFQUFDO29CQUNQLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDOUMsTUFBTSx3QkFBVSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDaEMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUMsT0FBTyxFQUFFLEVBQUUsRUFBQyxDQUFDLEdBQUcsRUFBQyxFQUFFO3dCQUNuQyxJQUFJLENBQUMsQ0FBQyxHQUFHOzRCQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQzlCLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDeEIsQ0FBQyxDQUFDLENBQUE7aUJBQ0w7YUFFSjtTQUNKO0lBQ0wsQ0FBQzs7QUFyT0wsb0NBd09DO0FBdk8yQixtQkFBTSxHQUFHLHdCQUFVLENBQUMsTUFBTSxDQUFBO0FBQzFCLHlCQUFZLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0FBRWxELG9CQUFPLEdBQXVCLElBQUksR0FBRyxDQUFnQjtJQUNoRSxDQUFDLGdCQUFnQixFQUFHLGtCQUFrQixDQUFDO0lBQ3ZDLENBQUMsZUFBZSxFQUFHLGlCQUFpQixDQUFDO0lBQ3JDLENBQUMsY0FBYyxFQUFHLGdCQUFnQixDQUFDO0lBQ25DLENBQUMsV0FBVyxFQUFHLFVBQVUsQ0FBQztJQUMxQixDQUFDLFlBQVksRUFBRyxTQUFTLENBQUM7SUFDMUIsQ0FBQyxXQUFXLEVBQUcsVUFBVSxDQUFDO0lBQzFCLENBQUMsV0FBVyxFQUFHLFNBQVMsQ0FBQztJQUN6QixDQUFDLFVBQVUsRUFBRyxRQUFRLENBQUM7Q0FDMUIsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCB7IEVUVGFzayB9IGZyb20gXCIuL2V0dGFza1wiO1xyXG5pbXBvcnQgeyBJTm9kZSB9IGZyb20gXCJAY29jb3MvY3JlYXRvci10eXBlcy9lZGl0b3IvcGFja2FnZXMvc2NlbmUvQHR5cGVzL3B1YmxpY1wiO1xyXG5pbXBvcnQgeyBGaWxlSGVscGVyIH0gZnJvbSBcIi4vZmlsZS1oZWxwZXJcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb2RlR2VuZXJhdGV7XHJcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSB1aVBhdGggPSBGaWxlSGVscGVyLnVpUGF0aFxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgdWlTY3JpcHRQYXRoID0gW1wiVUlcIiwgXCJVSUhhbGxcIiwgXCJVSUdhbWVcIl1cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyB0eXBlTWFwOiBNYXA8c3RyaW5nLHN0cmluZz4gPSBuZXcgTWFwPHN0cmluZyxzdHJpbmc+KFtcclxuICAgICAgICBbXCJDb3B5R2FtZU9iamVjdFwiICwgXCJVSUNvcHlHYW1lT2JqZWN0XCJdLFxyXG4gICAgICAgIFtcIkxvb3BMaXN0VmlldzJcIiAsIFwiVUlMb29wTGlzdFZpZXcyXCJdLFxyXG4gICAgICAgIFtcIkxvb3BHcmlkVmlld1wiICwgXCJVSUxvb3BHcmlkVmlld1wiXSxcclxuICAgICAgICBbXCJjYy5CdXR0b25cIiAsIFwiVUlCdXR0b25cIl0sXHJcbiAgICAgICAgW1wiY2MuRWRpdEJveFwiICwgXCJVSUlucHV0XCJdLFxyXG4gICAgICAgIFtcImNjLlNsaWRlclwiICwgXCJVSVNpbGRlclwiXSxcclxuICAgICAgICBbXCJjYy5TcHJpdGVcIiAsIFwiVUlJbWFnZVwiXSxcclxuICAgICAgICBbXCJjYy5MYWJlbFwiICwgXCJVSVRleHRcIl0sXHJcbiAgICBdKVxyXG4gICAgcHVibGljIHN0YXRpYyBhc3luYyBnZXRQYXRoKG5vZGU6IElOb2RlKXtcclxuICAgICAgICBsZXQgcGF0aCA9IG5vZGUubmFtZS52YWx1ZTtcclxuICAgICAgICBpZihub2RlLnBhcmVudD8udmFsdWUgPT0gbnVsbCkgcmV0dXJuIHBhdGg7XHJcbiAgICAgICAgdmFyIHBhcmVudE5vZGUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZS5wYXJlbnQudmFsdWUudXVpZCk7XHJcbiAgICAgICAgaWYocGFyZW50Tm9kZSA9PSBudWxsIHx8IHBhcmVudE5vZGUubmFtZS52YWx1ZSA9PSBcInNob3VsZF9oaWRlX2luX2hpZXJhcmNoeVwiKSByZXR1cm4gcGF0aDtcclxuICAgICAgICB3aGlsZShwYXJlbnROb2RlLnBhcmVudD8udmFsdWUgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgIG5vZGUgPSBwYXJlbnROb2RlO1xyXG4gICAgICAgICAgICBwYXJlbnROb2RlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIHBhcmVudE5vZGUucGFyZW50LnZhbHVlLnV1aWQpO1xyXG4gICAgICAgICAgICBpZihwYXJlbnROb2RlID09IG51bGwgfHwgcGFyZW50Tm9kZS5uYW1lLnZhbHVlID09IFwic2hvdWxkX2hpZGVfaW5faGllcmFyY2h5XCIpIGJyZWFrO1xyXG4gICAgICAgICAgICBwYXRoID0gbm9kZS5uYW1lLnZhbHVlICsgXCIvXCIgKyBwYXRoO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcGF0aDtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICog5qC55o2u6YCJ5oup6IqC54K555Sf5oiQVUnku6PnoIFcclxuICAgICAqL1xyXG4gICAgcHVibGljIHN0YXRpYyBhc3luYyBnZW5lcmF0ZVVJQ29kZShub2Rlczogc3RyaW5nW10pe1xyXG4gICAgICAgIGlmKCFub2RlcyB8fCBub2Rlcy5sZW5ndGggPD0wKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCLmnKrpgInkuK3oioLngrlcIilcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcm9vdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2Rlc1swXSk7XHJcbiAgICAgICAgd2hpbGUocm9vdC5wYXJlbnQ/LnZhbHVlICE9IG51bGwpe1xyXG4gICAgICAgICAgICB2YXIgcE5vZGUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgcm9vdC5wYXJlbnQudmFsdWUudXVpZCk7XHJcbiAgICAgICAgICAgIGlmKHBOb2RlLm5hbWUudmFsdWUgPT0gXCJzaG91bGRfaGlkZV9pbl9oaWVyYXJjaHlcIikgYnJlYWs7XHJcbiAgICAgICAgICAgIHJvb3QgPSBwTm9kZVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihyb290Ll9fdHlwZV9fID09IFwiY2MuU2NlbmVcIikgcmV0dXJuO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKHJvb3QuX19wcmVmYWJfXyE9bnVsbCl7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvb3RQYXRoID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktcGF0aCcsIHJvb3QuX19wcmVmYWJfXy51dWlkKTtcclxuICAgICAgICAgICAgaWYocm9vdFBhdGggIT0gbnVsbCAmJiByb290UGF0aCE9XCJcIil7XHJcbiAgICAgICAgICAgICAgICBpZihyb290UGF0aC5pbmRleE9mKFwiYXNzZXRzUGFja2FnZVwiKTwwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIumdnlVJ6LWE5rqQXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwcmVmYWJQYXRoID0gRWRpdG9yLlV0aWxzLlBhdGguc2xhc2gocm9vdFBhdGgpLnNwbGl0KFwiL2Fzc2V0c1BhY2thZ2UvXCIpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3ViID0gcHJlZmFiUGF0aFsxXS5zcGxpdChcIi9cIik7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3ViVUkgPSBudWxsXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgQ29kZUdlbmVyYXRlLnVpUGF0aC5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZihDb2RlR2VuZXJhdGUudWlQYXRoW2luZGV4XS50b1VwcGVyQ2FzZSgpID09IHN1YlswXS50b1VwcGVyQ2FzZSgpKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3ViVUkgPSBDb2RlR2VuZXJhdGUudWlTY3JpcHRQYXRoW2luZGV4XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYoIXN1YlVJKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIumdnlVJ6LWE5rqQXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNzUGF0aCA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgXCJhc3NldHNcIiwgXCJzY3JpcHRzXCIsXCJDb2RlXCIsXCJHYW1lXCIsIHN1YlVJKTtcclxuICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IDE7IGluZGV4IDwgc3ViLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBlbGVtZW50ID0gc3ViW2luZGV4XS5yZXBsYWNlKFwidWlcIixcIlVJXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGVsZW1lbnQuaW5kZXhPZihcIi5cIikgPj0wICkgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZWxlbWVudC50b0xvd2VyQ2FzZSgpID09IFwicHJlZmFic1wiICkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZWxlbWVudC5zdGFydHNXaXRoKFwiVUlcIikpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gXCJVSVwiICsgZWxlbWVudC5jaGFyQXQoMikudG9VcHBlckNhc2UoKSArIGVsZW1lbnQuc2xpY2UoMylcclxuICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBlbGVtZW50LnNsaWNlKDEpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGNzUGF0aCA9IHBhdGguam9pbihjc1BhdGgsIGVsZW1lbnQpXHJcbiAgICAgICAgICAgICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCBmaWxlTmFtZSA9IEVkaXRvci5VdGlscy5QYXRoLnN0cmlwRXh0KEVkaXRvci5VdGlscy5QYXRoLmJhc2VuYW1lKHJvb3RQYXRoKS5yZXBsYWNlKFwidWlcIixcIlVJXCIpKTsgXHJcbiAgICAgICAgICAgICAgICBpZihmaWxlTmFtZS5zdGFydHNXaXRoKFwiVUlcIikpIHtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlTmFtZSA9IFwiVUlcIiArIGZpbGVOYW1lLmNoYXJBdCgyKS50b1VwcGVyQ2FzZSgpICsgZmlsZU5hbWUuc2xpY2UoMylcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lID0gZmlsZU5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBmaWxlTmFtZS5zbGljZSgxKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjc1BhdGggPSBwYXRoLmpvaW4oY3NQYXRoLCBmaWxlTmFtZSArXCIudHNcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjc1BhdGgpXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0YXNrID0gRVRUYXNrLmNyZWF0ZTxib29sZWFuPih0cnVlKTtcclxuICAgICAgICAgICAgICAgIGZzLmV4aXN0cyhjc1BhdGgsIChyZXMpPT57IHRhc2suc2V0UmVzdWx0KHJlcykgfSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgZXhpc3RzID0gYXdhaXQgdGFza1xyXG4gICAgICAgICAgICAgICAgaWYoZXhpc3RzKVxyXG4gICAgICAgICAgICAgICAgeyAgXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwi5paH5Lu25bey5a2Y5ZyoLCDlsIbkuI3kvJrnm7TmjqXovpPlh7rmlofku7ZcIitjc1BhdGgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwb2ludHMgPSBcIi4uLy4uL1wiO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGNvdW50OyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9pbnRzICs9XCIuLi9cIlxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc3QgbGluZSA9IGBcclxuYFxyXG4gICAgICAgICAgICAgICAgbGV0IGhlYWRlciA9IFxyXG5gXHJcbmltcG9ydCB7IE5vZGUgfSBmcm9tIFwiY2NcIjtcclxuaW1wb3J0IHsgSU9uQ3JlYXRlIH0gZnJvbSBcIiR7cG9pbnRzfU1vZHVsZS9VSS9JT25DcmVhdGVcIjtcclxuaW1wb3J0IHsgSU9uRW5hYmxlIH0gZnJvbSBcIiR7cG9pbnRzfU1vZHVsZS9VSS9JT25FbmFibGVcIjtcclxuaW1wb3J0IHsgVUlCYXNlVmlldyB9IGZyb20gXCIke3BvaW50c31Nb2R1bGUvVUkvVUlCYXNlVmlld1wiO1xyXG5gXHJcbiAgICAgICAgICAgICAgICBsZXQgZmllbGRzID0gXCJcIlxyXG4gICAgICAgICAgICAgICAgbGV0IG9uQ3JlYXRlID0gXCJcIlxyXG4gICAgICAgICAgICAgICAgbGV0IG9uRW5hYmxlID0gXCJcIlxyXG4gICAgICAgICAgICAgICAgbGV0IGZ1bmMgPSBcIlwiXHJcbiAgICAgICAgICAgICAgICBjb25zdCB1aVR5cGVzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IG5vZGVzLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBub2RlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVzW2luZGV4XSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJhc2VOYW1lID0gKG5vZGUubmFtZS52YWx1ZSBhcyBzdHJpbmcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJhc2VOYW1lPT1udWxsIHx8IGJhc2VOYW1lID09ICcnKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICBiYXNlTmFtZSA9IGJhc2VOYW1lLnJlcGxhY2UoJyAnLCcnKTtcclxuICAgICAgICAgICAgICAgICAgICBiYXNlTmFtZSA9IGJhc2VOYW1lLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgYmFzZU5hbWUuc2xpY2UoMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5vZGVOYW1lID0gYmFzZU5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGkgPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlKG5hbWVzLmhhcyhub2RlTmFtZSkpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlTmFtZSA9IGJhc2VOYW1lICsgaTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cHBlck5hbWUgPSBub2RlTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5vZGVOYW1lLnNsaWNlKDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzLmFkZChub2RlTmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IGF3YWl0IENvZGVHZW5lcmF0ZS5nZXRQYXRoKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB1aVR5cGUgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgbm9kZS5fX2NvbXBzX18ubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcCA9IG5vZGUuX19jb21wc19fW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjb21wPy50eXBlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0aGlzVHlwZSA9IENvZGVHZW5lcmF0ZS50eXBlTWFwLmdldChjb21wLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodGhpc1R5cGUgPT0gbnVsbCkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih1aVR5cGUgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIENvZGVHZW5lcmF0ZS50eXBlTWFwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGVsZW1lbnRbMV0gPT0gdWlUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihlbGVtZW50WzFdID09IHRoaXNUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aVR5cGUgPSB0aGlzVHlwZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdWlUeXBlID0gdGhpc1R5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYodWlUeXBlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdWlUeXBlcy5hZGQodWlUeXBlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWVsZHMgKz0gYCAgICBwdWJsaWMgJHtub2RlTmFtZX06ICR7dWlUeXBlfTske2xpbmV9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25DcmVhdGUgKz0gYCAgICAgICAgdGhpcy4ke25vZGVOYW1lfSA9IHRoaXMuYWRkQ29tcG9uZW50KCR7dWlUeXBlfSwgXCIke3BhdGh9XCIpOyR7bGluZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZih1aVR5cGUgPT0gXCJVSUJ1dHRvblwiKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRW5hYmxlICs9IGAgICAgICAgIHRoaXMuJHtub2RlTmFtZX0uc2V0T25DbGljayh0aGlzLm9uQ2xpY2ske3VwcGVyTmFtZX0uYmluZCh0aGlzKSk7JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jICs9IGAgICAgcHJpdmF0ZSBvbkNsaWNrJHt1cHBlck5hbWV9KCl7JHtsaW5lfSR7bGluZX0gICAgfSR7bGluZX0ke2xpbmV9YFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYodWlUeXBlID09IFwiVUlMb29wR3JpZFZpZXdcIil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNyZWF0ZSArPSBgICAgICAgICB0aGlzLiR7bm9kZU5hbWV9LmluaXRHcmlkVmlldygwLCB0aGlzLm9uR2V0JHt1cHBlck5hbWV9SXRlbUJ5SW5kZXguYmluZCh0aGlzKSk7JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jICs9IGAgICAgcHJpdmF0ZSBvbkdldCR7dXBwZXJOYW1lfUl0ZW1CeUluZGV4KGdyaWRWaWV3OiBMb29wR3JpZFZpZXcsIGluZGV4OiBudW1iZXIsIHJvdzogbnVtYmVyLCBjb2x1bW46IG51bWJlcik6IExvb3BHcmlkVmlld0l0ZW0geyR7bGluZX0gICAgICAgIHJldHVybiBudWxsOyR7bGluZX0gICAgfSR7bGluZX0ke2xpbmV9YFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYodWlUeXBlID09IFwiVUlMb29wTGlzdFZpZXcyXCIpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DcmVhdGUgKz0gYCAgICAgICAgdGhpcy4ke25vZGVOYW1lfS5pbml0TGlzdFZpZXcoMCwgdGhpcy5vbkdldCR7dXBwZXJOYW1lfUl0ZW1CeUluZGV4LmJpbmQodGhpcykpOyR7bGluZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuYyArPSBgICAgIHByaXZhdGUgb25HZXQke3VwcGVyTmFtZX1JdGVtQnlJbmRleChsaXN0VmlldzogTG9vcExpc3RWaWV3MiwgaW5kZXg6IG51bWJlcik6IExvb3BMaXN0Vmlld0l0ZW0yIHske2xpbmV9ICAgICAgICByZXR1cm4gbnVsbDske2xpbmV9ICAgIH0ke2xpbmV9JHtsaW5lfWBcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmKHVpVHlwZSA9PSBcIlVJQ29weUdhbWVPYmplY3RcIil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNyZWF0ZSArPSBgICAgICAgICB0aGlzLiR7bm9kZU5hbWV9LmluaXRMaXN0VmlldygwLCB0aGlzLm9uR2V0JHt1cHBlck5hbWV9SXRlbUJ5SW5kZXguYmluZCh0aGlzKSk7JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jICs9IGAgICAgcHJpdmF0ZSBvbkdldCR7dXBwZXJOYW1lfUl0ZW1CeUluZGV4KGluZGV4OiBudW1iZXIsIGdvOiBOb2RlKXske2xpbmV9JHtsaW5lfSAgICB9JHtsaW5lfSR7bGluZX1gXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1aVR5cGVzLmFkZChcIlVJRW1wdHlWaWV3XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkcyArPSBgICAgIHB1YmxpYyAke25vZGVOYW1lfTogVUlFbXB0eVZpZXc7JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ3JlYXRlICs9IGAgICAgICAgIHRoaXMuJHtub2RlTmFtZX0gPSB0aGlzLmFkZENvbXBvbmVudChVSUVtcHR5VmlldywgXCIke3BhdGh9XCIpOyR7bGluZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgdWlUeXBlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlciArPSBgaW1wb3J0IHsgJHtlbGVtZW50fSB9IGZyb20gXCIke3BvaW50c31Nb2R1bGUvVUlDb21wb25lbnQvJHtlbGVtZW50fVwiOyR7bGluZX1gXHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZWxlbWVudCA9PSBcIlVJTG9vcExpc3RWaWV3MlwiKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyICs9IGBpbXBvcnQgeyBMb29wTGlzdFZpZXcyIH0gZnJvbSBcIiR7cG9pbnRzfS4uL1RoaXJkUGFydHkvU3VwZXJTY3JvbGxWaWV3L0xpc3RWaWV3L0xvb3BMaXN0VmlldzJcIjtcclxuaW1wb3J0IHsgTG9vcExpc3RWaWV3SXRlbTIgfSBmcm9tIFwiJHtwb2ludHN9Li4vVGhpcmRQYXJ0eS9TdXBlclNjcm9sbFZpZXcvTGlzdFZpZXcvTG9vcExpc3RWaWV3SXRlbTJcIjske2xpbmV9YFxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZihlbGVtZW50ID09IFwiVUlMb29wR3JpZFZpZXdcIil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlciArPSBgaW1wb3J0IHsgTG9vcEdyaWRWaWV3IH0gZnJvbSBcIiR7cG9pbnRzfS4uL1RoaXJkUGFydHkvU3VwZXJTY3JvbGxWaWV3L0dyaWRWaWV3L0xvb3BHcmlkVmlld1wiO1xyXG5pbXBvcnQgeyBMb29wR3JpZFZpZXdJdGVtIH0gZnJvbSBcIiR7cG9pbnRzfS4uL1RoaXJkUGFydHkvU3VwZXJTY3JvbGxWaWV3L0dyaWRWaWV3L0xvb3BHcmlkVmlld0l0ZW1cIjske2xpbmV9YFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgY29udGVudCA9IFxyXG5gXHJcbiR7aGVhZGVyfVxyXG5leHBvcnQgY2xhc3MgJHtmaWxlTmFtZX0gZXh0ZW5kcyBVSUJhc2VWaWV3IGltcGxlbWVudHMgSU9uQ3JlYXRlLCBJT25FbmFibGUge1xyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgUHJlZmFiUGF0aDpzdHJpbmcgPSBcIiR7RWRpdG9yLlV0aWxzLlBhdGguc3RyaXBFeHQocHJlZmFiUGF0aFsxXSl9XCI7XHJcblxyXG4gICAgcHJvdGVjdGVkIGdldENvbnN0cnVjdG9yKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gJHtmaWxlTmFtZX07XHJcbiAgICB9XHJcblxyXG4ke2ZpZWxkc31cclxuICAgIHB1YmxpYyBvbkNyZWF0ZSgpXHJcbiAgICB7XHJcbiR7b25DcmVhdGV9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIG9uRW5hYmxlKClcclxuICAgIHtcclxuJHtvbkVuYWJsZX1cclxuICAgIH1cclxuXHJcbiR7ZnVuY31cclxufVxyXG5gXHJcblxyXG4gICAgICAgICAgICAgICAgRWRpdG9yLkNsaXBib2FyZC53cml0ZSgndGV4dCcsIGNvbnRlbnQpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCLnlJ/miJDku6PnoIHmiJDlip/vvIzlt7LlpI3liLbliLDliarnspjmnb9cIilcclxuICAgICAgICAgICAgICAgIGlmKCFleGlzdHMpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpciA9IEVkaXRvci5VdGlscy5QYXRoLmRpcm5hbWUoY3NQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBGaWxlSGVscGVyLmNyZWF0ZURpcihkaXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZShjc1BhdGgsY29udGVudCwge30sKGVycik9PntcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhZXJyKSBjb25zb2xlLmVycm9yKGVycik7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXNrLnNldFJlc3VsdCghZXJyKVxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG59Il19