import { sys, settings } from "cc";
import { UpdateRes } from "../UpdateRes";
import { UpdateProcess } from "./UpdateProcess";
import { UpdateTask } from "../UpdateTask";
import { Log } from "../../../../Mono/Module/Log/Log";
import { ServerConfigManager } from "../ServerConfigManager";
import { CacheManager } from "../../Player/CacheManager";

export class AppUpdateProcess extends UpdateProcess {
    public async process(task: UpdateTask): Promise<UpdateRes> {
        const appChannel = ServerConfigManager.instance.getCurConfig()?.name ?? "";
        const channel = settings.querySettings<string>('assets', '_channel') || "default";
        const channelAppUpdateList = ServerConfigManager.instance.getAppUpdateListByChannel(appChannel, channel);

        if (!channelAppUpdateList || !channelAppUpdateList.AppVer) {
            Log.info("[HotUpdate] CheckAppUpdate channel_app_update_list or app_ver is nil, so return");
            return UpdateRes.Over;
        }

        const version = ServerConfigManager.instance.findMaxUpdateAppVer(appChannel);
        Log.info(`[HotUpdate] FindMaxUpdateAppVer = ${version}`);
        if (version < 0) {
            Log.info("[HotUpdate] CheckAppUpdate maxVer is nil");
            return UpdateRes.Over;
        }

        const appVer = task.appVer;
        const flag = appVer - version;
        Log.info(`[HotUpdate] CheckAppUpdate AppVer:${appVer} maxVer:${version}`);
        if (flag >= 0) {
            Log.info(`[HotUpdate] CheckAppUpdate AppVer is Most Max Version, so return; flag = ${flag}`);
            return UpdateRes.Over;
        }

        const appURL = channelAppUpdateList.AppUrl;
        // 按当前版本取更新配置
        const verInfo = channelAppUpdateList.AppVer[String(appVer)] ?? null;
        Log.info(`[HotUpdate] CheckAppUpdate app_url = ${appURL}`);

        // 不强制更新时, ForceUpdate=-1 直接不提示
        const forceUpdateGlobal = false; // Define.ForceUpdate
        if (!forceUpdateGlobal) {
            if (verInfo && verInfo.ForceUpdate === -1) {
                return UpdateRes.Over;
            }
        }

        let forceUpdate = forceUpdateGlobal;
        if (verInfo && verInfo.ForceUpdate !== 0) {
            forceUpdate = true;
        }

        // 非强制更新时, 检查是否已跳过过此版本
        const checkKey = `CheckAppUpdate${version}`;
        const check = CacheManager.instance.getInt(checkKey, 0);
        if (check !== 0 && !forceUpdate) {
            return UpdateRes.Over;
        }

        // TODO: 通过 UIManager 显示更新提示框 (等 UI 实现后补充)
        // const cancelBtnText = forceUpdate ? "退出" : "进入游戏";
        // const contentUpdate = forceUpdate ? "需要重新下载" : "有新版本可下载";
        // const btnState = await task.showMsgBoxView(contentUpdate, "确认", cancelBtnText);
        // 暂时直接跳过
        Log.info(`[HotUpdate] App update available: ${appVer} → ${version}, url: ${appURL}, force: ${forceUpdate}`);

        // if (btnState) {
        //     if (sys.isNative) {
        //         sys.openURL(appURL);
        //     }
        //     return await this.process(task); // 防止切到网页后回来进入游戏
        // } else if (forceUpdate) {
        //     // 强制更新但用户拒绝 → 退出
        //     return UpdateRes.Quit;
        // } else {
        //     CacheManager.instance.setInt(checkKey, 1);
        // }

        return UpdateRes.Over;
    }
}
