import { IOnCreate } from "../../../Module/UI/IOnCreate";
import { UIBaseContainer } from "../../../Module/UI/UIBaseContainer";
import { UIText } from "../../../Module/UIComponent/UIText";

export class CellItem extends UIBaseContainer implements IOnCreate{

    protected getConstructor()
    {
        return CellItem;
    }

    private text: UIText
    public onCreate(){
        this.text = this.addComponent(UIText,"Text");
    }

    public setData(time: Date)
    {
        this.text.setText(time.getDate().toString());
    }
}