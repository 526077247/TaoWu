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

                int fieldIndex = ++table.Index;
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
                sb.Append($"\tpublic {headInfo.FieldName}: {ConvertType(fieldType)}{DefaultTsValueOf(fieldType)}\n");
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
                case "double[][]":
                case "uint[][]":
                case "int[][]":
                case "int32[][]":
                case "long[][]":
                case "float[][]":
                    return $"[{value.Replace("[", "\"").Replace("]", "\"")}]";
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
                default:
                    throw new Exception($"不支持此类型: {type}");
            }
        }

        private static string ConvertType(string type)
        {
            switch (type)
            {
                case "int":
                case "uint":
                case "int32":
                case "float":
                case "double":
                    return "number";
                case "int64":
                case "long":
                    return "bigint";
                case "double[]":
                case "uint[]":
                case "int[]":
                case "int32[]":
                case "float[]":
                    {
                        return "number[]";
                    }
                case "int64[]":
                case "long[]":
                    return "bigint[]";
                case "double[][]":
                case "uint[][]":
                case "int[][]":
                case "int32[][]":
                case "long[][]":
                case "float[][]":
                    return "string[]";
                default:
                    return type;
            }
        }
        #endregion

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

                int rowIdx = 0;
                foreach (JsonData item in list)
                {
                    rowIdx++;
                    byte[] row = EncodeRow(item, fields, $"表 {protoName}，源 {Path.GetFileName(jsonPath)} 第 {rowIdx} 条");
                    ProtoWriter.WriteBytesField(ms, 1, row);
                }
            }

            string path = Path.Combine(dir, $"{protoName}Category.bin");
            byte[] payload = ms.ToArray();
            if (payload.Length == 0)
            {
                // 0 字节文件在抖音上传/分发链路会被丢弃（真机 readFile no such file），
                // 写入未注册字段 field14 varint 0 占位，ProtoHelper.decodeMessage 未知字段走 skipField，解码结果与空消息等价
                payload = new byte[] { 0x72, 0x00 };
            }
            File.WriteAllBytes(path, payload);
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

        static byte[] EncodeRow(JsonData item, List<HeadInfo> fields, string ctx)
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
                if (!headInfo.FieldType.EndsWith("[]") && v.IsArray) continue;
                switch (headInfo.FieldType)
                {
                    case "int":
                    case "int32":
                        ProtoWriter.WriteInt32Field(ms, headInfo.FieldIndex, ToInt32(v, headInfo, ctx));
                        break;
                    case "uint":
                        ProtoWriter.WriteUInt32Field(ms, headInfo.FieldIndex, ToUInt32(v, headInfo, ctx));
                        break;
                    case "int64":
                    case "long":
                        ProtoWriter.WriteInt64Field(ms, headInfo.FieldIndex, ToInt64(v, headInfo, ctx));
                        break;
                    case "float":
                        ProtoWriter.WriteFloatField(ms, headInfo.FieldIndex, (float)ToNumber(v, headInfo, ctx));
                        break;
                    case "double":
                        ProtoWriter.WriteDoubleField(ms, headInfo.FieldIndex, ToNumber(v, headInfo, ctx));
                        break;
                    case "string":
                        ProtoWriter.WriteStringField(ms, headInfo.FieldIndex, ToStringValue(v));
                        break;
                    case "int[]":
                    case "int32[]":
                        ProtoWriter.WritePackedInt32(ms, headInfo.FieldIndex, ToArray(v, headInfo, ctx, ToInt32));
                        break;
                    case "uint[]":
                        ProtoWriter.WritePackedUInt32(ms, headInfo.FieldIndex, ToArray(v, headInfo, ctx, ToUInt32));
                        break;
                    case "int64[]":
                    case "long[]":
                        ProtoWriter.WritePackedInt64(ms, headInfo.FieldIndex, ToArray(v, headInfo, ctx, ToInt64));
                        break;
                    case "float[]":
                        ProtoWriter.WritePackedFloat(ms, headInfo.FieldIndex, ToArray(v, headInfo, ctx, (e, t, c) => (float)ToNumber(e, t, c)));
                        break;
                    case "double[]":
                        ProtoWriter.WritePackedDouble(ms, headInfo.FieldIndex, ToArray(v, headInfo, ctx, (e, t, c) => ToNumber(e, t, c)));
                        break;
                    case "string[]":
                        foreach (JsonData elem in v)
                        {
                            ProtoWriter.WriteStringField(ms, headInfo.FieldIndex, ToStringValue(elem));
                        }
                        break;
                    case "double[][]":
                    case "uint[][]":
                    case "int[][]":
                    case "int32[][]":
                    case "long[][]":
                    case "float[][]":
                        foreach (JsonData elem in v)
                        {
                            string s = JoinSubArray(elem);
                            if (s.Length == 0) continue;
                            ProtoWriter.WriteStringField(ms, headInfo.FieldIndex, s);
                        }
                        break;
                    default:
                        throw new Exception($"不支持 proto 导出的类型: {headInfo.FieldType}");
                }
            }
            return ms.ToArray();
        }

        static T[] ToArray<T>(JsonData arr, HeadInfo headInfo, string ctx, Func<JsonData, HeadInfo, string, T> conv)
        {
            T[] result = new T[arr.Count];
            for (int i = 0; i < arr.Count; i++)
            {
                result[i] = conv(arr[i], headInfo, ctx);
            }
            return result;
        }

        static string JoinSubArray(JsonData elem)
        {
            if (elem.IsString) return ((IJsonWrapper)elem).GetString();
            if (!elem.IsArray) return ToStringValue(elem);
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < elem.Count; i++)
            {
                if (i > 0) sb.Append(',');
                sb.Append(ToStringValue(elem[i]));
            }
            return sb.ToString();
        }

        static double ToNumber(JsonData d, HeadInfo headInfo, string ctx)
        {
            if (d.IsInt) return ((IJsonWrapper)d).GetInt();
            if (d.IsLong) return ((IJsonWrapper)d).GetLong();
            if (d.IsDouble) return ((IJsonWrapper)d).GetDouble();
            throw new Exception($"导表类型错误: {ctx}，字段 {headInfo.FieldName} 声明 {headInfo.FieldType}，但值不是数字，请修改 Excel 后重新导表");
        }

        static double ToIntegral(JsonData d, HeadInfo headInfo, string ctx)
        {
            double v = ToNumber(d, headInfo, ctx);
            if (double.IsNaN(v) || double.IsInfinity(v) || v != Math.Truncate(v))
            {
                throw new Exception($"导表类型错误: {ctx}，字段 {headInfo.FieldName} 声明 {headInfo.FieldType}，但值 {v} 含小数，请修改 Excel 后重新导表");
            }
            return v;
        }

        static int ToInt32(JsonData d, HeadInfo headInfo, string ctx)
        {
            double v = ToIntegral(d, headInfo, ctx);
            if (v < int.MinValue || v > int.MaxValue)
            {
                throw new Exception($"导表类型错误: {ctx}，字段 {headInfo.FieldName} 值 {v} 超出 int 范围，请修改 Excel 后重新导表");
            }
            return (int)v;
        }

        static uint ToUInt32(JsonData d, HeadInfo headInfo, string ctx)
        {
            double v = ToIntegral(d, headInfo, ctx);
            if (v < 0 || v > uint.MaxValue)
            {
                throw new Exception($"导表类型错误: {ctx}，字段 {headInfo.FieldName} 值 {v} 超出 uint 范围，请修改 Excel 后重新导表");
            }
            return (uint)v;
        }

        static long ToInt64(JsonData d, HeadInfo headInfo, string ctx)
        {
            double v = ToIntegral(d, headInfo, ctx);
            if (v < long.MinValue || v > long.MaxValue)
            {
                throw new Exception($"导表类型错误: {ctx}，字段 {headInfo.FieldName} 值 {v} 超出 long 范围，请修改 Excel 后重新导表");
            }
            return (long)v;
        }

        static string ToStringValue(JsonData d)
        {
            if (d.IsString) return ((IJsonWrapper)d).GetString();
            if (d.IsInt) return ((IJsonWrapper)d).GetInt().ToString();
            if (d.IsLong) return ((IJsonWrapper)d).GetLong().ToString();
            if (d.IsDouble) return ((IJsonWrapper)d).GetDouble().ToString();
            return "";
        }

        /// <summary>@ProtoMember 的类型参数（TS 字面量），严格按 Excel 声明类型映射</summary>
        static string ProtoMemberArgOf(string fieldType)
        {
            switch (fieldType)
            {
                case "int":
                case "int32":
                    return "\"int32\"";
                case "uint":
                    return "\"uint32\"";
                case "int64":
                case "long":
                    return "\"int64\"";
                case "float":
                    return "\"float\"";
                case "double":
                    return "\"double\"";
                case "string":
                    return "\"string\"";
                case "int[]":
                case "int32[]":
                    return "[\"int32\"]";
                case "uint[]":
                    return "[\"uint32\"]";
                case "int64[]":
                case "long[]":
                    return "[\"int64\"]";
                case "float[]":
                    return "[\"float\"]";
                case "double[]":
                    return "[\"double\"]";
                case "string[]":
                case "double[][]":
                case "uint[][]":
                case "int[][]":
                case "int32[][]":
                case "long[][]":
                case "float[][]":
                    return "[\"string\"]";
                default:
                    throw new Exception($"不支持 proto 导出的类型: {fieldType}");
            }
        }

        static string DefaultTsValueOf(string fieldType)
        {
            switch (fieldType)
            {
                case "int":
                case "uint":
                case "int32":
                case "float":
                case "double":
                    return " = 0";
                case "int64":
                case "long":
                    return " = 0n";
                default:
                    return "";
            }
        }

        #endregion
    }
}