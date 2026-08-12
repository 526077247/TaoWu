import { UpdateRes } from "../UpdateRes";
import { UpdateProcess } from "./UpdateProcess";
import { UpdateTask } from "../UpdateTask";
import { UpdateSetting, UpdateListConfig, RawVersionManifest, AppConfig, Resver } from "../../../../Mono/Module/Resource/VersionManifest";
import { Log } from "../../../../Mono/Module/Log/Log";
import { ServerConfigManager } from "../ServerConfigManager";
import { JsonHelper } from "../../../../Mono/Helper/JsonHelper";
import { settings } from "cc";

export class SetUpdateListProcess extends UpdateProcess {
    public async process(task: UpdateTask): Promise<UpdateRes> {
        if (!UpdateSetting.enabled) {
            Log.info("[HotUpdate] Disabled, skip.");
            return UpdateRes.Over;
        }

        try {
            // Step 1: 拉取 CDN update_{platform}.list (URL 由 ServerConfigManager 决定)
            const listText = await this.fetchText(ServerConfigManager.instance.getUpdateListCdnUrl());
            if (!listText) {
                Log.warning("[HotUpdate] Failed to fetch update list, using built-in bundles.");
                return UpdateRes.Over;
            }
            JsonHelper.registerClass(AppConfig, 'AppConfig');
            JsonHelper.registerClass(Resver, 'Resver');
            const updateList = JsonHelper.fromJson(UpdateListConfig, listText);
            ServerConfigManager.instance.setUpdateList(updateList);

            // 从 cc.settings 读取 channel (构建时写入, 不在 manifest 中)
            const channel = settings.querySettings<string>('assets', '_channel') || "default";
            const maxAppResVer = ServerConfigManager.instance.findMaxUpdateResVerThisAppVer(channel, task.appVer);
            // Step 2: 通过 ServerConfigManager 查找当前渠道的最大资源版本号
            let remoteVersion = ServerConfigManager.instance.findMaxUpdateResVer(channel, "", maxAppResVer);
            if (!remoteVersion) {
                Log.warning("[HotUpdate] No remote version found, using built-in.");
                return UpdateRes.Over;
            }

            if (!!maxAppResVer)
            {
                remoteVersion = maxAppResVer;
            }

            Log.info(`[HotUpdate] Remote version: ${remoteVersion}`);

            // Step 3: 拉取 CDN {version}.bytes
            // server/channel/platform 都从 cc.settings / UpdateConfig 获取, 不在 manifest 中
            const server = settings.querySettings<string>('assets', 'server') || "";
            const platform = UpdateSetting.getPlatformName();
            const remoteText = await this.fetchText(UpdateSetting.getManifestURL(server, channel, platform, remoteVersion));
            if (!remoteText) {
                Log.warning("[HotUpdate] Failed to fetch CDN manifest, using built-in bundles.");
                return UpdateRes.Over;
            }

            task.remoteManifest = JSON.parse(remoteText) as RawVersionManifest;

            return UpdateRes.Over;
        } catch (e: any) {
            Log.error("[HotUpdate] SetUpdateListProcess error:", e);
            return UpdateRes.Over;
        }
    }

    private fetchText(url: string): Promise<string> {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.timeout = UpdateSetting.timeout;
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status >= 200 && xhr.status < 400) {
                        resolve(xhr.responseText);
                    } else {
                        Log.warning(`[HotUpdate] HTTP ${xhr.status} for ${url}`);
                        resolve(null);
                    }
                }
            };
            xhr.open("GET", url, true);
            xhr.send();
        });
    }
}
