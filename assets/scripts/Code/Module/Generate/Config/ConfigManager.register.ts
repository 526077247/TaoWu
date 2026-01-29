import { JsonHelper } from '../../../../Mono/Helper/JsonHelper';
import { SceneConfig, SceneConfigCategory } from './SceneConfig';
import { ServerConfig, ServerConfigCategory } from './ServerConfig';
export function register(configBytes: Map<string, any>, loadOneInThread: Function){
	JsonHelper.registerClass(SceneConfig,'SceneConfig');
	JsonHelper.registerClass(SceneConfigCategory,'SceneConfigCategory');
	loadOneInThread(SceneConfigCategory,'SceneConfigCategory', configBytes);
	JsonHelper.registerClass(ServerConfig,'ServerConfig');
	JsonHelper.registerClass(ServerConfigCategory,'ServerConfigCategory');
	loadOneInThread(ServerConfigCategory,'ServerConfigCategory', configBytes);
}
