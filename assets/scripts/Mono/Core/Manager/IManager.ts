export interface IManagerDestroy
{
    destroy();
}

export interface IManager<P1 = void, P2 = void, P3 = void> extends IManagerDestroy 
{
    init(p1?: P1,p2?: P2,p3?: P3): void;
}