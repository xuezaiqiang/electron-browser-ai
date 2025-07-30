const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const ModelAPI = require('./model-api');
// const MCPInterface = require('./mcp'); // 暂时注释掉MCP功能

let mainWindow;
let modelAPI;
// let mcpInterface; // 暂时注释掉MCP功能

function createWindow() {
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false, // 允许加载本地资源，生产环境需要谨慎使用
            webviewTag: true // 启用webview标签支持
        },
        icon: path.join(__dirname, '../assets/icon.png'), // 如果有图标的话
        show: false // 先不显示，等加载完成后再显示
    });

    // 加载应用的 index.html
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // 当窗口准备好时显示
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // 开发模式下打开开发者工具
        if (process.argv.includes('--dev')) {
            mainWindow.webContents.openDevTools();
        }
    });

    // 当窗口被关闭时
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
    // 初始化API实例
    modelAPI = new ModelAPI();
    // mcpInterface = new MCPInterface(); // 暂时注释掉MCP功能

    createWindow();
});

// 当所有窗口都被关闭时退出应用
app.on('window-all-closed', () => {
    // 在 macOS 上，应用和它们的菜单栏通常会保持活跃状态，直到用户使用 Cmd + Q 明确退出
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，通常会重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC 通信处理

// 处理页面数据提取请求
ipcMain.handle('extract-page-data', async () => {
    try {
        const result = await mainWindow.webContents.executeJavaScript(`
            (function() {
                // 获取HTML
                const html = document.documentElement.outerHTML;
                
                // 获取CSS
                let css = '';
                try {
                    css = Array.from(document.styleSheets)
                        .map(sheet => {
                            try {
                                return Array.from(sheet.cssRules || [])
                                    .map(rule => rule.cssText).join('\\n');
                            } catch (e) {
                                return '/* External stylesheet: ' + (sheet.href || 'unknown') + ' */';
                            }
                        }).join('\\n');
                } catch (e) {
                    css = '/* Could not extract CSS: ' + e.message + ' */';
                }
                
                // 获取JavaScript
                const scripts = Array.from(document.scripts)
                    .map(script => {
                        if (script.src) {
                            return '// External script: ' + script.src;
                        } else {
                            return script.innerText;
                        }
                    }).join('\\n\\n');
                
                return { html, css, scripts };
            })();
        `);
        
        return result;
    } catch (error) {
        console.error('Error extracting page data:', error);
        throw error;
    }
});

// 处理截图请求 - 返回base64格式
ipcMain.handle('capture-screenshot', async () => {
    try {
        const image = await mainWindow.webContents.capturePage();

        // 直接转换为base64格式，避免本地文件URL问题
        const base64Data = image.toDataURL();

        console.log('Screenshot captured, size:', base64Data.length, 'characters');

        return {
            success: true,
            url: base64Data, // 直接返回base64 data URL
            size: base64Data.length,
            format: 'base64'
        };
    } catch (error) {
        console.error('Error capturing screenshot:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// 清理临时截图文件
ipcMain.handle('cleanup-screenshots', async () => {
    try {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');

        const tempDir = path.join(os.tmpdir(), 'electron-browser-ai');
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            let cleanedCount = 0;

            files.forEach(file => {
                if (file.startsWith('screenshot-') && file.endsWith('.png')) {
                    const filepath = path.join(tempDir, file);
                    const stats = fs.statSync(filepath);
                    const now = Date.now();
                    const fileAge = now - stats.mtime.getTime();

                    // 删除超过1小时的截图文件
                    if (fileAge > 60 * 60 * 1000) {
                        fs.unlinkSync(filepath);
                        cleanedCount++;
                    }
                }
            });

            console.log(`Cleaned up ${cleanedCount} old screenshot files`);
            return { success: true, cleanedCount };
        }

        return { success: true, cleanedCount: 0 };
    } catch (error) {
        console.error('Error cleaning up screenshots:', error);
        return { success: false, error: error.message };
    }
});

// 处理保存文件请求
ipcMain.handle('save-file', async (event, data) => {
    try {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            defaultPath: 'page-documentation.json',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (filePath) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return { success: true, filePath };
        }
        
        return { success: false, cancelled: true };
    } catch (error) {
        console.error('Error saving file:', error);
        return { success: false, error: error.message };
    }
});

// 处理显示通知
ipcMain.handle('show-notification', async (event, message) => {
    const { Notification } = require('electron');
    
    if (Notification.isSupported()) {
        new Notification({
            title: 'Electron Browser AI',
            body: message
        }).show();
    }
});

// 处理错误日志
ipcMain.handle('log-error', async (event, error) => {
    console.error('Renderer error:', error);
});

// AI模型相关的IPC处理

// 发送数据到AI模型
ipcMain.handle('send-to-model', async (event, pageData) => {
    try {
        const result = await modelAPI.generateDocumentation(pageData);
        return result;
    } catch (error) {
        console.error('Error sending to model:', error);
        return {
            success: false,
            error: error.message || '未知错误',
            timestamp: new Date().toISOString()
        };
    }
});

// 设置AI模型配置
ipcMain.handle('set-model-config', async (event, config) => {
    try {
        modelAPI.setConfig(config);
        return { success: true };
    } catch (error) {
        console.error('Error setting model config:', error);
        throw error;
    }
});

// 测试AI模型连接
ipcMain.handle('test-model-connection', async () => {
    try {
        return await modelAPI.testConnection();
    } catch (error) {
        console.error('Error testing model connection:', error);
        return { success: false, error: error.message };
    }
});

// 获取可用模型列表
ipcMain.handle('get-available-models', async () => {
    try {
        return await modelAPI.getAvailableModels();
    } catch (error) {
        console.error('Error getting available models:', error);
        return [];
    }
});

// MCP相关的IPC处理 - 暂时注释掉

/*
// 执行点击操作
ipcMain.handle('mcp-click', async (event, x, y, button = 'left') => {
    try {
        return await mcpInterface.click(x, y, button);
    } catch (error) {
        console.error('Error executing click:', error);
        throw error;
    }
});

// 获取窗口信息
ipcMain.handle('mcp-get-window-info', async (event, windowTitle = null) => {
    try {
        return mcpInterface.getWindowInfo(windowTitle);
    } catch (error) {
        console.error('Error getting window info:', error);
        throw error;
    }
});

// 发送键盘输入
ipcMain.handle('mcp-send-keys', async (event, keys) => {
    try {
        return await mcpInterface.sendKeys(keys);
    } catch (error) {
        console.error('Error sending keys:', error);
        throw error;
    }
});

// 获取鼠标位置
ipcMain.handle('mcp-get-cursor-position', async () => {
    try {
        return mcpInterface.getCursorPosition();
    } catch (error) {
        console.error('Error getting cursor position:', error);
        throw error;
    }
});

// 检查MCP是否可用
ipcMain.handle('mcp-is-available', async () => {
    try {
        return { available: mcpInterface.isAvailable() };
    } catch (error) {
        console.error('Error checking MCP availability:', error);
        return { available: false, error: error.message };
    }
});
*/

// MCP功能暂时不可用的占位符
ipcMain.handle('mcp-is-available', async () => {
    return { available: false, error: 'MCP功能暂时不可用' };
});
