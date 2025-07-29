# Electron Browser AI - 智能网页分析工具

## 🎯 项目概述

Electron Browser AI 是一个基于 Electron 的智能浏览器应用，集成了先进的AI技术，能够自动分析网页内容并生成详细的使用说明。

### ✨ 核心功能

1. **AI驱动的网页分析** - 使用豆包多模态模型分析网页
2. **智能截图分析** - 结合页面代码和视觉截图进行综合分析
3. **实时调试监控** - 完整的AI交互过程监控和调试
4. **多模型支持** - 支持豆包、Ollama、OpenAI等多种AI模型
5. **自动化数据提取** - 智能提取HTML、CSS、JavaScript代码
6. **本地文件管理** - 安全的截图本地存储和自动清理

---

## 🚀 技术特性

### 多模态AI分析
- **豆包视觉模型**: `doubao-seed-1-6-250615` 支持图片+文本分析
- **代码理解**: 深度分析HTML、CSS、JavaScript结构
- **视觉识别**: 识别页面布局、按钮、交互元素
- **综合分析**: 结合代码逻辑和视觉效果

### 技术栈
- **主框架**: Electron
- **前端**: HTML5, CSS3, JavaScript ES6+
- **后端**: Node.js
- **AI集成**: HTTP API调用
- **截图技术**: Electron原生API + 本地文件存储
- **调试工具**: 自研调试面板

---

## 📁 项目结构

```
electron-browser-ai/
├── main/                    # 主进程代码
│   ├── main.js             # Electron入口文件
│   ├── model-api.js        # AI模型API集成
│   ├── mcp.js              # MCP接口调用模块
│   └── preload.js          # 预加载脚本
├── renderer/               # 渲染进程代码
│   ├── index.html          # 主界面
│   ├── index.js            # 主要逻辑
│   ├── styles.css          # 样式文件
│   ├── floating-button/    # 悬浮按钮模块
│   │   ├── button.js       # 按钮逻辑
│   │   └── button.css      # 按钮样式
│   └── utils/              # 工具模块
│       ├── capture.js      # 截图功能
│       ├── extract.js      # 页面数据提取
│       ├── display.js      # 结果展示
│       └── debug.js        # 调试工具
├── docs/                   # 文档目录
├── package.json            # 项目配置
└── README.md              # 项目说明
```

---

## 🛠️ 安装和使用

### 环境要求
- Node.js 16.0+
- npm 8.0+
- Windows 10+ / macOS 10.15+ / Linux

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/xuezaiqiang/electron-browser-ai.git
   cd electron-browser-ai
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动应用**
   ```bash
   npm start
   ```

### 基本使用

1. **访问网页** - 在地址栏输入要分析的网址
2. **生成分析** - 点击悬浮的"生成说明"按钮
3. **查看结果** - 在弹出面板中查看AI生成的详细说明
4. **调试监控** - 点击"🔍 调试"按钮监控分析过程

---

## 🎯 核心功能详解

### 1. 智能页面分析
- 自动提取页面HTML、CSS、JavaScript代码
- 分析页面结构和交互元素
- 识别表单、链接、图片等功能组件

### 2. AI驱动的说明生成
- 使用豆包多模态模型进行分析
- 结合代码结构和视觉截图
- 生成详细的功能说明和使用指南

### 3. 实时调试监控
- 完整的请求/响应监控
- 详细的操作日志记录
- 性能统计和错误诊断
- 调试数据导出功能

### 4. 多模型支持
- **豆包**: 支持图片分析的先进模型
- **Ollama**: 本地部署的开源模型
- **OpenAI**: GPT系列模型支持

---

## 🔧 技术亮点

### 本地文件截图方案
- 解决了"object could not be cloned"错误
- 截图保存到系统临时目录
- 使用文件URL进行AI分析
- 自动清理过期文件

### 防御性编程
- 完善的错误处理机制
- 数据序列化验证
- 安全的IPC通信
- 内存和性能优化

### 用户体验优化
- 直观的操作界面
- 实时的状态反馈
- 详细的错误提示
- 流畅的交互体验

---

## 📊 性能特性

- **响应时间**: AI分析通常在10-30秒内完成
- **内存占用**: 优化的内存管理，避免内存泄漏
- **文件管理**: 自动清理临时文件，防止磁盘占用
- **错误恢复**: 完善的错误处理，确保应用稳定性

---

## 🔮 未来规划

### 短期目标
- [ ] 支持更多AI模型
- [ ] 增加批量分析功能
- [ ] 优化分析速度
- [ ] 增强错误处理

### 长期目标
- [ ] 支持插件系统
- [ ] 云端分析服务
- [ ] 多语言界面
- [ ] 移动端支持

---

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

---

## 📞 联系方式

- 项目地址: [https://github.com/xuezaiqiang/electron-browser-ai](https://github.com/xuezaiqiang/electron-browser-ai)
- 问题反馈: [Issues](https://github.com/xuezaiqiang/electron-browser-ai/issues)

---

**让AI为您的网页分析提供智能支持！** 🚀
