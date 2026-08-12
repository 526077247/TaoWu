export * from '@cocos/creator-types/editor/packages/builder/@types/public';

import { IPanelThis, IBuildTaskOption } from '@cocos/creator-types/editor/packages/builder/@types/public';

const PACKAGE_NAME = 'taowu-editor';
export interface ITaskOptions extends IBuildTaskOption {
    packages: {
        [PACKAGE_NAME]: IOptions;
    };
}

export interface ICustomPanelThis extends IPanelThis {
    options: ITaskOptions;
    errorMap: any;
    pkgName: string;
    $: Record<string, any>;
}

export interface IOptions {
    enableObfuscate: boolean;
    generateManifest: boolean;
    version: string;
    channel: string;
}
