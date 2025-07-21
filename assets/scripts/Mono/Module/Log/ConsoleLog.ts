import {ILog} from "./ILog";

import * as string from "../../Helper/StringHelper"
export class ConsoleLog implements ILog {
    trace(message: string): void;
    trace(message: string, ...args: any[]): void {
        console.log(string.format(message, args));
    }

    warning(message: string): void;
    warning(message: string, ...args: any[]): void {
        console.warn(string.format(message, args));
    }

    info(message: string): void;
    info(message: string, ...args: any[]): void {
        console.log(string.format(message, args));
    }

    debug(message: string): void;
    debug(message: string, ...args: any[]): void {
        console.debug(string.format(message, args));
    }

    error(message: string): void;
    error(message: string, ...args: any[]): void {
        console.error(string.format(message, args));
    }
    
}