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
                        if (root.uuid.value == node.uuid.value) {
                            onCreate += `        this.${nodeName} = this.addComponent(${uiType});${line}`;
                        }
                        else {
                            onCreate += `        this.${nodeName} = this.addComponent(${uiType}, "${path}");${line}`;
                        }
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
                        if (root.uuid.value == node.uuid.value) {
                            onCreate += `        this.${nodeName} = this.addComponent(UIEmptyView);${line}`;
                        }
                        else {
                            onCreate += `        this.${nodeName} = this.addComponent(UIEmptyView, "${path}");${line}`;
                        }
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
    ["cc.Slider", "UISlider"],
    ["cc.Sprite", "UIImage"],
    ["cc.Label", "UIText"],
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1nZW5lcmF0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9jb2RlLWdlbmVyYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUNBQXlCO0FBQ3pCLGdEQUF3QjtBQUN4QixxQ0FBa0M7QUFFbEMsK0NBQTJDO0FBRTNDLE1BQWEsWUFBWTtJQWNkLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVc7O1FBQ25DLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQzNCLElBQUcsQ0FBQSxNQUFBLElBQUksQ0FBQyxNQUFNLDBDQUFFLEtBQUssS0FBSSxJQUFJO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDM0MsSUFBSSxVQUFVLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdGLElBQUcsVUFBVSxJQUFJLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSwwQkFBMEI7WUFBRSxPQUFPLElBQUksQ0FBQztRQUMxRixPQUFNLENBQUEsTUFBQSxVQUFVLENBQUMsTUFBTSwwQ0FBRSxLQUFLLEtBQUksSUFBSSxFQUFDO1lBQ25DLElBQUksR0FBRyxVQUFVLENBQUM7WUFDbEIsVUFBVSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvRixJQUFHLFVBQVUsSUFBSSxJQUFJLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksMEJBQTBCO2dCQUFFLE1BQU07WUFDcEYsSUFBSSxHQUFHLElBQUksQ0FB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Q0FBQTtnQkFDN0IsSUFBRyxDQUFDLE1BQU0sRUFBQztvQkFDUCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQzlDLE1BQU0sd0JBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2hDLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFDLE9BQU8sRUFBRSxFQUFFLEVBQUMsQ0FBQyxHQUFHLEVBQUMsRUFBRTt3QkFDbkMsSUFBSSxDQUFDLENBQUMsR0FBRzs0QkFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNsQyxDQUFDLENBQUMsQ0FBQTtpQkFDTDthQUVKO1NBQ0o7SUFDTCxDQUFDOztBQTVPTCxvQ0ErT0M7QUE5TzJCLG1CQUFNLEdBQUcsd0JBQVUsQ0FBQyxNQUFNLENBQUE7QUFDMUIseUJBQVksR0FBRyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7QUFFbEQsb0JBQU8sR0FBdUIsSUFBSSxHQUFHLENBQWdCO0lBQ2hFLENBQUMsZ0JBQWdCLEVBQUcsa0JBQWtCLENBQUM7SUFDdkMsQ0FBQyxlQUFlLEVBQUcsaUJBQWlCLENBQUM7SUFDckMsQ0FBQyxjQUFjLEVBQUcsZ0JBQWdCLENBQUM7SUFDbkMsQ0FBQyxXQUFXLEVBQUcsVUFBVSxDQUFDO0lBQzFCLENBQUMsWUFBWSxFQUFHLFNBQVMsQ0FBQztJQUMxQixDQUFDLFdBQVcsRUFBRyxVQUFVLENBQUM7SUFDMUIsQ0FBQyxXQUFXLEVBQUcsU0FBUyxDQUFDO0lBQ3pCLENBQUMsVUFBVSxFQUFHLFFBQVEsQ0FBQztDQUMxQixDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgRVRUYXNrIH0gZnJvbSBcIi4vZXR0YXNrXCI7XHJcbmltcG9ydCB7IElOb2RlIH0gZnJvbSBcIkBjb2Nvcy9jcmVhdG9yLXR5cGVzL2VkaXRvci9wYWNrYWdlcy9zY2VuZS9AdHlwZXMvcHVibGljXCI7XHJcbmltcG9ydCB7IEZpbGVIZWxwZXIgfSBmcm9tIFwiLi9maWxlLWhlbHBlclwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvZGVHZW5lcmF0ZXtcclxuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IHVpUGF0aCA9IEZpbGVIZWxwZXIudWlQYXRoXHJcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSB1aVNjcmlwdFBhdGggPSBbXCJVSVwiLCBcIlVJSGFsbFwiLCBcIlVJR2FtZVwiXVxyXG5cclxuICAgIHByaXZhdGUgc3RhdGljIHR5cGVNYXA6IE1hcDxzdHJpbmcsc3RyaW5nPiA9IG5ldyBNYXA8c3RyaW5nLHN0cmluZz4oW1xyXG4gICAgICAgIFtcIkNvcHlHYW1lT2JqZWN0XCIgLCBcIlVJQ29weUdhbWVPYmplY3RcIl0sXHJcbiAgICAgICAgW1wiTG9vcExpc3RWaWV3MlwiICwgXCJVSUxvb3BMaXN0VmlldzJcIl0sXHJcbiAgICAgICAgW1wiTG9vcEdyaWRWaWV3XCIgLCBcIlVJTG9vcEdyaWRWaWV3XCJdLFxyXG4gICAgICAgIFtcImNjLkJ1dHRvblwiICwgXCJVSUJ1dHRvblwiXSxcclxuICAgICAgICBbXCJjYy5FZGl0Qm94XCIgLCBcIlVJSW5wdXRcIl0sXHJcbiAgICAgICAgW1wiY2MuU2xpZGVyXCIgLCBcIlVJU2xpZGVyXCJdLFxyXG4gICAgICAgIFtcImNjLlNwcml0ZVwiICwgXCJVSUltYWdlXCJdLFxyXG4gICAgICAgIFtcImNjLkxhYmVsXCIgLCBcIlVJVGV4dFwiXSxcclxuICAgIF0pXHJcbiAgICBwdWJsaWMgc3RhdGljIGFzeW5jIGdldFBhdGgobm9kZTogSU5vZGUpe1xyXG4gICAgICAgIGxldCBwYXRoID0gbm9kZS5uYW1lLnZhbHVlO1xyXG4gICAgICAgIGlmKG5vZGUucGFyZW50Py52YWx1ZSA9PSBudWxsKSByZXR1cm4gcGF0aDtcclxuICAgICAgICB2YXIgcGFyZW50Tm9kZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlLnBhcmVudC52YWx1ZS51dWlkKTtcclxuICAgICAgICBpZihwYXJlbnROb2RlID09IG51bGwgfHwgcGFyZW50Tm9kZS5uYW1lLnZhbHVlID09IFwic2hvdWxkX2hpZGVfaW5faGllcmFyY2h5XCIpIHJldHVybiBwYXRoO1xyXG4gICAgICAgIHdoaWxlKHBhcmVudE5vZGUucGFyZW50Py52YWx1ZSAhPSBudWxsKXtcclxuICAgICAgICAgICAgbm9kZSA9IHBhcmVudE5vZGU7XHJcbiAgICAgICAgICAgIHBhcmVudE5vZGUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgcGFyZW50Tm9kZS5wYXJlbnQudmFsdWUudXVpZCk7XHJcbiAgICAgICAgICAgIGlmKHBhcmVudE5vZGUgPT0gbnVsbCB8fCBwYXJlbnROb2RlLm5hbWUudmFsdWUgPT0gXCJzaG91bGRfaGlkZV9pbl9oaWVyYXJjaHlcIikgYnJlYWs7XHJcbiAgICAgICAgICAgIHBhdGggPSBub2RlLm5hbWUudmFsdWUgKyBcIi9cIiArIHBhdGg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBwYXRoO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiDmoLnmja7pgInmi6noioLngrnnlJ/miJBVSeS7o+eggVxyXG4gICAgICovXHJcbiAgICBwdWJsaWMgc3RhdGljIGFzeW5jIGdlbmVyYXRlVUlDb2RlKG5vZGVzOiBzdHJpbmdbXSl7XHJcbiAgICAgICAgaWYoIW5vZGVzIHx8IG5vZGVzLmxlbmd0aCA8PTApIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIuacqumAieS4reiKgueCuVwiKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciByb290ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVzWzBdKTtcclxuICAgICAgICB3aGlsZShyb290LnBhcmVudD8udmFsdWUgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgIHZhciBwTm9kZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCByb290LnBhcmVudC52YWx1ZS51dWlkKTtcclxuICAgICAgICAgICAgaWYocE5vZGUubmFtZS52YWx1ZSA9PSBcInNob3VsZF9oaWRlX2luX2hpZXJhcmNoeVwiKSBicmVhaztcclxuICAgICAgICAgICAgcm9vdCA9IHBOb2RlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHJvb3QuX190eXBlX18gPT0gXCJjYy5TY2VuZVwiKSByZXR1cm47XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYocm9vdC5fX3ByZWZhYl9fIT1udWxsKXtcclxuICAgICAgICAgICAgY29uc3Qgcm9vdFBhdGggPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1wYXRoJywgcm9vdC5fX3ByZWZhYl9fLnV1aWQpO1xyXG4gICAgICAgICAgICBpZihyb290UGF0aCAhPSBudWxsICYmIHJvb3RQYXRoIT1cIlwiKXtcclxuICAgICAgICAgICAgICAgIGlmKHJvb3RQYXRoLmluZGV4T2YoXCJhc3NldHNQYWNrYWdlXCIpPDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwi6Z2eVUnotYTmupBcIilcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IHByZWZhYlBhdGggPSBFZGl0b3IuVXRpbHMuUGF0aC5zbGFzaChyb290UGF0aCkuc3BsaXQoXCIvYXNzZXRzUGFja2FnZS9cIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzdWIgPSBwcmVmYWJQYXRoWzFdLnNwbGl0KFwiL1wiKTtcclxuICAgICAgICAgICAgICAgIGxldCBzdWJVSSA9IG51bGxcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBDb2RlR2VuZXJhdGUudWlQYXRoLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKENvZGVHZW5lcmF0ZS51aVBhdGhbaW5kZXhdLnRvVXBwZXJDYXNlKCkgPT0gc3ViWzBdLnRvVXBwZXJDYXNlKCkpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWJVSSA9IENvZGVHZW5lcmF0ZS51aVNjcmlwdFBhdGhbaW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZighc3ViVUkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwi6Z2eVUnotYTmupBcIilcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCBwcm9qZWN0UGF0aCA9IEVkaXRvci5Qcm9qZWN0LnBhdGg7XHJcbiAgICAgICAgICAgICAgICBsZXQgY3NQYXRoID0gcGF0aC5qb2luKHByb2plY3RQYXRoLCBcImFzc2V0c1wiLCBcInNjcmlwdHNcIixcIkNvZGVcIixcIkdhbWVcIiwgc3ViVUkpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gMTsgaW5kZXggPCBzdWIubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQgPSBzdWJbaW5kZXhdLnJlcGxhY2UoXCJ1aVwiLFwiVUlcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZWxlbWVudC5pbmRleE9mKFwiLlwiKSA+PTAgKSBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBpZihlbGVtZW50LnRvTG93ZXJDYXNlKCkgPT0gXCJwcmVmYWJzXCIgKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICBpZihlbGVtZW50LnN0YXJ0c1dpdGgoXCJVSVwiKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBcIlVJXCIgKyBlbGVtZW50LmNoYXJBdCgyKS50b1VwcGVyQ2FzZSgpICsgZWxlbWVudC5zbGljZSgzKVxyXG4gICAgICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGVsZW1lbnQuc2xpY2UoMSlcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY3NQYXRoID0gcGF0aC5qb2luKGNzUGF0aCwgZWxlbWVudClcclxuICAgICAgICAgICAgICAgICAgICBjb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbGV0IGZpbGVOYW1lID0gRWRpdG9yLlV0aWxzLlBhdGguc3RyaXBFeHQoRWRpdG9yLlV0aWxzLlBhdGguYmFzZW5hbWUocm9vdFBhdGgpLnJlcGxhY2UoXCJ1aVwiLFwiVUlcIikpOyBcclxuICAgICAgICAgICAgICAgIGlmKGZpbGVOYW1lLnN0YXJ0c1dpdGgoXCJVSVwiKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lID0gXCJVSVwiICsgZmlsZU5hbWUuY2hhckF0KDIpLnRvVXBwZXJDYXNlKCkgKyBmaWxlTmFtZS5zbGljZSgzKVxyXG4gICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZU5hbWUgPSBmaWxlTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGZpbGVOYW1lLnNsaWNlKDEpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNzUGF0aCA9IHBhdGguam9pbihjc1BhdGgsIGZpbGVOYW1lICtcIi50c1wiKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGNzUGF0aClcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhc2sgPSBFVFRhc2suY3JlYXRlPGJvb2xlYW4+KHRydWUpO1xyXG4gICAgICAgICAgICAgICAgZnMuZXhpc3RzKGNzUGF0aCwgKHJlcyk9PnsgdGFzay5zZXRSZXN1bHQocmVzKSB9KTtcclxuICAgICAgICAgICAgICAgIGxldCBleGlzdHMgPSBhd2FpdCB0YXNrXHJcbiAgICAgICAgICAgICAgICBpZihleGlzdHMpXHJcbiAgICAgICAgICAgICAgICB7ICBcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmluZm8oXCLmlofku7blt7LlrZjlnKgsIOWwhuS4jeS8muebtOaOpei+k+WHuuaWh+S7tlwiK2NzUGF0aCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHBvaW50cyA9IFwiLi4vLi4vXCI7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgY291bnQ7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgICAgICBwb2ludHMgKz1cIi4uL1wiXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsaW5lID0gYFxyXG5gXHJcbiAgICAgICAgICAgICAgICBsZXQgaGVhZGVyID0gXHJcbmBcclxuaW1wb3J0IHsgTm9kZSB9IGZyb20gXCJjY1wiO1xyXG5pbXBvcnQgeyBJT25DcmVhdGUgfSBmcm9tIFwiJHtwb2ludHN9TW9kdWxlL1VJL0lPbkNyZWF0ZVwiO1xyXG5pbXBvcnQgeyBJT25FbmFibGUgfSBmcm9tIFwiJHtwb2ludHN9TW9kdWxlL1VJL0lPbkVuYWJsZVwiO1xyXG5pbXBvcnQgeyBVSUJhc2VWaWV3IH0gZnJvbSBcIiR7cG9pbnRzfU1vZHVsZS9VSS9VSUJhc2VWaWV3XCI7XHJcbmBcclxuICAgICAgICAgICAgICAgIGxldCBmaWVsZHMgPSBcIlwiXHJcbiAgICAgICAgICAgICAgICBsZXQgb25DcmVhdGUgPSBcIlwiXHJcbiAgICAgICAgICAgICAgICBsZXQgb25FbmFibGUgPSBcIlwiXHJcbiAgICAgICAgICAgICAgICBsZXQgZnVuYyA9IFwiXCJcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVpVHlwZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBub2Rlcy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgbm9kZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2Rlc1tpbmRleF0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBiYXNlTmFtZSA9IChub2RlLm5hbWUudmFsdWUgYXMgc3RyaW5nKTtcclxuICAgICAgICAgICAgICAgICAgICBpZihiYXNlTmFtZT09bnVsbCB8fCBiYXNlTmFtZSA9PSAnJykgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFzZU5hbWUgPSBiYXNlTmFtZS5yZXBsYWNlKCcgJywnJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgYmFzZU5hbWUgPSBiYXNlTmFtZS5jaGFyQXQoMCkudG9Mb3dlckNhc2UoKSArIGJhc2VOYW1lLnNsaWNlKDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBub2RlTmFtZSA9IGJhc2VOYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpID0gMTtcclxuICAgICAgICAgICAgICAgICAgICB3aGlsZShuYW1lcy5oYXMobm9kZU5hbWUpKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWUgPSBiYXNlTmFtZSArIGk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXBwZXJOYW1lID0gbm9kZU5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBub2RlTmFtZS5zbGljZSgxKTtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lcy5hZGQobm9kZU5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBhd2FpdCBDb2RlR2VuZXJhdGUuZ2V0UGF0aChub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdWlUeXBlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IG5vZGUuX19jb21wc19fLmxlbmd0aDsgaisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXAgPSBub2RlLl9fY29tcHNfX1tqXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoY29tcD8udHlwZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdGhpc1R5cGUgPSBDb2RlR2VuZXJhdGUudHlwZU1hcC5nZXQoY29tcC50eXBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHRoaXNUeXBlID09IG51bGwpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodWlUeXBlICE9IG51bGwpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBDb2RlR2VuZXJhdGUudHlwZU1hcCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihlbGVtZW50WzFdID09IHVpVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoZWxlbWVudFsxXSA9PSB0aGlzVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdWlUeXBlID0gdGhpc1R5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpVHlwZSA9IHRoaXNUeXBlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmKHVpVHlwZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVpVHlwZXMuYWRkKHVpVHlwZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmllbGRzICs9IGAgICAgcHVibGljICR7bm9kZU5hbWV9OiAke3VpVHlwZX07JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJvb3QudXVpZC52YWx1ZSA9PSBub2RlLnV1aWQudmFsdWUpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DcmVhdGUgKz0gYCAgICAgICAgdGhpcy4ke25vZGVOYW1lfSA9IHRoaXMuYWRkQ29tcG9uZW50KCR7dWlUeXBlfSk7JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DcmVhdGUgKz0gYCAgICAgICAgdGhpcy4ke25vZGVOYW1lfSA9IHRoaXMuYWRkQ29tcG9uZW50KCR7dWlUeXBlfSwgXCIke3BhdGh9XCIpOyR7bGluZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHVpVHlwZSA9PSBcIlVJQnV0dG9uXCIpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25FbmFibGUgKz0gYCAgICAgICAgdGhpcy4ke25vZGVOYW1lfS5zZXRPbkNsaWNrKHRoaXMub25DbGljayR7dXBwZXJOYW1lfS5iaW5kKHRoaXMpKTske2xpbmV9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmMgKz0gYCAgICBwcml2YXRlIG9uQ2xpY2ske3VwcGVyTmFtZX0oKXske2xpbmV9JHtsaW5lfSAgICB9JHtsaW5lfSR7bGluZX1gXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZih1aVR5cGUgPT0gXCJVSUxvb3BHcmlkVmlld1wiKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ3JlYXRlICs9IGAgICAgICAgIHRoaXMuJHtub2RlTmFtZX0uaW5pdEdyaWRWaWV3KDAsIHRoaXMub25HZXQke3VwcGVyTmFtZX1JdGVtQnlJbmRleC5iaW5kKHRoaXMpKTske2xpbmV9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmMgKz0gYCAgICBwcml2YXRlIG9uR2V0JHt1cHBlck5hbWV9SXRlbUJ5SW5kZXgoZ3JpZFZpZXc6IExvb3BHcmlkVmlldywgaW5kZXg6IG51bWJlciwgcm93OiBudW1iZXIsIGNvbHVtbjogbnVtYmVyKTogTG9vcEdyaWRWaWV3SXRlbSB7JHtsaW5lfSAgICAgICAgcmV0dXJuIG51bGw7JHtsaW5lfSAgICB9JHtsaW5lfSR7bGluZX1gXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZih1aVR5cGUgPT0gXCJVSUxvb3BMaXN0VmlldzJcIil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNyZWF0ZSArPSBgICAgICAgICB0aGlzLiR7bm9kZU5hbWV9LmluaXRMaXN0VmlldygwLCB0aGlzLm9uR2V0JHt1cHBlck5hbWV9SXRlbUJ5SW5kZXguYmluZCh0aGlzKSk7JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jICs9IGAgICAgcHJpdmF0ZSBvbkdldCR7dXBwZXJOYW1lfUl0ZW1CeUluZGV4KGxpc3RWaWV3OiBMb29wTGlzdFZpZXcyLCBpbmRleDogbnVtYmVyKTogTG9vcExpc3RWaWV3SXRlbTIgeyR7bGluZX0gICAgICAgIHJldHVybiBudWxsOyR7bGluZX0gICAgfSR7bGluZX0ke2xpbmV9YFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYodWlUeXBlID09IFwiVUlDb3B5R2FtZU9iamVjdFwiKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ3JlYXRlICs9IGAgICAgICAgIHRoaXMuJHtub2RlTmFtZX0uaW5pdExpc3RWaWV3KDAsIHRoaXMub25HZXQke3VwcGVyTmFtZX1JdGVtQnlJbmRleC5iaW5kKHRoaXMpKTske2xpbmV9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmMgKz0gYCAgICBwcml2YXRlIG9uR2V0JHt1cHBlck5hbWV9SXRlbUJ5SW5kZXgoaW5kZXg6IG51bWJlciwgZ286IE5vZGUpeyR7bGluZX0ke2xpbmV9ICAgIH0ke2xpbmV9JHtsaW5lfWBcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVpVHlwZXMuYWRkKFwiVUlFbXB0eVZpZXdcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmllbGRzICs9IGAgICAgcHVibGljICR7bm9kZU5hbWV9OiBVSUVtcHR5Vmlldzske2xpbmV9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYocm9vdC51dWlkLnZhbHVlID09IG5vZGUudXVpZC52YWx1ZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNyZWF0ZSArPSBgICAgICAgICB0aGlzLiR7bm9kZU5hbWV9ID0gdGhpcy5hZGRDb21wb25lbnQoVUlFbXB0eVZpZXcpOyR7bGluZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ3JlYXRlICs9IGAgICAgICAgIHRoaXMuJHtub2RlTmFtZX0gPSB0aGlzLmFkZENvbXBvbmVudChVSUVtcHR5VmlldywgXCIke3BhdGh9XCIpOyR7bGluZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiB1aVR5cGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyICs9IGBpbXBvcnQgeyAke2VsZW1lbnR9IH0gZnJvbSBcIiR7cG9pbnRzfU1vZHVsZS9VSUNvbXBvbmVudC8ke2VsZW1lbnR9XCI7JHtsaW5lfWBcclxuICAgICAgICAgICAgICAgICAgICBpZihlbGVtZW50ID09IFwiVUlMb29wTGlzdFZpZXcyXCIpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXIgKz0gYGltcG9ydCB7IExvb3BMaXN0VmlldzIgfSBmcm9tIFwiJHtwb2ludHN9Li4vVGhpcmRQYXJ0eS9TdXBlclNjcm9sbFZpZXcvTGlzdFZpZXcvTG9vcExpc3RWaWV3MlwiO1xyXG5pbXBvcnQgeyBMb29wTGlzdFZpZXdJdGVtMiB9IGZyb20gXCIke3BvaW50c30uLi9UaGlyZFBhcnR5L1N1cGVyU2Nyb2xsVmlldy9MaXN0Vmlldy9Mb29wTGlzdFZpZXdJdGVtMlwiOyR7bGluZX1gXHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmKGVsZW1lbnQgPT0gXCJVSUxvb3BHcmlkVmlld1wiKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyICs9IGBpbXBvcnQgeyBMb29wR3JpZFZpZXcgfSBmcm9tIFwiJHtwb2ludHN9Li4vVGhpcmRQYXJ0eS9TdXBlclNjcm9sbFZpZXcvR3JpZFZpZXcvTG9vcEdyaWRWaWV3XCI7XHJcbmltcG9ydCB7IExvb3BHcmlkVmlld0l0ZW0gfSBmcm9tIFwiJHtwb2ludHN9Li4vVGhpcmRQYXJ0eS9TdXBlclNjcm9sbFZpZXcvR3JpZFZpZXcvTG9vcEdyaWRWaWV3SXRlbVwiOyR7bGluZX1gXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBjb250ZW50ID0gXHJcbmBcclxuJHtoZWFkZXJ9XHJcbmV4cG9ydCBjbGFzcyAke2ZpbGVOYW1lfSBleHRlbmRzIFVJQmFzZVZpZXcgaW1wbGVtZW50cyBJT25DcmVhdGUsIElPbkVuYWJsZSB7XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyByZWFkb25seSBQcmVmYWJQYXRoOnN0cmluZyA9IFwiJHtFZGl0b3IuVXRpbHMuUGF0aC5zdHJpcEV4dChwcmVmYWJQYXRoWzFdKX1cIjtcclxuXHJcbiAgICBwcm90ZWN0ZWQgZ2V0Q29uc3RydWN0b3IoKVxyXG4gICAge1xyXG4gICAgICAgIHJldHVybiAke2ZpbGVOYW1lfTtcclxuICAgIH1cclxuXHJcbiR7ZmllbGRzfVxyXG4gICAgcHVibGljIG9uQ3JlYXRlKClcclxuICAgIHtcclxuJHtvbkNyZWF0ZX1cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgb25FbmFibGUoKVxyXG4gICAge1xyXG4ke29uRW5hYmxlfVxyXG4gICAgfVxyXG5cclxuJHtmdW5jfVxyXG59XHJcbmBcclxuXHJcbiAgICAgICAgICAgICAgICBFZGl0b3IuQ2xpcGJvYXJkLndyaXRlKCd0ZXh0JywgY29udGVudCk7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIueUn+aIkOS7o+eggeaIkOWKn++8jOW3suWkjeWItuWIsOWJqueymOadv1wiKVxyXG4gICAgICAgICAgICAgICAgaWYoIWV4aXN0cyl7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlyID0gRWRpdG9yLlV0aWxzLlBhdGguZGlybmFtZShjc1BhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEZpbGVIZWxwZXIuY3JlYXRlRGlyKGRpcik7XHJcbiAgICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlKGNzUGF0aCxjb250ZW50LCB7fSwoZXJyKT0+e1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISFlcnIpIGNvbnNvbGUuZXJyb3IoZXJyKTsgXHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbn0iXX0=