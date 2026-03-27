# PromptVault 打包说明

本文档说明如何打包 PromptVault 浏览器扩展，生成可直接加载的压缩包。

## 打包脚本

项目提供了三种打包方式，你可以根据自己的环境选择：

### 方法一：双击运行（推荐 Windows 用户）

直接双击运行 `package.bat`，脚本会自动：
- 从 `manifest.json` 读取版本号
- 打包所需文件
- 生成到 `dist` 目录

### 方法二：PowerShell

```powershell
# 基本用法（自动读取版本）
.\package-extension.ps1

# 指定版本号
.\package-extension.ps1 -Version "1.1.0"

# 指定输出目录
.\package-extension.ps1 -OutputDir "D:\\Releases"
```

### 方法三：Node.js（跨平台）

```bash
# 基本用法（自动读取版本）
node package.js

# 指定版本号
node package.js 1.1.0
```

## 打包内容

以下文件和目录会被包含在压缩包中：

```
PromptVault-v{版本}.zip
├── manifest.json      # 扩展配置
├── index.html         # 主页面
├── popup.html         # 弹出窗口
├── background.js      # 后台脚本
├── README.md          # 说明文档
├── js/                # JavaScript 文件
│   ├── app.js
│   ├── popup.js
│   ├── content.js
│   ├── tailwindcss.js
│   ├── dexie.min.js
│   └── lucide.js
└── icons/             # 图标文件
```

## 排除的文件

以下文件和目录会被自动排除：

- `.git*` - Git 版本控制文件
- `.vscode` - VS Code 配置
- `node_modules` - Node.js 依赖
- `dist` - 输出目录（避免递归）
- `*.ps1` - PowerShell 脚本
- `*.bat` - 批处理脚本
- `package.js` - Node 打包脚本
- `*.zip` - 已有的压缩包

## 安装扩展

打包完成后，按以下步骤安装到浏览器：

### Chrome / Edge

1. 打开浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 将生成的 `PromptVault-v{版本}.zip` 文件拖入页面
4. 扩展会自动安装

### Firefox

Firefox 需要使用 `.xpi` 格式，需要使用 Mozilla 的签名服务或开发者版进行安装。

## 手动打包

如果你需要手动打包，只需将以下文件压缩成 ZIP：

```
manifest.json
index.html
popup.html
background.js
README.md
js/
icons/
```

**注意**：确保 `manifest.json` 在 ZIP 的根目录。

## 版本号说明

版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

- `主版本号.次版本号.修订号`（如 `1.0.0`）
- 主版本号：重大功能变更或不兼容修改
- 次版本号：新增功能，向下兼容
- 修订号：问题修复，向下兼容

`manifest.json` 中的版本号会自动被读取用于生成文件名。
