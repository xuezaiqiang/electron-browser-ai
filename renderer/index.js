// 主要应用逻辑
class ElectronBrowserAI {
    constructor() {
        this.webview = null;
        this.currentUrl = '';
        this.isAIConnected = false;
        this.isMCPAvailable = false;
        this.isPythonAvailable = false;
        
        this.init();
    }

    // 初始化应用
    init() {
        this.setupElements();
        this.setupEventListeners();
        this.checkSystemStatus();
        this.loadSettings();
        this.initializeAIChat();
    }

    // 初始化AI对话功能
    initializeAIChat() {
        // 简化初始化，避免无限递归
        try {
            if (window.AIChatManager && window.NLPParser && window.TaskScheduler) {
                this.aiChatManager = new AIChatManager();
                window.aiChatManager = this.aiChatManager; // 全局引用，供任务调度器使用
                console.log('✅ AI聊天管理器初始化成功');
            } else {
                console.warn('⚠️ AI聊天依赖未完全加载，跳过初始化');
            }
        } catch (error) {
            console.error('❌ AI聊天管理器初始化失败:', error);
        }
    }

    // 设置DOM元素引用
    setupElements() {
        this.webview = document.getElementById('webview');
        this.urlInput = document.getElementById('url-input');
        this.goBtn = document.getElementById('go-btn');
        this.refreshBtn = document.getElementById('refresh-btn');
        this.resetWebviewBtn = document.getElementById('reset-webview-btn');
        this.statusText = document.getElementById('status-text');
        this.aiStatus = document.getElementById('ai-status');
        this.mcpStatus = document.getElementById('mcp-status');
        
        // 面板元素
        this.settingsPanel = document.getElementById('settings-panel');
        this.documentationPanel = document.getElementById('documentation-panel');
        this.helpPanel = document.getElementById('help-panel');
        this.debugPanel = document.getElementById('debug-panel');
        this.aiSidebar = document.getElementById('ai-sidebar');
        this.sidebarOverlay = document.getElementById('sidebar-overlay');

        // 按钮元素
        this.settingsBtn = document.getElementById('settings-btn');
        this.helpBtn = document.getElementById('help-btn');
        this.debugBtn = document.getElementById('debug-btn');
        this.aiChatBtn = document.getElementById('ai-chat-btn');
        this.floatingBtn = document.getElementById('floating-button');
    }

    // 设置事件监听器
    setupEventListeners() {
        // 地址栏事件
        this.goBtn.addEventListener('click', () => this.navigateToUrl());
        this.refreshBtn.addEventListener('click', () => this.refreshPage());
        this.resetWebviewBtn.addEventListener('click', () => this.manualRecoverWebView());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.navigateToUrl();
            }
        });

        // 工具栏按钮事件
        this.settingsBtn.addEventListener('click', () => this.showSettings());
        this.helpBtn.addEventListener('click', () => this.showHelp());
        this.debugBtn.addEventListener('click', () => this.showDebug());
        this.aiChatBtn.addEventListener('click', () => this.showAIChat());

        // 悬浮按钮事件
        this.floatingBtn.addEventListener('click', () => this.generateDocumentation());

        // 面板关闭事件
        document.getElementById('close-settings').addEventListener('click', () => this.hideSettings());
        document.getElementById('close-doc').addEventListener('click', () => this.hideDocumentation());
        document.getElementById('close-help').addEventListener('click', () => this.hideHelp());

        // 设置面板事件
        document.getElementById('test-connection').addEventListener('click', () => this.testAIConnection());
        document.getElementById('api-type').addEventListener('change', () => this.onApiTypeChange());
        document.getElementById('model-url').addEventListener('change', () => this.saveSettings());
        document.getElementById('model-name').addEventListener('change', () => this.saveSettings());
        document.getElementById('api-key').addEventListener('change', () => this.saveSettings());

        // 文档面板事件
        document.getElementById('save-doc').addEventListener('click', () => this.saveDocumentation());
        document.getElementById('copy-doc').addEventListener('click', () => this.copyDocumentation());

        // WebView事件 - 需要等待webview准备就绪
        this.setupWebViewEvents();

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey) {
                switch (e.key) {
                    case 'r':
                        e.preventDefault();
                        this.refreshPage();
                        break;
                    case 'l':
                        e.preventDefault();
                        this.urlInput.focus();
                        this.urlInput.select();
                        break;
                    case 'g':
                        e.preventDefault();
                        this.generateDocumentation();
                        break;
                    case ',':
                        e.preventDefault();
                        this.showSettings();
                        break;
                }
            }
            
            if (e.key === 'F1') {
                e.preventDefault();
                this.showHelp();
            }
        });
    }

    // 设置WebView事件监听器
    setupWebViewEvents() {
        if (!this.webview) return;

        // 等待webview准备就绪
        this.webview.addEventListener('dom-ready', () => {
            console.log('WebView DOM ready');
        });

        this.webview.addEventListener('did-start-loading', () => {
            this.statusText.textContent = '正在加载...';
        });

        this.webview.addEventListener('did-finish-load', () => {
            this.statusText.textContent = '加载完成';
            try {
                this.currentUrl = this.webview.getURL();
                this.urlInput.value = this.currentUrl;

                // 页面加载完成后注入弹窗拦截脚本
                setTimeout(() => {
                    this.injectPopupBlocker();
                }, 1000);
            } catch (error) {
                console.warn('Failed to get webview URL:', error);
            }
        });

        this.webview.addEventListener('did-fail-load', (event) => {
            this.statusText.textContent = '加载失败';
            this.showNotification('页面加载失败', 'error');
            console.error('WebView load failed:', event);
        });

        this.webview.addEventListener('page-title-updated', (event) => {
            if (event.title) {
                document.title = `${event.title} - Electron Browser AI`;
            }
        });

        // 处理新窗口事件 - 阻止所有弹窗以避免崩溃
        this.webview.addEventListener('new-window', (event) => {
            console.log('阻止新窗口打开:', event.url, event.frameName, event.disposition);
            event.preventDefault();
            event.stopPropagation();
            // 不导航到新URL，直接阻止弹窗
            this.showNotification('已阻止弹窗窗口，避免崩溃', 'info');
        });

        // 处理WebView内部的弹窗拦截
        this.webview.addEventListener('dom-ready', () => {
            // 注入弹窗拦截脚本
            this.injectPopupBlocker();

            // 检查并修正URL
            this.checkAndFixWebViewURL();
        });

        // 处理will-navigate事件
        this.webview.addEventListener('will-navigate', (event) => {
            console.log('页面即将导航:', event.url);
            // 允许正常导航，但记录日志
        });

        // 处理did-navigate事件
        this.webview.addEventListener('did-navigate', (event) => {
            console.log('页面已导航:', event.url);
            try {
                this.currentUrl = event.url;
                this.urlInput.value = event.url;
            } catch (error) {
                console.warn('更新URL失败:', error);
            }
        });

        // 处理webview加载错误
        this.webview.addEventListener('did-fail-load', (event) => {
            if (event.errorCode !== -3) { // -3 是用户取消，不显示错误
                this.statusText.textContent = `加载失败 (${event.errorCode})`;
                this.showNotification(`页面加载失败: ${event.errorDescription}`, 'error');
            }
        });

        // 处理WebView崩溃 - 智能恢复机制
        this.webview.addEventListener('crashed', () => {
            console.error('WebView崩溃');
            this.statusText.textContent = 'WebView崩溃，正在尝试恢复...';
            this.showNotification('WebView崩溃，正在尝试恢复...', 'error');

            // 智能恢复：只在短时间内没有频繁崩溃时才自动恢复
            this.handleWebViewCrash();
        });

        // 处理render-process-gone事件（新的崩溃事件）
        this.webview.addEventListener('render-process-gone', (event) => {
            console.error('WebView渲染进程终止:', event.details);
            this.statusText.textContent = 'WebView进程终止，正在尝试恢复...';
            this.showNotification('WebView进程终止，正在尝试恢复...', 'error');

            // 智能恢复
            this.handleWebViewCrash();
        });

        // 处理WebView无响应
        this.webview.addEventListener('unresponsive', () => {
            console.warn('WebView无响应');
            this.statusText.textContent = 'WebView无响应';
            this.showNotification('WebView无响应，请稍候...', 'warning');
        });

        // 处理WebView恢复响应
        this.webview.addEventListener('responsive', () => {
            console.log('WebView恢复响应');
            this.statusText.textContent = '已恢复响应';
        });

        // 简化的权限处理 - 拒绝所有权限请求以避免冲突
        this.webview.addEventListener('permission-request', (event) => {
            console.log('权限请求:', event.permission);
            // 拒绝所有权限请求以避免崩溃
            event.request.deny();
        });

        // 处理WebView的插件崩溃
        this.webview.addEventListener('plugin-crashed', (event) => {
            console.error('WebView插件崩溃:', event.name, event.version);
            this.statusText.textContent = 'WebView插件崩溃';
            this.showNotification('WebView插件崩溃，请刷新页面', 'warning');
        });

        // 处理WebView的GPU进程崩溃
        this.webview.addEventListener('gpu-crashed', () => {
            console.error('WebView GPU进程崩溃');
            this.statusText.textContent = 'WebView GPU崩溃';
            this.showNotification('WebView GPU崩溃，请刷新页面', 'warning');
        });

        // 处理WebView的媒体开始播放
        this.webview.addEventListener('media-started-playing', () => {
            console.log('WebView媒体开始播放');
        });

        // 处理WebView的媒体暂停
        this.webview.addEventListener('media-paused', () => {
            console.log('WebView媒体已暂停');
        });

        // 处理WebView的证书错误
        this.webview.addEventListener('certificate-error', (event) => {
            console.warn('WebView证书错误:', event.url, event.error);
            // 忽略证书错误以避免阻塞
            event.preventDefault();
        });

        // 定期检查WebView状态
        this.webviewHealthCheck = setInterval(() => {
            this.checkWebViewHealth();
        }, 30000); // 每30秒检查一次
    }

    // WebView健康检查
    checkWebViewHealth() {
        if (!this.webview) return;

        try {
            // 检查WebView是否还存在于DOM中
            if (!document.contains(this.webview)) {
                console.error('WebView已从DOM中移除');
                this.statusText.textContent = 'WebView已断开';
                return;
            }

            // 检查WebView是否可以获取URL
            const url = this.webview.getURL();
            if (!url || url === 'about:blank') {
                console.warn('WebView URL异常:', url);
            }

            // 更新状态
            if (this.statusText.textContent === 'WebView已断开') {
                this.statusText.textContent = '运行正常';
            }
        } catch (error) {
            console.error('WebView健康检查失败:', error);
            this.statusText.textContent = 'WebView状态异常';
        }
    }

    // 注入弹窗拦截脚本
    injectPopupBlocker() {
        if (!this.webview) return;

        try {
            const blockScript = `
                (function() {
                    console.log('注入弹窗拦截脚本');

                    // 重写window.open方法
                    const originalOpen = window.open;
                    window.open = function(url, name, features) {
                        console.log('阻止window.open调用:', url, name, features);
                        return null;
                    };

                    // 重写showModalDialog方法
                    if (window.showModalDialog) {
                        window.showModalDialog = function() {
                            console.log('阻止showModalDialog调用');
                            return null;
                        };
                    }

                    // 阻止alert, confirm, prompt
                    window.alert = function(message) {
                        console.log('阻止alert:', message);
                        return;
                    };

                    window.confirm = function(message) {
                        console.log('阻止confirm:', message);
                        return false;
                    };

                    window.prompt = function(message, defaultText) {
                        console.log('阻止prompt:', message);
                        return null;
                    };

                    // 监听并阻止beforeunload事件
                    window.addEventListener('beforeunload', function(e) {
                        e.preventDefault();
                        e.returnValue = '';
                        return '';
                    }, true);

                    console.log('弹窗拦截脚本注入完成');
                })();
            `;

            this.webview.executeJavaScript(blockScript)
                .then(() => {
                    console.log('弹窗拦截脚本注入成功');
                })
                .catch((error) => {
                    console.warn('弹窗拦截脚本注入失败:', error);
                });
        } catch (error) {
            console.error('注入弹窗拦截脚本时出错:', error);
        }
    }

    // 检查并修正WebView URL
    checkAndFixWebViewURL() {
        if (!this.webview) return;

        try {
            const currentUrl = this.webview.getURL();
            console.log('当前WebView URL:', currentUrl);

            // 如果URL不正确，重新导航到百度
            if (currentUrl && (currentUrl.includes('baobao.com') || currentUrl === 'about:blank')) {
                console.log('检测到错误URL，重新导航到百度');
                this.navigateToUrl('https://www.baidu.com');
            }
        } catch (error) {
            console.warn('检查WebView URL失败:', error);
        }
    }

    // 智能崩溃处理
    handleWebViewCrash() {
        const now = Date.now();

        // 初始化崩溃记录
        if (!this.crashHistory) {
            this.crashHistory = [];
        }

        // 记录崩溃时间
        this.crashHistory.push(now);

        // 只保留最近5分钟的崩溃记录
        this.crashHistory = this.crashHistory.filter(time => now - time < 300000);

        // 如果5分钟内崩溃超过3次，停止自动恢复
        if (this.crashHistory.length >= 3) {
            console.error('WebView频繁崩溃，停止自动恢复');
            this.statusText.textContent = 'WebView频繁崩溃，请手动重启应用';
            this.showNotification('WebView频繁崩溃，请手动重启应用', 'error');
            return;
        }

        // 延迟恢复，避免立即重新崩溃
        setTimeout(() => {
            this.manualRecoverWebView();
        }, 3000);
    }

    // WebView手动恢复方法（仅在用户手动触发时使用）
    manualRecoverWebView() {
        console.log('手动恢复WebView...');

        // 清理健康检查定时器
        if (this.webviewHealthCheck) {
            clearInterval(this.webviewHealthCheck);
        }

        // 保存当前URL
        let currentUrl = 'https://www.baidu.com';
        try {
            currentUrl = this.webview.getURL() || currentUrl;
        } catch (error) {
            console.warn('无法获取当前URL:', error);
        }

        try {
            // 停止当前加载
            this.webview.stop();

            // 等待一下再重新加载
            setTimeout(() => {
                try {
                    this.webview.reload();
                    this.statusText.textContent = 'WebView已重新加载';
                    this.showNotification('WebView已重新加载', 'success');

                    // 重新启动健康检查
                    this.webviewHealthCheck = setInterval(() => {
                        this.checkWebViewHealth();
                    }, 30000);
                } catch (error) {
                    console.error('重新加载失败:', error);
                    this.statusText.textContent = 'WebView重新加载失败';
                    this.showNotification('WebView重新加载失败，请重启应用', 'error');
                }
            }, 1000);
        } catch (error) {
            console.error('停止WebView失败:', error);
            this.statusText.textContent = 'WebView恢复失败';
            this.showNotification('WebView恢复失败，请重启应用', 'error');
        }
    }

    // 导航到指定URL
    navigateToUrl(targetUrl = null) {
        let url = targetUrl || this.urlInput.value.trim();

        if (!url) {
            this.showNotification('请输入有效的网址', 'warning');
            return;
        }

        // 添加协议前缀
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
            if (url.includes('.')) {
                url = 'https://' + url;
            } else {
                // 如果不包含点，当作搜索处理，改用百度搜索
                url = `https://www.baidu.com/s?wd=${encodeURIComponent(url)}`;
            }
        }

        try {
            if (this.webview && this.webview.loadURL) {
                this.webview.loadURL(url);
                this.urlInput.value = url;
                this.statusText.textContent = '正在加载...';
            } else {
                console.error('WebView not available');
                this.showNotification('浏览器组件未就绪', 'error');
            }
        } catch (error) {
            console.error('Navigation failed:', error);
            this.showNotification('导航失败: ' + error.message, 'error');
        }
    }

    // 刷新页面
    refreshPage() {
        if (this.webview) {
            try {
                this.webview.reload();
                this.statusText.textContent = '正在刷新...';
            } catch (error) {
                console.error('刷新失败:', error);
                this.manualRecoverWebView();
            }
        }
    }

    // 检查系统状态
    async checkSystemStatus() {
        // 检查AI连接状态
        try {
            if (window.aiAPI && window.aiAPI.testConnection) {
                const result = await window.aiAPI.testConnection();
                this.updateAIStatus(result.success);
            } else {
                this.updateAIStatus(false);
            }
        } catch (error) {
            console.warn('AI connection test failed:', error);
            this.updateAIStatus(false);
        }

        // 检查MCP可用性
        try {
            if (window.mcpAPI && window.mcpAPI.isAvailable) {
                const result = await window.mcpAPI.isAvailable();
                this.updateMCPStatus(result.available);
            } else {
                this.updateMCPStatus(false);
            }
        } catch (error) {
            console.warn('MCP availability check failed:', error);
            this.updateMCPStatus(false);
        }

        // 检查Python自动化环境 - 简化版本
        setTimeout(async () => {
            try {
                if (window.pythonAPI && window.pythonAPI.checkEnvironment) {
                    console.log('🔍 开始检查Python环境...');
                    
                    // 简单重试机制
                    for (let i = 0; i < 3; i++) {
                        try {
                            const result = await window.pythonAPI.checkEnvironment();
                            this.updatePythonStatus(result.success);
                            if (result.success) {
                                console.log('✅ Python环境检查通过');
                            } else {
                                console.warn('⚠️ Python环境检查失败:', result.message);
                            }
                            break;
                        } catch (error) {
                            if (i < 2 && error.message.includes('No handler registered')) {
                                console.warn('⚠️ IPC处理器未就绪，重试...');
                                await new Promise(resolve => setTimeout(resolve, 3000));
                                continue;
                            }
                            throw error;
                        }
                    }
                } else {
                    console.warn('⚠️ Python API不可用');
                    this.updatePythonStatus(false);
                }
            } catch (error) {
                console.warn('Python environment check failed:', error);
                this.updatePythonStatus(false);
            }
        }, 12000); // 延迟12秒执行
    }

    // 更新AI状态
    updateAIStatus(connected) {
        this.isAIConnected = connected;
        this.aiStatus.textContent = connected ? 'AI: 已连接' : 'AI: 未连接';
        this.aiStatus.className = connected ? 'connected' : '';
    }

    // 更新MCP状态
    updateMCPStatus(available) {
        this.isMCPAvailable = available;
        this.mcpStatus.textContent = available ? 'MCP: 可用' : 'MCP: 不可用';
        this.mcpStatus.className = available ? 'available' : 'unavailable';
    }

    // 更新Python状态
    updatePythonStatus(available) {
        this.isPythonAvailable = available;
        const pythonStatus = document.getElementById('python-status');
        if (pythonStatus) {
            pythonStatus.textContent = available ? 'Python: 可用' : 'Python: 不可用';
            pythonStatus.className = available ? 'available' : 'unavailable';
        }
    }

    // 显示设置面板
    showSettings() {
        this.settingsPanel.classList.remove('hidden');
    }

    // 隐藏设置面板
    hideSettings() {
        this.settingsPanel.classList.add('hidden');
    }

    // 显示帮助面板
    showHelp() {
        this.helpPanel.classList.remove('hidden');
    }

    // 隐藏帮助面板
    hideHelp() {
        this.helpPanel.classList.add('hidden');
    }

    // 显示调试面板
    showDebug() {
        if (window.aiDebugger) {
            window.aiDebugger.show();
        }
    }

    // 显示AI智能助手侧边栏
    showAIChat() {
        if (this.aiChatManager) {
            try {
                this.aiChatManager.show();
            } catch (error) {
                console.error('显示AI助手失败:', error);
                this.showNotification('AI助手显示失败，请重试', 'error');
            }
        } else {
            this.showNotification('AI智能助手未初始化，请刷新页面重试', 'warning');
        }
    }

    // 显示文档面板
    showDocumentation() {
        this.documentationPanel.classList.remove('hidden');
    }

    // 隐藏文档面板
    hideDocumentation() {
        this.documentationPanel.classList.add('hidden');
    }

    // 测试AI连接
    async testAIConnection() {
        const connectionStatus = document.getElementById('connection-status');
        const testBtn = document.getElementById('test-connection');

        testBtn.disabled = true;
        testBtn.textContent = '测试中...';
        connectionStatus.textContent = '';
        connectionStatus.className = '';

        // 开始调试会话
        if (window.aiDebugger) {
            window.aiDebugger.startSession({
                action: 'testConnection'
            });
            window.aiDebugger.log('开始测试AI连接', 'info');
        }

        try {
            // 先保存当前设置
            this.saveSettings();

            if (window.aiDebugger) {
                window.aiDebugger.log('发送连接测试请求', 'info');
            }

            const result = await window.aiAPI.testConnection();

            // 记录测试结果到调试器
            if (window.aiDebugger) {
                if (result.success) {
                    window.aiDebugger.logResponse(result);
                    window.aiDebugger.log('连接测试成功', 'success');
                } else {
                    window.aiDebugger.logResponse(null, new Error(result.error));
                    window.aiDebugger.log('连接测试失败: ' + result.error, 'error');
                }
            }

            if (result.success) {
                connectionStatus.textContent = '连接成功';
                connectionStatus.className = 'success';
                this.updateAIStatus(true);

                // 显示可用模型
                if (result.models && result.models.length > 0) {
                    const modelSelect = document.getElementById('model-name');
                    modelSelect.innerHTML = '';
                    result.models.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.name;
                        option.textContent = model.name;
                        modelSelect.appendChild(option);
                    });

                    if (window.aiDebugger) {
                        window.aiDebugger.log(`发现 ${result.models.length} 个可用模型`, 'info');
                    }
                }
            } else {
                connectionStatus.textContent = `连接失败: ${result.error}`;
                connectionStatus.className = 'error';
                this.updateAIStatus(false);
            }
        } catch (error) {
            connectionStatus.textContent = `连接失败: ${error.message}`;
            connectionStatus.className = 'error';
            this.updateAIStatus(false);

            if (window.aiDebugger) {
                window.aiDebugger.logResponse(null, error);
                window.aiDebugger.log('连接测试异常: ' + error.message, 'error');
            }
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = '测试连接';
        }
    }

    // API类型变化处理
    onApiTypeChange() {
        const apiType = document.getElementById('api-type').value;
        const modelUrlInput = document.getElementById('model-url');
        const apiKeyInput = document.getElementById('api-key');
        const modelNameSelect = document.getElementById('model-name');

        // 根据API类型设置默认值
        if (apiType === 'doubao') {
            modelUrlInput.value = 'https://ark.cn-beijing.volces.com/api/v3';
            apiKeyInput.value = '0bf1c076-b6e9-479a-9c55-051813ad5e4a';
            modelNameSelect.value = 'doubao-seed-1-6-250615'; // 使用支持图片的新模型
            apiKeyInput.style.display = 'block';
            apiKeyInput.previousElementSibling.style.display = 'block';
        } else if (apiType === 'ollama') {
            modelUrlInput.value = 'http://localhost:11434';
            apiKeyInput.value = '';
            modelNameSelect.value = 'llama2';
            apiKeyInput.style.display = 'none';
            apiKeyInput.previousElementSibling.style.display = 'none';
        } else if (apiType === 'openai') {
            modelUrlInput.value = 'https://api.openai.com/v1';
            apiKeyInput.value = '';
            modelNameSelect.value = 'gpt-3.5-turbo';
            apiKeyInput.style.display = 'block';
            apiKeyInput.previousElementSibling.style.display = 'block';
        }

        this.saveSettings();
    }

    // 保存设置
    saveSettings() {
        const settings = {
            apiType: document.getElementById('api-type').value,
            modelUrl: document.getElementById('model-url').value,
            modelName: document.getElementById('model-name').value,
            apiKey: document.getElementById('api-key').value,
            autoScreenshot: document.getElementById('auto-screenshot').checked,
            includeCss: document.getElementById('include-css').checked,
            includeJs: document.getElementById('include-js').checked
        };

        localStorage.setItem('electronBrowserAI_settings', JSON.stringify(settings));

        // 更新AI配置
        if (window.aiAPI && window.aiAPI.setModelConfig) {
            try {
                window.aiAPI.setModelConfig({
                    apiType: settings.apiType,
                    baseURL: settings.modelUrl,
                    model: settings.modelName,
                    apiKey: settings.apiKey
                });
            } catch (error) {
                console.error('设置AI配置失败:', error);
            }
        } else {
            console.warn('AI API不可用，跳过配置设置');
        }

        this.showNotification('设置已保存', 'success');
    }

    // 加载设置
    loadSettings() {
        const savedSettings = localStorage.getItem('electronBrowserAI_settings');

        if (savedSettings) {
            const settings = JSON.parse(savedSettings);

            document.getElementById('api-type').value = settings.apiType || 'doubao';
            document.getElementById('model-url').value = settings.modelUrl || 'https://ark.cn-beijing.volces.com/api/v3';
            document.getElementById('model-name').value = settings.modelName || 'doubao-seed-1-6-250615'; // 使用支持图片的新模型
            document.getElementById('api-key').value = settings.apiKey || '0bf1c076-b6e9-479a-9c55-051813ad5e4a';
            document.getElementById('auto-screenshot').checked = settings.autoScreenshot !== false;
            document.getElementById('include-css').checked = settings.includeCss !== false;
            document.getElementById('include-js').checked = settings.includeJs !== false;

            // 根据API类型显示/隐藏API密钥字段
            this.onApiTypeChange();
        } else {
            // 默认设置
            document.getElementById('api-type').value = 'doubao';
            this.onApiTypeChange();
        }
    }

    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        const container = document.getElementById('notifications');
        container.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // 生成文档说明
    async generateDocumentation() {
        if (!this.isAIConnected) {
            this.showNotification('AI服务未连接，请检查设置', 'error');
            return;
        }

        // 防止重复请求
        if (this.isGeneratingDoc) {
            this.showNotification('正在生成文档，请稍候...', 'warning');
            return;
        }

        this.isGeneratingDoc = true;

        // 开始调试会话
        if (window.aiDebugger) {
            window.aiDebugger.startSession({
                url: this.currentUrl,
                action: 'generateDocumentation'
            });
        }

        // 使用文档显示工具
        window.documentationDisplay.showLoading('正在分析页面内容...');

        try {
            // 初始化页面提取器和截图工具
            window.pageExtractor.init(this.webview);
            window.screenCapture.init(this.webview);

            // 等待页面完全加载
            const isLoaded = await window.pageExtractor.isPageLoaded();
            if (!isLoaded) {
                window.documentationDisplay.showLoading('等待页面加载完成...');
                if (window.aiDebugger) {
                    window.aiDebugger.log('页面未完全加载，等待中...', 'warning');
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // 提取页面基本信息
            window.documentationDisplay.showLoading('正在提取页面基本信息...');
            if (window.aiDebugger) {
                window.aiDebugger.log('开始提取页面基本信息（简化模式）', 'info');
            }
            const pageData = await window.pageExtractor.extractPageData();

            // 获取截图（如果启用）- 使用本地文件方案
            const settings = JSON.parse(localStorage.getItem('electronBrowserAI_settings') || '{}');
            if (settings.autoScreenshot !== false) { // 重新启用截图
                window.documentationDisplay.showLoading('正在截取页面截图...');
                if (window.aiDebugger) {
                    window.aiDebugger.log('开始截取页面截图', 'info');
                }
                try {
                    // 使用新的本地文件截图方案
                    pageData.screenshot = await window.screenCapture.captureCurrentPage();
                    if (window.aiDebugger) {
                        window.aiDebugger.log('截图成功，使用本地文件URL', 'success');
                    }
                } catch (error) {
                    console.warn('Screenshot failed, continuing without screenshot:', error);
                    pageData.screenshot = null;
                    if (window.aiDebugger) {
                        window.aiDebugger.log('截图失败: ' + error.message, 'warning');
                    }
                }
            } else {
                pageData.screenshot = null;
                if (window.aiDebugger) {
                    window.aiDebugger.log('截图功能已禁用，跳过截图', 'info');
                }
            }

            // 确保pageData中的所有数据都是可序列化的，只传递必要字段
            const cleanPageData = this.sanitizePageData(pageData);

            // 验证数据可序列化性
            try {
                JSON.stringify(cleanPageData);
                console.log('✅ 数据序列化验证通过');
            } catch (error) {
                console.error('❌ 数据序列化失败:', error);
                throw new Error('页面数据包含无法序列化的内容');
            }

            // 记录请求信息到调试器
            if (window.aiDebugger) {
                window.aiDebugger.logRequest({
                    apiType: settings.apiType || 'doubao',
                    model: settings.modelName || 'doubao-seed-1-6-250615',
                    pageData: cleanPageData,
                    settings: settings
                });
            }

            // 发送到AI模型
            window.documentationDisplay.showLoading('正在基于截图生成使用说明...');
            if (window.aiDebugger) {
                window.aiDebugger.log('发送数据到AI模型（主要基于截图分析）', 'info');
            }

            const result = await window.aiAPI.sendToModel(cleanPageData);

            // 记录响应信息到调试器
            if (window.aiDebugger) {
                if (result && result.success) {
                    window.aiDebugger.logResponse(result);
                    window.aiDebugger.log('AI模型响应成功', 'success');
                } else {
                    const errorMsg = (result && result.error) || '生成失败';
                    window.aiDebugger.logResponse(null, new Error(errorMsg));
                    window.aiDebugger.log('AI模型响应失败: ' + errorMsg, 'error');
                }
            }

            if (result && result.success) {
                // 显示生成的文档
                window.documentationDisplay.displayDocumentation(
                    result.documentation,
                    {
                        url: pageData.url,
                        title: pageData.title,
                        model: result.model || '未知模型',
                        timestamp: result.timestamp || new Date().toISOString()
                    }
                );
                this.showNotification('文档生成成功', 'success');

                if (window.aiDebugger) {
                    window.aiDebugger.log('文档生成完成，内容长度: ' + (result.documentation ? result.documentation.length : 0) + ' 字符', 'success');
                }
            } else {
                throw new Error((result && result.error) || '生成失败');
            }
        } catch (error) {
            console.error('Documentation generation failed:', error);

            // 记录错误到调试器
            if (window.aiDebugger) {
                window.aiDebugger.logResponse(null, error);
                window.aiDebugger.log('文档生成过程出错: ' + error.message, 'error');
            }

            // 根据错误类型显示不同的错误信息
            let errorMessage = '文档生成失败';
            if (error.message.includes('timeout') || error.message.includes('超时')) {
                errorMessage = '生成超时，请重试';
                window.documentationDisplay.displayError('页面分析超时，可能是图片过大或网络较慢。建议：\n1. 刷新页面后重试\n2. 检查网络连接\n3. 稍后再试');
            } else if (error.message.includes('Network Error') || error.message.includes('网络')) {
                errorMessage = '网络连接失败';
                window.documentationDisplay.displayError('网络连接错误，请检查网络设置后重试');
            } else {
                window.documentationDisplay.displayError(error.message);
            }

            this.showNotification(errorMessage, 'error');
        } finally {
            // 重置生成标志
            this.isGeneratingDoc = false;
        }
    }

    // 清理页面数据，确保可序列化 - 简化版本
    sanitizePageData(pageData) {
        const cleanData = {
            url: this.sanitizeString(pageData.url),
            title: this.sanitizeString(pageData.title),
            html: '<!-- HTML extraction skipped for safety -->',
            css: '/* CSS extraction skipped for safety */',
            scripts: '// JavaScript extraction skipped for safety',
            metadata: {
                description: this.sanitizeString(pageData.metadata?.description || ''),
                keywords: this.sanitizeString(pageData.metadata?.keywords || '')
            },
            screenshot: pageData.screenshot || null
        };

        // 验证数据大小
        const dataSize = JSON.stringify(cleanData).length;
        console.log('📊 简化后数据大小:', dataSize, 'bytes');

        return cleanData;
    }

    // 清理字符串数据
    sanitizeString(str, maxLength = null) {
        if (!str || typeof str !== 'string') {
            return '';
        }

        let cleaned = str;

        if (maxLength && cleaned.length > maxLength) {
            cleaned = cleaned.substring(0, maxLength) + '\n<!-- Content truncated for size limit -->';
        }

        return cleaned;
    }

    // 保存文档
    async saveDocumentation() {
        const docText = document.getElementById('doc-text').textContent;
        
        if (!docText) {
            this.showNotification('没有可保存的文档', 'warning');
            return;
        }

        try {
            const data = {
                url: this.currentUrl,
                timestamp: new Date().toISOString(),
                documentation: docText
            };

            const result = await window.electronAPI.saveFile(data);
            
            if (result.success) {
                this.showNotification('文档已保存', 'success');
            } else if (!result.cancelled) {
                throw new Error(result.error || '保存失败');
            }
        } catch (error) {
            console.error('Save failed:', error);
            this.showNotification('保存失败', 'error');
        }
    }

    // 复制文档
    async copyDocumentation() {
        const docText = document.getElementById('doc-text').textContent;
        
        if (!docText) {
            this.showNotification('没有可复制的文档', 'warning');
            return;
        }

        try {
            await navigator.clipboard.writeText(docText);
            this.showNotification('文档已复制到剪贴板', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            this.showNotification('复制失败', 'error');
        }
    }
}

// 当DOM加载完成时初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    // 延迟初始化以确保主进程IPC处理器已注册
    setTimeout(async () => {
        window.app = new ElectronBrowserAI();

        // 清理旧的截图文件
        try {
            const cleanupResult = await window.electronAPI.cleanupScreenshots();
            if (cleanupResult.success && cleanupResult.cleanedCount > 0) {
                console.log(`🧹 清理了 ${cleanupResult.cleanedCount} 个旧截图文件`);
            }
        } catch (error) {
            console.warn('清理旧截图文件失败:', error);
        }
    }, 3000); // 延迟3秒初始化
});
