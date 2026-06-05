"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
const file_helper_1 = require("./file-helper");
/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
exports.methods = {
    settingUIAB() {
        file_helper_1.FileHelper.settingUIAB();
    },
    changeInitScene() {
        const selected = Editor.Selection.getSelected("node");
        if (selected == null || selected.length <= 0) {
            Editor.Message.request("scene", "open-scene", "9ea28805-dc27-4325-b00b-521f029a25db"); //init scene
        }
    },
    setImagesFormat() {
        file_helper_1.FileHelper.setImagesFormat();
    },
    onAssetAdd(uuid) {
        file_helper_1.FileHelper.onAssetAdd(uuid);
    },
};
/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
function load() { }
/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
function unload() { }
