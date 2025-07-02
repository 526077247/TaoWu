export function format(format: string, ...args: any[]): string {
    return format.replace(/{(\d+)}/g, (match, index) => {
        return typeof args[index] !== 'undefined'
            ? args[index].toString()
            : match;
    });
}

export function getHash(str: string): bigint {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // 转换为32位整数
    }
    return BigInt(hash);
}

export function isNullOrEmpty(str: string): boolean {
    return !str || str == '';
}

export function isNullOrWhiteSpace(str: string): boolean {
    return !str || str.trim() == '';
}
