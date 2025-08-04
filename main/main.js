const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const ModelAPI = require('./model-api');

// 设置控制台编码为UTF-8
if (process.platform === 'win32') {
    process.env.PYTHONIOENCODING = 'utf-8';
    process.env.LANG = 'zh_CN.UTF-8';
    process.env.LC_ALL = 'zh_CN.UTF-8';

    // 修复控制台中文显示
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = function(...args) {
        const message = args.map(arg => {
            if (typeof arg === 'string') {
                // 确保中文字符正确显示
                return arg.replace(/[\u4e00-\u9fff]/g, (match) => {
                    return Buffer.from(match, 'utf8').toString('utf8');
                });
            }
            return arg;
        });
        originalLog.apply(console, message);
    };

    console.error = function(...args) {
        const message = args.map(arg => {
            if (typeof arg === 'string') {
                return arg.replace(/[\u4e00-\u9fff]/g, (match) => {
                    return Buffer.from(match, 'utf8').toString('utf8');
                });
            }
            return arg;
        });
        originalError.apply(console, message);
    };

    console.warn = function(...args) {
        const message = args.map(arg => {
            if (typeof arg === 'string') {
                return arg.replace(/[\u4e00-\u9fff]/g, (match) => {
                    return Buffer.from(match, 'utf8').toString('utf8');
                });
            }
            return arg;
        });
        originalWarn.apply(console, message);
    };
}

// 禁用GPU缓存以避免权限问题
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--no-sandbox');
// const MCPInterface = require('./mcp'); // 暂时注释掉MCP功能

// 导入Python自动化桥接器
let PythonAutomationBridge, searchTaobao, searchBaidu, checkEnvironment, executeAICommand, smartSearch, smartNavigateAndSearch;

try {
    const automationBridge = require('../python_automation/automation_bridge');
    PythonAutomationBridge = automationBridge.PythonAutomationBridge;
    searchTaobao = automationBridge.searchTaobao;
    searchBaidu = automationBridge.searchBaidu;
    checkEnvironment = automationBridge.checkEnvironment;
    executeAICommand = automationBridge.executeAICommand;
    smartSearch = automationBridge.smartSearch;
    smartNavigateAndSearch = automationBridge.smartNavigateAndSearch;

    console.log('✅ Python自动化桥接器导入成功');
    console.log('✅ PythonAutomationBridge:', typeof PythonAutomationBridge);
    console.log('✅ AI增强功能:', typeof executeAICommand);
} catch (error) {
    console.error('❌ Python自动化桥接器导入失败:', error);
    // 创建占位符函数，避免应用崩溃
    PythonAutomationBridge = class { constructor() {} };
    searchTaobao = async () => ({ success: false, error: 'Python自动化不可用' });
    searchBaidu = async () => ({ success: false, error: 'Python自动化不可用' });
    checkEnvironment = async () => ({ success: false, error: 'Python自动化不可用' });
    executeAICommand = async () => ({ success: false, error: 'AI增强功能不可用' });
    smartSearch = async () => ({ success: false, error: 'AI增强功能不可用' });
    smartNavigateAndSearch = async () => ({ success: false, error: 'AI增强功能不可用' });
}

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

// 清理缓存目录
function cleanupCache() {
    try {
        const cacheDir = path.join(app.getPath('userData'), 'GPUCache');
        if (fs.existsSync(cacheDir)) {
            fs.rmSync(cacheDir, { recursive: true, force: true });
            console.log('✅ 缓存目录清理完成');
        }
    } catch (error) {
        console.log('⚠️ 缓存清理失败，忽略:', error.message);
    }
}

// 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
    // 清理缓存
    cleanupCache();

    // 初始化API实例
    modelAPI = new ModelAPI();
    // mcpInterface = new MCPInterface(); // 暂时注释掉MCP功能

    // 注册所有IPC处理器
    registerIPCHandlers();

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

// IPC 通信处理函数
let handlersRegistered = false;
function registerIPCHandlers() {
    if (handlersRegistered) {
        console.log('⚠️ IPC处理器已注册，跳过重复注册');
        return;
    }

    console.log('🔧 注册IPC处理器...');
    handlersRegistered = true;

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

// ==================== 在函数外部注册Python IPC处理器（确保注册） ====================

// 检查Python环境
if (!ipcMain.listenerCount('python-check-environment')) {
    ipcMain.handle('python-check-environment', async () => {
        try {
            console.log('🔍 处理Python环境检查请求...');

            // 检查函数是否可用
            if (!checkEnvironment || typeof checkEnvironment !== 'function') {
                throw new Error('checkEnvironment函数不可用');
            }

            const result = await checkEnvironment();
            console.log('✅ Python环境检查完成:', result);
            return result || { success: false, error: '未知错误' };
        } catch (error) {
            console.error('Python环境检查失败:', error);
            return {
                success: false,
                message: `Python环境检查失败: ${error.message}`,
                error: error.toString()
            };
        }
    });
    console.log('✅ Python环境检查处理器已注册');
}


// Python IPC处理器注册
console.log('🔧 注册所有Python IPC处理器...');

// 清理所有现有的处理器
const pythonHandlers = [
    'python-check-environment',
    'python-execute-ai-command', 
    'python-execute-workflow',
    'python-smart-search',
    'python-smart-navigate-search',
    'python-search-taobao',
    'python-search-baidu',
    'python-install-dependencies'
];

pythonHandlers.forEach(handler => {
    ipcMain.removeAllListeners(handler);
});

// 1. Python环境检查
ipcMain.handle('python-check-environment', async () => {
    try {
        console.log('🔍 处理Python环境检查请求...');
        
        if (!checkEnvironment || typeof checkEnvironment !== 'function') {
            return {
                success: false,
                message: 'checkEnvironment函数不可用',
                error: 'Function not available'
            };
        }
        
        const result = await checkEnvironment();
        console.log('✅ Python环境检查完成');
        return result || { success: false, error: '未知错误' };
    } catch (error) {
        console.error('Python环境检查失败:', error);
        return {
            success: false,
            message: 'Python环境检查失败: ' + error.message,
            error: error.toString()
        };
    }
});

// 2. AI增强命令执行
ipcMain.handle('python-execute-ai-command', async (event, command, options = {}) => {
    try {
        console.log('🤖 执行AI增强命令:', command);
        
        if (!executeAICommand || typeof executeAICommand !== 'function') {
            throw new Error('executeAICommand函数不可用');
        }
        
        const result = await executeAICommand(command, {
            aiApi: 'http://localhost:3000/api/ai',
            ...options
        });
        
        console.log('✅ AI增强命令执行完成');
        return result || { success: false, error: '未知错误' };
    } catch (error) {
        console.error('AI增强命令执行失败:', error);
        return {
            success: false,
            message: 'AI增强命令执行失败: ' + error.message,
            error: error.toString()
        };
    }
});

// 3. Python工作流执行
ipcMain.handle('python-execute-workflow', async (event, workflow, options = {}) => {
    try {
        console.log('🐍 执行Python自动化工作流:', workflow);
        
        if (!PythonAutomationBridge) {
            throw new Error('PythonAutomationBridge不可用');
        }
        
        const bridge = new PythonAutomationBridge();
        const result = await bridge.executeWorkflow(workflow, options);
        
        console.log('✅ Python工作流执行完成');
        return result || { success: false, error: '未知错误' };
    } catch (error) {
        console.error('Python工作流执行失败:', error);
        return {
            success: false,
            message: 'Python工作流执行失败: ' + error.message,
            error: error.toString()
        };
    }
});

// 4. 智能搜索
ipcMain.handle('python-smart-search', async (event, query, options = {}) => {
    try {
        console.log('🧠 执行智能搜索:', query);
        
        if (!smartSearch || typeof smartSearch !== 'function') {
            throw new Error('smartSearch函数不可用');
        }
        
        const result = await smartSearch(query, options);
        console.log('✅ 智能搜索完成');
        return result || { success: false, error: '未知错误' };
    } catch (error) {
        console.error('智能搜索失败:', error);
        return {
            success: false,
            message: '智能搜索失败: ' + error.message,
            error: error.toString()
        };
    }
});

// 5. 智能导航搜索
ipcMain.handle('python-smart-navigate-search', async (event, site, query, options = {}) => {
    try {
        console.log('🎯 执行智能导航搜索:', site, query);
        
        if (!smartNavigateAndSearch || typeof smartNavigateAndSearch !== 'function') {
            throw new Error('smartNavigateAndSearch函数不可用');
        }
        
        const result = await smartNavigateAndSearch(site, query, options);
        console.log('✅ 智能导航搜索完成');
        return result || { success: false, error: '未知错误' };
    } catch (error) {
        console.error('智能导航搜索失败:', error);
        return {
            success: false,
            message: '智能导航搜索失败: ' + error.message,
            error: error.toString()
        };
    }
});

// 6. 淘宝搜索
ipcMain.handle('python-search-taobao', async (event, query, options = {}) => {
    try {
        console.log('🛒 执行淘宝搜索:', query);
        
        if (!searchTaobao || typeof searchTaobao !== 'function') {
            throw new Error('searchTaobao函数不可用');
        }
        
        const result = await searchTaobao(query, options);
        console.log('✅ 淘宝搜索完成');
        return result || { success: false, error: '未知错误' };
    } catch (error) {
        console.error('淘宝搜索失败:', error);
        return {
            success: false,
            message: '淘宝搜索失败: ' + error.message,
            error: error.toString()
        };
    }
});

// 7. 百度搜索
ipcMain.handle('python-search-baidu', async (event, query, options = {}) => {
    try {
        console.log('🔍 执行百度搜索:', query);
        
        if (!searchBaidu || typeof searchBaidu !== 'function') {
            throw new Error('searchBaidu函数不可用');
        }
        
        const result = await searchBaidu(query, options);
        console.log('✅ 百度搜索完成');
        return result || { success: false, error: '未知错误' };
    } catch (error) {
        console.error('百度搜索失败:', error);
        return {
            success: false,
            message: '百度搜索失败: ' + error.message,
            error: error.toString()
        };
    }
});

// 8. 安装Python依赖
ipcMain.handle('python-install-dependencies', async () => {
    try {
        console.log('📦 安装Python依赖...');
        
        if (!PythonAutomationBridge) {
            throw new Error('PythonAutomationBridge不可用');
        }
        
        const bridge = new PythonAutomationBridge();
        const result = await bridge.installDependencies();
        console.log('✅ Python依赖安装完成');
        return result || { success: false, error: '未知错误' };
    } catch (error) {
        console.error('Python依赖安装失败:', error);
        return {
            success: false,
            message: 'Python依赖安装失败: ' + error.message,
            error: error.toString()
        };
    }
});

console.log('🎉 所有Python IPC处理器注册完成！');
console.log('📋 已注册的处理器:', pythonHandlers);
