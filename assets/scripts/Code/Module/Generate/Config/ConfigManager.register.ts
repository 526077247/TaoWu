import { JsonHelper } from '../../../../Mono/Helper/JsonHelper';
import { ConfigManager } from '../../Config/ConfigManager';
import { SceneConfig, SceneConfigCategory } from './SceneConfig';
import { ServerConfig, ServerConfigCategory } from './ServerConfig';
export function register(configBytes: Map<string, string>){
	JsonHelper.registerClass(SceneConfig,'SceneConfig');
	JsonHelper.registerClass(SceneConfigCategory,'SceneConfigCategory');
	ConfigManager.instance.loadOneInThread(SceneConfigCategory,'SceneConfigCategory', configBytes);
	JsonHelper.registerClass(ServerConfig,'ServerConfig');
	JsonHelper.registerClass(ServerConfigCategory,'ServerConfigCategory');
	ConfigManager.instance.loadOneInThread(ServerConfigCategory,'ServerConfigCategory', configBytes);
}
