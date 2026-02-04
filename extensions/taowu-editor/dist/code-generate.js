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

    public getConstructor()
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
    static async bindUINode(node) {
        var _a;
        var root = await Editor.Message.request('scene', 'query-node', node);
        while (((_a = root.parent) === null || _a === void 0 ? void 0 : _a.value) != null) {
            var pNode = await Editor.Message.request('scene', 'query-node', root.parent.value.uuid);
            if (pNode.name.value == "should_hide_in_hierarchy")
                break;
            root = pNode;
        }
        if (root.__type__ == "cc.Scene")
            return;
        if (root.__prefab__ != null) {
            await Editor.Message.request('asset-db', 'open-asset', root.__prefab__.uuid);
            await this.bindUINodeByPrefab();
        }
    }
    static async bindUINodeByPrefab() {
        while (!await Editor.Message.request('scene', 'query-is-ready'))
            ;
        const tree = await Editor.Message.request('scene', 'query-node-tree');
        var root = tree;
        if ((root === null || root === void 0 ? void 0 : root.children) == null)
            return;
        for (let index = 0; index < root.children.length; index++) {
            const element = root.children[index];
            if (element.name == "should_hide_in_hierarchy") {
                root = element.children[0];
                break;
            }
        }
        const scripts = await Editor.Message.request('asset-db', 'query-assets', { ccType: 'cc.Script' });
        let script = null;
        for (let index = 0; index < scripts.length; index++) {
            if (scripts[index].name.toLowerCase().indexOf(root.name.toLowerCase()) >= 0) {
                script = scripts[index];
                break;
            }
        }
        if (script == null) {
            console.error("query-script fail!");
            return;
        }
        const ts = fs.readFileSync(script.file, { encoding: "utf-8" });
        const lines = ts.split('\n');
        const pathMap = new Map();
        for (let index = 0; index < lines.length; index++) {
            let line = lines[index];
            if (line.indexOf("this.addComponent(") >= 0) {
                line = line.replace(' ', '');
                const vs = line.split("\"");
                if (vs.length > 2) {
                    pathMap.set(vs[1], null);
                }
            }
        }
        let comp = null;
        let compIndex = -1;
        for (let index = 0; index < root.components.length; index++) {
            if (root.components[index].type == "ReferenceCollector") {
                comp = root.components[index];
                compIndex = index;
                break;
            }
        }
        if (!comp) {
            const res = Editor.Message.request('scene', 'create-component', {
                uuid: root.uuid,
                component: 'ReferenceCollector'
            });
            if (!res) {
                console.error("create-component fail!");
                return;
            }
            var pNode = await Editor.Message.request('scene', 'query-node-tree', root.uuid);
            for (let index = 0; index < pNode.components.length; index++) {
                if (pNode.components[index].type == "ReferenceCollector") {
                    comp = pNode.components[index];
                    compIndex = index;
                    break;
                }
            }
        }
        let count = 0;
        for (const kv of pathMap) {
            const path = kv[0];
            const vs = path.split('/');
            var node = root;
            for (let index = 0; index < vs.length; index++) {
                const name = vs[index];
                let find = false;
                for (let i = 0; i < node.children.length; i++) {
                    if (name == node.children[i].name) {
                        node = node.children[i];
                        find = true;
                        break;
                    }
                }
                if (!find) {
                    node = null;
                    break;
                }
            }
            if (node != null) {
                pathMap.set(path, node);
                console.log(path + " " + node.uuid);
            }
            else {
                count++;
            }
        }
        await Editor.Message.request('scene', 'set-property', {
            uuid: root.uuid,
            path: `__comps__.${compIndex}.data.length`,
            dump: {
                value: count,
            },
        });
        let jj = 0;
        for (const kv of pathMap) {
            if (kv[1] == null)
                continue;
            await Editor.Message.request('scene', 'set-property', {
                uuid: root.uuid,
                path: `__comps__.${compIndex}.data.${jj}`,
                dump: {
                    type: "KeyValuePiar",
                    value: {},
                },
            });
            await Editor.Message.request('scene', 'set-property', {
                uuid: root.uuid,
                path: `__comps__.${compIndex}.data.${jj}.key`,
                dump: {
                    value: kv[0],
                },
            });
            await Editor.Message.request('scene', 'set-property', {
                uuid: root.uuid,
                path: `__comps__.${compIndex}.data.${jj}.value`,
                dump: {
                    type: "cc.Node",
                    value: { uuid: kv[1].uuid },
                },
            });
            jj++;
        }
        await Editor.Message.request('scene', 'save-scene');
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
    ["cc.RichText", "UIText"],
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1nZW5lcmF0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9jb2RlLWdlbmVyYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUNBQXlCO0FBQ3pCLGdEQUF3QjtBQUN4QixxQ0FBa0M7QUFFbEMsK0NBQTJDO0FBRzNDLE1BQWEsWUFBWTtJQWVkLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVc7O1FBQ25DLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQzNCLElBQUcsQ0FBQSxNQUFBLElBQUksQ0FBQyxNQUFNLDBDQUFFLEtBQUssS0FBSSxJQUFJO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDM0MsSUFBSSxVQUFVLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdGLElBQUcsVUFBVSxJQUFJLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSwwQkFBMEI7WUFBRSxPQUFPLElBQUksQ0FBQztRQUMxRixPQUFNLENBQUEsTUFBQSxVQUFVLENBQUMsTUFBTSwwQ0FBRSxLQUFLLEtBQUksSUFBSSxFQUFDO1lBQ25DLElBQUksR0FBRyxVQUFVLENBQUM7WUFDbEIsVUFBVSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvRixJQUFHLFVBQVUsSUFBSSxJQUFJLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksMEJBQTBCO2dCQUFFLE1BQU07WUFDcEYsSUFBSSxHQUFHLElBQUksQ0FB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ZixLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBQztpQkFDN0I7YUFDSixDQUFDLENBQUM7WUFDSCxFQUFFLEVBQUUsQ0FBQztTQUNSO1FBQ0QsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDeEQsQ0FBQzs7QUE5WEwsb0NBK1hDO0FBOVgyQixtQkFBTSxHQUFHLHdCQUFVLENBQUMsTUFBTSxDQUFBO0FBQzFCLHlCQUFZLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0FBRWxELG9CQUFPLEdBQXVCLElBQUksR0FBRyxDQUFnQjtJQUNoRSxDQUFDLGdCQUFnQixFQUFHLGtCQUFrQixDQUFDO0lBQ3ZDLENBQUMsZUFBZSxFQUFHLGlCQUFpQixDQUFDO0lBQ3JDLENBQUMsY0FBYyxFQUFHLGdCQUFnQixDQUFDO0lBQ25DLENBQUMsV0FBVyxFQUFHLFVBQVUsQ0FBQztJQUMxQixDQUFDLFlBQVksRUFBRyxTQUFTLENBQUM7SUFDMUIsQ0FBQyxXQUFXLEVBQUcsVUFBVSxDQUFDO0lBQzFCLENBQUMsV0FBVyxFQUFHLFNBQVMsQ0FBQztJQUN6QixDQUFDLFVBQVUsRUFBRyxRQUFRLENBQUM7SUFDdkIsQ0FBQyxhQUFhLEVBQUcsUUFBUSxDQUFDO0NBQzdCLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5pbXBvcnQgeyBFVFRhc2sgfSBmcm9tIFwiLi9ldHRhc2tcIjtcclxuaW1wb3J0IHsgSU5vZGUgfSBmcm9tIFwiQGNvY29zL2NyZWF0b3ItdHlwZXMvZWRpdG9yL3BhY2thZ2VzL3NjZW5lL0B0eXBlcy9wdWJsaWNcIjtcclxuaW1wb3J0IHsgRmlsZUhlbHBlciB9IGZyb20gXCIuL2ZpbGUtaGVscGVyXCI7XHJcbmltcG9ydCB7IFV0aWxzIH0gZnJvbSBcIkBjb2Nvcy9jcmVhdG9yLXR5cGVzL2VkaXRvci91dGlscy9pbmRleFwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvZGVHZW5lcmF0ZXtcclxuICAgIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IHVpUGF0aCA9IEZpbGVIZWxwZXIudWlQYXRoXHJcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSB1aVNjcmlwdFBhdGggPSBbXCJVSVwiLCBcIlVJSGFsbFwiLCBcIlVJR2FtZVwiXVxyXG5cclxuICAgIHByaXZhdGUgc3RhdGljIHR5cGVNYXA6IE1hcDxzdHJpbmcsc3RyaW5nPiA9IG5ldyBNYXA8c3RyaW5nLHN0cmluZz4oW1xyXG4gICAgICAgIFtcIkNvcHlHYW1lT2JqZWN0XCIgLCBcIlVJQ29weUdhbWVPYmplY3RcIl0sXHJcbiAgICAgICAgW1wiTG9vcExpc3RWaWV3MlwiICwgXCJVSUxvb3BMaXN0VmlldzJcIl0sXHJcbiAgICAgICAgW1wiTG9vcEdyaWRWaWV3XCIgLCBcIlVJTG9vcEdyaWRWaWV3XCJdLFxyXG4gICAgICAgIFtcImNjLkJ1dHRvblwiICwgXCJVSUJ1dHRvblwiXSxcclxuICAgICAgICBbXCJjYy5FZGl0Qm94XCIgLCBcIlVJSW5wdXRcIl0sXHJcbiAgICAgICAgW1wiY2MuU2xpZGVyXCIgLCBcIlVJU2xpZGVyXCJdLFxyXG4gICAgICAgIFtcImNjLlNwcml0ZVwiICwgXCJVSUltYWdlXCJdLFxyXG4gICAgICAgIFtcImNjLkxhYmVsXCIgLCBcIlVJVGV4dFwiXSxcclxuICAgICAgICBbXCJjYy5SaWNoVGV4dFwiICwgXCJVSVRleHRcIl0sXHJcbiAgICBdKVxyXG4gICAgcHVibGljIHN0YXRpYyBhc3luYyBnZXRQYXRoKG5vZGU6IElOb2RlKXtcclxuICAgICAgICBsZXQgcGF0aCA9IG5vZGUubmFtZS52YWx1ZTtcclxuICAgICAgICBpZihub2RlLnBhcmVudD8udmFsdWUgPT0gbnVsbCkgcmV0dXJuIHBhdGg7XHJcbiAgICAgICAgdmFyIHBhcmVudE5vZGUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZS5wYXJlbnQudmFsdWUudXVpZCk7XHJcbiAgICAgICAgaWYocGFyZW50Tm9kZSA9PSBudWxsIHx8IHBhcmVudE5vZGUubmFtZS52YWx1ZSA9PSBcInNob3VsZF9oaWRlX2luX2hpZXJhcmNoeVwiKSByZXR1cm4gcGF0aDtcclxuICAgICAgICB3aGlsZShwYXJlbnROb2RlLnBhcmVudD8udmFsdWUgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgIG5vZGUgPSBwYXJlbnROb2RlO1xyXG4gICAgICAgICAgICBwYXJlbnROb2RlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIHBhcmVudE5vZGUucGFyZW50LnZhbHVlLnV1aWQpO1xyXG4gICAgICAgICAgICBpZihwYXJlbnROb2RlID09IG51bGwgfHwgcGFyZW50Tm9kZS5uYW1lLnZhbHVlID09IFwic2hvdWxkX2hpZGVfaW5faGllcmFyY2h5XCIpIGJyZWFrO1xyXG4gICAgICAgICAgICBwYXRoID0gbm9kZS5uYW1lLnZhbHVlICsgXCIvXCIgKyBwYXRoO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcGF0aDtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICog5qC55o2u6YCJ5oup6IqC54K555Sf5oiQVUnku6PnoIFcclxuICAgICAqL1xyXG4gICAgcHVibGljIHN0YXRpYyBhc3luYyBnZW5lcmF0ZVVJQ29kZShub2Rlczogc3RyaW5nW10pe1xyXG4gICAgICAgIGlmKCFub2RlcyB8fCBub2Rlcy5sZW5ndGggPD0wKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCLmnKrpgInkuK3oioLngrlcIilcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgcm9vdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2Rlc1swXSk7XHJcbiAgICAgICAgd2hpbGUocm9vdC5wYXJlbnQ/LnZhbHVlICE9IG51bGwpe1xyXG4gICAgICAgICAgICB2YXIgcE5vZGUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgcm9vdC5wYXJlbnQudmFsdWUudXVpZCk7XHJcbiAgICAgICAgICAgIGlmKHBOb2RlLm5hbWUudmFsdWUgPT0gXCJzaG91bGRfaGlkZV9pbl9oaWVyYXJjaHlcIikgYnJlYWs7XHJcbiAgICAgICAgICAgIHJvb3QgPSBwTm9kZVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihyb290Ll9fdHlwZV9fID09IFwiY2MuU2NlbmVcIikgcmV0dXJuO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKHJvb3QuX19wcmVmYWJfXyE9bnVsbCl7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvb3RQYXRoID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktcGF0aCcsIHJvb3QuX19wcmVmYWJfXy51dWlkKTtcclxuICAgICAgICAgICAgaWYocm9vdFBhdGggIT0gbnVsbCAmJiByb290UGF0aCE9XCJcIil7XHJcbiAgICAgICAgICAgICAgICBpZihyb290UGF0aC5pbmRleE9mKFwiYXNzZXRzUGFja2FnZVwiKTwwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIumdnlVJ6LWE5rqQXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwcmVmYWJQYXRoID0gRWRpdG9yLlV0aWxzLlBhdGguc2xhc2gocm9vdFBhdGgpLnNwbGl0KFwiL2Fzc2V0c1BhY2thZ2UvXCIpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3ViID0gcHJlZmFiUGF0aFsxXS5zcGxpdChcIi9cIik7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3ViVUkgPSBudWxsXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgQ29kZUdlbmVyYXRlLnVpUGF0aC5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgICAgICBpZihDb2RlR2VuZXJhdGUudWlQYXRoW2luZGV4XS50b1VwcGVyQ2FzZSgpID09IHN1YlswXS50b1VwcGVyQ2FzZSgpKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3ViVUkgPSBDb2RlR2VuZXJhdGUudWlTY3JpcHRQYXRoW2luZGV4XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYoIXN1YlVJKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIumdnlVJ6LWE5rqQXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xyXG4gICAgICAgICAgICAgICAgbGV0IGNzUGF0aCA9IHBhdGguam9pbihwcm9qZWN0UGF0aCwgXCJhc3NldHNcIiwgXCJzY3JpcHRzXCIsXCJDb2RlXCIsXCJHYW1lXCIsIHN1YlVJKTtcclxuICAgICAgICAgICAgICAgIGxldCBjb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IDE7IGluZGV4IDwgc3ViLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBlbGVtZW50ID0gc3ViW2luZGV4XS5yZXBsYWNlKFwidWlcIixcIlVJXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGVsZW1lbnQuaW5kZXhPZihcIi5cIikgPj0wICkgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZWxlbWVudC50b0xvd2VyQ2FzZSgpID09IFwicHJlZmFic1wiICkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZWxlbWVudC5zdGFydHNXaXRoKFwiVUlcIikpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gXCJVSVwiICsgZWxlbWVudC5jaGFyQXQoMikudG9VcHBlckNhc2UoKSArIGVsZW1lbnQuc2xpY2UoMylcclxuICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBlbGVtZW50LnNsaWNlKDEpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGNzUGF0aCA9IHBhdGguam9pbihjc1BhdGgsIGVsZW1lbnQpXHJcbiAgICAgICAgICAgICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxldCBmaWxlTmFtZSA9IEVkaXRvci5VdGlscy5QYXRoLnN0cmlwRXh0KEVkaXRvci5VdGlscy5QYXRoLmJhc2VuYW1lKHJvb3RQYXRoKS5yZXBsYWNlKFwidWlcIixcIlVJXCIpKTsgXHJcbiAgICAgICAgICAgICAgICBpZihmaWxlTmFtZS5zdGFydHNXaXRoKFwiVUlcIikpIHtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlTmFtZSA9IFwiVUlcIiArIGZpbGVOYW1lLmNoYXJBdCgyKS50b1VwcGVyQ2FzZSgpICsgZmlsZU5hbWUuc2xpY2UoMylcclxuICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVOYW1lID0gZmlsZU5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBmaWxlTmFtZS5zbGljZSgxKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjc1BhdGggPSBwYXRoLmpvaW4oY3NQYXRoLCBmaWxlTmFtZSArXCIudHNcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhjc1BhdGgpXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0YXNrID0gRVRUYXNrLmNyZWF0ZTxib29sZWFuPih0cnVlKTtcclxuICAgICAgICAgICAgICAgIGZzLmV4aXN0cyhjc1BhdGgsIChyZXMpPT57IHRhc2suc2V0UmVzdWx0KHJlcykgfSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgZXhpc3RzID0gYXdhaXQgdGFza1xyXG4gICAgICAgICAgICAgICAgaWYoZXhpc3RzKVxyXG4gICAgICAgICAgICAgICAgeyAgXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5pbmZvKFwi5paH5Lu25bey5a2Y5ZyoLCDlsIbkuI3kvJrnm7TmjqXovpPlh7rmlofku7ZcIitjc1BhdGgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBwb2ludHMgPSBcIi4uLy4uL1wiO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGNvdW50OyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9pbnRzICs9XCIuLi9cIlxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc3QgbGluZSA9IGBcclxuYFxyXG4gICAgICAgICAgICAgICAgbGV0IGhlYWRlciA9IFxyXG5gXHJcbmltcG9ydCB7IE5vZGUgfSBmcm9tIFwiY2NcIjtcclxuaW1wb3J0IHsgSU9uQ3JlYXRlIH0gZnJvbSBcIiR7cG9pbnRzfU1vZHVsZS9VSS9JT25DcmVhdGVcIjtcclxuaW1wb3J0IHsgSU9uRW5hYmxlIH0gZnJvbSBcIiR7cG9pbnRzfU1vZHVsZS9VSS9JT25FbmFibGVcIjtcclxuaW1wb3J0IHsgVUlCYXNlVmlldyB9IGZyb20gXCIke3BvaW50c31Nb2R1bGUvVUkvVUlCYXNlVmlld1wiO1xyXG5gXHJcbiAgICAgICAgICAgICAgICBsZXQgZmllbGRzID0gXCJcIlxyXG4gICAgICAgICAgICAgICAgbGV0IG9uQ3JlYXRlID0gXCJcIlxyXG4gICAgICAgICAgICAgICAgbGV0IG9uRW5hYmxlID0gXCJcIlxyXG4gICAgICAgICAgICAgICAgbGV0IGZ1bmMgPSBcIlwiXHJcbiAgICAgICAgICAgICAgICBjb25zdCB1aVR5cGVzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgbm9kZXMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5vZGUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZXNbaW5kZXhdKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgYmFzZU5hbWUgPSAobm9kZS5uYW1lLnZhbHVlIGFzIHN0cmluZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoYmFzZU5hbWU9PW51bGwgfHwgYmFzZU5hbWUgPT0gJycpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJhc2VOYW1lID0gYmFzZU5hbWUucmVwbGFjZSgnICcsJycpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJhc2VOYW1lID0gYmFzZU5hbWUuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBiYXNlTmFtZS5zbGljZSgxKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbm9kZU5hbWUgPSBiYXNlTmFtZTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaSA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUobmFtZXMuaGFzKG5vZGVOYW1lKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lID0gYmFzZU5hbWUgKyBpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwcGVyTmFtZSA9IG5vZGVOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbm9kZU5hbWUuc2xpY2UoMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZXMuYWRkKG5vZGVOYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gYXdhaXQgQ29kZUdlbmVyYXRlLmdldFBhdGgobm9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHVpVHlwZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBub2RlLl9fY29tcHNfXy5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wID0gbm9kZS5fX2NvbXBzX19bal07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKGNvbXA/LnR5cGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRoaXNUeXBlID0gQ29kZUdlbmVyYXRlLnR5cGVNYXAuZ2V0KGNvbXAudHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih0aGlzVHlwZSA9PSBudWxsKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKHVpVHlwZSAhPSBudWxsKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgQ29kZUdlbmVyYXRlLnR5cGVNYXApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoZWxlbWVudFsxXSA9PSB1aVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGVsZW1lbnRbMV0gPT0gdGhpc1R5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVpVHlwZSA9IHRoaXNUeXBlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aVR5cGUgPSB0aGlzVHlwZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZih1aVR5cGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1aVR5cGVzLmFkZCh1aVR5cGUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkcyArPSBgICAgIHB1YmxpYyAke25vZGVOYW1lfTogJHt1aVR5cGV9OyR7bGluZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihyb290LnV1aWQudmFsdWUgPT0gbm9kZS51dWlkLnZhbHVlKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ3JlYXRlICs9IGAgICAgICAgIHRoaXMuJHtub2RlTmFtZX0gPSB0aGlzLmFkZENvbXBvbmVudCgke3VpVHlwZX0pOyR7bGluZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ3JlYXRlICs9IGAgICAgICAgIHRoaXMuJHtub2RlTmFtZX0gPSB0aGlzLmFkZENvbXBvbmVudCgke3VpVHlwZX0sIFwiJHtwYXRofVwiKTske2xpbmV9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZih1aVR5cGUgPT0gXCJVSUJ1dHRvblwiKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uRW5hYmxlICs9IGAgICAgICAgIHRoaXMuJHtub2RlTmFtZX0uc2V0T25DbGljayh0aGlzLm9uQ2xpY2ske3VwcGVyTmFtZX0uYmluZCh0aGlzKSk7JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jICs9IGAgICAgcHJpdmF0ZSBvbkNsaWNrJHt1cHBlck5hbWV9KCl7JHtsaW5lfSR7bGluZX0gICAgfSR7bGluZX0ke2xpbmV9YFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYodWlUeXBlID09IFwiVUlMb29wR3JpZFZpZXdcIil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNyZWF0ZSArPSBgICAgICAgICB0aGlzLiR7bm9kZU5hbWV9LmluaXRHcmlkVmlldygwLCB0aGlzLm9uR2V0JHt1cHBlck5hbWV9SXRlbUJ5SW5kZXguYmluZCh0aGlzKSk7JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jICs9IGAgICAgcHJpdmF0ZSBvbkdldCR7dXBwZXJOYW1lfUl0ZW1CeUluZGV4KGdyaWRWaWV3OiBMb29wR3JpZFZpZXcsIGluZGV4OiBudW1iZXIsIHJvdzogbnVtYmVyLCBjb2x1bW46IG51bWJlcik6IExvb3BHcmlkVmlld0l0ZW0geyR7bGluZX0gICAgICAgIHJldHVybiBudWxsOyR7bGluZX0gICAgfSR7bGluZX0ke2xpbmV9YFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYodWlUeXBlID09IFwiVUlMb29wTGlzdFZpZXcyXCIpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DcmVhdGUgKz0gYCAgICAgICAgdGhpcy4ke25vZGVOYW1lfS5pbml0TGlzdFZpZXcoMCwgdGhpcy5vbkdldCR7dXBwZXJOYW1lfUl0ZW1CeUluZGV4LmJpbmQodGhpcykpOyR7bGluZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuYyArPSBgICAgIHByaXZhdGUgb25HZXQke3VwcGVyTmFtZX1JdGVtQnlJbmRleChsaXN0VmlldzogTG9vcExpc3RWaWV3MiwgaW5kZXg6IG51bWJlcik6IExvb3BMaXN0Vmlld0l0ZW0yIHske2xpbmV9ICAgICAgICByZXR1cm4gbnVsbDske2xpbmV9ICAgIH0ke2xpbmV9JHtsaW5lfWBcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmKHVpVHlwZSA9PSBcIlVJQ29weUdhbWVPYmplY3RcIil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNyZWF0ZSArPSBgICAgICAgICB0aGlzLiR7bm9kZU5hbWV9LmluaXRMaXN0VmlldygwLCB0aGlzLm9uR2V0JHt1cHBlck5hbWV9SXRlbUJ5SW5kZXguYmluZCh0aGlzKSk7JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jICs9IGAgICAgcHJpdmF0ZSBvbkdldCR7dXBwZXJOYW1lfUl0ZW1CeUluZGV4KGluZGV4OiBudW1iZXIsIGdvOiBOb2RlKXske2xpbmV9JHtsaW5lfSAgICB9JHtsaW5lfSR7bGluZX1gXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1aVR5cGVzLmFkZChcIlVJRW1wdHlWaWV3XCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkcyArPSBgICAgIHB1YmxpYyAke25vZGVOYW1lfTogVUlFbXB0eVZpZXc7JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKHJvb3QudXVpZC52YWx1ZSA9PSBub2RlLnV1aWQudmFsdWUpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DcmVhdGUgKz0gYCAgICAgICAgdGhpcy4ke25vZGVOYW1lfSA9IHRoaXMuYWRkQ29tcG9uZW50KFVJRW1wdHlWaWV3KTske2xpbmV9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNyZWF0ZSArPSBgICAgICAgICB0aGlzLiR7bm9kZU5hbWV9ID0gdGhpcy5hZGRDb21wb25lbnQoVUlFbXB0eVZpZXcsIFwiJHtwYXRofVwiKTske2xpbmV9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgdWlUeXBlcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlciArPSBgaW1wb3J0IHsgJHtlbGVtZW50fSB9IGZyb20gXCIke3BvaW50c31Nb2R1bGUvVUlDb21wb25lbnQvJHtlbGVtZW50fVwiOyR7bGluZX1gXHJcbiAgICAgICAgICAgICAgICAgICAgaWYoZWxlbWVudCA9PSBcIlVJTG9vcExpc3RWaWV3MlwiKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyICs9IGBpbXBvcnQgeyBMb29wTGlzdFZpZXcyIH0gZnJvbSBcIiR7cG9pbnRzfS4uL1RoaXJkUGFydHkvU3VwZXJTY3JvbGxWaWV3L0xpc3RWaWV3L0xvb3BMaXN0VmlldzJcIjtcclxuaW1wb3J0IHsgTG9vcExpc3RWaWV3SXRlbTIgfSBmcm9tIFwiJHtwb2ludHN9Li4vVGhpcmRQYXJ0eS9TdXBlclNjcm9sbFZpZXcvTGlzdFZpZXcvTG9vcExpc3RWaWV3SXRlbTJcIjske2xpbmV9YFxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZihlbGVtZW50ID09IFwiVUlMb29wR3JpZFZpZXdcIil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlciArPSBgaW1wb3J0IHsgTG9vcEdyaWRWaWV3IH0gZnJvbSBcIiR7cG9pbnRzfS4uL1RoaXJkUGFydHkvU3VwZXJTY3JvbGxWaWV3L0dyaWRWaWV3L0xvb3BHcmlkVmlld1wiO1xyXG5pbXBvcnQgeyBMb29wR3JpZFZpZXdJdGVtIH0gZnJvbSBcIiR7cG9pbnRzfS4uL1RoaXJkUGFydHkvU3VwZXJTY3JvbGxWaWV3L0dyaWRWaWV3L0xvb3BHcmlkVmlld0l0ZW1cIjske2xpbmV9YFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgY29udGVudCA9IFxyXG5gXHJcbiR7aGVhZGVyfVxyXG5leHBvcnQgY2xhc3MgJHtmaWxlTmFtZX0gZXh0ZW5kcyBVSUJhc2VWaWV3IGltcGxlbWVudHMgSU9uQ3JlYXRlLCBJT25FbmFibGUge1xyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgUHJlZmFiUGF0aDpzdHJpbmcgPSBcIiR7RWRpdG9yLlV0aWxzLlBhdGguc3RyaXBFeHQocHJlZmFiUGF0aFsxXSl9XCI7XHJcblxyXG4gICAgcHVibGljIGdldENvbnN0cnVjdG9yKClcclxuICAgIHtcclxuICAgICAgICByZXR1cm4gJHtmaWxlTmFtZX07XHJcbiAgICB9XHJcblxyXG4ke2ZpZWxkc31cclxuICAgIHB1YmxpYyBvbkNyZWF0ZSgpXHJcbiAgICB7XHJcbiR7b25DcmVhdGV9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIG9uRW5hYmxlKClcclxuICAgIHtcclxuJHtvbkVuYWJsZX1cclxuICAgIH1cclxuXHJcbiR7ZnVuY31cclxufVxyXG5gXHJcblxyXG4gICAgICAgICAgICAgICAgRWRpdG9yLkNsaXBib2FyZC53cml0ZSgndGV4dCcsIGNvbnRlbnQpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCLnlJ/miJDku6PnoIHmiJDlip/vvIzlt7LlpI3liLbliLDliarnspjmnb9cIilcclxuICAgICAgICAgICAgICAgIGlmKCFleGlzdHMpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpciA9IEVkaXRvci5VdGlscy5QYXRoLmRpcm5hbWUoY3NQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBGaWxlSGVscGVyLmNyZWF0ZURpcihkaXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZShjc1BhdGgsY29udGVudCwge30sKGVycik9PntcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEhZXJyKSBjb25zb2xlLmVycm9yKGVycik7IFxyXG4gICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwdWJsaWMgc3RhdGljIGFzeW5jIGJpbmRVSU5vZGUobm9kZTogc3RyaW5nKXtcclxuICAgICAgICB2YXIgcm9vdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlKTtcclxuICAgICAgICB3aGlsZShyb290LnBhcmVudD8udmFsdWUgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgIHZhciBwTm9kZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCByb290LnBhcmVudC52YWx1ZS51dWlkKTtcclxuICAgICAgICAgICAgaWYocE5vZGUubmFtZS52YWx1ZSA9PSBcInNob3VsZF9oaWRlX2luX2hpZXJhcmNoeVwiKSBicmVhaztcclxuICAgICAgICAgICAgcm9vdCA9IHBOb2RlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHJvb3QuX190eXBlX18gPT0gXCJjYy5TY2VuZVwiKSByZXR1cm47XHJcbiAgICAgICAgaWYocm9vdC5fX3ByZWZhYl9fIT1udWxsKXtcclxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnb3Blbi1hc3NldCcsIHJvb3QuX19wcmVmYWJfXy51dWlkKTtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5iaW5kVUlOb2RlQnlQcmVmYWIoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyBhc3luYyBiaW5kVUlOb2RlQnlQcmVmYWIoKXtcclxuICAgICAgICB3aGlsZSghYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktaXMtcmVhZHknKSkgO1xyXG4gICAgICAgIGNvbnN0IHRyZWUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKSBhcyBhbnk7XHJcbiAgICAgICAgdmFyIHJvb3QgPSB0cmVlO1xyXG4gICAgICAgIGlmKHJvb3Q/LmNoaWxkcmVuID09IG51bGwpIHJldHVybjtcclxuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcm9vdC5jaGlsZHJlbi5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgY29uc3QgZWxlbWVudCA9IHJvb3QuY2hpbGRyZW5baW5kZXhdO1xyXG4gICAgICAgICAgICBpZihlbGVtZW50Lm5hbWUgPT0gXCJzaG91bGRfaGlkZV9pbl9oaWVyYXJjaHlcIil7XHJcbiAgICAgICAgICAgICAgICByb290ID0gZWxlbWVudC5jaGlsZHJlblswXTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHNjcmlwdHMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldHMnLCB7IGNjVHlwZTogJ2NjLlNjcmlwdCcgfSk7XHJcbiAgICAgICAgbGV0IHNjcmlwdCA9IG51bGw7XHJcbiAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHNjcmlwdHMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgIGlmKHNjcmlwdHNbaW5kZXhdLm5hbWUudG9Mb3dlckNhc2UoKS5pbmRleE9mKHJvb3QubmFtZS50b0xvd2VyQ2FzZSgpKT49MCl7XHJcbiAgICAgICAgICAgICAgICBzY3JpcHQgPSBzY3JpcHRzW2luZGV4XTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKHNjcmlwdCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJxdWVyeS1zY3JpcHQgZmFpbCFcIik7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29uc3QgdHMgPSBmcy5yZWFkRmlsZVN5bmMoc2NyaXB0LmZpbGUsIHsgZW5jb2Rpbmc6IFwidXRmLThcIn0pO1xyXG4gICAgICAgIGNvbnN0IGxpbmVzID0gdHMuc3BsaXQoJ1xcbicpO1xyXG4gICAgICAgIGNvbnN0IHBhdGhNYXAgPSBuZXcgTWFwPHN0cmluZywgYW55PigpO1xyXG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBsaW5lcy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgbGV0IGxpbmUgPSBsaW5lc1tpbmRleF07XHJcbiAgICAgICAgICAgIGlmKGxpbmUuaW5kZXhPZihcInRoaXMuYWRkQ29tcG9uZW50KFwiKT49MCl7XHJcbiAgICAgICAgICAgICAgICBsaW5lID0gbGluZS5yZXBsYWNlKCcgJywnJyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB2cyA9IGxpbmUuc3BsaXQoXCJcXFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgaWYodnMubGVuZ3RoPjIpIHtcclxuICAgICAgICAgICAgICAgICAgICBwYXRoTWFwLnNldCh2c1sxXSwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGNvbXAgPSBudWxsO1xyXG4gICAgICAgIGxldCBjb21wSW5kZXggPSAtMTtcclxuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcm9vdC5jb21wb25lbnRzLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICBpZihyb290LmNvbXBvbmVudHNbaW5kZXhdLnR5cGUgPT0gXCJSZWZlcmVuY2VDb2xsZWN0b3JcIil7XHJcbiAgICAgICAgICAgICAgICBjb21wID0gcm9vdC5jb21wb25lbnRzW2luZGV4XTtcclxuICAgICAgICAgICAgICAgIGNvbXBJbmRleCA9IGluZGV4O1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYoIWNvbXApe1xyXG4gICAgICAgICAgICBjb25zdCByZXMgPSBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtY29tcG9uZW50JywgeyBcclxuICAgICAgICAgICAgICAgIHV1aWQ6IHJvb3QudXVpZCxcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudDogJ1JlZmVyZW5jZUNvbGxlY3RvcidcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGlmKCFyZXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJjcmVhdGUtY29tcG9uZW50IGZhaWwhXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgcE5vZGUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnLCByb290LnV1aWQpIGFzIGFueTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHBOb2RlLmNvbXBvbmVudHMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZihwTm9kZS5jb21wb25lbnRzW2luZGV4XS50eXBlID09IFwiUmVmZXJlbmNlQ29sbGVjdG9yXCIpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbXAgPSBwTm9kZS5jb21wb25lbnRzW2luZGV4XTtcclxuICAgICAgICAgICAgICAgICAgICBjb21wSW5kZXggPSBpbmRleDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgY291bnQgPSAwO1xyXG4gICAgICAgIGZvciAoY29uc3Qga3Ygb2YgcGF0aE1hcCkge1xyXG4gICAgICAgICAgICBjb25zdCBwYXRoID0ga3ZbMF07XHJcbiAgICAgICAgICAgIGNvbnN0IHZzID0gcGF0aC5zcGxpdCgnLycpO1xyXG4gICAgICAgICAgICB2YXIgbm9kZSA9IHJvb3Q7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCB2cy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSB2c1tpbmRleF07XHJcbiAgICAgICAgICAgICAgICBsZXQgZmluZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYobmFtZSA9PSBub2RlLmNoaWxkcmVuW2ldLm5hbWUpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlID0gbm9kZS5jaGlsZHJlbltpXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmluZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmKCFmaW5kKXtcclxuICAgICAgICAgICAgICAgICAgICBub2RlID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZihub2RlIT1udWxsKXtcclxuICAgICAgICAgICAgICAgIHBhdGhNYXAuc2V0KHBhdGgsIG5vZGUpXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhwYXRoK1wiIFwiK25vZGUudXVpZCk7XHJcbiAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xyXG4gICAgICAgICAgICB1dWlkOiByb290LnV1aWQsXHJcbiAgICAgICAgICAgIHBhdGg6IGBfX2NvbXBzX18uJHtjb21wSW5kZXh9LmRhdGEubGVuZ3RoYCxcclxuICAgICAgICAgICAgZHVtcDoge1xyXG4gICAgICAgICAgICAgICAgdmFsdWU6IGNvdW50LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGxldCBqaiA9IDA7XHJcbiAgICAgICAgZm9yIChjb25zdCBrdiBvZiBwYXRoTWFwKSB7XHJcbiAgICAgICAgICAgIGlmKGt2WzFdID09IG51bGwpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XHJcbiAgICAgICAgICAgICAgICB1dWlkOiByb290LnV1aWQsXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7Y29tcEluZGV4fS5kYXRhLiR7amp9YCxcclxuICAgICAgICAgICAgICAgIGR1bXA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIktleVZhbHVlUGlhclwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7fSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XHJcbiAgICAgICAgICAgICAgICB1dWlkOiByb290LnV1aWQsXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7Y29tcEluZGV4fS5kYXRhLiR7amp9LmtleWAsXHJcbiAgICAgICAgICAgICAgICBkdW1wOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGt2WzBdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcclxuICAgICAgICAgICAgICAgIHV1aWQ6IHJvb3QudXVpZCxcclxuICAgICAgICAgICAgICAgIHBhdGg6IGBfX2NvbXBzX18uJHtjb21wSW5kZXh9LmRhdGEuJHtqan0udmFsdWVgLFxyXG4gICAgICAgICAgICAgICAgZHVtcDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiY2MuTm9kZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHV1aWQ6IGt2WzFdLnV1aWR9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGpqKys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NhdmUtc2NlbmUnKTtcclxuICAgIH1cclxufSJdfQ==