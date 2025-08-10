/**
 * AI服务器 - 专门处理AI相关请求
 */

const http = require('http');
const url = require('url');
const ModelAPI = require('./model-api');

class AIServer {
    constructor(port = 3000) {
        this.port = port;
        this.server = null;
        this.modelAPI = new ModelAPI();
    }
    
    // 解析请求体
    parseRequestBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    if (body) {
                        resolve(JSON.parse(body));
                    } else {
                        resolve({});
                    }
                } catch (error) {
                    reject(new Error('Invalid JSON'));
                }
            });
            
            req.on('error', reject);
        });
    }
    
    // 处理AI请求
    async handleAIRequest(data) {
        try {
            console.log('🤖 AI服务器收到请求:', {
                hasPrompt: !!data.prompt,
                hasQuery: !!data.query,
                hasScreenshot: !!data.screenshot,
                hasTitle: !!data.title
            });
            
            // 构建页面数据
            const pageData = {
                title: data.title || '页面分析',
                url: data.url || 'unknown',
                screenshot: data.screenshot,
                customPrompt: data.prompt || data.query || '请分析这个页面',
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
    
    // 处理HTTP请求
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
            if (pathname === '/api/ai') {
                // 解析请求数据
                let requestData = {};
                if (req.method === 'POST') {
                    requestData = await this.parseRequestBody(req);
                } else if (req.method === 'GET') {
                    requestData = parsedUrl.query;
                }
                
                // 处理AI请求
                const result = await this.handleAIRequest(requestData);
                
                // 返回结果
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result, null, 2));
            } else if (pathname === '/health') {
                // 健康检查
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'AI服务器运行正常',
                    timestamp: new Date().toISOString()
                }));
            } else {
                // 404
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: `未找到路径: ${pathname}`,
                    availablePaths: ['/api/ai', '/health']
                }));
            }
        } catch (error) {
            console.error('AI服务器请求处理失败:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }
    
    // 启动服务器
    start() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res).catch((error) => {
                    console.error('AI服务器请求处理异常:', error);
                });
            });
            
            this.server.listen(this.port, (error) => {
                if (error) {
                    reject(error);
                } else {
                    console.log(`🤖 AI服务器启动成功，监听端口: ${this.port}`);
                    resolve();
                }
            });
            
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.log(`端口 ${this.port} 被占用，尝试端口 ${this.port + 1}`);
                    this.port++;
                    this.start().then(resolve).catch(reject);
                } else {
                    reject(error);
                }
            });
        });
    }
    
    // 停止服务器
    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('🤖 AI服务器已停止');
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

module.exports = AIServer;
