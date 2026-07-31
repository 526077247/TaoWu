import { ITaoWuClassMeta, ITaoWuPropertyMeta } from "./TaoWuTypes";

/**
 * TaoWu Inspector 元数据注册中心
 * 装饰器在类定义时调用 register 写入元数据
 * 场景脚本通过 globalThis.__TAOWU_REGISTRY__ 读取
 */
export class TaoWuRegistry {
    private static metadata: Map<string, ITaoWuClassMeta> = new Map();

    static register(className: string, propertyKey: string, meta: Partial<ITaoWuPropertyMeta>): void {
        if (!this.metadata.has(className)) {
            this.metadata.set(className, {});
        }
        const classMeta = this.metadata.get(className)!;
        if (!classMeta[propertyKey]) {
            classMeta[propertyKey] = {};
        }
        Object.assign(classMeta[propertyKey], meta);
    }

    static getMetadata(className: string): ITaoWuClassMeta | null {
        return this.metadata.get(className) || null;
    }

    static hasMetadata(className: string): boolean {
        return this.metadata.has(className);
    }

    static clear(): void {
        this.metadata.clear();
    }
}

declare global {
    // eslint-disable-next-line no-var
    var __TAOWU_REGISTRY__: typeof TaoWuRegistry;
}
globalThis.__TAOWU_REGISTRY__ = TaoWuRegistry;
