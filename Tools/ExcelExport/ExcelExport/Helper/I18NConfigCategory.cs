using System;
using System.Collections.Generic;


public class I18NConfigCategory
{
    public List<I18NConfig> list = new List<I18NConfig>();

    public List<I18NConfig> GetAllList()
    {
        return this.list;
    }
}

public partial class I18NConfig
{
    /// <summary>Id</summary>
    public int id { get; set; }
#if NOT_UNITY
    /// <summary>索引标识</summary>
	public string key { get; set; }
#endif
    /// <summary>内容</summary>
    public string value { get; set; }
}

