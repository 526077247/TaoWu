import { JsonAsset, TextAsset } from "cc";
import { JsonHelper } from "../../../Mono/Helper/JsonHelper";
import { Log } from "../../../Mono/Module/Log/Log";
import { BundleManager } from "../../../Mono/Module/Resource/BundleManager";
import { IConfigLoader } from "./IConfigLoader";

export class ConfigLoader implements IConfigLoader{
    public async getAllConfigBytes(output: Map<string, any>): Promise<void>{
        var bundle = await BundleManager.instance.loadBundle("config");
        if(bundle == null) {
            return;
        }

        return await new Promise<void>((resolve) => {
            bundle.loadDir("", (err,assets)=> {
                if (err) {
                    Log.error(err);
                    resolve();
                    BundleManager.instance.releaseBundle(bundle);
                    return null;
                }
                for (const asset of assets) {
                    const jsonAsset = asset as JsonAsset;
                    if(!!jsonAsset) output.set(asset.name, jsonAsset.json)
                }
                BundleManager.instance.releaseBundle(bundle);
                resolve();
            });
        });

    }
    public async getOneConfigBytes(configName: string): Promise<string>{
        var bundle = await BundleManager.instance.loadBundle("config");
        if(bundle == null) {
            return;
        }

        return await new Promise<string>((resolve) => {
            bundle.load(configName, JsonAsset, (err, jsonAsset)=> {
                if (err) {
                    Log.error(err);
                    resolve(null);
                    BundleManager.instance.releaseBundle(bundle);
                    return null;
                }
                let res = null;
                if(!!jsonAsset) res = jsonAsset.json;
                BundleManager.instance.releaseBundle(bundle);
                resolve(res);
            });
        });
    }
}