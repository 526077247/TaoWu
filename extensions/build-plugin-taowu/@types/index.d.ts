export * from '@cocos/creator-types/editor/packages/builder/@types/public';

import { IPanelThis, IBuildTaskOption } from '@cocos/creator-types/editor/packages/builder/@types/public';
import { Link, Checkbox } from '@editor/creator-ui-kit/dist/renderer';

const PACKAGE_NAME = 'build-plugin-taowu';
export interface ITaskOptions extends IBuildTaskOption {
    packages: {
        [PACKAGE_NAME]: IOptions;
    };
}

export interface ICustomPanelThis extends IPanelThis {
    options: ITaskOption;
    errorMap: any;
    pkgName: string;
    $: {
        root: HTMLElement;
        hideLink: Editor.UI.HTMLCustomElement<Checkbox>;
        link: Editor.UI.HTMLCustomElement<Link>;
    },
}

export interface IOptions {
    remoteAddress: string;
    enterCocos: string;
    selectTest: string;
    objectTest: {
        number: number;
        string: string;
        boolean: boolean
    },
    arrayTest: [number, string, boolean];
    webTestOption: boolean;
}

export interface ITaskOptions extends IBuildTaskOption {
    packages: {
        ['cocos-build-template']: IOptions;
    };
}