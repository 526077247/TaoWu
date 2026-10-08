import { BufferAsset } from "cc";
import { Log } from "../../../Mono/Module/Log/Log";
import { BundleManager } from "../../../Mono/Module/Resource/BundleManager";
import { IConfigLoader } from "./IConfigLoader";

export class ConfigLoader implements IConfigLoader{
    public async getAllConfigBytes(output: Map<string, ArrayBuffer>): Promise<void>{
        var bundle = await BundleManager.instance.loadBundle("config");
        if(bundle == null) {
            return;
        }

        return await new Promise<void>((resolve) => {
            bundle.loadDir("", (err,assets)=> {
                if (err) {
                    Log.error(err);
                    resolve();
                    BundleManager.instance.releaseBundle(bundle, true);
                    return null;
                }
                for (const asset of assets) {
                    const protoAsset = asset as BufferAsset;
                    if(!!protoAsset) output.set(asset.name, protoAsset.buffer())
                }
                BundleManager.instance.releaseBundle(bundle, true);
                resolve();
            });
        });

    }
    public async getOneConfigBytes(configName: string): Promise<ArrayBuffer>{
        var bundle = await BundleManager.instance.loadBundle("config");
        if(bundle == null) {
            return;
        }

        return await new Promise<ArrayBuffer>((resolve) => {
            bundle.load(configName, BufferAsset, (err, protoAsset)=> {
                if (err) {
                    Log.error(err);
                    resolve(null);
                    BundleManager.instance.releaseBundle(bundle, true);
                    return null;
                }
                let res = null;
                if(!!protoAsset) res = protoAsset.buffer();
                BundleManager.instance.releaseBundle(bundle, true);
                resolve(res);
            });
        });
    }
}