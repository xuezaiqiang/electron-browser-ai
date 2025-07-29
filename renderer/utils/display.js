// 使用说明展示工具
class DocumentationDisplay {
    constructor() {
        this.panel = null;
        this.contentElement = null;
        this.loadingElement = null;
        this.isVisible = false;
        this.currentDocumentation = null;
        this.displayOptions = {
            autoFormat: true,
            enableMarkdown: true,
            showTimestamp: true,
            showMetadata: true,
            maxHeight: '80vh',
            animation: true
        };
    }

    // 初始化展示工具
    init() {
        this.panel = document.getElementById('documentation-panel');
        this.contentElement = document.getElementById('doc-text');
        this.loadingElement = document.getElementById('doc-loading');
        
        if (!this.panel || !this.contentElement || !this.loadingElement) {
            console.error('Documentation display elements not found');
            return;
        }

        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    }

    // 设置事件监听器
    setupEventListeners() {
        // 面板关闭事件
        const closeBtn = document.getElementById('close-doc');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // 保存按钮事件
        const saveBtn = document.getElementById('save-doc');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveDocumentation());
        }

        // 复制按钮事件
        const copyBtn = document.getElementById('copy-doc');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyToClipboard());
        }

        // 点击面板外部关闭
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) {
                this.hide();
            }
        });

        // 内容滚动事件
        this.contentElement.addEventListener('scroll', () => {
            this.updateScrollIndicator();
        });
    }

    // 设置键盘快捷键
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;

            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    this.hide();
                    break;
                case 's':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.saveDocumentation();
                    }
                    break;
                case 'c':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.copyToClipboard();
                    }
                    break;
            }
        });
    }

    // 显示文档面板
    show() {
        if (this.panel) {
            this.panel.classList.remove('hidden');
            this.isVisible = true;
            
            if (this.displayOptions.animation) {
                this.panel.style.opacity = '0';
                this.panel.style.transform = 'translate(-50%, -50%) scale(0.9)';
                
                requestAnimationFrame(() => {
                    this.panel.style.transition = 'all 0.3s ease';
                    this.panel.style.opacity = '1';
                    this.panel.style.transform = 'translate(-50%, -50%) scale(1)';
                });
            }
        }
    }

    // 隐藏文档面板
    hide() {
        if (this.panel) {
            if (this.displayOptions.animation) {
                this.panel.style.transition = 'all 0.3s ease';
                this.panel.style.opacity = '0';
                this.panel.style.transform = 'translate(-50%, -50%) scale(0.9)';
                
                setTimeout(() => {
                    this.panel.classList.add('hidden');
                    this.isVisible = false;
                }, 300);
            } else {
                this.panel.classList.add('hidden');
                this.isVisible = false;
            }
        }
    }

    // 显示加载状态
    showLoading(message = '正在生成页面使用说明...') {
        if (this.loadingElement) {
            this.loadingElement.classList.remove('hidden');
            const loadingText = this.loadingElement.querySelector('p');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
        
        if (this.contentElement) {
            this.contentElement.innerHTML = '';
        }
        
        this.show();
    }

    // 隐藏加载状态
    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.classList.add('hidden');
        }
    }

    // 显示文档内容
    displayDocumentation(documentation, metadata = {}) {
        this.hideLoading();
        
        if (!documentation) {
            this.displayError('没有可显示的文档内容');
            return;
        }

        this.currentDocumentation = {
            content: documentation,
            metadata: metadata,
            timestamp: new Date().toISOString()
        };

        // 格式化并显示内容
        const formattedContent = this.formatContent(documentation, metadata);
        this.contentElement.innerHTML = formattedContent;

        // 添加交互功能
        this.addInteractiveFeatures();
        
        // 更新滚动指示器
        this.updateScrollIndicator();
        
        this.show();
    }

    // 显示错误信息
    displayError(errorMessage) {
        this.hideLoading();
        
        const errorHtml = `
            <div class="error-message">
                <div class="error-icon">❌</div>
                <h3>生成失败</h3>
                <p>${errorMessage}</p>
                <button onclick="window.app.generateDocumentation()" class="retry-btn">重试</button>
            </div>
        `;
        
        this.contentElement.innerHTML = errorHtml;
        this.show();
    }

    // 格式化内容
    formatContent(content, metadata) {
        let formattedContent = '';

        // 添加元数据头部
        if (this.displayOptions.showMetadata && metadata) {
            formattedContent += this.createMetadataHeader(metadata);
        }

        // 处理Markdown格式
        if (this.displayOptions.enableMarkdown) {
            formattedContent += this.parseMarkdown(content);
        } else {
            formattedContent += `<pre class="documentation-content">${this.escapeHtml(content)}</pre>`;
        }

        // 添加时间戳
        if (this.displayOptions.showTimestamp) {
            formattedContent += this.createTimestampFooter();
        }

        return formattedContent;
    }

    // 创建元数据头部
    createMetadataHeader(metadata) {
        const url = metadata.url || '未知页面';
        const title = metadata.title || '无标题';
        
        return `
            <div class="doc-metadata">
                <h2 class="doc-title">${this.escapeHtml(title)}</h2>
                <div class="doc-url">
                    <span class="url-label">页面地址:</span>
                    <a href="${this.escapeHtml(url)}" target="_blank" class="url-link">${this.escapeHtml(url)}</a>
                </div>
            </div>
            <hr class="doc-separator">
        `;
    }

    // 创建时间戳页脚
    createTimestampFooter() {
        const timestamp = new Date().toLocaleString('zh-CN');
        return `
            <hr class="doc-separator">
            <div class="doc-footer">
                <span class="timestamp">生成时间: ${timestamp}</span>
            </div>
        `;
    }

    // 简单的Markdown解析
    parseMarkdown(content) {
        let html = this.escapeHtml(content);
        
        // 标题
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        
        // 粗体和斜体
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // 代码块
        html = html.replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>');
        html = html.replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');
        
        // 列表
        html = html.replace(/^\d+\.\s+(.*$)/gm, '<li class="ordered-item">$1</li>');
        html = html.replace(/^[-*]\s+(.*$)/gm, '<li class="unordered-item">$1</li>');
        
        // 包装列表项
        html = html.replace(/(<li class="ordered-item">.*?<\/li>)/gs, '<ol>$1</ol>');
        html = html.replace(/(<li class="unordered-item">.*?<\/li>)/gs, '<ul>$1</ul>');
        
        // 段落
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        // 清理空段落
        html = html.replace(/<p><\/p>/g, '');
        
        return `<div class="markdown-content">${html}</div>`;
    }

    // 转义HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 添加交互功能
    addInteractiveFeatures() {
        // 添加代码块复制功能
        const codeBlocks = this.contentElement.querySelectorAll('.code-block');
        codeBlocks.forEach(block => {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-code-btn';
            copyBtn.textContent = '复制';
            copyBtn.onclick = () => this.copyCodeBlock(block);
            
            block.style.position = 'relative';
            block.appendChild(copyBtn);
        });

        // 添加链接点击处理
        const links = this.contentElement.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                window.electronAPI.openExternal(link.href);
            });
        });
    }

    // 复制代码块
    async copyCodeBlock(codeBlock) {
        const code = codeBlock.querySelector('code');
        if (code) {
            try {
                await navigator.clipboard.writeText(code.textContent);
                this.showToast('代码已复制到剪贴板');
            } catch (error) {
                console.error('Copy failed:', error);
                this.showToast('复制失败', 'error');
            }
        }
    }

    // 复制整个文档到剪贴板
    async copyToClipboard() {
        if (!this.currentDocumentation) {
            this.showToast('没有可复制的内容', 'warning');
            return;
        }

        try {
            await navigator.clipboard.writeText(this.currentDocumentation.content);
            this.showToast('文档已复制到剪贴板', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            this.showToast('复制失败', 'error');
        }
    }

    // 保存文档
    async saveDocumentation() {
        if (!this.currentDocumentation) {
            this.showToast('没有可保存的内容', 'warning');
            return;
        }

        try {
            const data = {
                content: this.currentDocumentation.content,
                metadata: this.currentDocumentation.metadata,
                timestamp: this.currentDocumentation.timestamp,
                format: 'markdown'
            };

            const result = await window.electronAPI.saveFile(data);
            
            if (result.success) {
                this.showToast('文档已保存', 'success');
            } else if (!result.cancelled) {
                throw new Error(result.error || '保存失败');
            }
        } catch (error) {
            console.error('Save failed:', error);
            this.showToast('保存失败', 'error');
        }
    }

    // 更新滚动指示器
    updateScrollIndicator() {
        const scrollTop = this.contentElement.scrollTop;
        const scrollHeight = this.contentElement.scrollHeight;
        const clientHeight = this.contentElement.clientHeight;
        
        const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;
        
        // 更新滚动指示器（如果存在）
        const indicator = this.panel.querySelector('.scroll-indicator');
        if (indicator) {
            indicator.style.width = `${scrollPercentage}%`;
        }
    }

    // 显示提示消息
    showToast(message, type = 'info') {
        if (window.app && typeof window.app.showNotification === 'function') {
            window.app.showNotification(message, type);
        } else {
            console.log(`Toast: ${message}`);
        }
    }

    // 设置显示选项
    setOptions(options) {
        this.displayOptions = { ...this.displayOptions, ...options };
    }

    // 获取当前文档
    getCurrentDocumentation() {
        return this.currentDocumentation;
    }

    // 清除当前文档
    clear() {
        this.currentDocumentation = null;
        if (this.contentElement) {
            this.contentElement.innerHTML = '';
        }
        this.hide();
    }

    // 检查是否可见
    isVisible() {
        return this.isVisible;
    }
}

// 导出展示工具实例
window.documentationDisplay = new DocumentationDisplay();

// 当DOM加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
    window.documentationDisplay.init();
});
