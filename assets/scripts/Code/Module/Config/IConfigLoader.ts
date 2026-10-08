export interface IConfigLoader{
    getAllConfigBytes(output: Map<string, ArrayBuffer>): Promise<void>;
    getOneConfigBytes(configName: string): Promise<ArrayBuffer>;
}