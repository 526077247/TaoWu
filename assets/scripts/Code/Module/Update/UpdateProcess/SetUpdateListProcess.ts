import { UpdateRes } from "../UpdateRes";
import { UpdateProcess } from "./UpdateProcess";
import { UpdateTask } from "../UpdateTask";
import { UpdateConfig, parseManifest, UpdateListConfig, RawVersionManifest, AppConfig, Resver } from "../../../../Mono/Module/Resource/VersionManifest";
import { Log } from "../../../../Mono/Module/Log/Log";
import { BundleManager } from "../../../../Mono/Module/Resource/BundleManager";
import { ServerConfigManager } from "../ServerConfigManager";
import { JsonHelper } from "../../../../Mono/Helper/JsonHelper";

export class SetUpdateListProcess extends UpdateProcess {
    public async process(task: UpdateTask): Promise<UpdateRes> {
        if (!UpdateConfig.enabled) {
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
            const localManifest = BundleManager.instance.localManifest;
            const channel = localManifest?.channel || "default";

            // Step 2: 通过 ServerConfigManager 查找当前渠道的最大资源版本号
            const remoteVersion = ServerConfigManager.instance.findMaxResVer(channel);
            if (!remoteVersion) {
                Log.warning("[HotUpdate] No remote version found, using built-in.");
                return UpdateRes.Over;
            }

            Log.info(`[HotUpdate] Remote version: ${remoteVersion}`);

            // Step 3: 拉取 CDN {version}.bytes (server 从 manifest 读取)
            
            const server = localManifest?.server || "";
            const platform = localManifest?.platform || UpdateConfig.getPlatformName();
            const remoteText = await this.fetchText(UpdateConfig.getManifestURL(server, channel, platform, remoteVersion));
            if (!remoteText) {
                Log.warning("[HotUpdate] Failed to fetch CDN manifest, using built-in bundles.");
                return UpdateRes.Over;
            }

            task.remoteManifest = parseManifest(JSON.parse(remoteText) as RawVersionManifest);

            return UpdateRes.Over;
        } catch (e: any) {
            Log.error("[HotUpdate] SetUpdateListProcess error:", e);
            return UpdateRes.Over;
        }
    }

    private fetchText(url: string): Promise<string> {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.timeout = UpdateConfig.timeout;
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
