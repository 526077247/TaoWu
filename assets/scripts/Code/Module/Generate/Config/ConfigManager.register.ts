import { JsonHelper } from '../../../../Mono/Helper/JsonHelper';
import { ConfigManager } from '../../Config/ConfigManager';
import { SceneConfig, SceneConfigCategory } from './SceneConfig';
import { ServerConfig, ServerConfigCategory } from './ServerConfig';
export function register(configBytes: Map<string, string>){
	JsonHelper.registerClass(SceneConfig);
	JsonHelper.registerClass(SceneConfigCategory);
	ConfigManager.instance.loadOneInThread(SceneConfigCategory, configBytes);
	JsonHelper.registerClass(ServerConfig);
	JsonHelper.registerClass(ServerConfigCategory);
	ConfigManager.instance.loadOneInThread(ServerConfigCategory, configBytes);
}
