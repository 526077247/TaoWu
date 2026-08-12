import { settings, sys } from "cc";
import { UpdateRes } from "../UpdateRes";
import { UpdateTask } from "../UpdateTask";
import { UpdateProcess } from "./UpdateProcess";
import { Define } from "../../../../Mono/Define";
import { ServerConfigManager } from "../ServerConfigManager";

export class SetUpdateListProcess extends UpdateProcess {
    public async process(task: UpdateTask): Promise<UpdateRes> {
        const channel = settings.querySettings<string>('assets', '_channel') || "default";
        const setVal = sys.localStorage.getItem('DEBUG_IsSH') || 0;
        if (setVal == 0)
        {
            Define.isSH = ServerConfigManager.instance.findMaxUpdateResVerThisAppVer(channel, task.appVer) != null;
        }
        else
        {
            Define.isSH = setVal == 1;
        }
        return UpdateRes.Over;
    }
}