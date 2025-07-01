export class JsonHelper {
    // 类型注册表，存储类名与构造函数的映射
    private static typeRegistry = new Map<string, new () => any>();
    // 忽略属性元数据存储
    private static ignoreProperties = new Map<string, Set<string>>();
    /**
     * 注册可序列化的类
     * @param type 要注册的类
     */
    static registerClass<T>(type: new (...args:any[]) => T, ignoreProps?: string[]): void {
        const className = type.name;
        if (this.typeRegistry.has(className)) {
            return;
        }
        this.typeRegistry.set(className, type);
        if(!!ignoreProps) this.ignoreProperties.set(className, new Set(ignoreProps))
    }

    /**
     * 检测属性是否为忽略
     * @param className 类名
     * @param propName 属性名
     */
    static isIgnoreProperty(className: string, propName: string): boolean {
        const ignoreSet = this.ignoreProperties.get(className);
        return ignoreSet ? ignoreSet.has(propName) : false;
    }
    /**
     * 序列化对象为 JSON 字符串
     * @param obj 要序列化的对象
     * @param pretty 是否格式化输出
     * @returns JSON 字符串
     */
    public static toJson<T>(type: new (...args:any[]) => T, obj: any, pretty: boolean = false): string {
        if(!!type) this.registerClass(type);
        const serialized = this.serialize(obj);
        
        return !!pretty 
            ? JSON.stringify(serialized, null, 2)
            : JSON.stringify(serialized);
    }
    
    /**
     * 内部序列化方法
     * @param obj 要序列化的对象
     * @param path 当前路径（用于调试）
     * @returns 序列化后的对象
     */
    public static serialize(obj: any, path: string = ''): any {
        // 处理原始类型
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        // 处理数组
        if (Array.isArray(obj)) {
            return obj.map((item, i) => 
                this.serialize(item, `${path}[${i}]`)
            );
        }
        
        // 处理 Date 对象
        if (obj instanceof Date) {
            return { _type: 'Date', _value: obj.toISOString() };
        }
        
        // 处理 Map 对象
        if (obj instanceof Map) {
            return {
                _type: 'Map',
                _value: Array.from(obj.entries()).map(([key, value]) => [
                    this.serialize(key, `${path}.key`),
                    this.serialize(value, `${path}.value`)
                ])
            };
        }
        
        // 处理 Set 对象
        if (obj instanceof Set) {
            return {
                _type: 'Set',
                _value: Array.from(obj.values()).map((value, i) => 
                    this.serialize(value, `${path}[${i}]`)
                )
            };
        }
        
        // 处理自定义类的实例
        const className = obj.constructor.name;
        if (JsonHelper.typeRegistry.has(className)) {
            const hasIgnore = JsonHelper.ignoreProperties.has(className);
            // 获取可序列化的属性
            const serializedObj: Record<string, any> = {
                _type: className
            };
            
            // 序列化所有自有属性
            for (const key in obj) {
                if (obj.hasOwnProperty(key) && (!hasIgnore||!JsonHelper.isIgnoreProperty(className,key))) {
                    serializedObj[key] = this.serialize(obj[key], `${path}.${key}`);
                }
            }
            
            // 处理自定义序列化方法
            if (typeof obj.toJSON === 'function') {
                const custom = obj.toJSON();
                return {
                    ...this.serialize(custom, `${path}.toJSON()`),
                    _type: className
                };
            }
            
            return serializedObj;
        }
        
        // 处理普通对象
        const result: Record<string, any> = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                result[key] = this.serialize(obj[key], `${path}.${key}`);
            }
        }
        return result;
    }
    
    /**
     * 反序列化 JSON 字符串
     * @param json JSON 字符串
     * @returns 反序列化后的对象
     */
    public static fromJson<T>(type: new (...args:any[]) => T, json: string) {
        if(!!type) this.registerClass(type);
        const parsed = JSON.parse(json);
        return this.deserialize(parsed);
    }

    /**
     * 内部反序列化方法
     * @param data 要反序列化的数据
     * @param path 当前路径（用于调试）
     * @returns 反序列化后的对象
     */
    public static deserialize(data: any, path: string = ''): any {
        // 处理原始类型
        if (data === null || typeof data !== 'object') {
            return data;
        }
        
        // 处理数组
        if (Array.isArray(data)) {
            return data.map((item, i) => 
                this.deserialize(item, `${path}[${i}]`)
            );
        }
        
        // 处理特殊类型
        if ('_type' in data) {
            const type = data._type;
            
            // 处理 Date
            if (type === 'Date') {
                return new Date(data._value);
            }
            
            // 处理 Map
            if (type === 'Map') {
                return new Map(
                    (data._value as [any, any][]).map(([key, value]) => [
                        this.deserialize(key, `${path}.key`),
                        this.deserialize(value, `${path}.value`)
                    ])
                );
            }
            
            // 处理 Set
            if (type === 'Set') {
                return new Set(
                    (data._value as any[]).map((value, i) => 
                        this.deserialize(value, `${path}[${i}]`)
                    )
                );
            }
            
            // 处理注册的自定义类
            if (JsonHelper.typeRegistry.has(type)) {
                const hasIgnore = JsonHelper.ignoreProperties.has(type);
                const Clazz = JsonHelper.typeRegistry.get(type)!;
                const instance = new Clazz();
                
                
                // 反序列化属性
                for (const key in data) {
                    if (key !== '_type' && data.hasOwnProperty(key) && (!hasIgnore||!JsonHelper.isIgnoreProperty(type,key))) {
                        (instance as any)[key] = this.deserialize(data[key], `${path}.${key}`);
                    }
                }
                
                // 处理自定义反序列化方法
                if (typeof (instance as any).fromJSON === 'function') {
                    return (instance as any).fromJSON(data);
                }
                
                return instance;
            }
            
            throw new Error(`Unregistered type ${type} at path ${path}`);
        }
        
        // 处理普通对象
        const result: Record<string, any> = {};
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                result[key] = this.deserialize(data[key], `${path}.${key}`);
            }
        }
        return result;
    }
}