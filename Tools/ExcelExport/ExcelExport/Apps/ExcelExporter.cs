#define NOT_SERVER //导服务端配置开关
using OfficeOpenXml;
using System.Globalization;
using System.Numerics;
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

                // 不再整目录删除 class / proto 输出目录：*.meta 里存着 Cocos 的资源 uuid，
                // 连目录一起删会让编辑器重新导入时分配新 uuid，已保存的 prefab / scene / 代码引用全部断开。
                // 改为扫完表之后，按"本次会生成的文件名"清掉过期产物，其余原样覆盖（见 CleanStaleOutputs）。
                string cProtoDir = string.Format(clientProtoDir, ".");

                // 中间 json 目录仍必须清空，否则已删除/改名的表残留旧文件，会污染 proto 全局合并与 server 输出。
                // 这里是 Excel/Json 下的纯中间产物（不进 assets，无 .meta），整目录删除是安全的。
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

                // 清理过期产物：只删"本次不会再生成"的 .ts / xxxCategory.bin，其余文件原样覆盖，.meta 一律不动。
                HashSet<string> expectedClass = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                HashSet<string> expectedProto = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var kv in tables)
                {
                    if (kv.Value.C)
                    {
                        expectedClass.Add($"{kv.Key}.ts");
                        expectedProto.Add($"{kv.Key}Category.bin");
                    }
#if !NOT_SERVER
                    if (kv.Value.S)
                    {
                        expectedClass.Add($"{kv.Key}.ts");
                    }
#endif
                }
                CleanStaleOutputs(ClientClassDir, "*.ts", expectedClass);
#if !NOT_SERVER
                CleanStaleOutputs(ServerClassDir, "*.ts", expectedClass);
#endif
                CleanStaleOutputs(cProtoDir, "*Category.bin", expectedProto);

                // 导出拆成两阶段：
                //   阶段一 并行，只把每个分表写成 Excel/Json/{c,s}/**/{name}.txt（不碰 bin、不碰服务端产物）；
                //   阶段二 串行，按 protoName 合并，每个 protoName 只跑一次。
                // 阶段一并行是安全的：各分表写各自的 json 路径，不共享输出文件；package 与输出目录都在并行前预热/预建。
                // 阶段二必须在所有 json 落盘之后，否则扫描不到同组其它分表会丢行；同名分表（如多个 ItemConfig_*.xlsx）
                // 也只在这里合并一次，不再像原来那样让每个分表都把全量合并重算一遍。
                List<ExportJob> jobs = new List<ExportJob>();
                foreach (string path in ExportHelper.FindFile(excelDir))
                {
                    ExportJob job = BuildJob(path);
                    if (job == null) continue;
                    // 预热 package 缓存：packages 是普通 Dictionary，不是线程安全的；EPPlus 打开文件本身也应串行。
                    GetPackage(Path.GetFullPath(job.Path));
                    // 预建输出目录，免得并行阶段多个线程同时 CreateDirectory
                    if (job.HasC) EnsureJsonDir(ConfigType.c, job.RelativeDir);
                    if (job.HasS) EnsureJsonDir(ConfigType.s, job.RelativeDir);
                    jobs.Add(job);
                }

                List<string> jobErrors = new List<string>();
                Parallel.ForEach(jobs, job =>
                {
                    try
                    {
                        ExportExcelJsonOnly(job);
                    }
                    catch (Exception ex)
                    {
                        lock (jobErrors)
                        {
                            jobErrors.Add($"{Path.GetFileName(job.Path)}: {ex.Message}");
                        }
                    }
                });
                foreach (string err in jobErrors)
                {
                    Console.WriteLine("导出中间 json 失败 " + err);
                }

                // 阶段二：按 protoName 串行合并（合并顺序由 jsonPaths 排序决定，与阶段一的完成顺序无关）
                List<string> protoNames = new List<string>();
                HashSet<string> seenProto = new HashSet<string>();
                HashSet<string> protoC = new HashSet<string>();
                foreach (ExportJob job in jobs)
                {
                    if (seenProto.Add(job.ProtoName)) protoNames.Add(job.ProtoName);
                    if (job.HasC) protoC.Add(job.ProtoName);
                }
                foreach (string protoName in protoNames)
                {
                    if (protoC.Contains(protoName))
                    {
                        MergeProto(ConfigType.c, protoName);
                    }
                }
#if !NOT_SERVER
                // 服务端输出按 relativeDir 分目录，不做扁平合并，沿用"每个分表各写一次"的旧语义，
                // 但改到阶段二执行，确保所有中间 json 已经落盘。
                foreach (ExportJob job in jobs)
                {
                    if (job.HasS)
                    {
                        MoveJson2Project(ConfigType.s, job.ProtoName, job.RelativeDir);
                    }
                }
#endif
                if (jobErrors.Count == 0)
                {
                    Console.WriteLine("ExcelExporter 成功");
                }
                else
                {
                    Console.WriteLine($"ExcelExporter 失败 {jobErrors.Count} 个分表（见上方日志），其余表已导出");
                }
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
        public static bool ExportTarget(string target)
        {
            string fullAbsolute = Path.GetFullPath(target);

            var name = Path.GetFileName(target);
            Console.WriteLine($"Exporter{name} 开始");
            try
            {
                template = File.ReadAllText("Template.txt");
                ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

                bool ignoreCase = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
                StringComparison pathCompare = ignoreCase ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;

                // 1. 先定位目标文件，并解析出它的导出任务。找不到就明确报错，
                //    不再像原来那样什么都没导也打印"成功"（路径写法不对时会被误当成已导出）。
                ExportJob targetJob = null;
                foreach (string path in ExportHelper.FindFile(excelDir))
                {
                    if (!string.Equals(Path.GetFullPath(path, Directory.GetCurrentDirectory()), fullAbsolute, pathCompare)) continue;
                    targetJob = BuildJob(path);
                    break;
                }

                if (targetJob == null)
                {
                    Console.WriteLine($"ExcelExporterTarget 失败：{Path.GetFullPath(excelDir)} 下找不到可导出的目标表 {target}");
                    return false;
                }

                // 2. 表头必须按整个 protoName 分组收集，而不是只读目标这一张表。
                //    分表（ItemConfig_武器 / ItemConfig_头盔 …）共用同一个 ItemConfig 协议，
                //    只读其中一张会漏掉其它分表独有的字段（例如 param0），结果是生成的 .ts 缺字段、
                //    合并出的 bin 把这些字段整列丢掉。这里复用全量导表的遍历顺序，
                //    字段 desc / @ProtoMember 序号才与全量导表结果一致，避免无意义的 .ts 抖动。
                List<ExportJob> groupJobs = new List<ExportJob>();
                bool hasC = false;
#if !NOT_SERVER
                bool hasS = false;
#endif
                foreach (string path in ExportHelper.FindFile(excelDir))
                {
                    ExportJob job = BuildJob(path);
                    if (job == null || !string.Equals(job.ProtoName, targetJob.ProtoName, StringComparison.Ordinal)) continue;

                    Table table = GetTable(job.ProtoName);
                    if (job.HasC)
                    {
                        table.C = true;
                        hasC = true;
                    }
#if !NOT_SERVER
                    if (job.HasS)
                    {
                        table.S = true;
                        hasS = true;
                    }
#endif
                    ExportExcelClass(GetPackage(Path.GetFullPath(job.Path)), job.ProtoName, table);
                    groupJobs.Add(job);
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

                // 3. 先写中间 json：同组的分表一起写。合并只能基于磁盘上的中间 json，
                //    只刷新目标分表时，其它分表的 json 可能是上次全量导表留下的旧数据，
                //    甚至从头就没生成过（Excel/Json 是会被清空的），那样合并出来的 bin 会静默缺行。
                //    分表 package 在上一步收集表头时已经打开，这里不会额外付打开成本。
                foreach (ExportJob job in groupJobs)
                {
                    ExportExcelJsonOnly(job);
                }

                // 4. 合并只在组内做一次，与 Export 的两阶段保持一致。
                if (hasC)
                {
                    MergeProto(ConfigType.c, targetJob.ProtoName);
                }
#if !NOT_SERVER
                // 服务端输出按 relativeDir 分目录，不做扁平合并（与 Export 相同）
                if (hasS)
                {
                    foreach (ExportJob job in groupJobs)
                    {
                        if (job.HasS)
                        {
                            MoveJson2Project(ConfigType.s, job.ProtoName, job.RelativeDir);
                        }
                    }
                }
#endif

                Console.WriteLine($"ExcelExporterTarget 成功：{targetJob.ProtoName}（{groupJobs.Count} 个分表）");
                return true;
            }
            catch (Exception e)
            {
                Console.WriteLine(e.ToString());
                return false;
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

        /// <summary>
        /// 单个分表的导出任务。同 protoName 的多个分表共享一个 xxxCategory.bin，
        /// 因此合并必须按 protoName 归组、且每组只做一次。
        /// </summary>
        private sealed class ExportJob
        {
            /// <summary>源 xlsx 路径</summary>
            public string Path;
            /// <summary>相对 excelDir 的子目录，决定中间 json 落在哪一层</summary>
            public string RelativeDir;
            /// <summary>中间 json 文件名（分表保留 _标签，用于按 protoName 前缀合并）</summary>
            public string JsonName;
            /// <summary>协议名 / 合并键</summary>
            public string ProtoName;
            public bool HasC;
            public bool HasS;
        }

        /// <summary>解析文件名得到导出任务；不参与导出的文件返回 null</summary>
        private static ExportJob BuildJob(string path)
        {
            string fileName = Path.GetFileName(path);
            if (!fileName.EndsWith(".xlsx") || fileName.StartsWith("~$") || fileName.Contains("#"))
            {
                return null;
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

            return new ExportJob
            {
                Path = path,
                RelativeDir = Path.GetRelativePath(excelDir, Path.GetDirectoryName(path)),
                JsonName = fileNameWithoutCS,
                ProtoName = protoName,
                HasC = cs.Contains("c"),
                HasS = cs.Contains("s"),
            };
        }

        private static void EnsureJsonDir(ConfigType configType, string relativeDir)
        {
            string dir = string.Format(jsonDir, configType.ToString(), relativeDir);
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
        }

        /// <summary>
        /// 阶段一：只把单个分表写成中间 json，不写 bin / 不写服务端合并产物，可与其它分表并行。
        /// </summary>
        private static void ExportExcelJsonOnly(ExportJob job)
        {
            Table table = GetTable(job.ProtoName);
            ExcelPackage p = GetPackage(Path.GetFullPath(job.Path));

            if (job.HasC)
            {
                ExportExcelJson(p, job.JsonName, table, ConfigType.c, job.RelativeDir);
            }

            if (job.HasS)
            {
                ExportExcelJson(p, job.JsonName, table, ConfigType.s, job.RelativeDir);
            }
        }

        /// <summary>
        /// 阶段二：把一个 protoName 的全部中间 json 合并成一份客户端产物。必须在阶段一全部落盘后调用。
        /// 客户端输出目录是扁平结构（GetProtoDir 忽略 relativeDir），故这里传空串。
        /// </summary>
        private static void MergeProto(ConfigType configType, string protoName)
        {
            Table table = GetTable(protoName);
            ExportExcelProto(configType, protoName, string.Empty, table);
        }

        /// <summary>
        /// 删除目录里本次不会再生成的旧产物，**.meta 一律不动**。
        /// 不能整目录删除的原因：*.meta 记着 Cocos 的资源 uuid，连目录一起删会让编辑器重新导入时
        /// 分配新 uuid，已保存的 prefab / scene / 代码引用会全部断开。
        /// </summary>
        private static void CleanStaleOutputs(string dir, string searchPattern, HashSet<string> expectedNames)
        {
            if (!Directory.Exists(dir))
            {
                return;
            }

            foreach (string file in Directory.GetFiles(dir, searchPattern, SearchOption.TopDirectoryOnly))
            {
                if (file.EndsWith(".meta", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                string name = Path.GetFileName(file);
                if (expectedNames.Contains(name))
                {
                    continue;
                }

                try
                {
                    File.Delete(file);
                    Console.WriteLine("清理过期产物 " + name);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"清理过期产物失败 {name}: {ex.Message}");
                }
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
                case "bigint":
                case "BigInteger":
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
                case "bigint":
                case "BigInteger":
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
                    case "bigint":
                    case "BigInteger":
                        {
                            // protobuf-net BigIntegerSurrogate 布局：外层成员字段内嵌 surrogate 消息（field1 = Data，LE 补码）
                            //[ProtoContract]
                            //public class BigIntegerSurrogate
                            //{
                            //    [ProtoMember(1, OverwriteList = true)]
                            //    public byte[] Data { get; set; }

                            //    public static implicit operator BigInteger(BigIntegerSurrogate surrogate)
                            //        => new BigInteger(surrogate.Data);

                            //    public static implicit operator BigIntegerSurrogate(BigInteger value)
                            //        => new BigIntegerSurrogate { Data = value.ToByteArray() };
                            //}
                            BigInteger bi = ToBigInteger(v, headInfo, ctx);
                            using MemoryStream inner = new MemoryStream();
                            ProtoWriter.WriteBytesField(inner, 1, bi.ToByteArray());
                            ProtoWriter.WriteBytesField(ms, headInfo.FieldIndex, inner.ToArray());
                            break;
                        }
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

        static BigInteger ToBigInteger(JsonData d, HeadInfo headInfo, string ctx)
        {
            // 中间 JSON 中 BigInteger 以字符串承载（唯一不丢精度的形式），空值对齐 int 的空→0 行为
            if (d.IsString)
            {
                string s = ((IJsonWrapper)d).GetString()?.Trim() ?? "";
                if (s.Length == 0)
                {
                    return BigInteger.Zero;
                }
                if (BigInteger.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out BigInteger result))
                {
                    return result;
                }
                throw new Exception($"导表类型错误: {ctx}，字段 {headInfo.FieldName} 声明 {headInfo.FieldType}，但值 \"{s}\" 不是整数，请修改 Excel 后重新导表");
            }
            if (d.IsInt)
            {
                return new BigInteger(((IJsonWrapper)d).GetInt());
            }
            if (d.IsLong)
            {
                return new BigInteger(((IJsonWrapper)d).GetLong());
            }
            if (d.IsDouble)
            {
                double v = ToIntegral(d, headInfo, ctx);
                if (v < long.MinValue || v > long.MaxValue)
                {
                    throw new Exception($"导表类型错误: {ctx}，字段 {headInfo.FieldName} 值 {v} 超出范围，请修改 Excel 后重新导表");
                }
                return new BigInteger((long)v);
            }
            throw new Exception($"导表类型错误: {ctx}，字段 {headInfo.FieldName} 声明 {headInfo.FieldType}，但值不是数字或字符串，请修改 Excel 后重新导表");
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
                case "bigint":
                case "BigInteger":
                    return "\"bigint\"";
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
                case "bigint":
                case "BigInteger":
                    return " = 0n";
                default:
                    return "";
            }
        }

        #endregion
    }
}