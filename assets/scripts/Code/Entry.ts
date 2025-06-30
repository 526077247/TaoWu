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

export class Entry 
{  
    public static start()
    {
        Log.info("Entry.start");
        Entry.startAsync();
    }
    
    private static async startAsync() {
        try {
            ManagerProvider.registerManager<Messager>(Messager);
            ManagerProvider.registerManager<CoroutineLockManager>(CoroutineLockManager);
            ManagerProvider.registerManager<TimerManager>(TimerManager);
            ManagerProvider.registerManager<BundleManager>(BundleManager);
            ManagerProvider.registerManager<ResourceManager>(ResourceManager);
            ManagerProvider.registerManager<GameObjectPoolManager>(GameObjectPoolManager);
            ManagerProvider.registerManager<UIManager>(UIManager);
            
            ManagerProvider.registerManager<SceneManager>(SceneManager);


            SceneManager.instance.switchScene<HomeScene>(HomeScene)
        } catch (e) {
            Log.error(e);
        }
    }
}  

