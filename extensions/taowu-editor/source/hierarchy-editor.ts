import { AssetInfo } from "@cocos/creator-types/editor/packages/asset-db/@types/public";

export function onNodeMenu(nodeInfo:any) {
   const menu = [];
   if (nodeInfo.type === "cc.Node") {
        menu.push(
        {
            label: "复制相对路径",
            async click() {
                var node = await Editor.Message.request('scene', 'query-node', nodeInfo.uuid);
                var parentNode = await Editor.Message.request('scene', 'query-node', nodeInfo.parent);
                let path = node.name.value;
                while(parentNode.parent?.value != null){
                    node = parentNode;
                    parentNode = await Editor.Message.request('scene', 'query-node', parentNode.parent.value.uuid);
                    if(parentNode == null || parentNode.name.value == "should_hide_in_hierarchy") break;
                    path = node.name.value + "/" + path;
                }
                console.log(path)
                Editor.Clipboard.write('text', path);
            }
        })
    };
    return menu;
};