import { UpdateRes } from "../UpdateRes";
import { UpdateProcess } from "./UpdateProcess";
import { UpdateSetting, UpdateTask } from "../UpdateTask";
import {  UpdateListConfig, AppConfig, Resver } from "../../../../Mono/Module/Resource/VersionManifest";
import { Log } from "../../../../Mono/Module/Log/Log";
import { ServerConfigManager } from "../ServerConfigManager";
import { JsonHelper } from "../../../../Mono/Helper/JsonHelper";

export class SetUpdateListProcess extends UpdateProcess {
    public async process(task: UpdateTask): Promise<UpdateRes> {
        if (!UpdateSetting.enabled) {
            Log.info("[HotUpdate] Disabled, skip.");
            return UpdateRes.Over;
        }

        try {
            // Step 1: 拉取 CDN update_{platform}.list (URL 由 ServerConfigManager 决定)
            const listText = await task.fetchText(ServerConfigManager.instance.getUpdateListCdnUrl());
            if (!listText) {
                Log.warning("[HotUpdate] Failed to fetch update list, using built-in bundles.");
                return UpdateRes.Over;
            }
            JsonHelper.registerClass(AppConfig, 'AppConfig');
            JsonHelper.registerClass(Resver, 'Resver');
            const updateList = JsonHelper.fromJson(UpdateListConfig, listText);
            ServerConfigManager.instance.setUpdateList(updateList);

            return UpdateRes.Over;
        } catch (e: any) {
            Log.error("[HotUpdate] SetUpdateListProcess error:", e);
            return UpdateRes.Over;
        }
    }
}
