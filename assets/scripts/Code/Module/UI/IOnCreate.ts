export interface IOnCreate<P1 = void, P2 = void, P3 = void, P4 = void>
{
    onCreate(p1?: P1,p2?: P2,p3?: P3, p4? : P4): void;
}