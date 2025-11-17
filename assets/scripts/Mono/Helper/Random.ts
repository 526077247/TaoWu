
const mask = 0xffffffff;

export class Random {
    private m_w: number = 123456789;
    private m_z: number = 987654321;

    public constructor(seed?: number) { 
        if(!!seed) this.seed = seed;
    }

    public set seed(i:number) {
        this.m_w = i;
    }

    public get seed() :number{
        return this.m_w;
    }

    /**
     * return [0,1) float
     * @returns 
     */
    public range01():number
    {
        this.m_z = (36969 * (this.m_z & 65535) + (this.m_z >> 16)) & mask;
        this.m_w = (18000 * (this.m_w & 65535) + (this.m_w >> 16)) & mask;
        var result = ((this.m_z << 16) + this.m_w) & mask;
        result /= 4294967296;
        return result + 0.5;
    }

    /**
     * return [min,max) float
     * @param min 
     * @param max 
     */
    public range(min:number, max:number){
        if(max <= min) return min;
        return min + this.range01() * (max - min);
    }

    /**
     * return [min,max) int
     * @param min 
     * @param max 
     */
    public rangeInt(min:number, max:number){
        min = Math.ceil(min);
        if(max <= min) return min;
        return Math.floor(min + this.range01() * (max - min));
    }
}