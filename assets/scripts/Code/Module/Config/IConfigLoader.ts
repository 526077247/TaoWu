export interface IConfigLoader{
    getAllConfigBytes(output: Map<string, string>): Promise<void>;
    getOneConfigBytes(configName: string): Promise<string>;
}