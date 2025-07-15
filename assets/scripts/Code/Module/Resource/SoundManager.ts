import { _decorator, instantiate, AudioSource, AudioClip, Node, director, Prefab} from 'cc';
import { ResourceManager } from "./ResourceManager"
import { IManager } from '../../../Mono/Core/Manager/IManager';
import { IdGenerater } from '../../../Mono/Core/Object/IdGenerater';
import { ETCancellationToken } from '../../../ThirdParty/ETTask/ETCancellationToken';
import { ObjectPool } from '../../../Mono/Core/ObjectPool';
import { CoroutineLockManager } from '../CoroutineLock/CoroutineLockManager';
import { CacheManager } from '../Player/CacheManager';
import { CacheKeys } from '../Const/CacheKeys';
import { TimerManager } from '../../../Mono/Module/Timer/TimerManager';
import { Log } from '../../../Mono/Module/Log/Log';


class SoundItem {
    public isHttp: boolean = false;
    public id: bigint = 0n;
    public audioSource: AudioSource = null;
    public clip: AudioClip = null;
    public path: string = '';
    public token: ETCancellationToken = null;
    private isLoading: boolean = false;

    static create(path: string, isHttp: boolean, audioSource: AudioSource, token?: ETCancellationToken): SoundItem {
        const item = ObjectPool.instance.fetch(SoundItem);
        item.id = IdGenerater.instance.generateId();
        item.path = path;
        item.isHttp = isHttp;
        item.audioSource = audioSource;
        item.token = token || new ETCancellationToken();
        return item;
    }

    async loadClip(): Promise<void> {
        if (this.clip) return;
        
        const id = this.id;
        this.isLoading = true;
        
        try {
            if (this.isHttp) {
                const clip = await this.getOnlineClip(this.path);
                this.isLoading = false;
                if (this.id != id)
                {
                    clip.destroy();
                    ObjectPool.instance.recycle(this);
                    return;
                }
                if(clip == null) return;
                this.clip = clip;
            } else {
                var clip = await ResourceManager.instance.loadAsync<AudioClip>(AudioClip,this.path);
                this.isLoading = false;
                if (this.id != id)
                {
                    ResourceManager.instance.releaseAsset(clip);
                    ObjectPool.instance.recycle(this);
                    return;
                }
                if(clip == null) return;
                this.clip = clip;
            }

            this.audioSource.clip = this.clip;
        } finally {
            this.isLoading = false;
        }
    }

    private async getOnlineClip(url: string, retryCount: number = 3): Promise<AudioClip> {
        if (!url) return null;
        
        const lockKey = `sound_${url}`;
        // const lock = await CoroutineLockManager.instance.wait(lockKey);
        
        // try {
        //     // 伪代码 - 实际需使用Cocos网络模块
        //     return await HttpManager.Instance.downloadAudio(url, retryCount, this.token);
        // } finally {
        //     lock.release();
        // }
    }


    public dispose(): void {
        if (!this.token) return;
        
        this.token.cancel();
        this.token = null;
        this.id = 0n;
        
        if (this.clip != null)
        {
            if (!this.isHttp)
            {
                ResourceManager.instance.releaseAsset(this.clip);
            }
            else
            {
                this.clip.destroy();
            }

            this.clip = null;
        }
        
        if (this.audioSource) {
            this.audioSource.stop();
            this.audioSource.clip = null;
            SoundManager.instance.releaseAudioSource(this.audioSource);
        }
        this.audioSource = null;
        if (!this.isLoading) {
            ObjectPool.instance.recycle(this);
        }
    }
}

const INITSOUNDCOUNT = 3;

export class SoundManager implements IManager {
    private static _instance: SoundManager;

    public static get instance(): SoundManager{
        return SoundManager._instance;
    }

    public static readonly DEFAULTVALUE = 10;

    private soundItems = new Map<bigint, SoundItem>();
    private soundsPool: AudioSource[] = [];
    private curMusic: SoundItem = null;
    private soundsRoot: Node = null;

    private soundsClipClone: Prefab;

    private musicVolume: number = 10;
    private soundVolume: number = 10;
    public get MusicVolume(): number { return this.musicVolume; }
    public get SoundVolume(): number { return this.soundVolume; }

    public init(): void {

        SoundManager._instance = this;
        this.initAsync();
    }
    private async initAsync()
    {
        this.soundsRoot = new Node('SoundsRoot');
        director.addPersistRootNode(this.soundsRoot);
        this.soundsClipClone = await ResourceManager.instance.loadAsync<Prefab>(Prefab,"audio/common/source");
        // 初始化音频池
        for (let i = 0; i < INITSOUNDCOUNT; i++) {
            this.soundsPool.push(this.createAudioSource());
        }

        // 加载音量设置
        this.setMusicVolume(CacheManager.instance.getInt(CacheKeys.MusicVolume, 10));
        this.setSoundVolume(CacheManager.instance.getInt(CacheKeys.SoundVolume, 10));
    }

    public destroy(): void {
        SoundManager._instance = null;
        this.stopMusic();
        this.stopAllSound();
        this.soundItems.forEach(item => item.dispose());
        this.soundItems.clear();
        
        this.soundsPool.forEach(source => source.node.destroy());
        this.soundsPool = [];
        
        ResourceManager.instance.releaseAsset(this.soundsClipClone);
        this.soundsClipClone = null;

        SoundManager._instance = null;
        this.soundsRoot.destroy();
    }

    // region Volume Control
    setSoundVolume(value: number): void {
        if (this.soundVolume === value) return;
        
        this.soundVolume = value;
        CacheManager.instance.setInt(CacheKeys.SoundVolume, value);
        
        this.soundItems.forEach(item => {
            if (item !== this.curMusic && item.audioSource) {
                item.audioSource.volume = value / 10;
            }
        });
    }

    setMusicVolume(value: number): void {
        if (this.musicVolume === value) return;
        
        this.musicVolume = value;
        CacheManager.instance.setInt(CacheKeys.MusicVolume, value);
        
        if (this.curMusic?.audioSource) {
            this.curMusic.audioSource.volume = value / 10;
        }
    }
    // endregion

    // region Music Control
    playMusic(path: string, token?: ETCancellationToken): bigint {
        if (!path) return 0n;
        
        this.stopMusic();
        
        const audioSource = this.getAudioSource();
        if (!audioSource) return 0n;
        
        audioSource.loop = true;
        audioSource.volume = this.musicVolume / 10;
        
        const item = SoundItem.create(path, false, audioSource, token);
        this.curMusic = item;
        this.soundItems.set(item.id, item);
        
        this.loadAndPlay(item);
        return item.id;
    }

    pauseMusic(pause: boolean): void {
        if (!this.curMusic?.audioSource) return;
        
        if (pause) {
            this.curMusic.audioSource.pause();
        } else {
            this.curMusic.audioSource.play();
        }
    }

    stopMusic(id: bigint = 0n): void {
        if (!this.curMusic || (id !== 0n && id !== this.curMusic.id)) return;
        
        this.curMusic.dispose();
        this.soundItems.delete(this.curMusic.id);
        this.curMusic = null;
    }
    // endregion

    // region Sound Effects
    playSound(path: string, token?: ETCancellationToken, loop: boolean = false): bigint {
        if (!path) return 0n;
        
        const audioSource = this.getAudioSource();
        if (!audioSource) return 0n;
        
        audioSource.loop = loop;
        audioSource.volume = this.soundVolume / 10;
        
        const item = SoundItem.create(path, false, audioSource, token);
        this.soundItems.set(item.id, item);
        
        this.loadAndPlay(item);
        return item.id;
    }

    async playSoundAsync(path: string, token?: ETCancellationToken): Promise<void> {
        if (!path) return;
        
        const audioSource = this.getAudioSource();
        if (!audioSource) return;
        
        audioSource.loop = false;
        audioSource.volume = this.soundVolume / 10;
        
        const item = SoundItem.create(path, false, audioSource, token);
        this.soundItems.set(item.id, item);
        
        await this.loadAndPlay(item);
    }

    playHttpAudio(url: string, loop: boolean = false, token?: ETCancellationToken): bigint {
        if (!url) return 0n;
        
        const audioSource = this.getAudioSource();
        if (!audioSource) return 0n;
        
        audioSource.loop = loop;
        audioSource.volume = this.soundVolume / 10;
        
        const item = SoundItem.create(url, true, audioSource, token);
        this.soundItems.set(item.id, item);
        
        this.loadAndPlay(item);
        return item.id;
    }

    async playHttpAudioAsync(url: string, loop: boolean = false, token?: ETCancellationToken): Promise<void> {
        if (!url) return;
        
        const audioSource = this.getAudioSource();
        if (!audioSource) return;
        
        audioSource.loop = loop;
        audioSource.volume = this.soundVolume / 10;
        
        const item = SoundItem.create(url, true, audioSource, token);
        this.soundItems.set(item.id, item);
        
        await this.loadAndPlay(item);
    }

    stopSound(id: bigint): void {
        const item = this.soundItems.get(id);
        if (item) {
            item.dispose();
            this.soundItems.delete(id);
        }
    }

    stopAllSound(): void {
        this.soundItems.forEach(item => {
            if (item !== this.curMusic) {
                item.dispose();
            }
        });
        
        // 保留背景音乐
        const newMap = new Map<bigint, SoundItem>();
        if (this.curMusic) {
            newMap.set(this.curMusic.id, this.curMusic);
        }
        this.soundItems = newMap;
    }
    // endregion

    // region Private Methods
    private async loadAndPlay(item: SoundItem): Promise<void> {
        try {
            await item.loadClip();
            
            if (item.token?.isCancellationRequested || !item.audioSource || !item.clip) {
                item.dispose();
                return;
            }
            
            item.audioSource.play();
            
            if (!item.audioSource.loop) {
                const duration = item.clip.getDuration() * 1000;
                await TimerManager.instance.waitAsync(duration + 100, item.token);
                if (!item.token?.isCancellationRequested) {
                    this.stopSound(item.id);
                }
            }
        } catch (e) {
            console.error(`Sound play failed: ${e}`);
            item.dispose();
        }
    }

    private createAudioSource(): AudioSource {
        if (this.soundsClipClone == null || this.soundsRoot == null)
        {
            Log.error("this.soundsClipClone == null || soundsRoot == null");
            return null;
        }

        var obj = instantiate(this.soundsClipClone);
        this.soundsRoot.addChild(obj);
        return obj.getComponent<AudioSource>(AudioSource);
    }

    private getAudioSource(): AudioSource {
        return this.soundsPool.pop() || this.createAudioSource();
    }

    public releaseAudioSource(source: AudioSource): void {
        if (!source) return;
        
        source.stop();
        source.clip = null;
        this.soundsPool.push(source);
    }
}
