using OfficeOpenXml;
using System.Text;

namespace TaoWu
{
    internal class AttrExporter
    {
        private const string ClassDir = "../assets/scripts/Code/Module/Const/NumericType.ts";

        private const string excelDir = "../Excel";
        public class Info
        {
            public string Key;
            public string Id;
            public string Remarks;
            public string Affected;
        }

        public static void Export()
        {
            Console.WriteLine("AttrExporter 开始");
            foreach (string excelPath in ExportHelper.FindFile(excelDir))
            {
                if (!excelPath.EndsWith(".xlsx") || excelPath.StartsWith("~$") || excelPath.Contains("#"))
                {
                    continue;
                }
                if (!excelPath.Contains("AttributeConfig")) continue;
                using Stream stream = new FileStream(excelPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using ExcelPackage p = new ExcelPackage(stream);

                List<Info> list = new List<Info>();
                ExportExcelEnum(p, list);

                StringBuilder str = new StringBuilder();
                str.AppendLine("export const NumericType = {");
                str.AppendLine($"	/** 根据值取Key */");
                str.AppendLine($"	getKey(value: number): string | undefined {{");
                str.AppendLine($"	    const entry = Object.entries(this).find(");
                str.AppendLine($"	        ([, val]) => typeof val === 'number' && val === value");
                str.AppendLine($"	    );");
                str.AppendLine($"	    return entry ? entry[0] : undefined;");
                str.AppendLine($"	}},");
                str.AppendLine("	Max : 10000,");

                foreach (var item in list)
                {

                    str.AppendLine();
                    str.AppendLine($"	/** {item.Remarks} */");
                    str.AppendLine($"	{item.Key} : {item.Id},");
                    str.AppendLine($"	/** {item.Remarks}Base */");
                    str.AppendLine($"	{item.Key}Base : {item.Id} * 10 + 1,");
                    if (item.Affected == "1")
                    {
                        str.AppendLine($"	/** {item.Remarks}Add */");
                        str.AppendLine($"	{item.Key}Add : {item.Id} * 10 + 2,");
                        str.AppendLine($"	/** {item.Remarks}Pct */");
                        str.AppendLine($"	{item.Key}Pct : {item.Id} * 10 + 3,");
                        str.AppendLine($"	/** {item.Remarks}FinalAdd */");
                        str.AppendLine($"	{item.Key}FinalAdd : {item.Id} * 10 + 4,");
                        str.AppendLine($"	/** {item.Remarks}FinalPct */");
                        str.AppendLine($"	{item.Key}FinalPct : {item.Id} * 10 + 5,");
                    }
                }
                str.AppendLine("} as const");

                File.WriteAllText(ClassDir, str.ToString());
                Console.WriteLine("AttrExporter 成功");
                return;
            }
            Console.WriteLine("AttrExporter 文件未找到");
        }

        static void ExportExcelEnum(ExcelPackage p, List<Info> list)
        {
            foreach (ExcelWorksheet worksheet in p.Workbook.Worksheets)
            {
                if (worksheet.Dimension == null || worksheet.Dimension.End == null) continue;
                ExportSheetEnum(worksheet, list);
            }
        }

        static void ExportSheetEnum(ExcelWorksheet worksheet, List<Info> sb)
        {
            int infoRow = 2;
            int KeyIndex = 0, RemarksIndex = 0, AffectedIndex = 0, IdIndex = 0;
            for (int col = 3; col <= worksheet.Dimension.End.Column; ++col)
            {
                string fieldName = worksheet.Cells[infoRow + 2, col].Text.Trim();
                if (fieldName == "")
                {
                    continue;
                }
                if (fieldName == "Id")
                {
                    IdIndex = col;
                    continue;
                }
                if (fieldName == "Remarks")
                {
                    RemarksIndex = col;
                    continue;
                }
                if (fieldName == "Key")
                {
                    KeyIndex = col;
                    continue;
                }
                if (fieldName == "Affected")
                {
                    AffectedIndex = col;
                    continue;
                }
            }

            for (int row = 6; row <= worksheet.Dimension.End.Row; ++row)
            {
                Info info = new Info();

                if (worksheet.Cells[row, 3].Text.Trim() == "")
                {
                    continue;
                }

                info.Id = worksheet.Cells[row, IdIndex].Text;
                info.Remarks = worksheet.Cells[row, RemarksIndex].Text;
                info.Key = worksheet.Cells[row, KeyIndex].Text;
                info.Affected = worksheet.Cells[row, AffectedIndex].Text;
                sb.Add(info);
            }
        }

    }
}
