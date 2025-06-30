import { Define } from "../../Define"
import { Log } from "../../Module/Log/Log" 

const Mask18bit = 0x03FFFF;
const MaxZone = 1024;

class IdStruct {
    public time: number;    // 30bit
    public process: number; // 18bit
    public value: number;  // 16bit

    constructor(time?: number, process?: number, value?: number, id?: bigint) {
        if (id !== undefined) {
            const result = BigInt.asUintN(64, id);
            this.value = Number(result & BigInt(0xFFFF));
            this.process = Number((result >> BigInt(16)) & BigInt(Mask18bit));
            this.time = Number(result >> BigInt(34));
        } else {
            this.time = time!;
            this.process = process!;
            this.value = value!;
        }
    }

    public toLong(): bigint {
        let result = BigInt(this.value);
        result |= BigInt(this.process) << BigInt(16);
        result |= BigInt(this.time) << BigInt(34);
        return BigInt.asIntN(64, result);
    }

    public toString(): string {
        return `process: ${this.process}, time: ${this.time}, value: ${this.value}`;
    }
}

// InstanceIdStruct 结构体
class InstanceIdStruct {
    public time: number;   // 28bit
    public process: number; // 18bit
    public value: number;  // 18bit

    constructor(time?: number, process?: number, value?: number, id?: bigint) {
        if (id !== undefined) {
            const result = BigInt.asUintN(64, id);
            this.value = Number(result & BigInt(Mask18bit));
            this.process = Number((result >> BigInt(18)) & BigInt(Mask18bit));
            this.time = Number(result >> BigInt(36));
        } else {
            this.time = time!;
            this.process = process!;
            this.value = value!;
        }
    }

    public toLong(): bigint {
        let result = BigInt(this.value);
        result |= BigInt(this.process) << BigInt(18);
        result |= BigInt(this.time) << BigInt(36);
        return BigInt.asIntN(64, result);
    }

    public toString(): string {
        return `process: ${this.process}, value: ${this.value} time: ${this.time}`;
    }
}

// UnitIdStruct 结构体
class UnitIdStruct {
    public time: number;        // 30bit
    public zone: number;        // 10bit
    public processMode: number; // 8bit
    public value: number;       // 16bit

    constructor(zone?: number, process?: number, time?: number, value?: number, id?: bigint) {
        if (id !== undefined) {
            const result = BigInt.asUintN(64, id);
            this.value = Number(result & BigInt(0xFFFF));
            this.processMode = Number((result >> BigInt(16)) & BigInt(0xFF));
            this.zone = Number((result >> BigInt(24)) & BigInt(0x03FF));
            this.time = Number(result >> BigInt(34));
        } else {
            this.time = time!;
            this.zone = zone!;
            this.processMode = process! % 256;
            this.value = value!;
        }
    }

    public toLong(): bigint {
        let result = BigInt(this.value);
        result |= BigInt(this.processMode) << BigInt(16);
        result |= BigInt(this.zone) << BigInt(24);
        result |= BigInt(this.time) << BigInt(34);
        return BigInt.asIntN(64, result);
    }

    public toString(): string {
        return `ProcessMode: ${this.processMode}, value: ${this.value} time: ${this.time}`;
    }

    public static GetUnitZone(unitId: bigint): number {
        const v = (unitId >> BigInt(24)) & BigInt(0x03FF);
        return Number(v);
    }
}

// ID 生成器
export class IdGenerater {
    public static readonly instance = new IdGenerater();

    private epoch2020: bigint;
    private epochThisYear: bigint;
    private value: number = 0;
    private lastIdTime: number = 0;
    private instanceIdValue: number = 0;
    private lastInstanceIdTime: number = 0;
    private unitIdValue: number = 0;
    private lastUnitIdTime: number = 0;

    constructor() {
        // 计算2020年起点 (UTC)
        const epoch2020Date = new Date(Date.UTC(2020, 0, 1));
        this.epoch2020 = BigInt(epoch2020Date.getTime());

        // 计算今年起点 (UTC)
        const now = new Date();
        const epochThisYearDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        this.epochThisYear = BigInt(epochThisYearDate.getTime());

        // 初始化时间
        this.lastInstanceIdTime = this.timeSinceThisYear();
        if (this.lastInstanceIdTime <= 0) {
            Log.warning(`lastInstanceIdTime less than 0: ${this.lastInstanceIdTime}`);
            this.lastInstanceIdTime = 1;
        }

        this.lastIdTime = this.timeSince2020();
        if (this.lastIdTime <= 0) {
            Log.warning(`lastIdTime less than 0: ${this.lastIdTime}`);
            this.lastIdTime = 1;
        }

        this.lastUnitIdTime = this.timeSince2020();
        if (this.lastUnitIdTime <= 0) {
            Log.warning(`lastUnitIdTime less than 0: ${this.lastUnitIdTime}`);
            this.lastUnitIdTime = 1;
        }
    }

    // 计算自2020年以来的秒数
    private timeSince2020(): number {
        const currentTime = BigInt(Date.now());
        const elapsedMilliseconds = currentTime - this.epoch2020;
        return Number(elapsedMilliseconds / BigInt(1000));
    }

    // 计算自今年以来的秒数
    private timeSinceThisYear(): number {
        const currentTime = BigInt(Date.now());
        const elapsedMilliseconds = currentTime - this.epochThisYear;
        return Number(elapsedMilliseconds / BigInt(1000));
    }

    // 生成实例ID
    public generateInstanceId(): bigint {
        const time = this.timeSinceThisYear();

        if (time > this.lastInstanceIdTime) {
            this.lastInstanceIdTime = time;
            this.instanceIdValue = 0;
        } else {
            this.instanceIdValue++;

            if (this.instanceIdValue > Mask18bit - 1) {
                this.lastInstanceIdTime++;
                this.instanceIdValue = 0;
                Log.error(`instanceid count per sec overflow: ${time} ${this.lastInstanceIdTime}`);
            }
        }

        const instanceIdStruct = new InstanceIdStruct(
            this.lastInstanceIdTime,
            Define.Process,
            this.instanceIdValue
        );

        return instanceIdStruct.toLong();
    }

    // 生成普通ID
    public generateId(): bigint {
        const time = this.timeSince2020();

        if (time > this.lastIdTime) {
            this.lastIdTime = time;
            this.value = 0;
        } else {
            this.value++;

            if (this.value > 0xFFFF - 1) {
                this.value = 0;
                this.lastIdTime++;
                Log.error(`id count per sec overflow: ${time} ${this.lastIdTime}`);
            }
        }

        const idStruct = new IdStruct(
            this.lastIdTime,
            Define.Process,
            this.value
        );

        return idStruct.toLong();
    }

    // 生成单位ID
    public generateUnitId(zone: number): bigint {
        if (zone > MaxZone) {
            throw new Error(`zone > MaxZone: ${zone}`);
        }

        const time = this.timeSince2020();

        if (time > this.lastUnitIdTime) {
            this.lastUnitIdTime = time;
            this.unitIdValue = 0;
        } else {
            this.unitIdValue++;

            if (this.unitIdValue > 0xFFFF - 1) {
                this.unitIdValue = 0;
                this.lastUnitIdTime++;
                Log.error(`unitid count per sec overflow: ${time} ${this.lastUnitIdTime}`);
            }
        }

        const unitIdStruct = new UnitIdStruct(
            zone,
            Define.Process,
            this.lastUnitIdTime,
            this.unitIdValue
        );

        return unitIdStruct.toLong();
    }
}