import { game, sys } from "cc";
import { UpdateRes } from "./UpdateRes";
import { UpdateProcess } from "./UpdateProcess/UpdateProcess";
import { Log } from "../../../Mono/Module/Log/Log";
import { RawVersionManifest } from "../../../Mono/Module/Resource/VersionManifest";
import { UIManager } from "../UI/UIManager";
import { UILayerNames } from "../UI/UILayerNames";
import { UIMsgBoxWin, MsgBoxPara } from "../../Game/UI/UICommon/UIMsgBoxWin";
import { UIBaseView } from "../UI/UIBaseView";

export class UpdateTask {
    public appVer: number = 1;
    private list: UpdateProcess[];
    private onDownloadSize: (total: number, current: number) => void;

    public downloadingMaxNum = 10;
    public failedTryAgain = 2;
    public timeout = 8;
    public remoteManifest: RawVersionManifest = null;

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
            if (sys.isNative) {
                game.restart();
            } else {
                window.location.reload();
            }
        }, 500);
    }

    // === MsgBox ===

    private msgBoxPara: MsgBoxPara = new MsgBoxPara();

    /**
     * 显示提示窗
     * @param content 内容
     * @param confirmText 确认按钮文本
     * @param cancelText 取消按钮文本
     * @returns true=确认, false=取消
     */
    public async showMsgBoxView(content: string, confirmText: string, cancelText: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            this.msgBoxPara.content = content;
            this.msgBoxPara.confirmText = confirmText;
            this.msgBoxPara.cancelText = cancelText;
            this.msgBoxPara.confirmCallback = (win: UIBaseView) => {
                resolve(true);
                UIManager.instance.closeBox(win);
            };
            this.msgBoxPara.cancelCallback = (win: UIBaseView) => {
                resolve(false);
                UIManager.instance.closeBox(win);
            };
            await UIManager.instance.openBox<UIMsgBoxWin, MsgBoxPara>(
                UIMsgBoxWin, UIMsgBoxWin.PrefabPath,
                this.msgBoxPara, null,null,null,UILayerNames.TipLayer
            );
        });
    }
}


// === 更新配置 ===

export class UpdateSetting {

    public static getManifestURL(baseURL: string, channel: string, platform: string, version: number): string {
        return `${baseURL}/${channel}_${platform}/${version}.bytes`;
    }

    public static getBundleURL(baseURL: string, channel: string, platform: string, hash: string): string {
        return `${baseURL}/${channel}_${platform}/${hash}`;
    }

    public static readonly timeout: number = 15000;

    public static readonly enabled: boolean = true;
}
