const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 页面数据提取
    extractPageData: () => ipcRenderer.invoke('extract-page-data'),

    // 截图功能
    captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),

    // 清理截图文件
    cleanupScreenshots: () => ipcRenderer.invoke('cleanup-screenshots'),

    // 保存文件
    saveFile: (data) => ipcRenderer.invoke('save-file', data),

    // 显示通知
    showNotification: (message) => ipcRenderer.invoke('show-notification', message),

    // 错误日志
    logError: (error) => ipcRenderer.invoke('log-error', error),

    // 获取平台信息
    platform: process.platform,

    // 版本信息
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    }
});

// 暴露AI相关的API
contextBridge.exposeInMainWorld('aiAPI', {
    // 发送数据到AI模型
    sendToModel: (data) => ipcRenderer.invoke('send-to-model', data),

    // 设置AI模型配置
    setModelConfig: (config) => ipcRenderer.invoke('set-model-config', config),

    // 测试AI连接
    testConnection: () => ipcRenderer.invoke('test-model-connection'),

    // 获取可用模型列表
    getAvailableModels: () => ipcRenderer.invoke('get-available-models')
});

// 暴露MCP相关的API（Windows自动化）
contextBridge.exposeInMainWorld('mcpAPI', {
    // 执行点击操作
    click: (x, y, button) => ipcRenderer.invoke('mcp-click', x, y, button),

    // 获取窗口信息
    getWindowInfo: (windowTitle) => ipcRenderer.invoke('mcp-get-window-info', windowTitle),

    // 发送键盘输入
    sendKeys: (keys) => ipcRenderer.invoke('mcp-send-keys', keys),

    // 获取鼠标位置
    getCursorPosition: () => ipcRenderer.invoke('mcp-get-cursor-position'),

    // 检查MCP是否可用
    isAvailable: () => ipcRenderer.invoke('mcp-is-available')
});

// 暴露Python自动化相关的API
contextBridge.exposeInMainWorld('pythonAPI', {
    // 检查Python环境
    checkEnvironment: () => ipcRenderer.invoke('python-check-environment'),

    // 执行Python自动化工作流
    executeWorkflow: (workflow, options) => ipcRenderer.invoke('python-execute-workflow', workflow, options),

    // 淘宝搜索便捷方法
    searchTaobao: (query, options) => ipcRenderer.invoke('python-search-taobao', query, options),

    // 百度搜索便捷方法
    searchBaidu: (query, options) => ipcRenderer.invoke('python-search-baidu', query, options),

    // 安装Python依赖
    installDependencies: () => ipcRenderer.invoke('python-install-dependencies'),

    // ==================== AI增强功能 ====================

    // 执行AI增强命令
    executeAICommand: (command, options) => ipcRenderer.invoke('python-execute-ai-command', command, options),

    // 智能搜索
    smartSearch: (query, options) => ipcRenderer.invoke('python-smart-search', query, options),

    // 智能导航+搜索
    smartNavigateAndSearch: (site, query, options) => ipcRenderer.invoke('python-smart-navigate-search', site, query, options)
});

// 监听来自主进程的消息
window.addEventListener('DOMContentLoaded', () => {
    // 可以在这里添加一些初始化逻辑
    console.log('Preload script loaded');
});
