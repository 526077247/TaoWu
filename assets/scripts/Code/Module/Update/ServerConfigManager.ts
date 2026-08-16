import { IManager } from "../../../Mono/Core/Manager/IManager";
import { CacheManager } from "../Player/CacheManager";
import { UpdateListConfig, Resver, AppConfig } from "../../../Mono/Module/Resource/VersionManifest";
import { ServerConfig, ServerConfigCategory } from "../Generate/Config/ServerConfig";
import { Define } from "../../../Mono/Define";
import { TimerManager } from "../../../Mono/Module/Timer/TimerManager";
import * as string from "../../../Mono/Helper/StringHelper";
import { PlatformUtils } from "../../../Mono/Helper/PlatformUtils";

/**
 * 服务器配置管理器
 * 负责管理当前服务器环境、更新列表、版本号查询、渠道/灰度判断
 */
export class ServerConfigManager implements IManager {
    private static _instance: ServerConfigManager;
    public static get instance(): ServerConfigManager { return ServerConfigManager._instance; }

    private readonly serverKey = "ServerId";
    private readonly defaultServer = 1;

    /** 当前服务器环境配置 */
    private _curConfig: ServerConfig = null;

    /** 更新列表 (从 CDN update_{platform}.list 拉取) */
    private _updateList: UpdateListConfig = null;

    public init(): void {
        ServerConfigManager._instance = this;
        this.initCurConfig();
    }

    public destroy(): void {
        ServerConfigManager._instance = null;
        this._updateList = null;
        this._curConfig = null;
    }

    // === 服务器环境 ===

    /**
     * 初始化当前服务器配置
     * Debug 模式从 localStorage 读取上次选择的服务器, 否则取 IsPriority=1 的默认服务器
     */
    private initCurConfig(): void {
        if (Define.Debug) {
            const serverId = CacheManager.instance.getInt(this.serverKey, this.defaultServer);
            this._curConfig = ServerConfigCategory.instance.get(serverId);
        }
        if (this._curConfig == null) {
            // 取默认优先服务器
            const all = ServerConfigCategory.instance.getAll();
            for (const [, config] of all) {
                this._curConfig = config;
                if (config.isPriority === 1) break;
            }
        }
    }

    /** 获取当前服务器配置 */
    public getCurConfig(): ServerConfig {
        return this._curConfig;
    }

    /** 获取当前环境 ID */
    public getEnvId(): number {
        return this._curConfig?.envId ?? 0;
    }

    /**
     * 切换服务器环境
     */
    public changeEnv(id: number): ServerConfig {
        const conf = ServerConfigCategory.instance.get(id);
        if (conf) {
            this._curConfig = conf;
            if (Define.Debug) {
                CacheManager.instance.setInt(this.serverKey, id);
            }
        }
        return this._curConfig;
    }

    /**
     * 获取更新列表的 CDN 地址
     * 使用 ServerConfig.routerListUrl 作为 CDN 根地址
     */
    public getUpdateListUrl(): string {
        return this._curConfig?.routerListUrl ?? "";
    }

    /**
     * 获取 update_{platform}.list 的完整 URL
     */
    public getUpdateListCdnUrl(): string {
        return `${this.getUpdateListUrl()}/update_${PlatformUtils.getPlatformName()}.list?timestamp=${TimerManager.instance.getTimeNow()}`;
    }

    // === 更新列表 ===

    /** 设置更新列表 */
    public setUpdateList(info: UpdateListConfig): void {
        this._updateList = info;
    }

    /** 是否已加载更新列表 */
    public get hasUpdateList(): boolean {
        return this._updateList != null;
    }

    // === 资源版本查询 ===

    /**
     * 找到可以更新的最大资源版本号
     * @param resverChannel 资源版本渠道 (用于 Resver.Channel 匹配)
     * @param appResVer 当前 App 版本对应的最大资源版本 (0 表示不限制)
     * @returns 最大资源版本号, null 表示无可用版本
     */
    public findMaxUpdateResVer(channel: string, resverChannel: string = "", appResVer: number = 0): number {
        if (!this._updateList?.ResList) return null;

        const verMap = this._updateList.ResList[channel];
        if (!verMap) return null;

        // 倒序排列版本号
        const versions = Object.keys(verMap).map(Number).sort((a, b) => b - a);
        let lastVer: number = -1;

        for (const ver of versions) {
            const resver = verMap[String(ver)];
            if (!resver) continue;
            if (this.isStrInList(resverChannel, resver.Channel)
                && this.isInTailNumber(resver.UpdateTailNumber)) {
                lastVer = ver;
                break;
            }
        }

        if (lastVer < 0) return null;

        // 如果当前 App 版本有最大资源版本限制, 且找到的版本超过限制, 则用限制版本
        if (appResVer > 0 && lastVer > appResVer && verMap[String(appResVer)]) {
            return appResVer;
        }

        return lastVer;
    }

    public getResVerInfo(channel: string, version: number): Resver {
        if (!this._updateList?.ResList) return null;
        const verMap = this._updateList.ResList[channel];
        if (verMap) {
            const res = verMap[String(version)];
            if(!!res) return res;
        }
        return null;
    }

    public isForceUpdate(channel: string, version: number): boolean {
        const resver = this.getResVerInfo(channel, version);
        return resver?.ForceUpdate === 1;
    }

    // === App 版本查询 ===

    public getAppUpdateListByChannel(channel: string): AppConfig {
        if (!this._updateList?.AppList) return null;
        const data = this._updateList.AppList[channel];
        if (!data) return null;

        if (!string.isNullOrEmpty(data.JumpChannel)) {
            const jumpData = this.resolveJumpChannel(data.JumpChannel);
            if (jumpData) {
                return { AppUrl: data.AppUrl, AppVer: jumpData.AppVer, JumpChannel: data.JumpChannel };
            }
        }
        return data;
    }

    private resolveJumpChannel(jumpChannel: string): AppConfig {
        if (!jumpChannel || !this._updateList?.AppList) return null;
        const jumpData = this._updateList.AppList[jumpChannel];
        if (!jumpData) return null;
        if (!string.isNullOrEmpty(jumpData.JumpChannel)) {
            const deeper = this.resolveJumpChannel(jumpData.JumpChannel);
            if (deeper) return deeper;
        }
        return jumpData;
    }

    /**找到可以更新的最大app版本号 */
    public findMaxUpdateAppVer(channel: string): number {
        if (!this._updateList?.AppList) return -1;
        let data = this._updateList.AppList[channel];
        if (!data) return -1;
        if (!string.isNullOrEmpty(data.JumpChannel) && this._updateList.AppList[data.JumpChannel]) {
            data = this._updateList.AppList[data.JumpChannel];
        }
        let lastVer = -1;
        for (const verStr in data.AppVer) {
            const ver = Number(verStr);
            const resver = data.AppVer[verStr];
            if (lastVer === -1) {
                lastVer = ver;
            } else if (ver > lastVer
                && this.isStrInList(channel, resver.Channel)
                && this.isInTailNumber(resver.UpdateTailNumber)) {
                lastVer = ver;
            }
        }
        return lastVer;
    }

    public findMaxUpdateResVerThisAppVer(channel: string, appVer: number): number | null{
        if (this._updateList?.AppList == null) return null;
        let data = this._updateList.AppList[channel];
        if (!data) return null;
        if (!string.isNullOrEmpty(data.JumpChannel))
            data = this._updateList.AppList[data.JumpChannel];
        const res = data.AppVer[appVer.toString()];
        if (!!res)
        {
            return res.MaxResVer;
        }
        return null;
    }

    // === 工具方法 ===

    public isInTailNumber(list: string[]): boolean {
        if (!list) return false;
        const account = CacheManager.instance.getString("Account", "");
        const tailNumber = account ? account[account.length - 1] : "";
        for (const item of list) {
            if (item === "all" || tailNumber === item) return true;
        }
        return false;
    }

    public isStrInList(str: string, list: string[]): boolean {
        if (!list) return false;
        for (const item of list) {
            if (item === "all" || str === item) return true;
        }
        return false;
    }
}
