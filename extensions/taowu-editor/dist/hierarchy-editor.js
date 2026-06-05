"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onNodeMenu = onNodeMenu;
exports.onPanelMenu = onPanelMenu;
const code_generate_1 = require("./code-generate");
function onNodeMenu(nodeInfo) {
    const menu = [];
    if (nodeInfo.type === "cc.Node") {
        menu.push({
            label: "复制相对路径",
            async click() {
                var node = await Editor.Message.request('scene', 'query-node', nodeInfo.uuid);
                const path = await code_generate_1.CodeGenerate.getPath(node);
                console.log(path);
                Editor.Clipboard.write('text', path);
            }
        });
        menu.push({
            label: "根据选择节点生成UI代码",
            async click() {
                var list = Editor.Selection.getSelected("node");
                code_generate_1.CodeGenerate.generateUICode(list);
            }
        });
        menu.push({
            label: "绑定UI节点",
            async click() {
                code_generate_1.CodeGenerate.bindUINodeByPrefab();
            }
        });
        return menu;
    }
    ;
}
;
function onPanelMenu() {
    const menu = [];
    menu.push({
        label: "根据选择节点生成UI代码",
        async click() {
            var list = Editor.Selection.getSelected("node");
            code_generate_1.CodeGenerate.generateUICode(list);
        }
    });
    menu.push({
        label: "绑定UI节点",
        async click() {
            code_generate_1.CodeGenerate.bindUINodeByPrefab();
        }
    });
    return menu;
}
