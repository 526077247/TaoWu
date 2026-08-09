import { UpdateRes } from "../UpdateRes";
import { UpdateTask } from "../UpdateTask";

export abstract class UpdateProcess {
    public abstract process(task: UpdateTask): Promise<UpdateRes>;
}
