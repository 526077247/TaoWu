export class StringBuilder {
  private parts: string[] = [];
  private _length: number = 0;

  constructor(value?: string | number | boolean) {
    if (value !== undefined && value !== null) {
      this.append(value);
    }
  }

  // 基础方法
  public append(value: string | number | boolean | null | undefined): StringBuilder {
    if (value !== null && value !== undefined) {
      const str = String(value);
      this.parts.push(str);
      this._length += str.length;
    }
    return this;
  }

  public appendLine(value?: string | number | boolean | null | undefined): StringBuilder {
    if (value !== null && value !== undefined) {
      this.append(value);
    }
    this.append('\n');
    return this;
  }

  public clear(): StringBuilder {
    this.parts = [];
    this._length = 0;
    return this;
  }

  public insert(index: number, value: string | number | boolean): StringBuilder {
    if (index < 0 || index > this._length) {
      throw new Error('Index out of range');
    }

    const str = String(value);
    
    if (index === 0) {
      this.parts.unshift(str);
    } else if (index === this._length) {
      this.parts.push(str);
    } else {
      // 在指定位置插入
      const currentString = this.toString();
      const before = currentString.substring(0, index);
      const after = currentString.substring(index);
      
      this.parts = [before, str, after];
      this._length = currentString.length + str.length;
    }
    
    return this;
  }

  public remove(startIndex: number, length: number): StringBuilder {
    if (startIndex < 0 || startIndex >= this._length) {
      throw new Error('Start index out of range');
    }

    if (length < 0) {
      throw new Error('Length cannot be negative');
    }

    const currentString = this.toString();
    const endIndex = Math.min(startIndex + length, this._length);
    
    const before = currentString.substring(0, startIndex);
    const after = currentString.substring(endIndex);
    
    this.parts = [before, after];
    this._length = before.length + after.length;
    
    return this;
  }

  public replace(searchValue: string | RegExp, replaceValue: string): StringBuilder {
    const currentString = this.toString();
    const newString = currentString.replace(searchValue, replaceValue);
    
    this.parts = [newString];
    this._length = newString.length;
    
    return this;
  }

  // 查询方法
  public toString(): string {
    return this.parts.join('');
  }

  get length(): number {
    return this._length;
  }

  public isEmpty(): boolean {
    return this._length === 0;
  }

  public startsWith(searchString: string): boolean {
    return this.toString().startsWith(searchString);
  }

  public endsWith(searchString: string): boolean {
    return this.toString().endsWith(searchString);
  }

  public indexOf(searchString: string, position?: number): number {
    return this.toString().indexOf(searchString, position);
  }

  public lastIndexOf(searchString: string, position?: number): number {
    return this.toString().lastIndexOf(searchString, position);
  }

  public contains(searchString: string): boolean {
    return this.toString().includes(searchString);
  }

  // 静态方法
  static create(value?: string | number | boolean): StringBuilder {
    return new StringBuilder(value);
  }

  static join(separator: string, ...values: any[]): StringBuilder {
    const sb = new StringBuilder();
    values.forEach((value, index) => {
      if (index > 0) {
        sb.append(separator);
      }
      sb.append(value);
    });
    return sb;
  }
}