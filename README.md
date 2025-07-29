# Electron浏览器项目开发文档

## 项目概述
该项目是一个基于Electron的浏览器应用，主要功能包括：
1. 自动生成当前页面的使用说明。
2. 提供悬浮按钮，点击后可以：
   - 获取当前页面的HTML、CSS、JS代码。
   - 截取整个浏览器窗口的截图。
   - 将上述数据发送给大模型以生成页面使用说明。
3. 支持通过MCP方式调用Windows系统接口，实现自动化操作（如点击）。

---

## 技术栈
- **主框架**: Electron
- **前端**: HTML, CSS, JavaScript
- **后端**: Node.js
- **通信协议**: MCP（Model Context Protocol）
- **截图工具**: Electron内置API或第三方库（如`puppeteer`）
- **大模型接口**: 使用HTTP或WebSocket与大模型交互
- **Windows系统接口**: 使用Node.js的`ffi-napi`或`edge-js`库调用Windows API

---

## 功能模块设计

### 1. 悬浮按钮模块
- **功能**: 在浏览器窗口中显示悬浮按钮。
- **实现**:
  - 使用CSS实现悬浮样式。
  - 使用Electron的`BrowserWindow`创建一个透明窗口，嵌入悬浮按钮。

### 2. 页面数据采集模块
- **功能**: 获取当前页面的HTML、CSS、JS代码。
- **实现**:
  - 使用Electron的`webContents.executeJavaScript`方法在渲染进程中执行脚本，提取页面内容。

### 3. 截图模块
- **功能**: 截取整个浏览器窗口的截图。
- **实现**:
  - 使用Electron的`webContents.capturePage`方法获取截图。

### 4. 数据发送模块
- **功能**: 将页面数据和截图发送给大模型。
- **实现**:
  - 使用HTTP或WebSocket与大模型交互。
  - 数据格式：JSON，包含HTML、CSS、JS代码和截图的Base64编码。

### 5. 使用说明生成模块
- **功能**: 接收大模型返回的使用说明并展示。
- **实现**:
  - 在悬浮按钮附近弹出一个窗口，显示说明内容。

### 6. MCP接口调用模块
- **功能**: 调用Windows系统接口实现自动化操作。
- **实现**:
  - 使用`ffi-napi`或`edge-js`库调用Windows API。
  - 通过MCP协议与大模型交互，获取操作指令。

---

## 项目结构
```
electron-browser-ai/
├── main/                # 主进程代码
│   ├── main.js          # Electron入口文件
│   ├── mcp.js           # MCP接口调用模块
│   └── model-api.js     # 与大模型交互模块
├── renderer/            # 渲染进程代码
│   ├── index.html       # 主页面
│   ├── index.js         # 页面逻辑
│   ├── floating-button/ # 悬浮按钮模块
│   │   ├── button.js    # 悬浮按钮逻辑
│   │   └── button.css   # 悬浮按钮样式
│   └── utils/           # 工具模块
│       ├── capture.js   # 截图功能
│       ├── extract.js   # 页面数据采集功能
│       └── display.js   # 使用说明展示功能
├── package.json         # 项目配置文件
└── README.md            # 项目说明文档
```

---

## 开发步骤

### 1. 初始化项目
1. 安装Electron：
   ```powershell
   npm init -y
   npm install electron
   ```
2. 创建项目结构。

### 2. 开发主进程
1. 在`main.js`中初始化Electron窗口。
2. 实现与渲染进程的通信。

### 3. 开发渲染进程
1. 在`index.html`中设计主页面。
2. 在`floating-button/button.js`中实现悬浮按钮逻辑。
3. 在`utils/extract.js`中实现页面数据采集功能。
4. 在`utils/capture.js`中实现截图功能。

### 4. 与大模型交互
1. 在`model-api.js`中实现数据发送和接收逻辑。
2. 使用HTTP或WebSocket与大模型通信。

### 5. MCP接口调用
1. 在`mcp.js`中实现Windows API调用逻辑。
2. 使用`ffi-napi`或`edge-js`库。

### 6. 测试与优化
1. 测试各模块功能。
2. 优化性能和用户体验。

---

## 示例代码

### 悬浮按钮
`floating-button/button.js`:
```javascript
document.addEventListener('DOMContentLoaded', () => {
    const button = document.createElement('button');
    button.innerText = '生成说明';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '1000';
    button.style.padding = '10px 20px';
    button.style.backgroundColor = '#0078d7';
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';

    button.addEventListener('click', () => {
        // 调用采集和截图功能
        window.api.generateDocumentation();
    });

    document.body.appendChild(button);
});
```

### 页面数据采集
`utils/extract.js`:
```javascript
async function extractPageData() {
    const html = document.documentElement.outerHTML;
    const css = Array.from(document.styleSheets)
        .map(sheet => Array.from(sheet.cssRules || [])
        .map(rule => rule.cssText).join('\n')).join('\n');
    const scripts = Array.from(document.scripts)
        .map(script => script.src ? `// External script: ${script.src}` : script.innerText).join('\n');
    return { html, css, scripts };
}
```

---

## 后续扩展
1. 支持多语言说明生成。
2. 增加用户行为记录功能。
3. 提供更多自动化操作接口。

---

如果需要进一步的帮助或具体代码实现，请随时告知！
