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
        // 等待DOM完全加载后再初始化AI对话管理器
        if (window.AIChatManager) {
            this.aiChatManager = new AIChatManager();
            window.aiChatManager = this.aiChatManager; // 全局引用，供任务调度器使用
        } else {
            console.warn('AIChatManager not loaded yet');
        }
    }

    // 设置DOM元素引用
    setupElements() {
        this.webview = document.getElementById('webview');
        this.urlInput = document.getElementById('url-input');
        this.goBtn = document.getElementById('go-btn');
        this.refreshBtn = document.getElementById('refresh-btn');
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

        this.webview.addEventListener('new-window', (event) => {
            // 在新窗口中打开链接
            event.preventDefault();
            this.navigateToUrl(event.url);
        });

        // 处理webview加载错误
        this.webview.addEventListener('did-fail-load', (event) => {
            if (event.errorCode !== -3) { // -3 是用户取消，不显示错误
                this.statusText.textContent = `加载失败 (${event.errorCode})`;
                this.showNotification(`页面加载失败: ${event.errorDescription}`, 'error');
            }
        });
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
            this.webview.reload();
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

        // 检查Python自动化环境 - 延迟执行以确保主进程IPC处理器已注册
        setTimeout(async () => {
            try {
                if (window.pythonAPI && window.pythonAPI.checkEnvironment) {
                    const result = await window.pythonAPI.checkEnvironment();
                    this.updatePythonStatus(result.success);
                    if (result.success) {
                        console.log('✅ Python环境检查通过');
                    } else {
                        console.warn('⚠️ Python环境检查失败:', result.message);
                    }
                } else {
                    this.updatePythonStatus(false);
                }
            } catch (error) {
                console.warn('Python environment check failed:', error);
                this.updatePythonStatus(false);
            }
        }, 2000); // 延迟2秒执行
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
            this.aiChatManager.show();
        } else {
            this.showNotification('AI智能助手正在初始化，请稍后再试', 'warning');
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
        window.aiAPI.setModelConfig({
            apiType: settings.apiType,
            baseURL: settings.modelUrl,
            model: settings.modelName,
            apiKey: settings.apiKey
        });

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
