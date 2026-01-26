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
exports.load = load;
/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
function unload() { }
exports.unload = unload;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQUEyQztBQUUzQzs7O0dBR0c7QUFDVSxRQUFBLE9BQU8sR0FBNEM7SUFFNUQsV0FBVztRQUNQLHdCQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELGVBQWU7UUFDWCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNyRCxJQUFHLFFBQVEsSUFBSSxJQUFJLElBQUksUUFBUSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUM7WUFDeEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxzQ0FBc0MsQ0FBQyxDQUFDLENBQUEsWUFBWTtTQUNyRztJQUNMLENBQUM7SUFFRCxlQUFlO1FBQ1gsd0JBQVUsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQUk7UUFDWCx3QkFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoQyxDQUFDO0NBQ0osQ0FBQztBQUVGOzs7R0FHRztBQUNILFNBQWdCLElBQUksS0FBSyxDQUFDO0FBQTFCLG9CQUEwQjtBQUUxQjs7O0dBR0c7QUFDSCxTQUFnQixNQUFNLEtBQUssQ0FBQztBQUE1Qix3QkFBNEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBGaWxlSGVscGVyIH0gZnJvbSBcIi4vZmlsZS1oZWxwZXJcIjtcclxuXHJcbi8qKlxyXG4gKiBAZW4gUmVnaXN0cmF0aW9uIG1ldGhvZCBmb3IgdGhlIG1haW4gcHJvY2VzcyBvZiBFeHRlbnNpb25cclxuICogQHpoIOS4uuaJqeWxleeahOS4u+i/m+eoi+eahOazqOWGjOaWueazlVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55KSA9PiBhbnkgfSA9IHtcclxuXHJcbiAgICBzZXR0aW5nVUlBQigpIHtcclxuICAgICAgICBGaWxlSGVscGVyLnNldHRpbmdVSUFCKCk7XHJcbiAgICB9LFxyXG5cclxuICAgIGNoYW5nZUluaXRTY2VuZSgpIHtcclxuICAgICAgICBjb25zdCBzZWxlY3RlZCA9IEVkaXRvci5TZWxlY3Rpb24uZ2V0U2VsZWN0ZWQoXCJub2RlXCIpXHJcbiAgICAgICAgaWYoc2VsZWN0ZWQgPT0gbnVsbCB8fCBzZWxlY3RlZC5sZW5ndGggPD0gMCl7XHJcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoXCJzY2VuZVwiLCBcIm9wZW4tc2NlbmVcIiwgXCI5ZWEyODgwNS1kYzI3LTQzMjUtYjAwYi01MjFmMDI5YTI1ZGJcIik7Ly9pbml0IHNjZW5lXHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBzZXRJbWFnZXNGb3JtYXQoKSB7XHJcbiAgICAgICAgRmlsZUhlbHBlci5zZXRJbWFnZXNGb3JtYXQoKTtcclxuICAgIH0sXHJcblxyXG4gICAgb25Bc3NldEFkZCh1dWlkKXtcclxuICAgICAgICBGaWxlSGVscGVyLm9uQXNzZXRBZGQodXVpZCk7XHJcbiAgICB9LFxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBlbiBNZXRob2QgVHJpZ2dlcmVkIG9uIEV4dGVuc2lvbiBTdGFydHVwXHJcbiAqIEB6aCDmianlsZXlkK/liqjml7bop6blj5HnmoTmlrnms5VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2FkKCkgeyB9XHJcblxyXG4vKipcclxuICogQGVuIE1ldGhvZCB0cmlnZ2VyZWQgd2hlbiB1bmluc3RhbGxpbmcgdGhlIGV4dGVuc2lvblxyXG4gKiBAemgg5Y246L295omp5bGV5pe26Kem5Y+R55qE5pa55rOVXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdW5sb2FkKCkgeyB9XHJcbiJdfQ==