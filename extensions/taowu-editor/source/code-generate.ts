import * as fs from "fs";
import path from "path";
import { ETTask } from "./ettask";
import { INode } from "@cocos/creator-types/editor/packages/scene/@types/public";
import { FileHelper } from "./file-helper";

export class CodeGenerate{
    private static readonly uiPath = FileHelper.uiPath
    private static readonly uiScriptPath = ["UI", "UIHall", "UIGame"]

    private static typeMap: Map<string,string> = new Map<string,string>([
        ["CopyGameObject" , "UICopyGameObject"],
        ["LoopListView2" , "UILoopListView2"],
        ["LoopGridView" , "UILoopGridView"],
        ["cc.Button" , "UIButton"],
        ["cc.EditBox" , "UIInput"],
        ["cc.Slider" , "UISlider"],
        ["cc.Sprite" , "UIImage"],
        ["cc.Label" , "UIText"],
    ])
    public static async getPath(node: INode){
        let path = node.name.value;
        if(node.parent?.value == null) return path;
        var parentNode = await Editor.Message.request('scene', 'query-node', node.parent.value.uuid);
        if(parentNode == null || parentNode.name.value == "should_hide_in_hierarchy") return path;
        while(parentNode.parent?.value != null){
            node = parentNode;
            parentNode = await Editor.Message.request('scene', 'query-node', parentNode.parent.value.uuid);
            if(parentNode == null || parentNode.name.value == "should_hide_in_hierarchy") break;
            path = node.name.value + "/" + path;
        }
        return path;
    }
    /**
     * 根据选择节点生成UI代码
     */
    public static async generateUICode(nodes: string[]){
        if(!nodes || nodes.length <=0) {
            console.error("未选中节点")
            return;
        }
        var root = await Editor.Message.request('scene', 'query-node', nodes[0]);
        while(root.parent?.value != null){
            var pNode = await Editor.Message.request('scene', 'query-node', root.parent.value.uuid);
            if(pNode.name.value == "should_hide_in_hierarchy") break;
            root = pNode
        }
        if(root.__type__ == "cc.Scene") return;
        
        if(root.__prefab__!=null){
            const rootPath = await Editor.Message.request('asset-db', 'query-path', root.__prefab__.uuid);
            if(rootPath != null && rootPath!=""){
                if(rootPath.indexOf("assetsPackage")<0) {
                    console.error("非UI资源")
                    return
                }
                const prefabPath = Editor.Utils.Path.slash(rootPath).split("/assetsPackage/");
                const sub = prefabPath[1].split("/");
                let subUI = null
                for (let index = 0; index < CodeGenerate.uiPath.length; index++) {
                    if(CodeGenerate.uiPath[index].toUpperCase() == sub[0].toUpperCase()){
                        subUI = CodeGenerate.uiScriptPath[index];
                        break;
                    }
                }
                if(!subUI) {
                    console.error("非UI资源")
                    return
                }
               
                const projectPath = Editor.Project.path;
                let csPath = path.join(projectPath, "assets", "scripts","Code","Game", subUI);
                let count = 0;
                for (let index = 1; index < sub.length; index++) {
                    let element = sub[index].replace("ui","UI");
                    if(element.indexOf(".") >=0 ) break;
                    if(element.toLowerCase() == "prefabs" ) continue;
                    if(element.startsWith("UI")){
                        element = "UI" + element.charAt(2).toUpperCase() + element.slice(3)
                    }else{
                        element = element.charAt(0).toUpperCase() + element.slice(1)
                    }
                    csPath = path.join(csPath, element)
                    count++;
                }
                let fileName = Editor.Utils.Path.stripExt(Editor.Utils.Path.basename(rootPath).replace("ui","UI")); 
                if(fileName.startsWith("UI")) {
                    fileName = "UI" + fileName.charAt(2).toUpperCase() + fileName.slice(3)
                }else{
                    fileName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
                }
               
                csPath = path.join(csPath, fileName +".ts");
                console.log(csPath)
                const task = ETTask.create<boolean>(true);
                fs.exists(csPath, (res)=>{ task.setResult(res) });
                let exists = await task
                if(exists)
                {  
                    console.info("文件已存在, 将不会直接输出文件"+csPath);
                }

                let points = "../../";
                for (let index = 0; index < count; index++) {
                    points +="../"
                }
                const line = `
`
                let header = 
`
import { Node } from "cc";
import { IOnCreate } from "${points}Module/UI/IOnCreate";
import { IOnEnable } from "${points}Module/UI/IOnEnable";
import { UIBaseView } from "${points}Module/UI/UIBaseView";
`
                let fields = ""
                let onCreate = ""
                let onEnable = ""
                let func = ""
                const uiTypes = new Set<string>();

                const names = new Set<string>();

                for (let index = 0; index < nodes.length; index++) {
                    var node = await Editor.Message.request('scene', 'query-node', nodes[index]);
                    let baseName = (node.name.value as string);
                    if(baseName==null || baseName == '') continue;
                    baseName = baseName.replace(' ','');
                    baseName = baseName.charAt(0).toLowerCase() + baseName.slice(1);
                    let nodeName = baseName;
                    let i = 1;
                    while(names.has(nodeName)){
                        nodeName = baseName + i;
                        i++;
                    }
                    const upperName = nodeName.charAt(0).toUpperCase() + nodeName.slice(1);
                    names.add(nodeName);
                    const path = await CodeGenerate.getPath(node);
                    let uiType = null;
                    for (let j = 0; j < node.__comps__.length; j++) {
                        const comp = node.__comps__[j];
                        if(comp?.type != null) {
                            var thisType = CodeGenerate.typeMap.get(comp.type);
                            if(thisType == null) continue;
                            if(uiType != null){
                                for (const element of CodeGenerate.typeMap) {
                                    if(element[1] == uiType) {
                                        break;
                                    }
                                    if(element[1] == thisType) {
                                        uiType = thisType;
                                        break;
                                    }
                                }
                            }else{
                                uiType = thisType;
                            }
                        }
                       
                    }
                    if(uiType != null) {
                        uiTypes.add(uiType)
                        fields += `    public ${nodeName}: ${uiType};${line}`;
                        if(root.uuid.value == node.uuid.value){
                            onCreate += `        this.${nodeName} = this.addComponent(${uiType});${line}`;
                        }else{
                            onCreate += `        this.${nodeName} = this.addComponent(${uiType}, "${path}");${line}`;
                        }
                        if(uiType == "UIButton"){
                            onEnable += `        this.${nodeName}.setOnClick(this.onClick${upperName}.bind(this));${line}`;
                            func += `    private onClick${upperName}(){${line}${line}    }${line}${line}`
                        } else if(uiType == "UILoopGridView"){
                            onCreate += `        this.${nodeName}.initGridView(0, this.onGet${upperName}ItemByIndex.bind(this));${line}`;
                            func += `    private onGet${upperName}ItemByIndex(gridView: LoopGridView, index: number, row: number, column: number): LoopGridViewItem {${line}        return null;${line}    }${line}${line}`
                        } else if(uiType == "UILoopListView2"){
                            onCreate += `        this.${nodeName}.initListView(0, this.onGet${upperName}ItemByIndex.bind(this));${line}`;
                            func += `    private onGet${upperName}ItemByIndex(listView: LoopListView2, index: number): LoopListViewItem2 {${line}        return null;${line}    }${line}${line}`
                        } else if(uiType == "UICopyGameObject"){
                            onCreate += `        this.${nodeName}.initListView(0, this.onGet${upperName}ItemByIndex.bind(this));${line}`;
                            func += `    private onGet${upperName}ItemByIndex(index: number, go: Node){${line}${line}    }${line}${line}`
                        }
                    } else {
                        uiTypes.add("UIEmptyView")
                        fields += `    public ${nodeName}: UIEmptyView;${line}`;
                        if(root.uuid.value == node.uuid.value){
                            onCreate += `        this.${nodeName} = this.addComponent(UIEmptyView);${line}`;
                        }else{
                            onCreate += `        this.${nodeName} = this.addComponent(UIEmptyView, "${path}");${line}`;
                        }
                    }
                }

                for (const element of uiTypes) {
                    header += `import { ${element} } from "${points}Module/UIComponent/${element}";${line}`
                    if(element == "UILoopListView2"){
                        header += `import { LoopListView2 } from "${points}../ThirdParty/SuperScrollView/ListView/LoopListView2";
import { LoopListViewItem2 } from "${points}../ThirdParty/SuperScrollView/ListView/LoopListViewItem2";${line}`
                    } else if(element == "UILoopGridView"){
                        header += `import { LoopGridView } from "${points}../ThirdParty/SuperScrollView/GridView/LoopGridView";
import { LoopGridViewItem } from "${points}../ThirdParty/SuperScrollView/GridView/LoopGridViewItem";${line}`
                    }
                }

                let content = 
`
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
`

                Editor.Clipboard.write('text', content);
                console.log("生成代码成功，已复制到剪粘板")
                if(!exists){
                    const dir = Editor.Utils.Path.dirname(csPath);
                    await FileHelper.createDir(dir);
                    fs.writeFile(csPath,content, {},(err)=>{
                        if (!!err) console.error(err); 
                    })
                }
                
            }
        }
    }


}