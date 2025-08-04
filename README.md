# Electron Browser AI

基于Electron的智能浏览器应用，集成AI和Selenium自动化功能。

## 功能特性

- 🤖 **AI增强自动化** - 使用自然语言控制浏览器操作
- 🔍 **智能搜索** - 支持百度、淘宝等平台的智能搜索
- 🎯 **智能导航** - AI驱动的网页导航和操作
- 🐍 **Python集成** - 集成Python Selenium自动化脚本
- 💬 **AI聊天助手** - 内置AI对话功能
- 🖱️ **悬浮控制** - 便捷的悬浮按钮控制界面

## 技术栈

- **前端**: Electron, HTML5, CSS3, JavaScript
- **后端**: Node.js, Python
- **自动化**: Selenium WebDriver
- **AI**: 集成多种AI模型API

## 快速开始

### 环境要求

- Node.js 16+
- Python 3.8+
- Chrome/Chromium 浏览器

### 安装依赖

```bash
# 安装Node.js依赖
npm install

# 安装Python依赖
pip install -r python_automation/requirements.txt
```

### 启动应用

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 调试模式
npm run start:debug
```

## 使用说明

### AI自动化命令

在AI助手中输入自然语言命令，例如：

```
现在在百度搜索今日天气
帮我在淘宝搜索iPhone 15
打开GitHub，然后搜索"electron"
```

### 功能模块

- **AI聊天**: 与AI助手对话，获取帮助和建议
- **自动化执行**: 执行复杂的网页自动化任务
- **智能搜索**: 在各大平台进行智能搜索
- **页面分析**: AI驱动的页面内容分析

## 项目结构

```
electron-browser-ai/
├── main/                   # 主进程文件
│   ├── main.js            # 主进程入口
│   ├── preload.js         # 预加载脚本
│   └── model-api.js       # AI模型API
├── renderer/              # 渲染进程文件
│   ├── index.html         # 主页面
│   ├── index.js           # 主页面逻辑
│   ├── styles.css         # 样式文件
│   ├── automation/        # 自动化模块
│   ├── floating-button/   # 悬浮按钮
│   └── utils/             # 工具函数
├── python_automation/     # Python自动化脚本
│   ├── web_automation.py  # 网页自动化
│   ├── automation_bridge.js # Python桥接器
│   └── requirements.txt   # Python依赖
└── package.json           # 项目配置
```

## 开发指南

### 添加新的自动化功能

1. 在 `python_automation/web_automation.py` 中添加Python函数
2. 在 `python_automation/automation_bridge.js` 中导出函数
3. 在 `main/main.js` 中注册IPC处理器
4. 在 `main/preload.js` 中暴露API

### 自定义AI模型

在 `main/model-api.js` 中配置您的AI模型API：

```javascript
const API_CONFIG = {
    baseURL: 'your-api-endpoint',
    apiKey: 'your-api-key',
    model: 'your-model-name'
};
```

## 构建和部署

```bash
# 构建应用
npm run build

# 构建后的文件在 dist/ 目录中
```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。

## 支持

如果您在使用过程中遇到问题，请：

1. 查看控制台日志
2. 使用调试模式启动：`npm run start:debug`
3. 提交Issue描述问题

---

**享受AI驱动的智能自动化体验！** 🚀
