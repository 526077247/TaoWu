export class TimeInfo {
    private static _instance: TimeInfo;

    public static get instance(): TimeInfo {
        if (!TimeInfo._instance) {
            TimeInfo._instance = new TimeInfo();
        }
        return TimeInfo._instance;
    }

    private _timeZone: number = 0;
    private readonly _dt1970: Date = new Date(Date.UTC(1970, 0, 1, 0, 0, 0, 0));
    private _dt: Date = new Date(Date.UTC(1970, 0, 1, 0, 0, 0, 0));
    private _serverMinusClientTime: number = 0;
    private _frameTime: number = 0;

    private constructor() {
        this._frameTime = this.clientNow();
    }

    public get timeZone(): number {
        return this._timeZone;
    }

    public set timeZone(value: number) {
        this._timeZone = value;
        // 更新 dt 为 UTC 1970 + 时区偏移
        this._dt = new Date(this._dt1970.getTime() + value * 3600000);
    }

    public get serverMinusClientTime(): number {
        return this._serverMinusClientTime;
    }

    public set serverMinusClientTime(value: number) {
        this._serverMinusClientTime = value;
    }

    public get frameTime(): number {
        return this._frameTime;
    }

    public update(): void {
        this._frameTime = this.clientNow();
    }

    public toDateTime(timeStamp: number): Date {
        // 时间戳单位是毫秒，直接创建 Date 对象
        return new Date(timeStamp);
    }

    public clientNow(): number {
        // 返回当前 UTC 时间的毫秒时间戳
        return Date.now();
    }

    public serverNow(): number {
        return this.clientNow() + this._serverMinusClientTime;
    }

    public clientFrameTime(): number {
        return this._frameTime;
    }

    public serverFrameTime(): number {
        return this._frameTime + this._serverMinusClientTime;
    }

    public transition(d: Date): number {
        // 计算日期 d 相对于时区调整后的 1970 基准的时间差（毫秒）
        return d.getTime() - this._dt.getTime();
    }

    public static getUtcOffsetHours(): number {
        // 创建当前日期对象
        const now = new Date();

        // 获取时区偏移（分钟）
        const offsetMinutes = now.getTimezoneOffset();

        // 转换为小时（注意：偏移方向与.NET相反）
        const offsetHours = -offsetMinutes / 60;

        return offsetHours;
    }
}