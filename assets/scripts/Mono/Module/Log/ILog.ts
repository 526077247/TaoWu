export interface ILog {
    trace(message: string): void;
    trace(message: string, ...args: any[]): void;

    warning(message: string): void;
    warning(message: string, ...args: any[]): void;

    info(message: string): void;
    info(message: string, ...args: any[]): void;

    debug(message: string): void;
    debug(message: string, ...args: any[]): void;

    error(message: string): void;
    error(message: string, ...args: any[]): void;
}