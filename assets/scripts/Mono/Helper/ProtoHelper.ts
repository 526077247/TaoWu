export type ProtoScalarType =
    | "int32" | "uint32" | "int64" | "uint64"
    | "sint32" | "sint64"
    | "fixed32" | "fixed64" | "sfixed32" | "sfixed64"
    | "float" | "double"
    | "bool" | "enum"
    | "string" | "bytes";

export type ProtoFieldType = ProtoScalarType | (new () => any) | ProtoFieldType[];

interface FieldMeta {
    id: number;
    prop: string;
    repeated: boolean;
    elem: ProtoFieldType;
}

const VARINT_TYPES = new Set<string>(["int32", "uint32", "int64", "uint64", "sint32", "sint64", "bool", "enum"]);
const FIXED64_TYPES = new Set<string>(["fixed64", "sfixed64", "double"]);
const FIXED32_TYPES = new Set<string>(["fixed32", "sfixed32", "float"]);
const NUMERIC_TYPES = new Set<string>(["int32", "uint32", "int64", "uint64", "sint32", "sint64", "fixed32", "fixed64", "sfixed32", "sfixed64", "float", "double", "enum"]);
const BIGINT_DEFAULT_TYPES = new Set<string>(["int64", "uint64", "fixed64", "sfixed64"]);

function wireTypeOf(type: ProtoFieldType): number {
    if (typeof type !== "string") return 2;
    if (VARINT_TYPES.has(type)) return 0;
    if (FIXED64_TYPES.has(type)) return 1;
    if (FIXED32_TYPES.has(type)) return 5;
    return 2;
}

function zigzagDecode(value: bigint): bigint {
    return (value >> 1n) ^ -(value & 1n);
}

function utf8Decode(bytes: Uint8Array): string {
    let out = "";
    let i = 0;
    const len = bytes.length;
    while (i < len) {
        const c = bytes[i++];
        if (c < 0x80) {
            out += String.fromCharCode(c);
            continue;
        }
        let code = 0;
        let extra = 0;
        if ((c & 0xe0) === 0xc0) {
            code = c & 0x1f;
            extra = 1;
        } else if ((c & 0xf0) === 0xe0) {
            code = c & 0x0f;
            extra = 2;
        } else if ((c & 0xf8) === 0xf0) {
            code = c & 0x07;
            extra = 3;
        } else {
            out += "�";
            continue;
        }
        if (i + extra > len) {
            out += "�";
            break;
        }
        let valid = true;
        for (let k = 0; k < extra; k++) {
            const cc = bytes[i++];
            if ((cc & 0xc0) !== 0x80) {
                valid = false;
                break;
            }
            code = (code << 6) | (cc & 0x3f);
        }
        if (!valid) {
            out += "�";
            continue;
        }
        if (code > 0xffff) {
            code -= 0x10000;
            out += String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
        } else {
            out += String.fromCharCode(code);
        }
    }
    return out;
}

/**
 * protobuf 二进制 wire format 底层读取器
 */
export class MiniProtoReader {
    public pos: number = 0;
    public readonly end: number;
    private readonly bytes: Uint8Array;
    private readonly view: DataView;

    constructor(data: Uint8Array) {
        this.bytes = data;
        this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        this.end = data.length;
    }

    /**
     * 读取 base128 变长整数
     */
    public readVarint(): bigint {
        let result = 0n;
        let shift = 0n;
        for (let i = 0; i < 10; i++) {
            if (this.pos >= this.end) {
                throw new Error(`MiniProtoReader: varint 读取越界 pos=${this.pos} end=${this.end}`);
            }
            const b = this.bytes[this.pos++];
            result |= BigInt(b & 0x7f) << shift;
            if ((b & 0x80) === 0) {
                return result;
            }
            shift += 7n;
        }
        throw new Error(`MiniProtoReader: varint 超过 10 字节 pos=${this.pos}`);
    }

    /**
     * 读取 length-delimited 长度并做边界校验
     */
    public readLength(): number {
        const v = this.readVarint();
        const len = Number(v);
        if (!Number.isSafeInteger(len) || len < 0 || this.pos + len > this.end) {
            throw new Error(`MiniProtoReader: 非法长度 ${v}，剩余 ${this.end - this.pos} 字节`);
        }
        return len;
    }

    /**
     * 读取一段 length-delimited 数据，返回独立的子读取器
     */
    public readSub(): MiniProtoReader {
        const len = this.readLength();
        const sub = new MiniProtoReader(this.bytes.subarray(this.pos, this.pos + len));
        this.pos += len;
        return sub;
    }

    public readUint32(): number {
        this.need(4);
        const v = this.view.getUint32(this.pos, true);
        this.pos += 4;
        return v;
    }

    public readInt32(): number {
        this.need(4);
        const v = this.view.getInt32(this.pos, true);
        this.pos += 4;
        return v;
    }

    public readUint64(): bigint {
        this.need(8);
        const v = this.view.getBigUint64(this.pos, true);
        this.pos += 8;
        return v;
    }

    public readInt64(): bigint {
        this.need(8);
        const v = this.view.getBigInt64(this.pos, true);
        this.pos += 8;
        return v;
    }

    public readFloat(): number {
        this.need(4);
        const v = this.view.getFloat32(this.pos, true);
        this.pos += 4;
        return v;
    }

    public readDouble(): number {
        this.need(8);
        const v = this.view.getFloat64(this.pos, true);
        this.pos += 8;
        return v;
    }

    /**
     * 读取 length-delimited 原始字节（零拷贝子视图）
     */
    public readLenBytes(): Uint8Array {
        const len = this.readLength();
        const v = this.bytes.subarray(this.pos, this.pos + len);
        this.pos += len;
        return v;
    }

    /**
     * 读取 length-delimited UTF-8 字符串
     */
    public readLenString(): string {
        const len = this.readLength();
        const v = utf8Decode(this.bytes.subarray(this.pos, this.pos + len));
        this.pos += len;
        return v;
    }

    /**
     * 按 wire type 跳过一个字段
     */
    public skipField(wireType: number, fieldId: number = 0): void {
        switch (wireType) {
            case 0:
                this.readVarint();
                break;
            case 1:
                this.advance(8);
                break;
            case 2: {
                const len = this.readLength();
                this.pos += len;
                break;
            }
            case 3:
                this.skipGroup(fieldId);
                break;
            case 4:
                throw new Error(`MiniProtoReader: end-group 出现在消息体中 fieldId=${fieldId}`);
            case 5:
                this.advance(4);
                break;
            default:
                throw new Error(`MiniProtoReader: 未知 wire type ${wireType}`);
        }
    }

    private skipGroup(fieldId: number): void {
        while (this.pos < this.end) {
            const tag = this.readVarint();
            const id = Number(tag >> 3n);
            const wire = Number(tag & 7n);
            if (wire === 4) {
                if (id !== fieldId) {
                    throw new Error(`MiniProtoReader: group 结束 id=${id} 与开始 id=${fieldId} 不匹配`);
                }
                return;
            }
            this.skipField(wire, id);
        }
        throw new Error(`MiniProtoReader: group fieldId=${fieldId} 未闭合`);
    }

    private need(n: number): void {
        if (this.pos + n > this.end) {
            throw new Error(`MiniProtoReader: 读取 ${n} 字节越界 pos=${this.pos} end=${this.end}`);
        }
    }

    private advance(n: number): void {
        this.need(n);
        this.pos += n;
    }
}

function ensureArray(instance: any, prop: string): any[] {
    let arr = instance[prop];
    if (arr == null) {
        arr = [];
        instance[prop] = arr;
    }
    return arr;
}

/**
 * protobuf 解码辅助类，接口风格对齐 JsonHelper
 * 编码格式与 protobuf-net（标准 protobuf 二进制）一致
 */
export class ProtoHelper {
    private static typeRegistry = new Map<string, new (...args: any[]) => any>();
    private static fieldRegistry = new Map<Function, Map<number, FieldMeta>>();

    /**
     * 注册可解码的类
     * @param type 要注册的类
     * @param className 类名，缺省取 type.name
     */
    static registerClass<T>(type: new (...args: any[]) => T, className?: string): void {
        if (!className) {
            className = type.name;
        }
        if (this.typeRegistry.has(className)) {
            return;
        }
        this.typeRegistry.set(className, type);
    }

    /**
     * 注册字段 id 与解码类型（由 @ProtoMember 调用）
     * @param target 字段所在类的原型
     * @param propertyKey 属性名
     * @param fieldId protobuf 字段 id
     * @param type 解码类型；数组表示 repeated，元素类型为数组唯一元素
     */
    static registerField(target: any, propertyKey: string | symbol, fieldId: number, type: ProtoFieldType): void {
        if (target == null || typeof target !== "object") {
            console.warn(`ProtoHelper: @ProtoMember 只能用于属性 ${String(propertyKey)}`);
            return;
        }
        if (!Number.isInteger(fieldId) || fieldId <= 0 || fieldId > 0x1fffffff) {
            console.warn(`ProtoHelper: 字段 ${String(propertyKey)} 的 id ${fieldId} 非法（须为 1~536870911）`);
            return;
        }
        let elem = type;
        let repeated = false;
        if (Array.isArray(type)) {
            repeated = true;
            if (type.length === 0) {
                console.warn(`ProtoHelper: 字段 ${String(propertyKey)} 的类型数组为空`);
                return;
            }
            if (type.length > 1) {
                console.warn(`ProtoHelper: 字段 ${String(propertyKey)} 的 repeated 类型只取第一个元素`);
            }
            if (Array.isArray(type[0])) {
                console.warn(`ProtoHelper: 字段 ${String(propertyKey)} 不支持二维类型数组`);
                return;
            }
            elem = type[0];
        }
        const ctor = target.constructor;
        let map = this.fieldRegistry.get(ctor);
        if (map == null) {
            map = new Map();
            this.fieldRegistry.set(ctor, map);
        }
        if (map.has(fieldId)) {
            console.warn(`ProtoHelper: 类 ${ctor.name} 的字段 id ${fieldId} 重复注册，后者覆盖前者`);
        }
        map.set(fieldId, { id: fieldId, prop: String(propertyKey), repeated: repeated, elem: elem });
    }

    /**
     * 解码 protobuf 二进制数据为注册类实例
     * 数值类型字段（int/uint/sint/fixed/float/double/enum）解码后无值时缺省为 0，64 位类型为 0n
     * @param type 根消息类（需通过 @ProtoType、@ProtoMember 注册）
     * @param bytes 二进制数据
     * @returns 解码后的实例；bytes 为 null 时返回 null
     */
    public static fromBytes<T>(type: new (...args: any[]) => T, bytes: Uint8Array | ArrayBuffer): T {
        if (bytes == null) return null;
        const data = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
        const instance = new type();
        const fields = this.collectFields(type);
        if (fields == null) {
            console.warn(`ProtoHelper: 类 ${type.name} 未通过 @ProtoMember 注册字段，${data.length} 字节已忽略`);
            return instance;
        }
        this.decodeMessage(new MiniProtoReader(data), fields, instance);
        return instance;
    }

    private static collectFields(type: Function): Map<number, FieldMeta> | null {
        let merged: Map<number, FieldMeta> | null = null;
        let current: any = type;
        while (current != null && current !== Object.prototype) {
            const map = this.fieldRegistry.get(current);
            if (map != null) {
                if (merged == null) {
                    merged = new Map();
                }
                map.forEach((meta, id) => {
                    if (!merged!.has(id)) {
                        merged!.set(id, meta);
                    }
                });
            }
            current = Object.getPrototypeOf(current);
        }
        return merged;
    }

    private static decodeMessage(reader: MiniProtoReader, fields: Map<number, FieldMeta>, instance: any): void {
        while (reader.pos < reader.end) {
            const tag = reader.readVarint();
            const fieldId = Number(tag >> 3n);
            const wireType = Number(tag & 7n);
            const meta = fields.get(fieldId);
            if (meta == null) {
                reader.skipField(wireType, fieldId);
                continue;
            }
            if (!this.decodeField(reader, meta, wireType, instance)) {
                reader.skipField(wireType, fieldId);
            }
        }
        fields.forEach(meta => {
            if (meta.repeated || typeof meta.elem !== "string" || !NUMERIC_TYPES.has(meta.elem)) return;
            if (instance[meta.prop] == null) {
                instance[meta.prop] = BIGINT_DEFAULT_TYPES.has(meta.elem) ? 0n : 0;
            }
        });
    }

    private static decodeField(reader: MiniProtoReader, meta: FieldMeta, wireType: number, instance: any): boolean {
        const expected = wireTypeOf(meta.elem);
        if (meta.repeated && wireType === 2 && expected !== 2) {
            const sub = reader.readSub();
            const arr = ensureArray(instance, meta.prop);
            while (sub.pos < sub.end) {
                arr.push(this.decodeValue(sub, meta.elem));
            }
            return true;
        }
        if (wireType !== expected) {
            console.warn(`ProtoHelper: 字段 ${meta.prop}(id=${meta.id}) 期望 wire type ${expected}，实际 ${wireType}，已跳过`);
            return false;
        }
        const value = this.decodeValue(reader, meta.elem);
        if (meta.repeated) {
            ensureArray(instance, meta.prop).push(value);
        } else {
            instance[meta.prop] = value;
        }
        return true;
    }

    private static decodeValue(reader: MiniProtoReader, type: ProtoFieldType): any {
        if (typeof type !== "string") {
            const sub = reader.readSub();
            const fields = this.collectFields(type as Function);
            const obj: any = {};
            if (fields == null) {
                console.warn(`ProtoHelper: 嵌套类 ${(type as new () => any).name} 未注册 @ProtoMember，内容已丢弃`);
                sub.pos = sub.end;
            } else {
                this.decodeMessage(sub, fields, obj);
            }
            return obj;
        }
        switch (type) {
            case "int32":
                return Number(BigInt.asIntN(32, reader.readVarint()));
            case "uint32":
                return Number(BigInt.asUintN(32, reader.readVarint()));
            case "int64":
                return BigInt.asIntN(64, reader.readVarint());
            case "uint64":
                return BigInt.asUintN(64, reader.readVarint());
            case "sint32":
                return Number(BigInt.asIntN(32, zigzagDecode(reader.readVarint())));
            case "sint64":
                return BigInt.asIntN(64, zigzagDecode(reader.readVarint()));
            case "bool":
                return reader.readVarint() !== 0n;
            case "enum":
                return Number(BigInt.asIntN(32, reader.readVarint()));
            case "fixed32":
                return reader.readUint32();
            case "sfixed32":
                return reader.readInt32();
            case "fixed64":
                return reader.readUint64();
            case "sfixed64":
                return reader.readInt64();
            case "float":
                return reader.readFloat();
            case "double":
                return reader.readDouble();
            case "string":
                return reader.readLenString();
            case "bytes":
                return reader.readLenBytes();
            default:
                throw new Error(`ProtoHelper: 未知字段类型 ${type}`);
        }
    }
}

/**
 * 类装饰器：注册可解码的类，用法对齐 @JsonType
 */
export function ProtoType(name?: string) {
    return function <T extends new (...args: any[]) => any>(target: T): T {
        ProtoHelper.registerClass(target, name);
        return target;
    };
}

/**
 * 字段装饰器：注册 protobuf 字段 id 与解码类型
 * @param fieldId protobuf 字段 id（对应 [ProtoMember(n)]）
 * @param type 解码类型；数组表示 repeated，如 ["int32"]、[EnemyInfo]
 */
export function ProtoMember(fieldId: number, type: ProtoFieldType) {
    return function (target: any, propertyKey: string | symbol): void {
        ProtoHelper.registerField(target, propertyKey, fieldId, type);
    };
}
