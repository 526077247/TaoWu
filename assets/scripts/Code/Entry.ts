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
import { HomeScene } from "./Game/Scene/LoginScene"
import { I18NManager } from "./Module/I18N/I18NManager"
import { CacheManager } from "./Module/Player/CacheManager"
import { ConfigManager } from "./Module/Config/ConfigManager"
import { ImageLoaderManager } from "./Module/Resource/ImageLoaderManager"
import { CameraManager } from "./Module/Camera/CameraManager"
import { UIToastManager } from "./Module/UI/Toast/UIToastManager"

export class Entry 
{  
    public static start()
    {
        Log.info("Entry.start");
        Entry.startAsync();
    }
    
    private static async startAsync() {
        try {
            ManagerProvider.registerManager(Messager);
            ManagerProvider.registerManager(CoroutineLockManager);
            ManagerProvider.registerManager(TimerManager);
            ManagerProvider.registerManager(CacheManager);

            ManagerProvider.registerManager(BundleManager);
            const cm = ManagerProvider.registerManager(ConfigManager);
            await cm.loadAsync();
           
            ManagerProvider.registerManager(ResourceManager);
            ManagerProvider.registerManager(GameObjectPoolManager);
            ManagerProvider.registerManager(ImageLoaderManager);


            ManagerProvider.registerManager(I18NManager);
            ManagerProvider.registerManager(UIManager);
            ManagerProvider.registerManager(UIToastManager);
            
            ManagerProvider.registerManager(CameraManager);
            ManagerProvider.registerManager(SceneManager);

            await SceneManager.instance.switchScene(HomeScene)
        } catch (e) {
            Log.error(e);
        }
    }
}  

