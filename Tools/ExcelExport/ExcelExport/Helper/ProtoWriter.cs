using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

namespace TaoWu
{
    /// <summary>
    /// 标准 protobuf wire format 编码器（与客户端 ProtoHelper.ts 的 MiniProtoReader 解码对应）
    /// 仅支持当前配置表用到的字段类型：int32/uint32/int64/float/double/string 及对应 repeated
    /// </summary>
    public static class ProtoWriter
    {
        public const int WireVarint = 0;
        public const int WireFixed64 = 1;
        public const int WireLength = 2;
        public const int WireFixed32 = 5;

        public static void WriteVarint(System.IO.Stream s, ulong v)
        {
            while (v > 0x7f)
            {
                s.WriteByte((byte)((v & 0x7f) | 0x80));
                v >>= 7;
            }
            s.WriteByte((byte)v);
        }

        public static void WriteTag(System.IO.Stream s, int field, int wire)
        {
            WriteVarint(s, (ulong)((field << 3) | wire));
        }

        public static void WriteBytesField(System.IO.Stream s, int field, byte[] bytes)
        {
            WriteTag(s, field, WireLength);
            WriteVarint(s, (ulong)bytes.Length);
            s.Write(bytes, 0, bytes.Length);
        }

        public static void WriteStringField(System.IO.Stream s, int field, string value)
        {
            WriteBytesField(s, field, Encoding.UTF8.GetBytes(value ?? ""));
        }

        public static void WriteInt32Field(System.IO.Stream s, int field, int value)
        {
            WriteTag(s, field, WireVarint);
            // protobuf 规范：int32 负值按 64 位符号扩展编码
            WriteVarint(s, unchecked((ulong)(long)value));
        }

        public static void WriteUInt32Field(System.IO.Stream s, int field, uint value)
        {
            WriteTag(s, field, WireVarint);
            WriteVarint(s, value);
        }

        public static void WriteInt64Field(System.IO.Stream s, int field, long value)
        {
            WriteTag(s, field, WireVarint);
            WriteVarint(s, unchecked((ulong)value));
        }

        public static void WriteUInt64Field(System.IO.Stream s, int field, ulong value)
        {
            WriteTag(s, field, WireVarint);
            WriteVarint(s, value);
        }

        public static void WriteFloatField(System.IO.Stream s, int field, float value)
        {
            WriteTag(s, field, WireFixed32);
            byte[] bytes = BitConverter.GetBytes(BitConverter.SingleToInt32Bits(value));
            WriteLittleEndian(s, bytes);
        }

        public static void WriteDoubleField(System.IO.Stream s, int field, double value)
        {
            WriteTag(s, field, WireFixed64);
            byte[] bytes = BitConverter.GetBytes(BitConverter.DoubleToInt64Bits(value));
            WriteLittleEndian(s, bytes);
        }

        private static void WriteLittleEndian(System.IO.Stream s, byte[] bytes)
        {
            if (BitConverter.IsLittleEndian)
            {
                s.Write(bytes, 0, bytes.Length);
                return;
            }
            Array.Reverse(bytes);
            s.Write(bytes, 0, bytes.Length);
        }

        /// <summary>repeated 标量 packed 编码（proto3 默认）</summary>
        public static void WritePackedInt32(System.IO.Stream s, int field, IEnumerable<int> values)
        {
            using MemoryStream inner = new MemoryStream();
            foreach (int v in values)
            {
                WriteVarint(inner, unchecked((ulong)(long)v));
            }
            WriteBytesField(s, field, inner.ToArray());
        }

        public static void WritePackedUInt32(System.IO.Stream s, int field, IEnumerable<uint> values)
        {
            using MemoryStream inner = new MemoryStream();
            foreach (uint v in values)
            {
                WriteVarint(inner, v);
            }
            WriteBytesField(s, field, inner.ToArray());
        }

        public static void WritePackedInt64(System.IO.Stream s, int field, IEnumerable<long> values)
        {
            using MemoryStream inner = new MemoryStream();
            foreach (long v in values)
            {
                WriteVarint(inner, unchecked((ulong)v));
            }
            WriteBytesField(s, field, inner.ToArray());
        }

        public static void WritePackedFloat(System.IO.Stream s, int field, IEnumerable<float> values)
        {
            using MemoryStream inner = new MemoryStream();
            foreach (float v in values)
            {
                byte[] bytes = BitConverter.GetBytes(BitConverter.SingleToInt32Bits(v));
                WriteLittleEndian(inner, bytes);
            }
            WriteBytesField(s, field, inner.ToArray());
        }

        public static void WritePackedDouble(System.IO.Stream s, int field, IEnumerable<double> values)
        {
            using MemoryStream inner = new MemoryStream();
            foreach (double v in values)
            {
                byte[] bytes = BitConverter.GetBytes(BitConverter.DoubleToInt64Bits(v));
                WriteLittleEndian(inner, bytes);
            }
            WriteBytesField(s, field, inner.ToArray());
        }
    }
}