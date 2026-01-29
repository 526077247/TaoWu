import { IOnCreate } from "../../../Module/UI/IOnCreate";
import { UIBaseContainer } from "../../../Module/UI/UIBaseContainer";
import { UIText } from "../../../Module/UIComponent/UIText";

export class DateItem extends UIBaseContainer implements IOnCreate
{

    public getConstructor()
    {
        return DateItem;
    }
    public text: UIText;

    public onCreate()
    {
        this.text = this.addComponent<UIText>(UIText,"Text");
    }

    public setData(index: number)
    {
        let date = new Date();
        date = new Date(date.getTime() + index * 24 * 60 * 60 * 1000);
        var month = date.getMonth() + 1; // 月份从0开始，需要加1
        var day = date.getDate();
        var formattedDate = date.getFullYear() + '-' + (month > 9 ? month : '0' + month) + '-' + (day > 9 ? day : '0' + day);
        this.text.setText(formattedDate);
    }
}
