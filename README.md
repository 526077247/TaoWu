# TaoWu(梼杌)

基于 **Cocos Creator 3.8.7** 的游戏框架，包含组件式 UI 框架、资源管理系统、Excel 配置导出工具链及编辑器扩展。

---

## 框架架构

### 分层设计

| 层级 | 路径 | 说明 |
|------|------|------|
| **ThirdParty** | `assets/scripts/ThirdParty/` | ETTask 异步原语、SuperScrollView 虚拟列表/网格 |
| **Mono** | `assets/scripts/Mono/` | 基础设施层：Manager 注册中心、数据结构、计时器、日志、Http、资源 Bundle、Messager 事件系统、ReferenceCollector |
| **Code** | `assets/scripts/Code/` | 游戏逻辑层：UI 框架、场景管理、配置加载、I18N、相机、音效、对象池、协程锁、红点系统 |

### 启动流程

`Mono/Init.ts` → 设置日志与 ETTask Handler → 持久化根节点 → `Code/Entry.ts` 启动：

Messager → CoroutineLockManager → TimerManager → CacheManager → BundleManager → ConfigManager（异步加载配置）→ ResourceManager → GameObjectPoolManager → ImageLoaderManager → MaterialManager → I18NManager → UIManager → CameraManager → SceneManager → SoundManager → 切换到 LoginScene

### 核心模块

#### UI 框架（`Code/Module/UI/`）
- **UIBaseView / UIBaseContainer / UIWindow** 三层 UI 基类，支持生命周期钩子（`IOnCreate`、`IOnDestroy`、`IOnEnable`、`IOnDisable` 等）
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
- 基于 JSON 序列化的配置加载
- 配置类由 Excel 导出工具自动生成

#### I18N 国际化（`Code/Module/I18N/`）
- 多语言文本加载与管理
- 语言枚举与 I18N Key 由导出工具自动生成

#### 协程锁（`Code/Module/CoroutineLock/`）
- 异步锁与队列系统，防止并发冲突

---

## 工具链

### Excel 配置导出（`Tools/ExcelExport/`）

.NET 控制台应用，将 `.xlsx` 配置表导出为 TypeScript 配置类和 JSON 数据。

**Excel 文件命名规则**：`ConfigName@<标签>.xlsx`

| 标签 | 含义 | 导出目标 |
|------|------|----------|
| `c` | Client | 客户端 TypeScript + JSON |
| `s` | Server | 服务端 JSON |
| `cs` | Client + Server | 双端 |
| `i` | I18N | 多语言枚举 + JSON |

**使用方式**（`Excel/` 目录下）：

| 脚本 | 功能 |
|------|------|
| `win_startExcelExport.bat` | 导出配置表 |
| `win_startExportAll.bat` | 导出全部 |
| `win_startI18NExport.bat` | 导出多语言 |
| `win_startAttrExport.bat` | 导出属性表 |
| `策划校验表工具.bat` | 校验配置表 |

### 编辑器扩展（`extensions/taowu-editor/`）

Cocos Creator 编辑器插件，提供以下功能：

- **根据节点生成 UI 代码** — 选中 Prefab 节点，自动生成带类型绑定的 TypeScript View 类
- **绑定 UI 节点** — 将代码中的 `ReferenceCollector` 数据写回 Prefab
- **一键设置 UI 文件夹为 AB 包** — 批量设置 Asset Bundle
- **批量设置图片格式** — 统一压缩格式与采样方式
- **快捷启动场景** — Shift+B 快速切换到启动场景
- **构建时代码混淆** — 集成 `javascript-obfuscator`，构建时自动混淆 JS 产物

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
├── build-templates/           # 构建模板（web-desktop、web-mobile）
├── Excel/                     # 配置表 .xlsx + 导出脚本
├── extensions/
│   ├── taowu-editor/          # 编辑器扩展（UI 代码生成、构建混淆等）
│   └── build-plugin-taowu/    # 构建插件
├── profiles/                 # Cocos 项目配置
├── settings/                 # Cocos 项目设置
└── Tools/
    └── ExcelExport/           # C# Excel 导出工具
```

---

## 环境要求

- **Cocos Creator** 3.8.7+
- **.NET 9.0 SDK**（Excel 导出工具）

---

## 相关项目

- Unity 引擎 → [TaoTie(饕餮)](https://github.com/526077247/TaoTie)
- UE 引擎 → [QiongQi(穷奇)](https://github.com/526077247/QiongQi)
- Godot 引擎 → [HunDun(混沌)](https://github.com/526077247/HunDun)
