import { CodeGenerate } from "./code-generate";

export function onNodeMenu(nodeInfo:any) {
   const menu = [];
   if (nodeInfo.type === "cc.Node") {
        menu.push(
        {
            label: "复制相对路径",
            async click() {
                var node = await Editor.Message.request('scene', 'query-node', nodeInfo.uuid);
                const path = await CodeGenerate.getPath(node);
                console.log(path)
                Editor.Clipboard.write('text', path);
            }
        });
        menu.push(
        {
            label: "根据选择节点生成UI代码",
            async click() {
                var list = Editor.Selection.getSelected("node");
                CodeGenerate.generateUICode(list);
            }
        });
        return menu;
    };
    
};

export function onPanelMenu(){
    const menu = [];
    menu.push(
    {
        label: "根据选择节点生成UI代码",
        async click() {
            var list = Editor.Selection.getSelected("node");
            CodeGenerate.generateUICode(list);
        }
    });
    return menu;
}