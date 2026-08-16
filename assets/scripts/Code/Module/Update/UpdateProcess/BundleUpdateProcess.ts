import { UpdateRes } from "../UpdateRes";
import { UpdateProcess } from "./UpdateProcess";
import { UpdateSetting, UpdateTask } from "../UpdateTask";
import { Log } from "../../../../Mono/Module/Log/Log";
import { BundleManager } from "../../../../Mono/Module/Resource/BundleManager";
import { RawVersionManifest } from "../../../../Mono/Module/Resource/VersionManifest";
import { settings } from "cc";
import { ServerConfigManager } from "../ServerConfigManager";
import { Define } from "../../../../Mono/Define";
import { PlatformUtils } from "../../../../Mono/Helper/PlatformUtils";
import { HttpManager } from "../../../../Mono/Module/Http/HttpManager";

export class BundleUpdateProcess extends UpdateProcess {
    private remoteManifest: RawVersionManifest;
    private cacheDownload: boolean;
    private forceUpdate: boolean;
    
    constructor(cacheDownload: boolean = true) {
        super();
        this.cacheDownload = cacheDownload;
    }

    public async process(task: UpdateTask): Promise<UpdateRes> {
        const channel = settings.querySettings<string>('assets', '_channel') || "default";
        const maxAppResVer = ServerConfigManager.instance.findMaxUpdateResVerThisAppVer(channel, task.appVer);

        const version = Number(BundleManager.instance.getSavedVersion());
        this.forceUpdate = Define.ForceUpdate;
        var verInfo = ServerConfigManager.instance.getResVerInfo(channel, version);
        if (verInfo != null && verInfo.ForceUpdate == 1)
            this.forceUpdate = true;

        let maxVer = ServerConfigManager.instance.findMaxUpdateResVer(channel, "", maxAppResVer);
        if (!maxVer) {
            Log.warning("[HotUpdate] No remote version found, using built-in.");
            return UpdateRes.Over;
        }

        if (!maxAppResVer)
        {
            maxVer = version;
        }

        Log.info(`[HotUpdate] Max version: ${maxVer}`);

        const server = settings.querySettings<string>('assets', 'server') || "";
        const platform = PlatformUtils.getPlatformName();
        const remoteManifest = await HttpManager.instance.httpGetResult(RawVersionManifest, UpdateSetting.getManifestURL(server, channel, platform, maxVer), null, null);
        if (!remoteManifest) {
            Log.error("[HotUpdate] Failed to fetch CDN manifest.");
            return await this.updateFail(task);
        }
        
        this.remoteManifest = task.remoteManifest = remoteManifest;
        if (!this.remoteManifest) {
            Log.info("[HotUpdate] No remote manifest, skip bundle update.");
            return UpdateRes.Over;
        }

        const localManifest = BundleManager.instance.localManifest;
        const builtinManifest = BundleManager.instance.builtinManifest;
        let needRestart = false;

        const remoteBundles = this.remoteManifest.b;
        const localBundles = localManifest?.b || {};

        // 对比 hash, 找出有变化的 bundle
        const bundlesToDownload: string[] = [];
        for (const name in remoteBundles) {
            const remoteHash = remoteBundles[name]?.[0];
            const localHash = localBundles[name]?.[0];

            if (localHash === remoteHash) continue;

            const isBuiltin = builtinManifest?.b?.[name]?.[1] ?? false;
            BundleManager.instance.setRemoteBundleInfo(name, remoteHash);
            bundlesToDownload.push(name);

            if (isBuiltin) {
                Log.info(`[HotUpdate] Bundle "${name}" builtin but hash changed: ${localHash ?? "none"} → ${remoteHash}`);
                needRestart = true;
            } else {
                Log.info(`[HotUpdate] Bundle "${name}" remote, CDN: ${localHash ?? "none"} → ${remoteHash}`);
            }

            if (BundleManager.instance.hasBundle(name)) {
                needRestart = true;
            }
        }

        if (bundlesToDownload.length === 0) {
            Log.info("[HotUpdate] All bundles up to date.");
            return UpdateRes.Over;
        }

        if (needRestart && !this.cacheDownload) {
            return UpdateRes.Restart;
        }

        if (this.cacheDownload) {
            // 提示用户下载
            const content = `发现 ${bundlesToDownload.length} 个资源包需要更新，是否立即下载？`;
            const confirmed = await task.showMsgBoxView(content, "确认", this.forceUpdate ? "退出" : "跳过");
            if (!confirmed) {
                if (this.forceUpdate) {
                    return UpdateRes.Quit;
                }
                return UpdateRes.Over;
            }

            Log.info("[HotUpdate] Caching remote bundles...");
            let allSuccess = true;
            for (const name of bundlesToDownload) {
                try {
                    await BundleManager.instance.loadBundle(name);
                    Log.info(`[HotUpdate] Bundle "${name}" downloaded.`);
                } catch (e: any) {
                    Log.error(`[HotUpdate] Failed to download bundle "${name}":`, e);
                    allSuccess = false;
                    break;
                }
            }

            if (!allSuccess) {
                return await this.updateFail(task);
            }

            Log.info("[HotUpdate] All bundles downloaded successfully.");
            this.saveLatestManifest();
        }

        if (needRestart) {
            return UpdateRes.Restart;
        }

        return UpdateRes.Over;
    }

    /**
     * 下载失败处理
     * 提示用户重试或跳过/退出
     */
    private async updateFail(task: UpdateTask): Promise<UpdateRes> {
        const btnState = await task.showMsgBoxView("更新失败，请检查网络后重试", "重试", this.forceUpdate ? "退出" : "跳过");
        if (btnState) {
            // 用户选择重试 → 重新执行 process
            return await this.process(task);
        } else if (this.forceUpdate) {
            // 强制更新但用户选择退出
            return UpdateRes.Quit;
        }

        // 非强制更新, 用户选择跳过
        return UpdateRes.Over;
    }

    /**
     * 把当前 remoteManifest 保存为本地最新远端清单
     */
    private saveLatestManifest(): void {
        if (!this.remoteManifest) return;
        BundleManager.instance.saveRemoteManifest(this.remoteManifest);
    }
}
