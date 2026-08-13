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
            // 计算需要下载的总大小
            let totalSize = 0;
            const bundlesToDownload: string[] = [];
            for (const name in remoteBundles) {
                const remoteHash = remoteBundles[name]?.[0];
                const localHash = localBundles[name]?.[0];
                if (localHash === remoteHash) continue;
                const size = remoteBundles[name]?.[2] ?? 0;
                totalSize += size;
                bundlesToDownload.push(name);
            }

            if (bundlesToDownload.length === 0) {
                Log.info("[HotUpdate] All bundles up to date.");
                return UpdateRes.Over;
            }

            // 提示用户下载大小
            const sizeMb = totalSize / (1024 * 1024);
            const displayMb = sizeMb > 0 && sizeMb < 0.01 ? 0.01 : sizeMb;
            Log.info(`[HotUpdate] Download size: ${displayMb.toFixed(2)} MB (${totalSize} bytes, ${bundlesToDownload.length} bundles)`);

            const content = `需要下载 ${displayMb.toFixed(2)} MB 资源，是否继续？`;
            const confirmed = await task.showMsgBoxView(content, "确认", this.forceUpdate ? "退出" : "跳过");
            if (!confirmed) {
                if (this.forceUpdate) {
                    return UpdateRes.Quit;
                }
                return UpdateRes.Over;
            }

            // 设置下载进度初始值
            task.setDownloadSize(totalSize, 0);

            Log.info("[HotUpdate] Caching remote bundles...");
            let allSuccess = true;
            let downloadedSize = 0;
            for (const name of bundlesToDownload) {
                const bundleSize = remoteBundles[name]?.[2] ?? 0;
                try {
                    await BundleManager.instance.loadBundle(name, (finished, total) => {
                        if (total > 0) {
                            const current = downloadedSize + Math.floor(bundleSize * finished / total);
                            task.setDownloadSize(totalSize, current);
                        }
                    });
                    Log.info(`[HotUpdate] Bundle "${name}" downloaded.`);
                } catch (e: any) {
                    Log.error(`[HotUpdate] Failed to download bundle "${name}":`, e);
                    allSuccess = false;
                }
                downloadedSize += bundleSize;
                task.setDownloadSize(totalSize, downloadedSize);
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
