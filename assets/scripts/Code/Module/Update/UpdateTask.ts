import { game, sys } from "cc";
import { UpdateRes } from "./UpdateRes";
import { UpdateProcess } from "./UpdateProcess/UpdateProcess";
import { Log } from "../../../Mono/Module/Log/Log";
import { VersionManifest } from "../../../Mono/Module/Resource/VersionManifest";

export class UpdateTask {
    public appVer: number = 1;
    private list: UpdateProcess[];
    private onDownloadSize: (total: number, current: number) => void;

    public downloadingMaxNum = 10;
    public failedTryAgain = 2;
    public timeout = 8;
    public remoteManifest: VersionManifest = null;

    public async init(
        downloadSizeCallback: (total: number, current: number) => void,
        ...processes: UpdateProcess[]
    ): Promise<void> {
        this.onDownloadSize = downloadSizeCallback;
        this.list = processes;
    }

    public async process(): Promise<UpdateRes> {
        if (!this.list) {
            Log.error("UpdateTask 未 init");
            return UpdateRes.Fail;
        }

        for (let i = 0; i < this.list.length; i++) {
            if (!this.list[i]) continue;
            const res = await this.list[i].process(this);
            switch (res) {
                case UpdateRes.Fail:
                    Log.error("Update Fail " + this.list[i].constructor.name);
                    return UpdateRes.Fail;
                case UpdateRes.Over:
                    break;
                case UpdateRes.Quit:
                    return UpdateRes.Quit;
                case UpdateRes.Restart:
                    return UpdateRes.Restart;
            }
        }
        return UpdateRes.Over;
    }

    public setDownloadSize(total: number, current: number): void {
        this.onDownloadSize?.(total, current);
    }

    /** 重启游戏 */
    public static restartGame(): void {
        Log.info("[HotUpdate] Restarting game...");
        setTimeout(() => {
            if (sys.isBrowser) {
                window.location.reload();
            } else {
                game.restart();
            }
        }, 500);
    }
}
