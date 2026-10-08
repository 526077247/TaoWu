#define NOT_SERVER //导服务端配置开关
using OfficeOpenXml;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using TaoWu.LitJson;
using LicenseContext = OfficeOpenXml.LicenseContext;

namespace TaoWu
{
    public enum ConfigType
    {
        c = 0,
        s = 1,
    }

    class HeadInfo
    {
        public string FieldAttribute;
        public string FieldDesc;
        public string FieldName;
        public string FieldType;
        public int FieldIndex;

        public HeadInfo(string cs, string desc, string name, string type, int index)
        {
            this.FieldAttribute = cs;
            this.FieldDesc = desc;
            this.FieldName = name;
            this.FieldType = type;
            this.FieldIndex = index;
        }
    }

    // 这里加个标签是为了防止编译时裁剪掉protobuf，因为整个tool工程没有用到protobuf，编译会去掉引用，然后动态编译就会出错
    class Table
    {
        public bool C;
#if !NOT_SERVER
        public bool S;
#endif
        public int Index;
        public Dictionary<string, HeadInfo> HeadInfos = new Dictionary<string, HeadInfo>();
    }
    public partial class ExcelExporter
    {
        private static string template;

        private const string clientClassDir = "../assets/scripts/Code/Module/Generate/Config";
        private static string ClientClassDir
        {
            get
            {
                if (IsCheck) return "./Temp/ClientClass";
                return clientClassDir;
            }
        }
#if !NOT_SERVER
        private const string serverClassDir = "../Server/Model/Generate/Config";
        private static string ServerClassDir
        {
            get
            {
                if (IsCheck) return "./Temp/ServerClass";
                return serverClassDir;
            }
        }
#endif
        private const string excelDir = "../Excel";

        private const string jsonDir = "../Excel/Json/{0}/{1}";

        private const string __clientProtoDir = "../assets/assetsPackage/config/{0}";
        private static string clientProtoDir
        {
            get
            {
                if (IsCheck) return "./Temp/ClientProto/{0}";
                return __clientProtoDir;
            }
        }
#if !NOT_SERVER
        private const string __serverProtoDir = "../Config/{0}";
        private static string serverProtoDir
        {
            get
            {
                if (IsCheck) return "./Temp/ServerProto/{0}";
                return __serverProtoDir;
            }
        }
#endif
        private static bool IsCheck;

        private static Assembly[] configAssemblies = new Assembly[2];

        private static Dictionary<string, Table> tables = new Dictionary<string, Table>();
        private static Dictionary<string, ExcelPackage> packages = new Dictionary<string, ExcelPackage>();

        private static Table GetTable(string protoName)
        {
            if (!tables.TryGetValue(protoName, out var table))
            {
                table = new Table();
                tables[protoName] = table;
            }

            return table;
        }

        public static ExcelPackage GetPackage(string filePath)
        {
            if (!packages.TryGetValue(filePath, out var package))
            {
                using Stream stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                package = new ExcelPackage(stream);
                packages[filePath] = package;
            }

            return package;
        }

        public static void Export(bool isCheck = false)
        {
            IsCheck = isCheck;
            if (isCheck)
                Console.WriteLine("ExcelExporter 校验");
            else
                Console.WriteLine("ExcelExporter 开始");
            try
            {
                template = File.ReadAllText("Template.txt");
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

                if (Directory.Exists(ClientClassDir))
                {
                    Directory.Delete(ClientClassDir, true);
                }
#if !NOT_SERVER
                if (Directory.Exists(ServerClassDir))
                {
                    Directory.Delete(ServerClassDir, true);
                }
#endif
                if (Directory.Exists(clientProtoDir))
                {
                    Directory.Delete(clientProtoDir, true);
                }

                // clientProtoDir 是带 {0} 占位符的模板，上面的 Exists 检查恒为 false，此处显式按格式化路径清理，
                // 避免旧 .json/.bytes 残留（客户端配置是扁平目录，由导出程序全量生成）。
                string cProtoDir = string.Format(clientProtoDir, ".");
                if (Directory.Exists(cProtoDir))
                {
                    Directory.Delete(cProtoDir, true);
                }

                // 中间 json 目录同样必须清理，否则已删除/改名的表残留旧文件，会污染 proto 全局合并与 server 输出。
                foreach (string ct in new[] { "c", "s" })
                {
                    string jdir = string.Format(jsonDir, ct, "");
                    if (Directory.Exists(jdir))
                    {
                        Directory.Delete(jdir, true);
                    }
                }
                List<string> configList = new List<string>();
                foreach (string path in ExportHelper.FindFile(excelDir))
                {
                    string fileName = Path.GetFileName(path);
                    if (!fileName.EndsWith(".xlsx") || fileName.StartsWith("~$") || fileName.Contains("#"))
                    {
                        continue;
                    }

                    string fileNameWithoutExtension = Path.GetFileNameWithoutExtension(fileName);
                    string fileNameWithoutCS = fileNameWithoutExtension;
                    string cs = "cs";
                    if (fileNameWithoutExtension.Contains("@"))
                    {
                        string[] ss = fileNameWithoutExtension.Split("@");
                        fileNameWithoutCS = ss[0];
                        cs = ss[1];
                    }

                    if (cs == "")
                    {
                        cs = "cs";
                    }

                    ExcelPackage p = GetPackage(Path.GetFullPath(path));

                    string protoName = fileNameWithoutCS;
                    if (fileNameWithoutCS.Contains('_'))
                    {
                        protoName = fileNameWithoutCS.Substring(0, fileNameWithoutCS.LastIndexOf('_'));
                    }

                    Table table = GetTable(protoName);

                    if (cs.Contains("c"))
                    {
                        table.C = true;
                        configList.Add(protoName);
                    }
#if !NOT_SERVER
                    if (cs.Contains("s"))
                    {
                        table.S = true;
                    }
#endif
                    ExportExcelClass(p, protoName, table);
                }

                foreach (var kv in tables)
                {
                    if (kv.Value.C)
                    {
                        ExportClass(kv.Key, kv.Value.HeadInfos, ConfigType.c, true);
                    }
#if !NOT_SERVER
                    if (kv.Value.S)
                    {
                        ExportClass(kv.Key, kv.Value.HeadInfos, ConfigType.s, true);
                    }
#endif
                }

                // 动态编译生成的配置代码
                //configAssemblies[(int)ConfigType.c] = DynamicBuild(ConfigType.c);
#if !NOT_SERVER
                //configAssemblies[(int)ConfigType.s] = DynamicBuild(ConfigType.s);
#endif
                foreach (var kv in tables)
                {
                    if (kv.Value.C)
                    {
                        ExportClass(kv.Key, kv.Value.HeadInfos, ConfigType.c);
                    }
                }
                //foreach (string path in ExportHelper.FindFile(excelDir))
                //{
                //    ExportExcel(path);
                //}

                // 多线程导出
                List<Task> tasks = new List<Task>();
                foreach (string path in ExportHelper.FindFile(excelDir))
                {
                    Task task = Task.Run(() => ExportExcel(path));
                    tasks.Add(task);
                }
                Task.WaitAll(tasks.ToArray());
                Console.WriteLine("ExcelExporter 成功");
            }
            catch (Exception e)
            {
                Console.WriteLine(e.ToString());
            }
            finally
            {
                tables.Clear();
                foreach (var kv in packages)
                {
                    kv.Value.Dispose();
                }

                packages.Clear();
            }
        }
        public static void ExportTarget(string target)
        {
            string fullAbsolute = Path.GetFullPath(target);

            var name = Path.GetFileName(target);
            Console.WriteLine($"Exporter{name} 开始");
            try
            {
                template = File.ReadAllText("Template.txt");
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

                foreach (string path in ExportHelper.FindFile(excelDir))
                {
                    string fullRelative = Path.GetFullPath(path, Directory.GetCurrentDirectory());
                    bool ignoreCase = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
                    if (!string.Equals(fullRelative, fullAbsolute, ignoreCase ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal)) continue;
                    string fileName = Path.GetFileName(path);
                    if (!fileName.EndsWith(".xlsx") || fileName.StartsWith("~$") || fileName.Contains("#"))
                    {
                        continue;
                    }

                    string fileNameWithoutExtension = Path.GetFileNameWithoutExtension(fileName);
                    string fileNameWithoutCS = fileNameWithoutExtension;
                    string cs = "cs";
                    if (fileNameWithoutExtension.Contains("@"))
                    {
                        string[] ss = fileNameWithoutExtension.Split("@");
                        fileNameWithoutCS = ss[0];
                        cs = ss[1];
                    }

                    if (cs == "")
                    {
                        cs = "cs";
                    }

                    ExcelPackage p = GetPackage(Path.GetFullPath(path));

                    string protoName = fileNameWithoutCS;
                    if (fileNameWithoutCS.Contains('_'))
                    {
                        protoName = fileNameWithoutCS.Substring(0, fileNameWithoutCS.LastIndexOf('_'));
                    }

                    Table table = GetTable(protoName);

                    if (cs.Contains("c"))
                    {
                        table.C = true;
                    }
#if !NOT_SERVER
                    if (cs.Contains("s"))
                    {
                        table.S = true;
                    }
#endif
                    ExportExcelClass(p, protoName, table);
                }

                foreach (var kv in tables)
                {
                    if (kv.Value.C)
                    {
                        ExportClass(kv.Key, kv.Value.HeadInfos, ConfigType.c, true);
                    }
#if !NOT_SERVER
                    if (kv.Value.S)
                    {
                        ExportClass(kv.Key, kv.Value.HeadInfos, ConfigType.s, true);
                    }
#endif
                }

                // 动态编译生成的配置代码
                //configAssemblies[(int)ConfigType.c] = DynamicBuild(ConfigType.c);
#if !NOT_SERVER
                //configAssemblies[(int)ConfigType.s] = DynamicBuild(ConfigType.s);
#endif
                foreach (var kv in tables)
                {
                    if (kv.Value.C)
                    {
                        ExportClass(kv.Key, kv.Value.HeadInfos, ConfigType.c);
                    }
                }
                //foreach (string path in ExportHelper.FindFile(excelDir))
                //{
                //    ExportExcel(path);
                //}

                // 多线程导出
                List<Task> tasks = new List<Task>();
                foreach (string path in ExportHelper.FindFile(excelDir))
                {
                    string fullRelative = Path.GetFullPath(path, Directory.GetCurrentDirectory());
                    bool ignoreCase = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
                    if (!string.Equals(fullRelative, fullAbsolute, ignoreCase ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal)) continue;
                    Task task = Task.Run(() => ExportExcel(path));
                    tasks.Add(task);
                }
                Task.WaitAll(tasks.ToArray());

                Console.WriteLine("ExcelExporterTarget 成功");
            }
            catch (Exception e)
            {
                Console.WriteLine(e.ToString());
            }
            finally
            {
                tables.Clear();
                foreach (var kv in packages)
                {
                    kv.Value.Dispose();
                }

                packages.Clear();
            }
        }

        private static void ExportExcel(string path)
        {
            string dir = Path.GetDirectoryName(path);
            string relativePath = Path.GetRelativePath(excelDir, dir);
            string fileName = Path.GetFileName(path);
            if (!fileName.EndsWith(".xlsx") || fileName.StartsWith("~$") || fileName.Contains("#"))
            {
                return;
            }

            string fileNameWithoutExtension = Path.GetFileNameWithoutExtension(fileName);
            string fileNameWithoutCS = fileNameWithoutExtension;
            string cs = "cs";
            if (fileNameWithoutExtension.Contains("@"))
            {
                string[] ss = fileNameWithoutExtension.Split("@");
                fileNameWithoutCS = ss[0];
                cs = ss[1];
            }

            if (cs == "")
            {
                cs = "cs";
            }

            string protoName = fileNameWithoutCS;
            if (fileNameWithoutCS.Contains('_'))
            {
                protoName = fileNameWithoutCS.Substring(0, fileNameWithoutCS.LastIndexOf('_'));
            }

            Table table = GetTable(protoName);

            ExcelPackage p = GetPackage(Path.GetFullPath(path));

            if (cs.Contains("c"))
            {
                ExportExcelJson(p, fileNameWithoutCS, table, ConfigType.c, relativePath);
                ExportExcelProto(ConfigType.c, protoName, relativePath, table);
            }

            if (cs.Contains("s"))
            {
                ExportExcelJson(p, fileNameWithoutCS, table, ConfigType.s, relativePath);
#if !NOT_SERVER
                MoveJson2Project(ConfigType.s, protoName, relativePath);
#endif
            }

        }

        private static string GetProtoDir(ConfigType configType, string relativeDir)
        {
#if !NOT_SERVER
            if (configType == ConfigType.c)
            {
                return string.Format(clientProtoDir, ".");
            }

            return string.Format(serverProtoDir, relativeDir);
#else
            return string.Format(clientProtoDir, ".");
#endif
        }

        private static Assembly GetAssembly(ConfigType configType)
        {
            return configAssemblies[(int)configType];
        }

        private static string GetClassDir(ConfigType configType)
        {
#if !NOT_SERVER
            if (configType == ConfigType.c)
            {
                return ClientClassDir;
            }

            return ServerClassDir;
#else
            return ClientClassDir;
#endif
        }


        #region 导出class

        static void ExportExcelClass(ExcelPackage p, string name, Table table)
        {
            foreach (ExcelWorksheet worksheet in p.Workbook.Worksheets)
            {
                try
                {
                    if (worksheet.Dimension == null || worksheet.Dimension.End == null) continue;
                    Console.WriteLine("ExportSheetClass " + name);
                    ExportSheetClass(worksheet, table);
                }
                catch (Exception ex)
                {
                    Console.WriteLine(name + "--" + worksheet.Name + "     有错误 " + ex);
                }
            }
        }

        static void ExportSheetClass(ExcelWorksheet worksheet, Table table)
        {
            const int row = 2;
            for (int col = 3; col <= worksheet.Dimension.End.Column; ++col)
            {
                if (worksheet.Name.StartsWith("#"))
                {
                    continue;
                }

                string fieldName = worksheet.Cells[row + 2, col].Text.Trim();
                if (fieldName == "")
                {
                    continue;
                }

                if (table.HeadInfos.ContainsKey(fieldName))
                {
                    continue;
                }

                string fieldCS = worksheet.Cells[row, col].Text.Trim().ToLower();
                if (fieldCS.Contains("#"))
                {
                    table.HeadInfos[fieldName] = null;
                    continue;
                }

                if (fieldCS == "")
                {
                    fieldCS = "cs";
                }

                if (table.HeadInfos.TryGetValue(fieldName, out var oldClassField))
                {
                    if (oldClassField.FieldAttribute != fieldCS)
                    {
                        Console.WriteLine($"field cs not same: {worksheet.Name} {fieldName} oldcs: {oldClassField.FieldAttribute} {fieldCS}");
                    }

                    continue;
                }

                string fieldDesc = worksheet.Cells[row + 1, col].Text.Trim();
                string fieldType = worksheet.Cells[row + 3, col].Text.Trim();

                // 不支持 proto 导出的字段（AttrConfig/二维数组/小数）不参与编号，保证 proto 字段编号连续
                int fieldIndex = IsProtoFieldSupported(fieldType) ? ++table.Index : 0;
                table.HeadInfos[fieldName] = new HeadInfo(fieldCS, fieldDesc, char.ToLower(fieldName[0]) + fieldName.Substring(1), fieldType, fieldIndex);
            }
        }

        static void ExportClass(string protoName, Dictionary<string, HeadInfo> classField, ConfigType configType, bool setattr = false)
        {
            string dir = GetClassDir(configType);
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            string exportPath = Path.Combine(dir, $"{protoName}.ts");

            using FileStream txt = new FileStream(exportPath, FileMode.Create);
            using StreamWriter sw = new StreamWriter(txt);

            StringBuilder sb = new StringBuilder();
            foreach ((string _, HeadInfo headInfo) in classField)
            {
                if (headInfo == null)
                {
                    continue;
                }

                if (headInfo.FieldType == "json")
                {
                    continue;
                }

                if (!headInfo.FieldAttribute.Contains(configType.ToString()))
                {
                    continue;
                }

                // 不可 proto 导出的字段（AttrConfig 等）不进类
                if (headInfo.FieldIndex <= 0)
                {
                    continue;
                }

                string fieldType = headInfo.FieldType;
                sb.Append($"\t/** {headInfo.FieldDesc.Replace("\n", " * \n\t\t")}*/\n");
                sb.Append($"\t@ProtoMember({headInfo.FieldIndex}, {ProtoMemberArgOf(fieldType)})\n");
                sb.Append($"\tpublic {headInfo.FieldName}: {TsTypeOf(fieldType)}{DefaultTsValueOf(fieldType)}\n");
            }

            string content = template.Replace("(ConfigName)", protoName).Replace(("(Fields)"), sb.ToString());
            sw.Write(content);
        }

        #endregion

        #region 导出json


        static void ExportExcelJson(ExcelPackage p, string name, Table table, ConfigType configType, string relativeDir)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine($"{{\"_t\":\"{name}Category\",\"list\":[");
            foreach (ExcelWorksheet worksheet in p.Workbook.Worksheets)
            {
                if (worksheet.Name.StartsWith("#"))
                {
                    continue;
                }
                if (worksheet.Dimension == null || worksheet.Dimension.End == null) continue;
                Console.WriteLine("ExportExcelJson " + name);
                ExportSheetJson(worksheet, name, table.HeadInfos, configType, sb);
            }

            sb.AppendLine("]}");

            string dir = string.Format(jsonDir, configType.ToString(), relativeDir);
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            string jsonPath = Path.Combine(dir, $"{name}.txt");
            using FileStream txt = new FileStream(jsonPath, FileMode.Create);
            using StreamWriter sw = new StreamWriter(txt);
            sw.Write(sb.ToString());
        }

        static void MoveJson2Project(ConfigType configType, string protoName, string relativeDir)
        {
            string dir = GetProtoDir(configType, relativeDir);
            if (!Directory.Exists(dir))
            {
                if (!Directory.Exists(Directory.GetParent(dir).FullName))
                {
                    return;
                }
                Directory.CreateDirectory(dir);
            }

            string p = Path.Combine(string.Format(jsonDir, configType, relativeDir));
            string[] ss = Directory.GetFiles(p, $"{protoName}_*.txt");
            List<string> jsonPaths = ss.ToList();
            jsonPaths.Add(Path.Combine(string.Format(jsonDir, configType, relativeDir), $"{protoName}.txt"));

            jsonPaths.Sort();
            jsonPaths.Reverse();

            JsonData root = null;
            JsonData rootArray = null;
            foreach (string jsonPath in jsonPaths)
            {
                if (!File.Exists(jsonPath)) continue; // 防御性检查

                string jsonContent = File.ReadAllText(jsonPath);
                JsonData data = JsonMapper.ToObject(jsonContent);
                var list = data["list"];
                if (root == null)
                {
                    root = data;
                    rootArray = list;
                    continue;
                }
                if (list.IsArray)
                {
                    // 若文件内容是数组，则逐个添加元素
                    foreach (JsonData item in list)
                    {
                        rootArray.Add(item);
                    }
                }
            }

            string path = Path.Combine(dir, $"{protoName}Category.json");

            string jsonOutput = JsonMapper.ToJson(root);
            File.WriteAllText(path, jsonOutput);
        }

        #region 导出protobuf

        static void ExportExcelProto(ConfigType configType, string protoName, string relativeDir, Table table)
        {
            string dir = GetProtoDir(configType, relativeDir);
            if (!Directory.Exists(dir))
            {
                if (!Directory.Exists(Directory.GetParent(dir).FullName))
                {
                    return;
                }
                Directory.CreateDirectory(dir);
            }

            List<HeadInfo> fields = ProtoFields(table.HeadInfos, configType);

            // 客户端配置输出是扁平目录（GetProtoDir 忽略 relativeDir），同名表可能散落在多个子目录，
            // 需跨目录合并（与 ExportClass 聚合所有 sheet 的 HeadInfos 保持一致），避免 last-wins 丢行。
            string baseDir = string.Format(jsonDir, configType.ToString(), "");
            List<string> jsonPaths = Directory.GetFiles(baseDir, "*.txt", SearchOption.AllDirectories)
                .Where(f => { string n = Path.GetFileName(f); return n == $"{protoName}.txt" || (n.StartsWith($"{protoName}_") && n.EndsWith(".txt")); })
                .ToList();

            jsonPaths.Sort((a, b) => string.Compare(a, b, StringComparison.OrdinalIgnoreCase));
            jsonPaths.Reverse();

            using MemoryStream ms = new MemoryStream();
            foreach (string jsonPath in jsonPaths)
            {
                if (!File.Exists(jsonPath)) continue;

                string jsonContent = File.ReadAllText(jsonPath);
                JsonData data = JsonMapper.ToObject(jsonContent);
                JsonData list = data["list"];
                if (list == null || !list.IsArray) continue;

                foreach (JsonData item in list)
                {
                    byte[] row = EncodeRow(item, fields);
                    ProtoWriter.WriteBytesField(ms, 1, row);
                }
            }

            string path = Path.Combine(dir, $"{protoName}Category.bin");
            File.WriteAllBytes(path, ms.ToArray());
        }

        static List<HeadInfo> ProtoFields(Dictionary<string, HeadInfo> classField, ConfigType configType)
        {
            List<HeadInfo> list = new List<HeadInfo>();
            foreach ((string _, HeadInfo headInfo) in classField)
            {
                if (headInfo == null) continue;
                if (headInfo.FieldType == "json") continue;
                if (!headInfo.FieldAttribute.Contains(configType.ToString())) continue;
                if (headInfo.FieldIndex <= 0) continue;
                list.Add(headInfo);
            }
            list.Sort((a, b) => a.FieldIndex.CompareTo(b.FieldIndex));
            return list;
        }

        static byte[] EncodeRow(JsonData item, List<HeadInfo> fields)
        {
            using MemoryStream ms = new MemoryStream();
            foreach (HeadInfo headInfo in fields)
            {
                // 多 sheet 列可能不一致，缺失字段跳过
                if (!((System.Collections.IDictionary)item).Contains(headInfo.FieldName))
                {
                    continue;
                }
                JsonData v = item[headInfo.FieldName];
                if (v == null) continue;
                // 多 sheet 列类型可能不一致（如 LevelConfig.params2 有的 sheet 是 int、有的是 int[]），
                // 值类型与 HeadInfo 声明不符时跳过该字段，避免编码崩溃。
                if (headInfo.FieldType.EndsWith("[]") && !v.IsArray) continue;
                switch (headInfo.FieldType)
                {
                    // 数值统一按 double 编码：旧 json 管道客户端拿到的就是 number(double)，
                    // 且存在声明 int 列实际填小数（如 0.02/0.005）的情况，按 int 编码会丢精度/丢数据。
                    case "int":
                    case "int32":
                    case "uint":
                    case "int64":
                    case "long":
                    case "float":
                    case "double":
                        ProtoWriter.WriteDoubleField(ms, headInfo.FieldIndex, ToDouble(v));
                        break;
                    case "string":
                        ProtoWriter.WriteStringField(ms, headInfo.FieldIndex, ToStringValue(v));
                        break;
                    case "int[]":
                    case "int32[]":
                    case "uint[]":
                    case "long[]":
                    case "float[]":
                    case "double[]":
                        WritePackedDouble(ms, headInfo.FieldIndex, v);
                        break;
                    case "string[]":
                        foreach (JsonData elem in v)
                        {
                            ProtoWriter.WriteStringField(ms, headInfo.FieldIndex, ToStringValue(elem));
                        }
                        break;
                    default:
                        throw new Exception($"不支持 proto 导出的类型: {headInfo.FieldType}");
                }
            }
            return ms.ToArray();
        }

        static void WritePackedDouble(Stream ms, int field, JsonData arr)
        {
            using MemoryStream inner = new MemoryStream();
            foreach (JsonData elem in arr)
            {
                byte[] bytes = BitConverter.GetBytes(BitConverter.DoubleToInt64Bits(ToDouble(elem)));
                if (!BitConverter.IsLittleEndian) Array.Reverse(bytes);
                inner.Write(bytes, 0, bytes.Length);
            }
            ProtoWriter.WriteBytesField(ms, field, inner.ToArray());
        }

        static double ToDouble(JsonData d)
        {
            if (d.IsInt) return ((IJsonWrapper)d).GetInt();
            if (d.IsLong) return ((IJsonWrapper)d).GetLong();
            if (d.IsDouble) return ((IJsonWrapper)d).GetDouble();
            return 0.0;
        }

        static string ToStringValue(JsonData d)
        {
            if (d.IsString) return ((IJsonWrapper)d).GetString();
            if (d.IsInt) return ((IJsonWrapper)d).GetInt().ToString();
            if (d.IsLong) return ((IJsonWrapper)d).GetLong().ToString();
            if (d.IsDouble) return ((IJsonWrapper)d).GetDouble().ToString();
            return "";
        }

        /// <summary>该字段类型是否参与 proto 导出（AttrConfig/二维数组/小数暂不支持）</summary>
        static bool IsProtoFieldSupported(string fieldType)
        {
            switch (fieldType)
            {
                case "AttrConfig":
                case "decimal":
                case "decimal[]":
                    return false;
            }
            if (fieldType.EndsWith("[][]"))
            {
                return false;
            }
            return true;
        }

        /// <summary>@ProtoMember 的类型参数（TS 字面量），数值统一为 double（与旧 json 的 number 一致）</summary>
        static string ProtoMemberArgOf(string fieldType)
        {
            switch (fieldType)
            {
                case "int":
                case "int32":
                case "uint":
                case "int64":
                case "long":
                case "float":
                case "double":
                    return "\"double\"";
                case "string":
                    return "\"string\"";
                case "int[]":
                case "int32[]":
                case "uint[]":
                case "long[]":
                case "float[]":
                case "double[]":
                    return "[\"double\"]";
                case "string[]":
                    return "[\"string\"]";
                default:
                    throw new Exception($"不支持 proto 导出的类型: {fieldType}");
            }
        }

        static string TsTypeOf(string fieldType)
        {
            switch (fieldType)
            {
                case "int":
                case "uint":
                case "int32":
                case "int64":
                case "long":
                case "float":
                case "double":
                    return "number";
                case "string":
                    return "string";
                case "int[]":
                case "uint[]":
                case "int32[]":
                case "long[]":
                case "float[]":
                case "double[]":
                    return "number[]";
                case "string[]":
                    return "string[]";
                default:
                    throw new Exception($"不支持 proto 导出的类型: {fieldType}");
            }
        }

        static string DefaultTsValueOf(string fieldType)
        {
            switch (fieldType)
            {
                case "string":
                    return " = \"\";";
                case "string[]":
                    return " = [];";
                case "int[]":
                case "uint[]":
                case "int32[]":
                case "long[]":
                case "float[]":
                case "double[]":
                    return " = [];";
                default:
                    return " = 0;";
            }
        }

        #endregion

        static void ExportSheetJson(ExcelWorksheet worksheet, string name,
                Dictionary<string, HeadInfo> classField, ConfigType configType, StringBuilder sb)
        {
            string configTypeStr = configType.ToString();
            for (int row = 6; row <= worksheet.Dimension.End.Row; ++row)
            {
                string prefix = worksheet.Cells[row, 2].Text.Trim();
                if (prefix.Contains("#"))
                {
                    continue;
                }

                if (prefix == "")
                {
                    prefix = "cs";
                }

                if (!prefix.Contains(configTypeStr))
                {
                    continue;
                }

                if (worksheet.Cells[row, 3].Text.Trim() == "")
                {
                    continue;
                }

                sb.Append("{");
                sb.Append($"\"_t\":\"{name}\"");
                for (int col = 3; col <= worksheet.Dimension.End.Column; ++col)
                {
                    string fieldName = worksheet.Cells[4, col].Text.Trim();
                    if (!classField.ContainsKey(fieldName))
                    {
                        continue;
                    }

                    HeadInfo headInfo = classField[fieldName];

                    if (headInfo == null)
                    {
                        continue;
                    }

                    if (!headInfo.FieldAttribute.Contains(configTypeStr))
                    {
                        continue;
                    }

                    if (headInfo.FieldType == "json")
                    {
                        continue;
                    }

                    sb.Append($",\"{headInfo.FieldName}\":{Convert(headInfo.FieldType, worksheet.Cells[row, col].Text.Trim())}");
                }

                sb.Append("},\n");
            }
        }

        private static string Convert(string type, string value)
        {
            switch (type)
            {
                case "decimal[]":
                case "double[]":
                case "uint[]":
                case "int[]":
                case "int32[]":
                case "long[]":
                case "float[]":
                    {
                        value = value.Replace("{", "").Replace("}", "");
                        return $"[{value}]";
                    }
                case "string[]":
                    if (string.IsNullOrEmpty(value)) return "[]";
                    if (value.StartsWith("\""))
                    {
                        return $"[{value}]";
                    }
                    var list = value.Split(",");
                    value = "";
                    for (int i = 0; i < list.Length; i++)
                    {
                        value += "\"" + list[i] + "\"";
                        if (i < list.Length - 1) value += ",";
                    }
                    return $"[{value}]";
                case "decimal[][]":
                case "double[][]":
                case "uint[][]":
                case "int[][]":
                case "int32[][]":
                case "long[][]":
                case "float[][]":
                    return $"[{value}]";
                case "int":
                case "uint":
                case "int32":
                case "int64":
                case "long":
                case "float":
                case "double":
                    {
                        value = value.Replace("{", "").Replace("}", "");
                        if (value == "")
                        {
                            return "0";
                        }
                        return value;
                    }
                case "string":
                    return $"\"{value}\"";
                case "AttrConfig":
                    string[] ss = value.Split(':');
                    return "{\"_t\":\"AttrConfig\"," + "\"Ks\":" + ss[0] + ",\"Vs\":" + ss[1] + "}";
                default:
                    throw new Exception($"不支持此类型: {type}");
            }
        }

        private static string ConvertTypeName(string type)
        {
            switch (type)
            {
                case "int":
                case "uint":
                case "int32":
                case "int64":
                case "long":
                case "float":
                case "double":
                case "decimal":
                    return "number";
                case "decimal[]":
                case "double[]":
                case "uint[]":
                case "int[]":
                case "int32[]":
                case "long[]":
                case "float[]":
                    {
                        return "number[]";
                    }
                case "int[][]":
                    return "number[][]";
                default:
                    return type;
            }
        }
        #endregion
    }
}