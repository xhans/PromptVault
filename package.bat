@echo off
chcp 65001 >nul
title PromptVault 扩展打包工具

echo ========================================
echo     PromptVault Extension Packager
echo ========================================
echo.

:: 检查 PowerShell 是否可用
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 无法找到 PowerShell，请确保系统已安装 PowerShell。
    pause
    exit /b 1
)

:: 运行打包脚本
powershell -ExecutionPolicy Bypass -File "%~dp0package-extension.ps1" %*

if %errorlevel% neq 0 (
    echo.
    echo [错误] 打包过程中出现错误。
    pause
    exit /b 1
)

pause
