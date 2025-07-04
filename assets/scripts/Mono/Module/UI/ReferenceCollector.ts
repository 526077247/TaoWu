import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('KeyValuePiar')
class KeyValuePiar{
    @property({ tooltip: "key" })
    key: string = '';
    @property({ type: Node, tooltip: "value"  })
    value: Node | null = null;
}

@ccclass('ReferenceCollector')
export class ReferenceCollector extends Component {

    @property({type: [KeyValuePiar]})
    public data:KeyValuePiar[] = [];

    private dict: Map<string, Node>;
    onLoad(){
        this.dict = new Map<string, Node>();
        for (let index = 0; index < this.data.length; index++) {
            const element = this.data[index];
            this.dict.set(element.key,element.value);
        }
    }

    public add(key: string, value: Node){
        this.dict.set(key,value);
        for (let index = 0; index < this.data.length; index++) {
            const element = this.data[index];
            if(element.key == key){
                element.value = value;
                break;
            }
        }
    }


    //使用泛型返回对应key的Node
	public get<T extends Component | Node>(type: new (...args: any[]) => T, key: string) : T 
	{
		let dictGo: Node = this.dict.get(key)
		if (!dictGo)
		{
			return null;
		}
        if(dictGo instanceof type){
            return dictGo;
        }
		let res = dictGo.getComponent<any>(type);
		return res as T;
	}
}


