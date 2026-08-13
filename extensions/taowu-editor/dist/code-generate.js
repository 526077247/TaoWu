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
exports.CodeGenerate = void 0;
const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));
const ettask_1 = require("./ettask");
const file_helper_1 = require("./file-helper");
class CodeGenerate {
    static uiPath = file_helper_1.FileHelper.uiPath;
    static uiScriptPath = ["UI", "UIHall", "UIGame"];
    static typeMap = new Map([
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
    static async getPath(node) {
        let path = node.name.value;
        if (node.parent?.value == null)
            return path;
        var parentNode = await Editor.Message.request('scene', 'query-node', node.parent.value.uuid);
        if (parentNode == null || parentNode.name.value == "should_hide_in_hierarchy")
            return path;
        while (parentNode.parent?.value != null) {
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
        if (!nodes || nodes.length <= 0) {
            console.error("未选中节点");
            return;
        }
        var root = await Editor.Message.request('scene', 'query-node', nodes[0]);
        while (root.parent?.value != null) {
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
import { UIBaseView, uiView } from "${points}Module/UI/UIBaseView";
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
                        if (comp?.type != null) {
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
@uiView("${fileName}")
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
        var root = await Editor.Message.request('scene', 'query-node', node);
        while (root.parent?.value != null) {
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
        if (root?.children == null)
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
        const pathMap = new Map();
        // 解析 TS 文件提取所有 addComponent 路径
        const ts = fs.readFileSync(script.file, { encoding: "utf-8" });
        // 1. 静态路径: this.addComponent(Type, "path") 或 this.addComponent(Type, `path`)
        const staticRegex = /this\.addComponent\(\s*[\w.]+\s*,\s*['"`]([^'"`${]+)['"`]\s*\)/g;
        let match;
        while ((match = staticRegex.exec(ts)) !== null) {
            pathMap.set(match[1], null);
        }
        // 2. 循环路径: for (let i = 0; i < N; i++) { this.addComponent(Type, "prefix" + i + "suffix") }
        const forLoopRegex = /for\s*\(\s*let\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<\s*(\d+)\s*;\s*\1\s*\+\+\s*\)\s*\{([\s\S]*?)\}/g;
        let forMatch;
        while ((forMatch = forLoopRegex.exec(ts)) !== null) {
            const varName = forMatch[1];
            const start = parseInt(forMatch[2]);
            const end = parseInt(forMatch[3]);
            const body = forMatch[4];
            // 提取 addComponent 第二个参数的完整表达式 (引号开始到逗号或右括号结束)
            const concatRegex = /this\.addComponent\(\s*[\w.]+\s*,\s*([^)]+)\)/g;
            let concatMatch;
            while ((concatMatch = concatRegex.exec(body)) !== null) {
                const expr = concatMatch[1].trim();
                // 检查表达式中是否包含循环变量
                if (expr.indexOf(varName) < 0)
                    continue;
                for (let i = start; i < end; i++) {
                    // 将循环变量替换为当前值
                    let evalExpr = expr.replace(new RegExp('\\b' + varName + '\\b', 'g'), String(i));
                    // 将模板字符串 `prefix${i}suffix` 转换为普通字符串拼接后求值
                    evalExpr = evalExpr.replace(/`([^`]*)`/g, (_m, tpl) => {
                        return "'" + tpl.replace(/\$\{([^}]+)\}/g, "' + ($1) + '") + "'";
                    });
                    try {
                        const path = eval(evalExpr);
                        if (typeof path === 'string' && path.length > 0) {
                            pathMap.set(path, null);
                        }
                    }
                    catch (e) { }
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
        let foundCount = 0;
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
                foundCount++;
            }
            else {
                console.warn('[TaoWuEditor] 节点未找到: ' + path);
            }
        }
        await Editor.Message.request('scene', 'set-property', {
            uuid: root.uuid,
            path: `__comps__.${compIndex}.data.length`,
            dump: {
                value: foundCount,
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
