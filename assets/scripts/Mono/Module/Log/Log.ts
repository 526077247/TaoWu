import { Define } from "../../Define"
import { ILog } from "./ILog"
import * as string from "../../Helper/StringHelper"

const TraceLevel = 1;
const DebugLevel = 2;
const InfoLevel = 3;
const WarningLevel = 4;
export class Log {
    private static _logger: ILog | null = null;

    // 设置日志实现
    public static set logger(value: ILog) {
        Log._logger = value;
    }

    // 获取当前日志级别是否满足
    private static checkLogLevel(level: number): boolean {
        return Define.LogLevel <= level;
    }

    // 获取堆栈跟踪信息
    private static getStackTrace(): string {
        try {
            // 创建 Error 对象获取堆栈信息
            const err = new Error();
            return err.stack?.split('\n').slice(3).join('\n') || '';
        } catch (e) {
            return '';
        }
    }

    public static trace(message: string): void;
    public static trace(message: string, ...args: any[]): void;
    public static trace(message: string, ...args: any[]): void {
        if (!Log.checkLogLevel(TraceLevel) || !Log._logger) return;

        if (args.length > 0) {
            message = string.format(message, ...args);
        }

        const stack = Log.getStackTrace();
        Log._logger.trace(`${message}\n${stack}`);
    }

    public static debug(message: string): void;
    public static debug(message: string, ...args: any[]): void;
    public static debug(message: string, ...args: any[]): void {
        if (!Log.checkLogLevel(DebugLevel) || !Log._logger) return;

        if (args.length > 0) {
            message = string.format(message, ...args);
        }

        Log._logger.debug(message);
    }

    public static info(message: string): void;
    public static info(message: any): void;
    public static info(message: string, ...args: any[]): void;
    public static info(message: any, ...args: any[]): void {
        if (!Log.checkLogLevel(InfoLevel) || !Log._logger) return;

        if (typeof message !== 'string') {
            message = String(message);
        }

        if (args.length > 0) {
            message = string.format(message, ...args);
        }

        Log._logger.info(message);
    }

    public static traceInfo(message: string): void {
        if (!Log.checkLogLevel(InfoLevel) || !Log._logger) return;

        const stack = Log.getStackTrace();
        Log._logger.trace(`${message}\n${stack}`);
    }

    public static warning(message: string): void;
    public static warning(message: string, ...args: any[]): void;
    public static warning(message: string, ...args: any[]): void {
        if (!Log.checkLogLevel(WarningLevel) || !Log._logger) return;

        if (args.length > 0) {
            message = string.format(message, ...args);
        }

        Log._logger.warning(message);
    }

    public static error(message: string): void;
    public static error(error: Error): void;
    public static error(message: string, ...args: any[]): void;
    public static error(input: string | Error, ...args: any[]): void {
        if (!Log._logger) return;

        if (input instanceof Error) {
            const error = input as Error;
            // 检查是否有自定义堆栈信息
            if (error.stack) {
                Log._logger.error(`${error.stack}\n${error}`);
            } else {
                Log._logger.error(error.toString());
            }
        } else {
            let message = input as string;

            if (args.length > 0) {
                message = string.format(message, ...args);
            }

            const stack = Log.getStackTrace();
            Log._logger.error(`${message}\n${stack}`);
        }
    }
}