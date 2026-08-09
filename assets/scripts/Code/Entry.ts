import { Log } from "../Mono/Module/Log/Log"
import { ManagerProvider } from "../Mono/Core/Manager/ManagerProvider"
import { Messager } from "../Mono/Module/Messager/Messager"
import { TimerManager } from "../Mono/Module/Timer/TimerManager"
import { ResourceManager } from "./Module/Resource/ResourceManager"
import { UIManager } from "./Module/UI/UIManager"
import { BundleManager } from "../Mono/Module/Resource/BundleManager"
import { GameObjectPoolManager } from "./Module/Resource/GameObjectPoolManager"
import { CoroutineLockManager } from "./Module/CoroutineLock/CoroutineLockManager"
import { SceneManager } from "./Module/Scene/SceneManager"
import { LoginScene } from "./Game/Scene/LoginScene"
import { I18NManager } from "./Module/I18N/I18NManager"
import { ConfigManager } from "./Module/Config/ConfigManager"
import { ImageLoaderManager } from "./Module/Resource/ImageLoaderManager"
import { CameraManager } from "./Module/Camera/CameraManager"
import { SoundManager } from "./Module/Resource/SoundManager"
import { MaterialManager } from "./Module/Resource/MaterialManager"
import { CacheManager } from "./Module/Player/CacheManager"
import { ServerConfigManager } from "./Module/Update/ServerConfigManager"
import { UIUpdateView } from "./Game/UI/UIUpdate/UIUpdateView"
import { UILayerNames } from "./Module/UI/UILayerNames"
import { Define } from "../Mono/Define"
import { sys } from "cc"

export class Entry 
{  
    public static start()
    {
        Log.info("Entry.start");
        Entry.startAsync();
    }
    
    private static async startAsync() {
        try {
            // === 阶段 A: 注册基础 Manager ===
            ManagerProvider.registerManager(Messager);
            ManagerProvider.registerManager(CoroutineLockManager);
            ManagerProvider.registerManager(TimerManager);
            ManagerProvider.registerManager(CacheManager);

            const bm = ManagerProvider.registerManager(BundleManager);
            await bm.loadLocalManifest();

            const cm = ManagerProvider.registerManager(ConfigManager);
            await cm.loadAsync();

            ManagerProvider.registerManager(ResourceManager);
            ManagerProvider.registerManager(GameObjectPoolManager);

            ManagerProvider.registerManager(I18NManager);
            ManagerProvider.registerManager(UIManager);

            if (!sys.isBrowser && (Define.Networked||Define.ForceUpdate)) {
                ManagerProvider.registerManager(ServerConfigManager);
                // === 阶段 B: 热更新检查 (参考 World Entry → UIUpdateView) ===
                await UIManager.instance.openWindow<UIUpdateView, VoidFunction>(
                    UIUpdateView, UIUpdateView.PrefabPath,
                    Entry.startGame,null,null,null, UILayerNames.TopLayer
                );
            } else {
                // 编辑器中直接进入游戏
                Entry.startGame();
            }
        } catch (e: any) {
            Log.error(e);
        }
    }

    /**
     * 更新完成后, 注册剩余 Manager 并进入游戏
     */
    private static async startGame() {
        ManagerProvider.registerManager(ImageLoaderManager);
        ManagerProvider.registerManager(MaterialManager);
        ManagerProvider.registerManager(CameraManager);
        ManagerProvider.registerManager(SceneManager);
        ManagerProvider.registerManager(SoundManager);
        await SceneManager.instance.switchScene(LoginScene);
    }
}
