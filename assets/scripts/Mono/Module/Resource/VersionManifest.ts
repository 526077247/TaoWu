// === 版本清单数据结构 (Mono 层, 供 BundleManager 使用) ===

import { sys } from "cc";

/** 精简版本清单原始格式 */
export interface RawVersionManifest {
    v: string;
    c?: string;
    p?: string;
    s?: string;
    b: Record<string, [string, boolean]>;
}

/** 单个 Bundle 版本信息 */
export interface BundleVersionInfo {
    name: string;
    hash: string;
    builtin: boolean;
}

/** 解析后的版本清单 */
export interface VersionManifest {
    version: string;
    bundles: Record<string, BundleVersionInfo>;
}

/** 从原始精简格式解析为完整格式 */
export function parseManifest(raw: RawVersionManifest): VersionManifest {
    const bundles: Record<string, BundleVersionInfo> = {};
    for (const name in raw.b) {
        const [hash, builtin] = raw.b[name];
        bundles[name] = { name, hash, builtin };
    }
    return { version: raw.v, bundles };
}


// === 更新列表数据结构 (参考 World 项目 PackageConfig.cs) ===

/** 资源版本信息 */
export class Resver {
    Channel: string[];           // 适用渠道列表 ("all" 表示全部)
    UpdateTailNumber: string[];   // 灰度尾号 ("all" 表示全部)
    ForceUpdate: number;          // 是否强制更新 (1=强制, 0=普通, -1=不提示)
    MaxResVer: number;            // 当前 App 版本下的最大资源版本号
}

/** App 版本更新配置 */
export class AppConfig {
    AppUrl: string;               // 下载地址
    AppVer: Record<string, Resver>; // App版本号 → 更新配置
    JumpChannel: string;          // 跳转渠道
}

/** 更新列表 (服务端 update_{platform}.list) */
export class UpdateListConfig {
    ResList: Record<string, Record<string, Resver>>;  // 渠道 → {资源版本号 → Resver}
    AppList: Record<string, AppConfig>;               // 渠道 → AppConfig
}

// === 更新配置 ===

/** 更新配置 */
export class UpdateConfig {

    /** 获取当前平台名 (与构建时输出目录一致) */
    public static getPlatformName(): string {
        if (sys.isBrowser) return "webgl";
        if (sys.platform === sys.Platform.ANDROID) return "android";
        if (sys.platform === sys.Platform.IOS) return "ios";
        return "pc";
    }

    /** 拼接 CDN manifest URL: {baseURL}/{渠道名}_{平台名}/{version}.bytes */
    public static getManifestURL(baseURL: string, channel: string, platform: string, version: string): string {
        return `${baseURL}/${channel}_${platform}/${version}.bytes`;
    }

    /** 拼接 bundle 远程 URL: {baseURL}/{渠道名}_{平台名}/{hash} */
    public static getBundleURL(baseURL: string, channel: string, platform: string, hash: string): string {
        return `${baseURL}/${channel}_${platform}/${hash}`;
    }

    /** 请求超时 (ms) */
    public static readonly timeout: number = 15000;

    /** 是否启用热更新 (运行时始终启用, 编辑器中由 BundleManager.localManifest 是否存在判断) */
    public static readonly enabled: boolean = true;
}
