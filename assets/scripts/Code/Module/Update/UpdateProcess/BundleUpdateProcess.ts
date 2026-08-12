import { UpdateRes } from "../UpdateRes";
import { UpdateProcess } from "./UpdateProcess";
import { UpdateSetting, UpdateTask } from "../UpdateTask";
import { Log } from "../../../../Mono/Module/Log/Log";
import { BundleManager } from "../../../../Mono/Module/Resource/BundleManager";
import { RawVersionManifest } from "../../../../Mono/Module/Resource/VersionManifest";
import { settings } from "cc";
import { ServerConfigManager } from "../ServerConfigManager";
import { Define } from "../../../../Mono/Define";

export class BundleUpdateProcess extends UpdateProcess {
    private remoteManifest: RawVersionManifest;
    private cacheDownload: boolean;
    private forceUpdate: boolean;
    
    constructor(cacheDownload: boolean = true) {
        super();
        this.cacheDownload = cacheDownload;
    }

    public async process(task: UpdateTask): Promise<UpdateRes> {
        // Step 1:从 cc.settings 读取 channel (构建时写入, 不在 manifest 中)
        const channel = settings.querySettings<string>('assets', '_channel') || "default";
        const maxAppResVer = ServerConfigManager.instance.findMaxUpdateResVerThisAppVer(channel, task.appVer);

        const version = BundleManager.instance.getSavedVersion();
        this.forceUpdate = Define.ForceUpdate;
        var verInfo = ServerConfigManager.instance.getResVerInfo(channel, version);
        if (verInfo != null && verInfo.ForceUpdate == 1)
            this.forceUpdate = true;

        // Step 2: 通过 ServerConfigManager 查找当前渠道的最大资源版本号
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

        // Step 3: 拉取 CDN {version}.bytes
        // server/channel/platform 都从 cc.settings / UpdateConfig 获取, 不在 manifest 中
        const server = settings.querySettings<string>('assets', 'server') || "";
        const platform = BundleManager.getPlatformName();
        const remoteText = await task.fetchText(UpdateSetting.getManifestURL(server, channel, platform, maxVer));
        if (!remoteText) {
            Log.warning("[HotUpdate] Failed to fetch CDN manifest, using built-in bundles.");
            return UpdateRes.Over;
        }

        task.remoteManifest = JSON.parse(remoteText) as RawVersionManifest;


        this.remoteManifest = task.remoteManifest;
        if (!this.remoteManifest) {
            Log.info("[HotUpdate] No remote manifest, skip bundle update.");
            return UpdateRes.Over;
        }

        const localManifest = BundleManager.instance.localManifest;
        // 以内置 manifest 为准判断 builtin (远端 manifest 的 builtin 可能不可靠)
        const builtinManifest = BundleManager.instance.builtinManifest;
        let needRestart = false;

        // 对比 hash, 找出有变化的 bundle
        const remoteBundles = this.remoteManifest.b;
        const localBundles = localManifest?.b || {};
        for (const name in remoteBundles) {
            const remoteHash = remoteBundles[name]?.[0];
            const localHash = localBundles[name]?.[0];

            if (localHash === remoteHash) {
                continue;
            }

            // 以内置 manifest 判断是否 builtin
            const isBuiltin = builtinManifest?.b?.[name]?.[1] ?? false;

            // 有变化: 注册远程信息
            BundleManager.instance.setRemoteBundleInfo(name, remoteHash);

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

        if (needRestart && !this.cacheDownload) {
            return UpdateRes.Restart;
        }

        if (this.cacheDownload) {
            Log.info("[HotUpdate] Caching remote bundles...");
            let allSuccess = true;
            for (const name in remoteBundles) {
                const remoteHash = remoteBundles[name]?.[0];
                const localHash = localBundles[name]?.[0];
                if (localHash === remoteHash) continue;
                try {
                    await BundleManager.instance.loadBundle(name);
                    Log.info(`[HotUpdate] Bundle "${name}" downloaded.`);
                } catch (e: any) {
                    Log.error(`[HotUpdate] Failed to download bundle "${name}":`, e);
                    allSuccess = false;
                }
            }

            if (allSuccess) {
                Log.info("[HotUpdate] All bundles downloaded successfully.");
                this.saveLatestManifest();
            }
        }

        if (needRestart) {
            return UpdateRes.Restart;
        }

        return UpdateRes.Over;
    }

    /**
     * 把当前 remoteManifest 保存为本地最新远端清单
     * 下次启动 loadLocalManifest 时优先读取, 实现增量热更基线
     */
    private saveLatestManifest(): void {
        if (!this.remoteManifest) return;
        BundleManager.instance.saveRemoteManifest(this.remoteManifest);
    }
}
