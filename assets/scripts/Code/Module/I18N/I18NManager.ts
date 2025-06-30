import { IManager } from "../../../Mono/Core/Manager/IManager"
import { II18N } from "./II18N";

export class I18NManager implements IManager {

    private static _instance: I18NManager;

    public static get instance(): I18NManager {
        return I18NManager._instance;
    }

    public init() {
        I18NManager._instance = this;
    }
    public destroy() {
        I18NManager._instance = null;
    }


    public registerI18NEntity(entity: II18N)
    {
        // OnLanguageChangeEvt += entity.OnLanguageChange;
    }

    public removeI18NEntity(entity: II18N)
    {
        // OnLanguageChangeEvt -= entity.OnLanguageChange;
    }
}