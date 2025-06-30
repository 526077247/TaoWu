export class CoroutineLockType
{
    public static readonly None = 0;
    public static readonly Resources = 1;
    public static readonly UIManager = 2;
    public static readonly UIMsgBox = 3;
    public static readonly EnableObjView = 4;
    public static readonly PathQuery = 5;
    public static readonly Max = 100; // 这个必须最大
}