// === 版本清单数据结构 (Mono 层, 供 BundleManager 使用) ===

/**
 * 精简版本清单格式 (内置 + 远端统一使用此结构):
 * {
 *   "v": "1723200000000",       // version
 *   "b": {                       // bundles
 *     "main": ["a1b2c3d4e5f6", true, 102400],   // [hash, builtin, size(bytes)]
 *     "config": ["b2c3d4e5f6a1", false, 51200],
 *   }
 * }
 * channel/platform/server 不在此结构中:
 * - channel: 构建时写入 settings.json 的 assets._channel 字段
 * - platform: 运行时 UpdateConfig.getPlatformName()
 * - server: 运行时 settings.querySettings('assets','server') (Cocos 内置字段)
 */
export class RawVersionManifest {
    v: string;
    b: Record<string, [string, boolean, number]>;
}

// === 更新列表数据结构 ===

/** 资源版本信息 */
export class Resver {
    Channel: string[];
    UpdateTailNumber: string[];
    ForceUpdate: number;
    MaxResVer: number;
}

/** App 版本更新配置 */
export class AppConfig {
    AppUrl: string;
    AppVer: Record<string, Resver>;
    JumpChannel: string;
}

/** 更新列表 (服务端 update_{platform}.list) */
export class UpdateListConfig {
    ResList: Record<string, Record<string, Resver>>;
    AppList: Record<string, AppConfig>;
}

