# TaoWu(梼杌)

基于 **Cocos Creator 3.8.8** 的游戏框架，包含组件式 UI 框架、资源管理与热更新、Excel 配置导出工具链、编辑器扩展支持。

---

## 框架架构

### 分层设计

| 层级 | 路径 | 说明 |
|------|------|------|
| **ThirdParty** | `assets/scripts/ThirdParty/` | ETTask 异步原语、SuperScrollView 虚拟列表/网格 |
| **Mono** | `assets/scripts/Mono/` | 基础设施层：Manager 注册中心、数据结构、计时器、日志、Http、资源 Bundle、Messager 事件系统、ProtoHelper、平台工具、ReferenceCollector |
| **Code** | `assets/scripts/Code/` | 游戏逻辑层：UI 框架、场景管理、配置加载、I18N、相机、音效、对象池、网络、热更新、红点系统 |

### 启动流程

`Mono/Init.ts` → 设置日志与 ETTask Handler → 持久化根节点 → `Code/Entry.ts`：

1. **阶段 A（注册基础 Manager）**：Messager → CoroutineLockManager → TimerManager → CacheManager → ConfigManager → ResourceManager → GameObjectPoolManager → I18NManager → UIManager。
2. **热更新检查**：原生平台且开启联网/强制更新时，先加载配置、注册 ServerConfigManager，打开 `UIUpdateView` 完成版本检查与资源更新；编辑器环境直接进入游戏。
3. **阶段 B（启动游戏）**：打开 `UILoadingView` →（未预加载时）`ConfigManager.loadAsync()` → ImageLoaderManager → CameraManager → SceneManager → SoundManager → MaterialManager → 切换到 `LoginScene`。

### 核心模块

#### UI 框架（`Code/Module/UI/`、`Code/Module/UIComponent/`）
- **UIBaseView / UIBaseContainer / UIWindow** 三层 UI 基类，支持生命周期钩子（`IOnCreate`、`IOnDestroy`、`IOnEnable`、`IOnDisable`、`IOnWidthPaddingChange`）
- **UILayer** 多层级 UI 管理，支持独立的显示与交互策略
- **UIComponent** 对 Cocos 组件的封装：UIButton、UIImage、UIText、UIToggle、UISlider、UIInput、UIAnimation、UILoopGridView、UILoopListView2 等
- **RedDotManager** 红点系统

#### 场景管理（`Code/Module/Scene/`）
- 支持场景切换时自动显示 Loading 界面
- 基于 ManagerProvider 模式的场景注册与生命周期管理

#### 资源管理（`Code/Module/Resource/`）
- **ResourceManager** 统一资源加载入口
- **GameObjectPoolManager** 对象池
- **ImageLoaderManager** 图片加载
- **MaterialManager** 材质管理
- **SoundManager** 音效管理

#### 配置系统（`Code/Module/Config/`）
- 基于 Protobuf 序列化的配置加载，配置二进制存放于 `config` Bundle
- 配置类由 Excel 导出工具自动生成到 `Code/Module/Generate/Config/`

#### I18N 国际化（`Code/Module/I18N/`）
- 多语言文本加载与管理
- 语言枚举与 I18N Key 由导出工具自动生成

#### 热更新（`Code/Module/Update/`）
- **ServerConfigManager** 服务器版本配置
- **UpdateTask / UpdateRes / UpdateProcess** 版本检查、资源下载与更新流程

#### 协程锁（`Code/Module/CoroutineLock/`）
- 异步锁与队列系统，防止并发冲突

---

## 工具链

### Excel 配置导出（`Tools/ExcelExport/`）

基于 .NET 6+ 的控制台应用，将 `.xlsx` 配置表导出为 TypeScript 配置类和 Protobuf 二进制数据。导出拆为两阶段：并行生成中间 JSON，再串行合并输出，避免中途整体删除 `config` 目录。

**Excel 文件命名规则**：`ConfigName@<标签>.xlsx`

| 标签 | 含义 | 导出目标 |
|------|------|----------|
| `c` | Client | 客户端 TypeScript + 二进制配置 |
| `s` | Server | 服务端配置 |
| `cs` | Client + Server | 双端 |
| `i` | I18N | 多语言枚举 + JSON |

**使用方式**（`Excel/` 目录下）：

| 脚本 | 功能 |
|------|------|
| `win_startExcelExport.bat` | 导出配置表 |
| `win_startExportAll.bat` | 导出全部 |
| `win_startExportTarget.bat` | 按文件名导出指定表 |
| `win_startI18NExport.bat` | 导出多语言 |
| `win_startAttrExport.bat` | 导出属性表 |
| `注册右键一键导出.bat` / `删除右键一键导出.bat` | 注册/移除资源管理器右键导出菜单 |
| `策划校验表工具.bat` | 校验配置表 |

### 编辑器扩展（`extensions/`）

| 扩展 | 说明 |
|------|------|
| **taowu-editor** | 框架主扩展：根据节点生成 UI 代码、一键绑定 UI 节点、UI 目录设为 AB 包、批量设置图片格式、预制体图集设置、启动场景快捷键（Shift+B）、EasyMenu 导入/移除；构建后自动混淆 JS 并清理图集冗余原生图；内置字体裁剪配置面板（字符集报告、缺字检查、生成并应用裁剪字体、恢复全量字库） |
| **taowu-inspector** | 自定义属性检查器：分组绘制、条件显示/禁用、Range / TableList / ValueDropdown / Button 等装饰器，支持 JsonAsset 内联可视化编辑 |

各扩展的详细用法参见其目录下的 README。

### 独立工具（`Tools/`）

- **ExcelExport** — .NET 6+ 导表工具（含 AttrExporter / ExcelExporter / I18NExporter）
- **FileServer** — ASP.NET Core 本地静态资源服务，用于热更新资源的本地调试

---

## 项目结构

```
TaoWu/
├── assets/
│   ├── assetsPackage/          # AB 包资源（UI、音频、配置、场景）
│   ├── resources/             # 动态加载资源
│   └── scripts/
│       ├── Code/              # 游戏逻辑层
│       ├── Mono/              # 基础设施层
│       └── ThirdParty/        # 第三方库（ETTask、SuperScrollView）
├── Bin/                       # 编译后的工具 DLL
├── Excel/                     # 配置表 .xlsx、中间 JSON + 导出脚本
├── build-templates/           # 构建模板
├── extensions/
│   ├── taowu-editor/          # 框架编辑器扩展（代码生成、构建钩子、字体裁剪）
│   ├── taowu-inspector/       # 自定义属性检查器
├── profiles/                  # Cocos 项目配置
├── settings/                  # Cocos 项目设置
└── Tools/
    ├── ExcelExport/           # .NET Excel 导出工具
    ├── FileServer/            # 本地静态资源服务
```

---

## 环境要求

- **Cocos Creator** 3.8.8
- **.NET 6+ SDK**（Excel 导出、FileServer、字体裁剪工具）
- **Node.js** 18+（编辑器扩展开发/构建）

---

## 相关项目

- Unity 引擎 → [TaoTie(饕餮)](https://github.com/526077247/TaoTie)
- UE 引擎 → [QiongQi(穷奇)](https://github.com/526077247/QiongQi)
- Godot 引擎 → [HunDun(混沌)](https://github.com/526077247/HunDun)
