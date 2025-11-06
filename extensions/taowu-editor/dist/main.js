"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unload = exports.load = exports.methods = void 0;
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
    }
};
/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
function load() { }
exports.load = load;
/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
function unload() { }
exports.unload = unload;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQUEyQztBQUUzQzs7O0dBR0c7QUFDVSxRQUFBLE9BQU8sR0FBNEM7SUFFNUQsV0FBVztRQUNQLHdCQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELGVBQWU7UUFDWCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNyRCxJQUFHLFFBQVEsSUFBSSxJQUFJLElBQUksUUFBUSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUM7WUFDeEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDLENBQUEsWUFBWTtTQUNyRztJQUNMLENBQUM7Q0FDSixDQUFDO0FBRUY7OztHQUdHO0FBQ0gsU0FBZ0IsSUFBSSxLQUFLLENBQUM7QUFBMUIsb0JBQTBCO0FBRTFCOzs7R0FHRztBQUNILFNBQWdCLE1BQU0sS0FBSyxDQUFDO0FBQTVCLHdCQUE0QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEZpbGVIZWxwZXIgfSBmcm9tIFwiLi9maWxlLWhlbHBlclwiO1xyXG5cclxuLyoqXHJcbiAqIEBlbiBSZWdpc3RyYXRpb24gbWV0aG9kIGZvciB0aGUgbWFpbiBwcm9jZXNzIG9mIEV4dGVuc2lvblxyXG4gKiBAemgg5Li65omp5bGV55qE5Li76L+b56iL55qE5rOo5YaM5pa55rOVXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgbWV0aG9kczogeyBba2V5OiBzdHJpbmddOiAoLi4uYW55OiBhbnkpID0+IGFueSB9ID0ge1xyXG5cclxuICAgIHNldHRpbmdVSUFCKCkge1xyXG4gICAgICAgIEZpbGVIZWxwZXIuc2V0dGluZ1VJQUIoKTtcclxuICAgIH0sXHJcblxyXG4gICAgY2hhbmdlSW5pdFNjZW5lKCkge1xyXG4gICAgICAgIGNvbnN0IHNlbGVjdGVkID0gRWRpdG9yLlNlbGVjdGlvbi5nZXRTZWxlY3RlZChcIm5vZGVcIilcclxuICAgICAgICBpZihzZWxlY3RlZCA9PSBudWxsIHx8IHNlbGVjdGVkLmxlbmd0aCA8PSAwKXtcclxuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChcInNjZW5lXCIsIFwib3Blbi1zY2VuZVwiLCBcIjllYTI4ODA1LWRjMjctNDMyNS1iMDBiLTUyMWYwMjlhMjVkYlwiKTsvL2luaXQgc2NlbmVcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG4vKipcclxuICogQGVuIE1ldGhvZCBUcmlnZ2VyZWQgb24gRXh0ZW5zaW9uIFN0YXJ0dXBcclxuICogQHpoIOaJqeWxleWQr+WKqOaXtuinpuWPkeeahOaWueazlVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGxvYWQoKSB7IH1cclxuXHJcbi8qKlxyXG4gKiBAZW4gTWV0aG9kIHRyaWdnZXJlZCB3aGVuIHVuaW5zdGFsbGluZyB0aGUgZXh0ZW5zaW9uXHJcbiAqIEB6aCDljbjovb3mianlsZXml7bop6blj5HnmoTmlrnms5VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB1bmxvYWQoKSB7IH1cclxuIl19