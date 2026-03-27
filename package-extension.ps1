# PromptVault 浏览器扩展打包脚本
# 用于生成可直接加载的浏览器扩展压缩包

param(
    [string]$Version = "",
    [string]$OutputDir = ".\dist"
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 颜色定义
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"
$Red = "Red"

Write-Host "========================================" -ForegroundColor $Cyan
Write-Host "    PromptVault Extension Packager" -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan
Write-Host ""

# 获取版本号
if (-not $Version) {
    # 尝试从 manifest.json 读取版本
    if (Test-Path "manifest.json") {
        try {
            $manifest = Get-Content "manifest.json" -Raw | ConvertFrom-Json
            $Version = $manifest.version
            Write-Host "从 manifest.json 读取到版本: $Version" -ForegroundColor $Green
        } catch {
            $Version = "1.0.0"
            Write-Host "无法读取版本号，使用默认版本: $Version" -ForegroundColor $Yellow
        }
    } else {
        $Version = "1.0.0"
        Write-Host "未找到 manifest.json，使用默认版本: $Version" -ForegroundColor $Yellow
    }
}

# 创建输出目录
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Host "创建输出目录: $OutputDir" -ForegroundColor $Green
}

# 定义文件名
$zipFileName = "PromptVault-v$Version.zip"
$zipFilePath = Join-Path $OutputDir $zipFileName

# 如果文件已存在，删除它
if (Test-Path $zipFilePath) {
    Remove-Item $zipFilePath -Force
    Write-Host "已删除旧的压缩包: $zipFileName" -ForegroundColor $Yellow
}

# 定义需要包含的文件和目录
$includeItems = @(
    "manifest.json",
    "index.html",
    "popup.html",
    "background.js",
    "README.md",
    "js",
    "icons"
)

# 定义需要排除的模式
$excludePatterns = @(
    "*.ps1",           # PowerShell 脚本
    "*.zip",           # 已有的压缩包
    ".git*",           # Git 相关
    ".vscode",         # VS Code 配置
    "node_modules",    # Node 依赖
    "dist",            # 输出目录（避免递归）
    "*.md",            # Markdown 文档（可选，保留 README.md）
    "*.txt",           # 文本文件
    "package*.json",   # Node 包配置
    ".*"               # 隐藏文件
)

Write-Host ""
Write-Host "正在打包文件..." -ForegroundColor $Cyan
Write-Host "版本: $Version" -ForegroundColor $Cyan
Write-Host "输出: $zipFilePath" -ForegroundColor $Cyan
Write-Host ""

# 创建临时目录
$tempDir = Join-Path $env:TEMP "PromptVault-Build-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    # 复制文件到临时目录
    foreach ($item in $includeItems) {
        if (Test-Path $item) {
            $destPath = Join-Path $tempDir $item
            if ((Get-Item $item) -is [System.IO.DirectoryInfo]) {
                # 复制目录
                Copy-Item -Path $item -Destination $destPath -Recurse -Force
                Write-Host "  [目录] $item" -ForegroundColor $Green
            } else {
                # 复制文件
                Copy-Item -Path $item -Destination $destPath -Force
                Write-Host "  [文件] $item" -ForegroundColor $Green
            }
        } else {
            Write-Host "  [跳过] $item (不存在)" -ForegroundColor $Yellow
        }
    }

    # 压缩文件
    Write-Host ""
    Write-Host "正在创建压缩包..." -ForegroundColor $Cyan
    
    # 使用 .NET 的压缩功能
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipFilePath, "Optimal", $false)

    # 显示结果
    $fileInfo = Get-Item $zipFilePath
    $sizeKB = [math]::Round($fileInfo.Length / 1KB, 2)

    Write-Host ""
    Write-Host "========================================" -ForegroundColor $Green
    Write-Host "打包成功！" -ForegroundColor $Green
    Write-Host "========================================" -ForegroundColor $Green
    Write-Host "文件: $zipFileName" -ForegroundColor $Green
    Write-Host "大小: $sizeKB KB" -ForegroundColor $Green
    Write-Host "路径: $zipFilePath" -ForegroundColor $Green
    Write-Host ""
    Write-Host "安装说明:" -ForegroundColor $Cyan
    Write-Host "1. 打开 Chrome/Edge 浏览器" -ForegroundColor $Cyan
    Write-Host "2. 访问 chrome://extensions/" -ForegroundColor $Cyan
    Write-Host "3. 开启'开发者模式'" -ForegroundColor $Cyan
    Write-Host "4. 将 $zipFileName 拖入页面即可安装" -ForegroundColor $Cyan
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "错误: $_" -ForegroundColor $Red
    exit 1
} finally {
    # 清理临时目录
    if (Test-Path $tempDir) {
        Remove-Item -Path $tempDir -Recurse -Force
    }
}
