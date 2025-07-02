import { IOnCreate } from "../../../Module/UI/IOnCreate";
import { IOnEnable } from "../../../Module/UI/IOnEnable";
import { UIBaseView } from "../../../Module/UI/UIBaseView";
import { UIEmptyView } from "../../../Module/UIComponent/UIEmptyView";
import { UIImage } from "../../../Module/UIComponent/UIImage";
import { UIText } from "../../../Module/UIComponent/UIText";
import { MenuPara, UIMenu } from "../UICommon/UIMenu";


export class UIMainView extends UIBaseView implements IOnCreate, IOnEnable{

    public static readonly PrefabPath:string = "ui/uimain/prefabs/uiMainView";

    protected getConstructor()
    {
        return UIMainView;
    }

    public image: UIImage;
	public text: UIText;
    public menu: UIMenu

    public LoopGridView: UIEmptyView;
    public LoopListView2: UIEmptyView;
    public Welcome: UIEmptyView;

    public curId: number;

    private config: Map<number,string> =new Map<number,string>([
        [1, "欢迎"],
        [2, "网格列表"],
        [3, "无限循环滚动列表"],
    ]);

    public onCreate()
    {
        this.image = this.addComponent<UIImage>(UIImage,"Image");
		this.text = this.addComponent<UIText>(UIText,"Text");
		this.menu = this.addComponent<UIMenu>(UIMenu,"UIMenu");
        this.LoopGridView = this.addComponent<UIEmptyView>(UIEmptyView,"ScrollList/LoopGrid");
        this.LoopListView2 = this.addComponent<UIEmptyView>(UIEmptyView,"ScrollList/LoopList");
        this.Welcome = this.addComponent<UIEmptyView>(UIEmptyView,"ScrollList/Welcome");

        //模拟读配置
        const paras: MenuPara[] = [];
        for (const [id, name] of this.config) {
            const menuPara = new MenuPara();
            menuPara.id = id;
            menuPara.name = name;
            paras[paras.length] = menuPara;
        }
        
        this.menu.setData(paras, this.onMenuIndexChanged.bind(this));
    }


    public onEnable()
    {
        this.menu.setActiveIndex(0,true);
    }

    public onMenuIndexChanged(para: MenuPara){
        this.curId = para.id;
		this.refreshItemSpaceShow();
    }

    public refreshItemSpaceShow()
    {
        var conf = this.config[this.curId];
        this.text.setText(conf);
        switch (this.curId)
        {
            case 1:
                this.Welcome.setActive(true);
                this.LoopGridView.setActive(false);
                this.LoopListView2.setActive(false);
                break;
            case 2:
                this.Welcome.setActive(false);
                this.LoopGridView.setActive(true);
                this.LoopListView2.setActive(false);
                // DateTime dtNow = DateTime.Now;     
                // FirstDay = DateTime.Now.AddDays(1 - DateTime.Now.Day).Date;
                // TotalDay = DateTime.DaysInMonth(dtNow.Year ,dtNow.Month)+(int) FirstDay.DayOfWeek;
                // this.LoopGridView.SetListItemCount(TotalDay);
                // this.LoopGridView.RefreshAllShownItem();
                break;
            case 3:
                this.Welcome.setActive(false);
                this.LoopGridView.setActive(false);
                this.LoopListView2.setActive(true);
                // this.LoopListView2.SetListItemCount(-1);
                // this.LoopListView2.RefreshAllShownItem();
                break;
            default:
                this.Welcome.setActive(false);
                this.LoopGridView.setActive(false);
                this.LoopListView2.setActive(false);
                break;
        }
    }
}