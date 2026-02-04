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
        console.log(tree);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1nZW5lcmF0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9jb2RlLWdlbmVyYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUNBQXlCO0FBQ3pCLGdEQUF3QjtBQUN4QixxQ0FBa0M7QUFFbEMsK0NBQTJDO0FBRzNDLE1BQWEsWUFBWTtJQWVkLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQVc7O1FBQ25DLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQzNCLElBQUcsQ0FBQSxNQUFBLElBQUksQ0FBQyxNQUFNLDBDQUFFLEtBQUssS0FBSSxJQUFJO1lBQUUsT0FBTyxJQUFJLENBQUM7UUFDM0MsSUFBSSxVQUFVLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdGLElBQUcsVUFBVSxJQUFJLElBQUksSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSwwQkFBMEI7WUFBRSxPQUFPLElBQUksQ0FBQztRQUMxRixPQUFNLENBQUEsTUFBQSxVQUFVLENBQUMsTUFBTSwwQ0FBRSxLQUFLLEtBQUksSUFBSSxFQUFDO1lBQ25DLElBQUksR0FBRyxVQUFVLENBQUM7WUFDbEIsVUFBVSxHQUFHLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvRixJQUFHLFVBQVUsSUFBSSxJQUFJLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksMEJBQTBCO2dCQUFFLE1BQU07WUFDcEYsSUFBSSxHQUFHLElBQUksQ0FB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SUFBSSxFQUFDO2lCQUM3QjthQUNKLENBQUMsQ0FBQztZQUNILEVBQUUsRUFBRSxDQUFDO1NBQ1I7UUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3hELENBQUM7O0FBOVhMLG9DQStYQztBQTlYMkIsbUJBQU0sR0FBRyx3QkFBVSxDQUFDLE1BQU0sQ0FBQTtBQUMxQix5QkFBWSxHQUFHLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtBQUVsRCxvQkFBTyxHQUF1QixJQUFJLEdBQUcsQ0FBZ0I7SUFDaEUsQ0FBQyxnQkFBZ0IsRUFBRyxrQkFBa0IsQ0FBQztJQUN2QyxDQUFDLGVBQWUsRUFBRyxpQkFBaUIsQ0FBQztJQUNyQyxDQUFDLGNBQWMsRUFBRyxnQkFBZ0IsQ0FBQztJQUNuQyxDQUFDLFdBQVcsRUFBRyxVQUFVLENBQUM7SUFDMUIsQ0FBQyxZQUFZLEVBQUcsU0FBUyxDQUFDO0lBQzFCLENBQUMsV0FBVyxFQUFHLFVBQVUsQ0FBQztJQUMxQixDQUFDLFdBQVcsRUFBRyxTQUFTLENBQUM7SUFDekIsQ0FBQyxVQUFVLEVBQUcsUUFBUSxDQUFDO0lBQ3ZCLENBQUMsYUFBYSxFQUFHLFFBQVEsQ0FBQztDQUM3QixDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgRVRUYXNrIH0gZnJvbSBcIi4vZXR0YXNrXCI7XHJcbmltcG9ydCB7IElOb2RlIH0gZnJvbSBcIkBjb2Nvcy9jcmVhdG9yLXR5cGVzL2VkaXRvci9wYWNrYWdlcy9zY2VuZS9AdHlwZXMvcHVibGljXCI7XHJcbmltcG9ydCB7IEZpbGVIZWxwZXIgfSBmcm9tIFwiLi9maWxlLWhlbHBlclwiO1xyXG5pbXBvcnQgeyBVdGlscyB9IGZyb20gXCJAY29jb3MvY3JlYXRvci10eXBlcy9lZGl0b3IvdXRpbHMvaW5kZXhcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBDb2RlR2VuZXJhdGV7XHJcbiAgICBwcml2YXRlIHN0YXRpYyByZWFkb25seSB1aVBhdGggPSBGaWxlSGVscGVyLnVpUGF0aFxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgdWlTY3JpcHRQYXRoID0gW1wiVUlcIiwgXCJVSUhhbGxcIiwgXCJVSUdhbWVcIl1cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyB0eXBlTWFwOiBNYXA8c3RyaW5nLHN0cmluZz4gPSBuZXcgTWFwPHN0cmluZyxzdHJpbmc+KFtcclxuICAgICAgICBbXCJDb3B5R2FtZU9iamVjdFwiICwgXCJVSUNvcHlHYW1lT2JqZWN0XCJdLFxyXG4gICAgICAgIFtcIkxvb3BMaXN0VmlldzJcIiAsIFwiVUlMb29wTGlzdFZpZXcyXCJdLFxyXG4gICAgICAgIFtcIkxvb3BHcmlkVmlld1wiICwgXCJVSUxvb3BHcmlkVmlld1wiXSxcclxuICAgICAgICBbXCJjYy5CdXR0b25cIiAsIFwiVUlCdXR0b25cIl0sXHJcbiAgICAgICAgW1wiY2MuRWRpdEJveFwiICwgXCJVSUlucHV0XCJdLFxyXG4gICAgICAgIFtcImNjLlNsaWRlclwiICwgXCJVSVNsaWRlclwiXSxcclxuICAgICAgICBbXCJjYy5TcHJpdGVcIiAsIFwiVUlJbWFnZVwiXSxcclxuICAgICAgICBbXCJjYy5MYWJlbFwiICwgXCJVSVRleHRcIl0sXHJcbiAgICAgICAgW1wiY2MuUmljaFRleHRcIiAsIFwiVUlUZXh0XCJdLFxyXG4gICAgXSlcclxuICAgIHB1YmxpYyBzdGF0aWMgYXN5bmMgZ2V0UGF0aChub2RlOiBJTm9kZSl7XHJcbiAgICAgICAgbGV0IHBhdGggPSBub2RlLm5hbWUudmFsdWU7XHJcbiAgICAgICAgaWYobm9kZS5wYXJlbnQ/LnZhbHVlID09IG51bGwpIHJldHVybiBwYXRoO1xyXG4gICAgICAgIHZhciBwYXJlbnROb2RlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGUucGFyZW50LnZhbHVlLnV1aWQpO1xyXG4gICAgICAgIGlmKHBhcmVudE5vZGUgPT0gbnVsbCB8fCBwYXJlbnROb2RlLm5hbWUudmFsdWUgPT0gXCJzaG91bGRfaGlkZV9pbl9oaWVyYXJjaHlcIikgcmV0dXJuIHBhdGg7XHJcbiAgICAgICAgd2hpbGUocGFyZW50Tm9kZS5wYXJlbnQ/LnZhbHVlICE9IG51bGwpe1xyXG4gICAgICAgICAgICBub2RlID0gcGFyZW50Tm9kZTtcclxuICAgICAgICAgICAgcGFyZW50Tm9kZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBwYXJlbnROb2RlLnBhcmVudC52YWx1ZS51dWlkKTtcclxuICAgICAgICAgICAgaWYocGFyZW50Tm9kZSA9PSBudWxsIHx8IHBhcmVudE5vZGUubmFtZS52YWx1ZSA9PSBcInNob3VsZF9oaWRlX2luX2hpZXJhcmNoeVwiKSBicmVhaztcclxuICAgICAgICAgICAgcGF0aCA9IG5vZGUubmFtZS52YWx1ZSArIFwiL1wiICsgcGF0aDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHBhdGg7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIOagueaNrumAieaLqeiKgueCueeUn+aIkFVJ5Luj56CBXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBzdGF0aWMgYXN5bmMgZ2VuZXJhdGVVSUNvZGUobm9kZXM6IHN0cmluZ1tdKXtcclxuICAgICAgICBpZighbm9kZXMgfHwgbm9kZXMubGVuZ3RoIDw9MCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwi5pyq6YCJ5Lit6IqC54K5XCIpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJvb3QgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZXNbMF0pO1xyXG4gICAgICAgIHdoaWxlKHJvb3QucGFyZW50Py52YWx1ZSAhPSBudWxsKXtcclxuICAgICAgICAgICAgdmFyIHBOb2RlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIHJvb3QucGFyZW50LnZhbHVlLnV1aWQpO1xyXG4gICAgICAgICAgICBpZihwTm9kZS5uYW1lLnZhbHVlID09IFwic2hvdWxkX2hpZGVfaW5faGllcmFyY2h5XCIpIGJyZWFrO1xyXG4gICAgICAgICAgICByb290ID0gcE5vZGVcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYocm9vdC5fX3R5cGVfXyA9PSBcImNjLlNjZW5lXCIpIHJldHVybjtcclxuICAgICAgICBcclxuICAgICAgICBpZihyb290Ll9fcHJlZmFiX18hPW51bGwpe1xyXG4gICAgICAgICAgICBjb25zdCByb290UGF0aCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXBhdGgnLCByb290Ll9fcHJlZmFiX18udXVpZCk7XHJcbiAgICAgICAgICAgIGlmKHJvb3RQYXRoICE9IG51bGwgJiYgcm9vdFBhdGghPVwiXCIpe1xyXG4gICAgICAgICAgICAgICAgaWYocm9vdFBhdGguaW5kZXhPZihcImFzc2V0c1BhY2thZ2VcIik8MCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCLpnZ5VSei1hOa6kFwiKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcHJlZmFiUGF0aCA9IEVkaXRvci5VdGlscy5QYXRoLnNsYXNoKHJvb3RQYXRoKS5zcGxpdChcIi9hc3NldHNQYWNrYWdlL1wiKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN1YiA9IHByZWZhYlBhdGhbMV0uc3BsaXQoXCIvXCIpO1xyXG4gICAgICAgICAgICAgICAgbGV0IHN1YlVJID0gbnVsbFxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IENvZGVHZW5lcmF0ZS51aVBhdGgubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoQ29kZUdlbmVyYXRlLnVpUGF0aFtpbmRleF0udG9VcHBlckNhc2UoKSA9PSBzdWJbMF0udG9VcHBlckNhc2UoKSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1YlVJID0gQ29kZUdlbmVyYXRlLnVpU2NyaXB0UGF0aFtpbmRleF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmKCFzdWJVSSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCLpnZ5VSei1hOa6kFwiKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnN0IHByb2plY3RQYXRoID0gRWRpdG9yLlByb2plY3QucGF0aDtcclxuICAgICAgICAgICAgICAgIGxldCBjc1BhdGggPSBwYXRoLmpvaW4ocHJvamVjdFBhdGgsIFwiYXNzZXRzXCIsIFwic2NyaXB0c1wiLFwiQ29kZVwiLFwiR2FtZVwiLCBzdWJVSSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAxOyBpbmRleCA8IHN1Yi5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZWxlbWVudCA9IHN1YltpbmRleF0ucmVwbGFjZShcInVpXCIsXCJVSVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBpZihlbGVtZW50LmluZGV4T2YoXCIuXCIpID49MCApIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGVsZW1lbnQudG9Mb3dlckNhc2UoKSA9PSBcInByZWZhYnNcIiApIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGVsZW1lbnQuc3RhcnRzV2l0aChcIlVJXCIpKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IFwiVUlcIiArIGVsZW1lbnQuY2hhckF0KDIpLnRvVXBwZXJDYXNlKCkgKyBlbGVtZW50LnNsaWNlKDMpXHJcbiAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgZWxlbWVudC5zbGljZSgxKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjc1BhdGggPSBwYXRoLmpvaW4oY3NQYXRoLCBlbGVtZW50KVxyXG4gICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBsZXQgZmlsZU5hbWUgPSBFZGl0b3IuVXRpbHMuUGF0aC5zdHJpcEV4dChFZGl0b3IuVXRpbHMuUGF0aC5iYXNlbmFtZShyb290UGF0aCkucmVwbGFjZShcInVpXCIsXCJVSVwiKSk7IFxyXG4gICAgICAgICAgICAgICAgaWYoZmlsZU5hbWUuc3RhcnRzV2l0aChcIlVJXCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZU5hbWUgPSBcIlVJXCIgKyBmaWxlTmFtZS5jaGFyQXQoMikudG9VcHBlckNhc2UoKSArIGZpbGVOYW1lLnNsaWNlKDMpXHJcbiAgICAgICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlTmFtZSA9IGZpbGVOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgZmlsZU5hbWUuc2xpY2UoMSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY3NQYXRoID0gcGF0aC5qb2luKGNzUGF0aCwgZmlsZU5hbWUgK1wiLnRzXCIpO1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coY3NQYXRoKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgdGFzayA9IEVUVGFzay5jcmVhdGU8Ym9vbGVhbj4odHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICBmcy5leGlzdHMoY3NQYXRoLCAocmVzKT0+eyB0YXNrLnNldFJlc3VsdChyZXMpIH0pO1xyXG4gICAgICAgICAgICAgICAgbGV0IGV4aXN0cyA9IGF3YWl0IHRhc2tcclxuICAgICAgICAgICAgICAgIGlmKGV4aXN0cylcclxuICAgICAgICAgICAgICAgIHsgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuaW5mbyhcIuaWh+S7tuW3suWtmOWcqCwg5bCG5LiN5Lya55u05o6l6L6T5Ye65paH5Lu2XCIrY3NQYXRoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgcG9pbnRzID0gXCIuLi8uLi9cIjtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBjb3VudDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHBvaW50cyArPVwiLi4vXCJcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBgXHJcbmBcclxuICAgICAgICAgICAgICAgIGxldCBoZWFkZXIgPSBcclxuYFxyXG5pbXBvcnQgeyBOb2RlIH0gZnJvbSBcImNjXCI7XHJcbmltcG9ydCB7IElPbkNyZWF0ZSB9IGZyb20gXCIke3BvaW50c31Nb2R1bGUvVUkvSU9uQ3JlYXRlXCI7XHJcbmltcG9ydCB7IElPbkVuYWJsZSB9IGZyb20gXCIke3BvaW50c31Nb2R1bGUvVUkvSU9uRW5hYmxlXCI7XHJcbmltcG9ydCB7IFVJQmFzZVZpZXcgfSBmcm9tIFwiJHtwb2ludHN9TW9kdWxlL1VJL1VJQmFzZVZpZXdcIjtcclxuYFxyXG4gICAgICAgICAgICAgICAgbGV0IGZpZWxkcyA9IFwiXCJcclxuICAgICAgICAgICAgICAgIGxldCBvbkNyZWF0ZSA9IFwiXCJcclxuICAgICAgICAgICAgICAgIGxldCBvbkVuYWJsZSA9IFwiXCJcclxuICAgICAgICAgICAgICAgIGxldCBmdW5jID0gXCJcIlxyXG4gICAgICAgICAgICAgICAgY29uc3QgdWlUeXBlcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IG5vZGVzLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBub2RlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVzW2luZGV4XSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJhc2VOYW1lID0gKG5vZGUubmFtZS52YWx1ZSBhcyBzdHJpbmcpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKGJhc2VOYW1lPT1udWxsIHx8IGJhc2VOYW1lID09ICcnKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICBiYXNlTmFtZSA9IGJhc2VOYW1lLnJlcGxhY2UoJyAnLCcnKTtcclxuICAgICAgICAgICAgICAgICAgICBiYXNlTmFtZSA9IGJhc2VOYW1lLmNoYXJBdCgwKS50b0xvd2VyQ2FzZSgpICsgYmFzZU5hbWUuc2xpY2UoMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5vZGVOYW1lID0gYmFzZU5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGkgPSAxO1xyXG4gICAgICAgICAgICAgICAgICAgIHdoaWxlKG5hbWVzLmhhcyhub2RlTmFtZSkpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlTmFtZSA9IGJhc2VOYW1lICsgaTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaSsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cHBlck5hbWUgPSBub2RlTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIG5vZGVOYW1lLnNsaWNlKDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWVzLmFkZChub2RlTmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IGF3YWl0IENvZGVHZW5lcmF0ZS5nZXRQYXRoKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCB1aVR5cGUgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgbm9kZS5fX2NvbXBzX18ubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcCA9IG5vZGUuX19jb21wc19fW2pdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihjb21wPy50eXBlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0aGlzVHlwZSA9IENvZGVHZW5lcmF0ZS50eXBlTWFwLmdldChjb21wLnR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYodGhpc1R5cGUgPT0gbnVsbCkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZih1aVR5cGUgIT0gbnVsbCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIENvZGVHZW5lcmF0ZS50eXBlTWFwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKGVsZW1lbnRbMV0gPT0gdWlUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihlbGVtZW50WzFdID09IHRoaXNUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1aVR5cGUgPSB0aGlzVHlwZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdWlUeXBlID0gdGhpc1R5cGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYodWlUeXBlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdWlUeXBlcy5hZGQodWlUeXBlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWVsZHMgKz0gYCAgICBwdWJsaWMgJHtub2RlTmFtZX06ICR7dWlUeXBlfTske2xpbmV9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYocm9vdC51dWlkLnZhbHVlID09IG5vZGUudXVpZC52YWx1ZSl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNyZWF0ZSArPSBgICAgICAgICB0aGlzLiR7bm9kZU5hbWV9ID0gdGhpcy5hZGRDb21wb25lbnQoJHt1aVR5cGV9KTske2xpbmV9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkNyZWF0ZSArPSBgICAgICAgICB0aGlzLiR7bm9kZU5hbWV9ID0gdGhpcy5hZGRDb21wb25lbnQoJHt1aVR5cGV9LCBcIiR7cGF0aH1cIik7JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYodWlUeXBlID09IFwiVUlCdXR0b25cIil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbkVuYWJsZSArPSBgICAgICAgICB0aGlzLiR7bm9kZU5hbWV9LnNldE9uQ2xpY2sodGhpcy5vbkNsaWNrJHt1cHBlck5hbWV9LmJpbmQodGhpcykpOyR7bGluZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuYyArPSBgICAgIHByaXZhdGUgb25DbGljayR7dXBwZXJOYW1lfSgpeyR7bGluZX0ke2xpbmV9ICAgIH0ke2xpbmV9JHtsaW5lfWBcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmKHVpVHlwZSA9PSBcIlVJTG9vcEdyaWRWaWV3XCIpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DcmVhdGUgKz0gYCAgICAgICAgdGhpcy4ke25vZGVOYW1lfS5pbml0R3JpZFZpZXcoMCwgdGhpcy5vbkdldCR7dXBwZXJOYW1lfUl0ZW1CeUluZGV4LmJpbmQodGhpcykpOyR7bGluZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuYyArPSBgICAgIHByaXZhdGUgb25HZXQke3VwcGVyTmFtZX1JdGVtQnlJbmRleChncmlkVmlldzogTG9vcEdyaWRWaWV3LCBpbmRleDogbnVtYmVyLCByb3c6IG51bWJlciwgY29sdW1uOiBudW1iZXIpOiBMb29wR3JpZFZpZXdJdGVtIHske2xpbmV9ICAgICAgICByZXR1cm4gbnVsbDske2xpbmV9ICAgIH0ke2xpbmV9JHtsaW5lfWBcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmKHVpVHlwZSA9PSBcIlVJTG9vcExpc3RWaWV3MlwiKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ3JlYXRlICs9IGAgICAgICAgIHRoaXMuJHtub2RlTmFtZX0uaW5pdExpc3RWaWV3KDAsIHRoaXMub25HZXQke3VwcGVyTmFtZX1JdGVtQnlJbmRleC5iaW5kKHRoaXMpKTske2xpbmV9YDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmMgKz0gYCAgICBwcml2YXRlIG9uR2V0JHt1cHBlck5hbWV9SXRlbUJ5SW5kZXgobGlzdFZpZXc6IExvb3BMaXN0VmlldzIsIGluZGV4OiBudW1iZXIpOiBMb29wTGlzdFZpZXdJdGVtMiB7JHtsaW5lfSAgICAgICAgcmV0dXJuIG51bGw7JHtsaW5lfSAgICB9JHtsaW5lfSR7bGluZX1gXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZih1aVR5cGUgPT0gXCJVSUNvcHlHYW1lT2JqZWN0XCIpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DcmVhdGUgKz0gYCAgICAgICAgdGhpcy4ke25vZGVOYW1lfS5pbml0TGlzdFZpZXcoMCwgdGhpcy5vbkdldCR7dXBwZXJOYW1lfUl0ZW1CeUluZGV4LmJpbmQodGhpcykpOyR7bGluZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuYyArPSBgICAgIHByaXZhdGUgb25HZXQke3VwcGVyTmFtZX1JdGVtQnlJbmRleChpbmRleDogbnVtYmVyLCBnbzogTm9kZSl7JHtsaW5lfSR7bGluZX0gICAgfSR7bGluZX0ke2xpbmV9YFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdWlUeXBlcy5hZGQoXCJVSUVtcHR5Vmlld1wiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWVsZHMgKz0gYCAgICBwdWJsaWMgJHtub2RlTmFtZX06IFVJRW1wdHlWaWV3OyR7bGluZX1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZihyb290LnV1aWQudmFsdWUgPT0gbm9kZS51dWlkLnZhbHVlKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9uQ3JlYXRlICs9IGAgICAgICAgIHRoaXMuJHtub2RlTmFtZX0gPSB0aGlzLmFkZENvbXBvbmVudChVSUVtcHR5Vmlldyk7JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb25DcmVhdGUgKz0gYCAgICAgICAgdGhpcy4ke25vZGVOYW1lfSA9IHRoaXMuYWRkQ29tcG9uZW50KFVJRW1wdHlWaWV3LCBcIiR7cGF0aH1cIik7JHtsaW5lfWA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIHVpVHlwZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBoZWFkZXIgKz0gYGltcG9ydCB7ICR7ZWxlbWVudH0gfSBmcm9tIFwiJHtwb2ludHN9TW9kdWxlL1VJQ29tcG9uZW50LyR7ZWxlbWVudH1cIjske2xpbmV9YFxyXG4gICAgICAgICAgICAgICAgICAgIGlmKGVsZW1lbnQgPT0gXCJVSUxvb3BMaXN0VmlldzJcIil7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlYWRlciArPSBgaW1wb3J0IHsgTG9vcExpc3RWaWV3MiB9IGZyb20gXCIke3BvaW50c30uLi9UaGlyZFBhcnR5L1N1cGVyU2Nyb2xsVmlldy9MaXN0Vmlldy9Mb29wTGlzdFZpZXcyXCI7XHJcbmltcG9ydCB7IExvb3BMaXN0Vmlld0l0ZW0yIH0gZnJvbSBcIiR7cG9pbnRzfS4uL1RoaXJkUGFydHkvU3VwZXJTY3JvbGxWaWV3L0xpc3RWaWV3L0xvb3BMaXN0Vmlld0l0ZW0yXCI7JHtsaW5lfWBcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYoZWxlbWVudCA9PSBcIlVJTG9vcEdyaWRWaWV3XCIpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBoZWFkZXIgKz0gYGltcG9ydCB7IExvb3BHcmlkVmlldyB9IGZyb20gXCIke3BvaW50c30uLi9UaGlyZFBhcnR5L1N1cGVyU2Nyb2xsVmlldy9HcmlkVmlldy9Mb29wR3JpZFZpZXdcIjtcclxuaW1wb3J0IHsgTG9vcEdyaWRWaWV3SXRlbSB9IGZyb20gXCIke3BvaW50c30uLi9UaGlyZFBhcnR5L1N1cGVyU2Nyb2xsVmlldy9HcmlkVmlldy9Mb29wR3JpZFZpZXdJdGVtXCI7JHtsaW5lfWBcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSBcclxuYFxyXG4ke2hlYWRlcn1cclxuZXhwb3J0IGNsYXNzICR7ZmlsZU5hbWV9IGV4dGVuZHMgVUlCYXNlVmlldyBpbXBsZW1lbnRzIElPbkNyZWF0ZSwgSU9uRW5hYmxlIHtcclxuXHJcbiAgICBwdWJsaWMgc3RhdGljIHJlYWRvbmx5IFByZWZhYlBhdGg6c3RyaW5nID0gXCIke0VkaXRvci5VdGlscy5QYXRoLnN0cmlwRXh0KHByZWZhYlBhdGhbMV0pfVwiO1xyXG5cclxuICAgIHB1YmxpYyBnZXRDb25zdHJ1Y3RvcigpXHJcbiAgICB7XHJcbiAgICAgICAgcmV0dXJuICR7ZmlsZU5hbWV9O1xyXG4gICAgfVxyXG5cclxuJHtmaWVsZHN9XHJcbiAgICBwdWJsaWMgb25DcmVhdGUoKVxyXG4gICAge1xyXG4ke29uQ3JlYXRlfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBvbkVuYWJsZSgpXHJcbiAgICB7XHJcbiR7b25FbmFibGV9XHJcbiAgICB9XHJcblxyXG4ke2Z1bmN9XHJcbn1cclxuYFxyXG5cclxuICAgICAgICAgICAgICAgIEVkaXRvci5DbGlwYm9hcmQud3JpdGUoJ3RleHQnLCBjb250ZW50KTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwi55Sf5oiQ5Luj56CB5oiQ5Yqf77yM5bey5aSN5Yi25Yiw5Ymq57KY5p2/XCIpXHJcbiAgICAgICAgICAgICAgICBpZighZXhpc3RzKXtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXIgPSBFZGl0b3IuVXRpbHMuUGF0aC5kaXJuYW1lKGNzUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRmlsZUhlbHBlci5jcmVhdGVEaXIoZGlyKTtcclxuICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGUoY3NQYXRoLGNvbnRlbnQsIHt9LChlcnIpPT57XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghIWVycikgY29uc29sZS5lcnJvcihlcnIpOyBcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHVibGljIHN0YXRpYyBhc3luYyBiaW5kVUlOb2RlKG5vZGU6IHN0cmluZyl7XHJcbiAgICAgICAgdmFyIHJvb3QgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZSk7XHJcbiAgICAgICAgd2hpbGUocm9vdC5wYXJlbnQ/LnZhbHVlICE9IG51bGwpe1xyXG4gICAgICAgICAgICB2YXIgcE5vZGUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgcm9vdC5wYXJlbnQudmFsdWUudXVpZCk7XHJcbiAgICAgICAgICAgIGlmKHBOb2RlLm5hbWUudmFsdWUgPT0gXCJzaG91bGRfaGlkZV9pbl9oaWVyYXJjaHlcIikgYnJlYWs7XHJcbiAgICAgICAgICAgIHJvb3QgPSBwTm9kZVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihyb290Ll9fdHlwZV9fID09IFwiY2MuU2NlbmVcIikgcmV0dXJuO1xyXG4gICAgICAgIGlmKHJvb3QuX19wcmVmYWJfXyE9bnVsbCl7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ29wZW4tYXNzZXQnLCByb290Ll9fcHJlZmFiX18udXVpZCk7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuYmluZFVJTm9kZUJ5UHJlZmFiKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHB1YmxpYyBzdGF0aWMgYXN5bmMgYmluZFVJTm9kZUJ5UHJlZmFiKCl7XHJcbiAgICAgICAgd2hpbGUoIWF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWlzLXJlYWR5JykpIDtcclxuICAgICAgICBjb25zdCB0cmVlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJykgYXMgYW55O1xyXG4gICAgICAgIHZhciByb290ID0gdHJlZTtcclxuICAgICAgICBpZihyb290Py5jaGlsZHJlbiA9PSBudWxsKSByZXR1cm47XHJcbiAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHJvb3QuY2hpbGRyZW4ubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSByb290LmNoaWxkcmVuW2luZGV4XTtcclxuICAgICAgICAgICAgaWYoZWxlbWVudC5uYW1lID09IFwic2hvdWxkX2hpZGVfaW5faGllcmFyY2h5XCIpe1xyXG4gICAgICAgICAgICAgICAgcm9vdCA9IGVsZW1lbnQuY2hpbGRyZW5bMF07XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBjb25zdCBzY3JpcHRzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgeyBjY1R5cGU6ICdjYy5TY3JpcHQnIH0pO1xyXG4gICAgICAgIGxldCBzY3JpcHQgPSBudWxsO1xyXG4gICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBzY3JpcHRzLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICBpZihzY3JpcHRzW2luZGV4XS5uYW1lLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihyb290Lm5hbWUudG9Mb3dlckNhc2UoKSk+PTApe1xyXG4gICAgICAgICAgICAgICAgc2NyaXB0ID0gc2NyaXB0c1tpbmRleF07XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZihzY3JpcHQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKFwicXVlcnktc2NyaXB0IGZhaWwhXCIpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IHRzID0gZnMucmVhZEZpbGVTeW5jKHNjcmlwdC5maWxlLCB7IGVuY29kaW5nOiBcInV0Zi04XCJ9KTtcclxuICAgICAgICBjb25zdCBsaW5lcyA9IHRzLnNwbGl0KCdcXG4nKTtcclxuICAgICAgICBjb25zdCBwYXRoTWFwID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKTtcclxuICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgbGluZXMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgIGxldCBsaW5lID0gbGluZXNbaW5kZXhdO1xyXG4gICAgICAgICAgICBpZihsaW5lLmluZGV4T2YoXCJ0aGlzLmFkZENvbXBvbmVudChcIik+PTApe1xyXG4gICAgICAgICAgICAgICAgbGluZSA9IGxpbmUucmVwbGFjZSgnICcsJycpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdnMgPSBsaW5lLnNwbGl0KFwiXFxcIlwiKTtcclxuICAgICAgICAgICAgICAgIGlmKHZzLmxlbmd0aD4yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aE1hcC5zZXQodnNbMV0sIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBjb21wID0gbnVsbDtcclxuICAgICAgICBsZXQgY29tcEluZGV4ID0gLTE7XHJcbiAgICAgICAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IHJvb3QuY29tcG9uZW50cy5sZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgaWYocm9vdC5jb21wb25lbnRzW2luZGV4XS50eXBlID09IFwiUmVmZXJlbmNlQ29sbGVjdG9yXCIpe1xyXG4gICAgICAgICAgICAgICAgY29tcCA9IHJvb3QuY29tcG9uZW50c1tpbmRleF07XHJcbiAgICAgICAgICAgICAgICBjb21wSW5kZXggPSBpbmRleDtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmKCFjb21wKXtcclxuICAgICAgICAgICAgY29uc3QgcmVzID0gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnY3JlYXRlLWNvbXBvbmVudCcsIHsgXHJcbiAgICAgICAgICAgICAgICB1dWlkOiByb290LnV1aWQsXHJcbiAgICAgICAgICAgICAgICBjb21wb25lbnQ6ICdSZWZlcmVuY2VDb2xsZWN0b3InXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZighcmVzKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiY3JlYXRlLWNvbXBvbmVudCBmYWlsIVwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIHBOb2RlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJywgcm9vdC51dWlkKSBhcyBhbnk7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBwTm9kZS5jb21wb25lbnRzLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICAgICAgaWYocE5vZGUuY29tcG9uZW50c1tpbmRleF0udHlwZSA9PSBcIlJlZmVyZW5jZUNvbGxlY3RvclwiKXtcclxuICAgICAgICAgICAgICAgICAgICBjb21wID0gcE5vZGUuY29tcG9uZW50c1tpbmRleF07XHJcbiAgICAgICAgICAgICAgICAgICAgY29tcEluZGV4ID0gaW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGNvdW50ID0gMDtcclxuICAgICAgICBmb3IgKGNvbnN0IGt2IG9mIHBhdGhNYXApIHtcclxuICAgICAgICAgICAgY29uc3QgcGF0aCA9IGt2WzBdO1xyXG4gICAgICAgICAgICBjb25zdCB2cyA9IHBhdGguc3BsaXQoJy8nKTtcclxuICAgICAgICAgICAgdmFyIG5vZGUgPSByb290O1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgdnMubGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gdnNbaW5kZXhdO1xyXG4gICAgICAgICAgICAgICAgbGV0IGZpbmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmKG5hbWUgPT0gbm9kZS5jaGlsZHJlbltpXS5uYW1lKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZSA9IG5vZGUuY2hpbGRyZW5baV07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbmQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZighZmluZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYobm9kZSE9bnVsbCl7XHJcbiAgICAgICAgICAgICAgICBwYXRoTWFwLnNldChwYXRoLCBub2RlKVxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cocGF0aCtcIiBcIitub2RlLnV1aWQpO1xyXG4gICAgICAgICAgICB9ZWxzZXtcclxuICAgICAgICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcclxuICAgICAgICAgICAgdXVpZDogcm9vdC51dWlkLFxyXG4gICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7Y29tcEluZGV4fS5kYXRhLmxlbmd0aGAsXHJcbiAgICAgICAgICAgIGR1bXA6IHtcclxuICAgICAgICAgICAgICAgIHZhbHVlOiBjb3VudCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KTtcclxuICAgICAgICBsZXQgamogPSAwO1xyXG4gICAgICAgIGZvciAoY29uc3Qga3Ygb2YgcGF0aE1hcCkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XHJcbiAgICAgICAgICAgICAgICB1dWlkOiByb290LnV1aWQsXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7Y29tcEluZGV4fS5kYXRhLiR7amp9YCxcclxuICAgICAgICAgICAgICAgIGR1bXA6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIktleVZhbHVlUGlhclwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7fSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XHJcbiAgICAgICAgICAgICAgICB1dWlkOiByb290LnV1aWQsXHJcbiAgICAgICAgICAgICAgICBwYXRoOiBgX19jb21wc19fLiR7Y29tcEluZGV4fS5kYXRhLiR7amp9LmtleWAsXHJcbiAgICAgICAgICAgICAgICBkdW1wOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGt2WzBdLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcclxuICAgICAgICAgICAgICAgIHV1aWQ6IHJvb3QudXVpZCxcclxuICAgICAgICAgICAgICAgIHBhdGg6IGBfX2NvbXBzX18uJHtjb21wSW5kZXh9LmRhdGEuJHtqan0udmFsdWVgLFxyXG4gICAgICAgICAgICAgICAgZHVtcDoge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IFwiY2MuTm9kZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHV1aWQ6IGt2WzFdLnV1aWR9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGpqKys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnNvbGUubG9nKHRyZWUpO1xyXG4gICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NhdmUtc2NlbmUnKTtcclxuICAgIH1cclxufSJdfQ==