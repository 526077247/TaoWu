import {ILog} from "./ILog";
import * as string from "../../Helper/StringHelper"
import { debug, error, log, warn } from "cc";

export class CCCLog implements ILog {
    trace(message: string): void;
    trace(message: string, ...args: any[]): void {
        log(string.format(message, args));
    }

    warning(message: string): void;
    warning(message: string, ...args: any[]): void {
        warn(string.format(message, args));
    }

    info(message: string): void;
    info(message: string, ...args: any[]): void {
        log(string.format(message, args));
    }

    debug(message: string): void;
    debug(message: string, ...args: any[]): void {
        debug(string.format(message, args));
    }

    error(message: string): void;
    error(message: string, ...args: any[]): void {
        error(string.format(message, args));
    }
    
}