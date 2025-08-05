/**
 * IPC HTTP服务器
 */

const http = require('http');
const url = require('url');

class IPCServer {
    constructor(port = 3001) {
        this.port = port;
        this.server = null;
        this.webViewController = null;
        this.handlers = new Map();
        
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
        this.handlers.set('/api/webview/execute-script', this.handleExecuteScript.bind(this));
        this.handlers.set('/api/webview/page-info', this.handleGetPageInfo.bind(this));
        
        // 健康检查
        this.handlers.set('/api/health', this.handleHealth.bind(this));
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
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: `未找到处理器: ${pathname}`
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
