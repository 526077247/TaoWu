import { UpdateRes } from "../UpdateRes";
import { UpdateProcess } from "./UpdateProcess";
import { UpdateTask } from "../UpdateTask";
import { Log } from "../../../../Mono/Module/Log/Log";
import { BundleManager } from "../../../../Mono/Module/Resource/BundleManager";
import { UpdateSetting, RawVersionManifest } from "../../../../Mono/Module/Resource/VersionManifest";

export class BundleUpdateProcess extends UpdateProcess {
    private remoteManifest: RawVersionManifest;
    private cacheDownload: boolean;

    constructor(cacheDownload: boolean = true) {
        super();
        this.cacheDownload = cacheDownload;
    }

    public async process(task: UpdateTask): Promise<UpdateRes> {
        this.remoteManifest = task.remoteManifest;
        if (!this.remoteManifest) {
            Log.info("[HotUpdate] No remote manifest, skip bundle update.");
            return UpdateRes.Over;
        }

        const localManifest = BundleManager.instance.localManifest;
        let needRestart = false;

        // 对比内置 hash 与远程 hash, 找出有变化的 bundle
        const bundles = this.remoteManifest.b;
        const localBundles = localManifest?.b || {};
        for (const name in bundles) {
            const [remoteHash, builtin] = bundles[name];
            const localHash = localBundles[name]?.[0];

            if (builtin && localHash === remoteHash) {
                continue;
            }

            // 有变化: 注册远程信息
            BundleManager.instance.setRemoteBundleInfo(name, remoteHash);

            if (builtin) {
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
            for (const name in bundles) {
                const [remoteHash, builtin] = bundles[name];
                const localHash = localBundles[name]?.[0];
                if (builtin && localHash === remoteHash) continue;
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
