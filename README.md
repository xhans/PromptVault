# PromptVault - AI Prompt 收藏库浏览器扩展

PromptVault 是一个本地 AI Prompt 收藏与管理工具，支持一键捕获网页内容。所有数据存储在本地 IndexedDB 中，无需云服务，保障隐私安全。

## 功能特点

- 🖼️ **一键捕获**：选中网页文本，一键保存到 PromptVault
- 🗄️ **本地存储**：所有数据保存在本地，无需云服务
- 🏷️ **分类管理**：支持通用、写作、编程、图像、分析等分类
- 🔍 **快速搜索**：支持按标题、内容、标签搜索
- 🔄 **导入导出**：支持 JSON 格式的数据备份与恢复
- ⭐ **收藏夹**：收藏重要的 Prompt，快速访问

## 安装方法

### Chrome / Edge 浏览器

1. 下载本项目并解压
2. 打开 Chrome 或 Edge 浏览器，访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展"
5. 选择解压后的项目文件夹
6. 扩展已安装完成，可以开始使用！

## 使用方法

### 方式一：使用快捷键

1. 在任意网页选中要保存的文本
2. 按下 `Ctrl + Shift + S` (或 `Cmd + Shift + S` 在 Mac 上)
3. 侧边栏自动打开，填充了选中的内容
4. 编辑标题和分类，点击保存

### 方式二：使用右键菜单

1. 选中网页上的文本
2. 右键点击，选择"保存到 PromptVault"
3. 侧边栏自动打开并填充数据

### 方式三：使用扩展按钮

1. 点击浏览器工具栏上的 PromptVault 图标
2. 在弹出窗口中点击"捕获选中内容"
3. 侧边栏自动打开

### 方式四：使用侧边栏

1. 点击扩展图标，直接打开侧边栏
2. 点击"新建 Prompt"手动添加

## 文件说明

```
ai-prompt.b/
├── manifest.json          # 扩展配置文件
├── background.js          # 后台服务工作者
├── index.html             # 主页面（侧边栏）
├── ai-prompt.b.html       # 原始 HTML 文件
├── popup.html             # 扩展弹出窗口
├── js/
│   ├── content.js         # 内容脚本（页面注入）
│   └── popup.js           # 弹窗脚本
├── icons/
│   ├── icon16.png         # 16x16 图标
│   ├── icon32.png         # 32x32 图标
│   ├── icon48.png         # 48x48 图标
│   └── icon128.png        # 128x128 图标
└── README.md              # 说明文件
```

## 数据导入/导出

### 导出数据

1. 打开侧边栏
2. 点击左下角的"导出 JSON"按钮
3. 数据将保存为 JSON 文件

### 导入数据

1. 点击左下角的"导入 JSON"按钮
2. 选择之前导出的 JSON 文件
3. 数据将自动导入

## 技术栈

- **前端**: HTML5, Tailwind CSS, Vanilla JavaScript
- **图标**: Lucide Icons
- **存储**: IndexedDB (Dexie.js)
- **扩展**: Chrome Extension Manifest V3

## 浏览器兼容性

- Chrome 114+
- Edge 114+
- 其他支持 Manifest V3 的 Chromium 浏览器

## 隐私说明

- 所有 Prompt 数据存储在本地 IndexedDB 中
- 不会上传到任何服务器
- 不收集用户使用数据
- 清除浏览器数据时，收藏的 Prompt 也会被清除

## License

MIT License
