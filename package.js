#!/usr/bin/env node
/**
 * PromptVault 浏览器扩展打包脚本
 * 用于生成可直接加载的浏览器扩展压缩包
 * 
 * 使用方法:
 *   node package.js [版本号]
 * 
 * 示例:
 *   node package.js          # 自动从 manifest.json 读取版本
 *   node package.js 1.2.0    # 指定版本号
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    gray: '\x1b[90m'
};

const log = {
    info: (msg) => console.log(`${colors.cyan}${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}${msg}${colors.reset}`),
    gray: (msg) => console.log(`${colors.gray}${msg}${colors.reset}`)
};

console.log(`${colors.cyan}========================================${colors.reset}`);
console.log(`${colors.cyan}    PromptVault Extension Packager${colors.reset}`);
console.log(`${colors.cyan}========================================${colors.reset}`);
console.log();

// 获取版本号
function getVersion() {
    const argVersion = process.argv[2];
    if (argVersion) {
        log.info(`使用指定的版本号: ${argVersion}`);
        return argVersion;
    }

    // 尝试从 manifest.json 读取版本
    try {
        const manifestPath = path.join(__dirname, 'manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        log.success(`从 manifest.json 读取到版本: ${manifest.version}`);
        return manifest.version;
    } catch (err) {
        log.warning('无法读取版本号，使用默认版本: 1.0.0');
        return '1.0.0';
    }
}

// 创建临时目录
function createTempDir() {
    const tempDir = path.join(require('os').tmpdir(), `PromptVault-Build-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    return tempDir;
}

// 复制文件
function copyFile(src, dest) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        const items = fs.readdirSync(src);
        for (const item of items) {
            copyFile(path.join(src, item), path.join(dest, item));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

// 主函数
async function main() {
    const version = getVersion();
    const outputDir = path.join(__dirname, 'dist');
    const zipFileName = `PromptVault-v${version}.zip`;
    const zipFilePath = path.join(outputDir, zipFileName);

    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        log.success(`创建输出目录: ${outputDir}`);
    }

    // 删除旧的压缩包
    if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
        log.warning(`已删除旧的压缩包: ${zipFileName}`);
    }

    // 定义需要包含的文件和目录
    const includeItems = [
        'manifest.json',
        'index.html',
        'popup.html',
        'background.js',
        'README.md',
        'js',
        'icons'
    ];

    log.info('');
    log.info('正在打包文件...');
    log.info(`版本: ${version}`);
    log.info(`输出: ${zipFilePath}`);
    log.info('');

    // 创建临时目录并复制文件
    const tempDir = createTempDir();
    
    try {
        for (const item of includeItems) {
            const srcPath = path.join(__dirname, item);
            if (fs.existsSync(srcPath)) {
                const destPath = path.join(tempDir, item);
                copyFile(srcPath, destPath);
                const isDir = fs.statSync(srcPath).isDirectory();
                log.success(`  [${isDir ? '目录' : '文件'}] ${item}`);
            } else {
                log.warning(`  [跳过] ${item} (不存在)`);
            }
        }

        // 压缩文件
        log.info('');
        log.info('正在创建压缩包...');

        // 根据平台选择压缩方式
        const platform = process.platform;
        if (platform === 'win32') {
            // Windows: 使用 PowerShell
            try {
                execSync(`powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipFilePath}' -Force"`, {
                    stdio: 'ignore'
                });
            } catch {
                // 备选方案：使用 .NET
                execSync(`powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${tempDir}', '${zipFilePath}', 'Optimal', $false)"`, {
                    stdio: 'ignore'
                });
            }
        } else {
            // macOS/Linux: 使用 zip 命令
            execSync(`cd "${tempDir}" && zip -r "${zipFilePath}" .`, {
                stdio: 'ignore'
            });
        }

        // 显示结果
        const stats = fs.statSync(zipFilePath);
        const sizeKB = (stats.size / 1024).toFixed(2);

        log.success('');
        log.success('========================================');
        log.success('打包成功！');
        log.success('========================================');
        log.success(`文件: ${zipFileName}`);
        log.success(`大小: ${sizeKB} KB`);
        log.success(`路径: ${zipFilePath}`);
        log.info('');
        log.info('安装说明:');
        log.info('1. 打开 Chrome/Edge 浏览器');
        log.info('2. 访问 chrome://extensions/');
        log.info('3. 开启"开发者模式"');
        log.info(`4. 将 ${zipFileName} 拖入页面即可安装`);
        log.info('');

    } catch (err) {
        log.error('');
        log.error(`错误: ${err.message}`);
        process.exit(1);
    } finally {
        // 清理临时目录
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
}

main().catch(err => {
    log.error(err.message);
    process.exit(1);
});
