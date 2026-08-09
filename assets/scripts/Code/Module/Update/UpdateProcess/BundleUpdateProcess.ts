import { UpdateRes } from "../UpdateRes";
import { UpdateProcess } from "./UpdateProcess";
import { UpdateTask } from "../UpdateTask";
import { Log } from "../../../../Mono/Module/Log/Log";
import { BundleManager } from "../../../../Mono/Module/Resource/BundleManager";
import { UpdateConfig, VersionManifest, BundleVersionInfo } from "../../../../Mono/Module/Resource/VersionManifest";

export class BundleUpdateProcess extends UpdateProcess {
    private remoteManifest: VersionManifest;

    constructor() {
        super();
    }

    public async process(task: UpdateTask): Promise<UpdateRes> {
        this.remoteManifest = task.remoteManifest;
        if (!this.remoteManifest) {
            Log.info("[HotUpdate] No remote manifest, skip bundle update.");
            return UpdateRes.Over;
        }

        const localManifest = BundleManager.instance.localManifest;
        // 对比内置 hash 与远程 hash, 找出需要下载的 bundle
        const bundlesToUpdate: BundleVersionInfo[] = [];
        const bundles = this.remoteManifest.bundles;
        for (const name in bundles) {
            const remoteBundle = bundles[name];
            const localHash = localManifest?.bundles?.[name]?.hash;

            if (remoteBundle.builtin && localHash === remoteBundle.hash) {
                continue;
            }
            bundlesToUpdate.push(remoteBundle);
        }

        if (bundlesToUpdate.length === 0) {
            Log.info("[HotUpdate] All bundles up to date.");
            return UpdateRes.Over;
        }

        Log.info(`[HotUpdate] ${bundlesToUpdate.length} bundles to download.`);

        let allSuccess = true;

        for (let i = 0; i < bundlesToUpdate.length; i++) {
            const bundleInfo = bundlesToUpdate[i];
            const remoteInfo = BundleManager.instance.getRemoteBundleInfo(bundleInfo.name);
            if (!remoteInfo) {
                Log.error(`[HotUpdate] No remote info for bundle "${bundleInfo.name}"`);
                allSuccess = false;
                continue;
            }

            try {
                await BundleManager.instance.loadBundle(
                    bundleInfo.name,
                    remoteInfo.url,
                    remoteInfo.hash
                );
                Log.info(`[HotUpdate] Bundle "${bundleInfo.name}" downloaded.`);
            } catch (e: any) {
                Log.error(`[HotUpdate] Failed to download bundle "${bundleInfo.name}":`, e);
                allSuccess = false;
            }
        }

        if (allSuccess) {
            Log.info("[HotUpdate] All bundles downloaded successfully.");
        }

        return UpdateRes.Over;
    }
}
