import { FileHelper } from "./file-helper";

/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
export const methods: { [key: string]: (...any: any) => any } = {

    settingUIAB() {
        FileHelper.settingUIAB();
    },

    changeInitScene() {
        Editor.Message.request("scene", "open-scene", "9ea28805-dc27-4325-b00b-521f029a25db");//init scene
    }
};

/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
export function load() { }

/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
export function unload() { }
