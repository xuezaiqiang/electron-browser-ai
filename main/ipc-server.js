/**
 * IPC HTTP服务器
 */

const http = require('http');
const url = require('url');
const ModelAPI = require('./model-api');

class IPCServer {
    constructor(port = 3001) {
        this.port = port;
        this.server = null;
        this.webViewController = null;
        this.handlers = new Map();
        this.modelAPI = new ModelAPI();

        this.setupHandlers();
    }
    
    setWebViewController(webViewController) {
        this.webViewController = webViewController;
    }
    
    setupHandlers() {
        // WebView控制处理器
        this.handlers.set('/api/webview/navigate', this.handleNavigate.bind(this));
        this.handlers.set('/api/webview/search', this.handleSearch.bind(this));
        this.handlers.set('/api/webview/click', this.handleClick.bind(this));
        this.handlers.set('/api/webview/input', this.handleInput.bind(this));
        this.handlers.set('/api/webview/submit', this.handleSubmitSearch.bind(this));
        this.handlers.set('/api/webview/execute-script', this.handleExecuteScript.bind(this));
        this.handlers.set('/api/webview/page-info', this.handleGetPageInfo.bind(this));

        // 健康检查
        this.handlers.set('/api/health', this.handleHealth.bind(this));

        // 页面数据获取
        this.handlers.set('/api/extract-page-data', this.handleExtractPageData.bind(this));
        this.handlers.set('/api/capture-screenshot', this.handleCaptureScreenshot.bind(this));

        // AI服务处理器
        this.handlers.set('/api/ai', this.handleAIRequest.bind(this));
    }
    
    async handleNavigate(data) {
        if (!this.webViewController) {
            return { success: false, error: 'WebView控制器未初始化' };
        }
        
        const { url } = data;
        if (!url) {
            return { success: false, error: '缺少URL参数' };
        }
        
        return await this.webViewController.navigate(url);
    }
    
    async handleSearch(data) {
        if (!this.webViewController) {
            return { success: false, error: 'WebView控制器未初始化' };
        }
        
        const { query, site = 'baidu' } = data;
        if (!query) {
            return { success: false, error: '缺少搜索关键词' };
        }
        
        return await this.webViewController.search(query, site);
    }
    
    async handleClick(data) {
        if (!this.webViewController) {
            return { success: false, error: 'WebView控制器未初始化' };
        }
        
        const { selector } = data;
        if (!selector) {
            return { success: false, error: '缺少元素选择器' };
        }
        
        return await this.webViewController.clickElement(selector);
    }
    
    async handleInput(data) {
        if (!this.webViewController) {
            return { success: false, error: 'WebView控制器未初始化' };
        }
        
        const { selector, text } = data;
        if (!selector || text === undefined) {
            return { success: false, error: '缺少选择器或文本参数' };
        }
        
        return await this.webViewController.inputText(selector, text);
    }

    async handleSubmitSearch(data) {
        if (!this.webViewController) {
            return { success: false, error: 'WebView控制器未初始化' };
        }

        const { selector } = data;
        return await this.webViewController.submitSearch(selector);
    }
    
    async handleExecuteScript(data) {
        if (!this.webViewController) {
            return { success: false, error: 'WebView控制器未初始化' };
        }
        
        const { script } = data;
        if (!script) {
            return { success: false, error: '缺少脚本内容' };
        }
        
        return await this.webViewController.executeScript(script);
    }
    
    async handleGetPageInfo(data) {
        if (!this.webViewController) {
            return { success: false, error: 'WebView控制器未初始化' };
        }
        
        return await this.webViewController.getPageInfo();
    }
    
    async handleHealth(data) {
        return {
            success: true,
            message: 'IPC服务器运行正常',
            timestamp: new Date().toISOString(),
            webViewReady: !!this.webViewController
        };
    }

    async handleExtractPageData(data) {
        try {
            // 获取主窗口的webContents
            const { BrowserWindow } = require('electron');
            const mainWindow = BrowserWindow.getAllWindows()[0];

            if (!mainWindow) {
                return { success: false, error: '主窗口未找到' };
            }

            // 参考Chrome翻译功能的方式，直接同步获取HTML
            const result = await mainWindow.webContents.executeJavaScript(`
                (function() {
                    try {
                        const webview = document.getElementById('webview');
                        if (!webview) {
                            return { success: false, error: 'WebView元素未找到' };
                        }

                        // 直接同步执行，不使用Promise回调
                        webview.executeJavaScript(\`
                            try {
                                // 将结果存储到全局变量
                                window.__pageData = {
                                    html: document.documentElement.outerHTML,
                                    title: document.title,
                                    url: window.location.href,
                                    timestamp: Date.now()
                                };
                            } catch (error) {
                                window.__pageData = { error: error.message };
                            }
                        \`);

                        // 等待一下确保执行完成
                        setTimeout(() => {
                            // 获取存储的数据
                            webview.executeJavaScript(\`window.__pageData\`, (pageData) => {
                                if (pageData && pageData.html) {
                                    window.__extractedPageData = {
                                        success: true,
                                        html: pageData.html,
                                        title: pageData.title,
                                        url: pageData.url
                                    };
                                } else {
                                    window.__extractedPageData = {
                                        success: false,
                                        error: pageData ? pageData.error : '数据获取失败'
                                    };
                                }
                            });
                        }, 500);

                        return { success: true, message: '页面数据提取已启动' };

                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                })();
            `);

            // 等待数据提取完成
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 获取提取的数据
            const extractedData = await mainWindow.webContents.executeJavaScript(`
                window.__extractedPageData || { success: false, error: '数据提取超时' }
            `);

            return extractedData;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async handleCaptureScreenshot(data) {
        try {
            const { BrowserWindow } = require('electron');
            const mainWindow = BrowserWindow.getAllWindows()[0];

            if (!mainWindow) {
                return { success: false, error: '主窗口未找到' };
            }

            const image = await mainWindow.webContents.capturePage();
            const base64Data = image.toDataURL();

            return {
                success: true,
                url: base64Data,
                size: base64Data.length,
                format: 'base64'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    parseRequestBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const data = body ? JSON.parse(body) : {};
                    resolve(data);
                } catch (error) {
                    reject(new Error('Invalid JSON'));
                }
            });
            
            req.on('error', reject);
        });
    }

    // AI请求处理器
    async handleAIRequest(data) {
        try {
            console.log('🤖 收到AI请求:', data);

            // 构建页面数据
            const pageData = {
                title: data.title || '页面分析',
                url: data.url || 'unknown',
                screenshot: data.screenshot,
                customPrompt: data.prompt || data.query,
                chatMode: false
            };

            // 调用ModelAPI生成分析
            const result = await this.modelAPI.generateDocumentation(pageData);

            if (result.success) {
                return {
                    success: true,
                    analysis: result.documentation,
                    model: result.model,
                    timestamp: result.timestamp
                };
            } else {
                return {
                    success: false,
                    error: result.error || 'AI分析失败',
                    timestamp: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('AI请求处理失败:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async handleRequest(req, res) {
        // 设置CORS头
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // 处理OPTIONS请求
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        
        try {
            // 查找处理器
            const handler = this.handlers.get(pathname);
            if (!handler) {
                console.log('可用的处理器:', Array.from(this.handlers.keys()));
                console.log('请求的路径:', pathname);
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: `未找到处理器: ${pathname}`,
                    availableHandlers: Array.from(this.handlers.keys())
                }));
                return;
            }
            
            // 解析请求数据
            let requestData = {};
            if (req.method === 'POST') {
                requestData = await this.parseRequestBody(req);
            } else if (req.method === 'GET') {
                requestData = parsedUrl.query;
            }
            
            // 执行处理器
            const result = await handler(requestData);
            
            // 返回结果
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result, null, 2));
            
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }
    
    start() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res).catch(() => {
                    // 错误已在handleRequest中处理
                });
            });
            
            this.server.listen(this.port, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
            
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    this.port++;
                    this.start().then(resolve).catch(reject);
                } else {
                    reject(error);
                }
            });
        });
    }
    
    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
    
    getPort() {
        return this.port;
    }
}

module.exports = IPCServer;
