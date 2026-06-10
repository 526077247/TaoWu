import { BuildHook, IBuildResult, IBuildTaskOption, ITaskOptions } from '../@types';
import * as fs from "fs";
import * as path from 'path';
import * as JavaScriptObfuscator from 'javascript-obfuscator';

// 自定义混淆函数
const obfuscateMainJs = (options: IBuildTaskOption, result: IBuildResult) => {
    let destDir = path.join(result.paths.dir, "subpackages", "main");
    if(!fs.existsSync(destDir)){
        destDir = path.join(result.paths.dir, "assets", "main");
    }
    // 从构建选项获取配置
    const enableObfuscate = options.packages["taowu-editor"].enableObfuscate;
    if (!enableObfuscate) {
        console.log('[CodeObfuscate] 代码混淆未启用，跳过');
        return;
    }
    console.log(`[混淆插件] 构建完成，开始混淆，输出目录: ${destDir}`);

    const findMainJs = (dir: string): string | null => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                const result = findMainJs(fullPath);
                if (result) return result;
            } else if (/^(index|game)(?:\.[a-f0-9]+)?\.js$/.test(file)) {
                return fullPath;
            }
        }
        return null;
    };

    const targetFile = findMainJs(destDir);
    if (targetFile) {
        try {
            const code = fs.readFileSync(targetFile, 'utf8');
            const obfuscatedResult = JavaScriptObfuscator.obfuscate(code, {
                // ✅ 推荐启用的功能
                compact: true,                             // 紧凑输出，移除换行
                controlFlowFlattening: false,              // 核心控制：禁用，避免体积剧增
                deadCodeInjection: false,                  // 核心控制：禁用，防止无意义增肥
                stringArray: true,                         // 启用字符串数组
                stringArrayThreshold: 0.2,                 // 降低阈值，平衡体积
                stringArrayEncoding: [],                   // 不编码，避免额外膨胀
                rotateStringArray: true,                   // 打乱数组，安全度↑，体积影响小
                shuffleStringArray: true,                  // 随机化数组，安全度↑，体积影响小
                transformObjectKeys: false,                // 不改对象键，保持体积稳定
                
                // ❌ 严格控制/完全禁用的功能（高体积代价）
                // deadCodeInjection: false,               // 绝对禁止，可膨胀+200%
                // controlFlowFlattening: false,           // 绝对禁止，大代码影响显著
                // selfDefending: false,                   // 禁用自我保护，避免额外开销
                
                // 基础安全设置
                identifierNamesGenerator: 'hexadecimal',   // 十六进制变量名
                renameGlobals: false,                      // 不改全局变量
                unicodeEscapeSequence: false               // 禁用Unicode转义
            });
            fs.writeFileSync(targetFile, obfuscatedResult.getObfuscatedCode());
            console.log(`[混淆插件] ✅ 混淆完成: ${targetFile}`);
        } catch (error: any) {
            console.error(`[混淆插件] ❌ 混淆失败: ${error.message}`);
        }
    } else {
        console.warn(`[混淆插件] ⚠️ 未找到符合规则的 index.js`);
    }
};

// 导出的构建钩子
export const onAfterBuild: BuildHook.onAfterBuild = async function (options: IBuildTaskOption, result: IBuildResult) {
    obfuscateMainJs(options, result);
};