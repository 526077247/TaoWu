import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

 
@ccclass('EventSystem')
export class EventSystem extends Component {

    public listener: ((event: Event, customEventData: string) => void)[] = [];
    
    callback (event: Event, customEventData: string) {
        if(!!this.listener)
        {
            for (const item of this.listener) {
                item(event,customEventData);
            }
        }
    }
}


