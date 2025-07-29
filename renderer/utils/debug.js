// AI调试工具
class AIDebugger {
    constructor() {
        this.panel = null;
        this.requestElement = null;
        this.responseElement = null;
        this.statsElement = null;
        this.logsElement = null;
        this.isVisible = false;
        this.logs = [];
        this.currentSession = null;
    }

    // 初始化调试器
    init() {
        this.panel = document.getElementById('debug-panel');
        this.requestElement = document.getElementById('debug-request');
        this.responseElement = document.getElementById('debug-response');
        this.statsElement = document.getElementById('debug-stats');
        this.logsElement = document.getElementById('debug-logs');

        if (!this.panel) {
            console.error('Debug panel not found');
            return;
        }

        this.setupEventListeners();
        this.log('调试器已初始化', 'info');
    }

    // 设置事件监听器
    setupEventListeners() {
        // 关闭按钮
        const closeBtn = document.getElementById('close-debug');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // 清空按钮
        const clearBtn = document.getElementById('clear-debug');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clear());
        }

        // 导出按钮
        const exportBtn = document.getElementById('export-debug');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportDebugData());
        }

        // 点击面板外部关闭
        this.panel.addEventListener('click', (e) => {
            if (e.target === this.panel) {
                this.hide();
            }
        });
    }

    // 显示调试面板
    show() {
        if (this.panel) {
            this.panel.classList.remove('hidden');
            this.isVisible = true;
            this.log('调试面板已打开', 'info');
        }
    }

    // 隐藏调试面板
    hide() {
        if (this.panel) {
            this.panel.classList.add('hidden');
            this.isVisible = false;
            this.log('调试面板已关闭', 'info');
        }
    }

    // 开始新的调试会话
    startSession(sessionData = {}) {
        this.currentSession = {
            id: Date.now(),
            startTime: new Date(),
            url: sessionData.url || window.location.href,
            request: null,
            response: null,
            ...sessionData
        };

        this.log(`开始新的调试会话 #${this.currentSession.id}`, 'info');
        this.updateDisplay();
    }

    // 记录请求信息
    logRequest(requestData) {
        if (!this.currentSession) {
            this.startSession();
        }

        this.currentSession.request = {
            timestamp: new Date(),
            data: requestData
        };

        this.log('📤 发送API请求', 'info');
        this.updateRequestDisplay();
    }

    // 记录响应信息
    logResponse(responseData, error = null) {
        if (!this.currentSession) {
            this.startSession();
        }

        this.currentSession.response = {
            timestamp: new Date(),
            data: responseData,
            error: error,
            success: !error
        };

        if (error) {
            this.log('📥 API请求失败: ' + error.message, 'error');
        } else {
            this.log('📥 收到API响应', 'success');
        }

        this.updateResponseDisplay();
        this.updateStatsDisplay();
    }

    // 记录日志
    log(message, type = 'info') {
        const logEntry = {
            timestamp: new Date(),
            message: message,
            type: type
        };

        this.logs.push(logEntry);
        
        // 限制日志数量
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(-100);
        }

        this.updateLogsDisplay();
        console.log(`[AI Debug] ${message}`);
    }

    // 更新请求显示
    updateRequestDisplay() {
        if (!this.requestElement || !this.currentSession?.request) return;

        const request = this.currentSession.request;
        const html = `
            <div class="debug-timestamp">${this.formatTimestamp(request.timestamp)}</div>
            <div class="debug-status pending">发送中</div>
            <div class="debug-json">${this.formatJSON(request.data)}</div>
            <div class="debug-metric">
                <strong>请求大小:</strong> ${this.formatBytes(JSON.stringify(request.data).length)}
            </div>
        `;

        this.requestElement.innerHTML = html;
    }

    // 更新响应显示
    updateResponseDisplay() {
        if (!this.responseElement || !this.currentSession?.response) return;

        const response = this.currentSession.response;
        const statusClass = response.success ? 'success' : 'error';
        const statusText = response.success ? '成功' : '失败';

        let content = '';
        if (response.error) {
            const errorMessage = typeof response.error === 'string' ? response.error :
                                (response.error.message || '未知错误');
            content = `
                <div class="debug-json">错误信息: ${errorMessage}</div>
                ${response.error.details ? `<div class="debug-json">详细信息: ${this.formatJSON(response.error.details)}</div>` : ''}
            `;
        } else {
            content = `<div class="debug-json">${this.formatJSON(response.data)}</div>`;
        }

        const html = `
            <div class="debug-timestamp">${this.formatTimestamp(response.timestamp)}</div>
            <div class="debug-status ${statusClass}">${statusText}</div>
            ${content}
            <div class="debug-metric">
                <strong>响应大小:</strong> ${this.formatBytes(JSON.stringify(response.data || {}).length)}
            </div>
        `;

        this.responseElement.innerHTML = html;
    }

    // 更新统计显示
    updateStatsDisplay() {
        if (!this.statsElement || !this.currentSession) return;

        const session = this.currentSession;
        const duration = session.response && session.request ?
            session.response.timestamp - session.request.timestamp :
            session.request ? Date.now() - session.request.timestamp : 0;

        let metrics = `
            <div class="debug-metric">
                <strong>会话ID:</strong> ${session.id}
            </div>
            <div class="debug-metric">
                <strong>开始时间:</strong> ${this.formatTimestamp(session.startTime)}
            </div>
            <div class="debug-metric">
                <strong>响应时间:</strong> ${duration}ms
            </div>
        `;

        if (session.request && session.request.data) {
            metrics += `
                <div class="debug-metric">
                    <strong>API类型:</strong> ${session.request.data.apiType || '未知'}
                </div>
                <div class="debug-metric">
                    <strong>模型:</strong> ${session.request.data.model || '未知'}
                </div>
            `;
        }

        if (session.response && session.response.success && session.response.data) {
            const content = session.response.data.documentation || '';
            metrics += `
                <div class="debug-metric">
                    <strong>生成内容长度:</strong> ${content.length} 字符
                </div>
                <div class="debug-metric">
                    <strong>状态:</strong> 成功
                </div>
            `;
        } else if (session.response && !session.response.success) {
            metrics += `
                <div class="debug-metric">
                    <strong>状态:</strong> 失败
                </div>
            `;
        }

        this.statsElement.innerHTML = metrics;
    }

    // 更新日志显示
    updateLogsDisplay() {
        if (!this.logsElement) return;

        const recentLogs = this.logs.slice(-20); // 显示最近20条日志
        const html = recentLogs.map(log => `
            <div class="debug-log-entry ${log.type}">
                <div class="debug-timestamp">${this.formatTimestamp(log.timestamp)}</div>
                <div>${log.message}</div>
            </div>
        `).join('');

        this.logsElement.innerHTML = html || '<div class="debug-placeholder">暂无日志</div>';
        
        // 自动滚动到底部
        this.logsElement.scrollTop = this.logsElement.scrollHeight;
    }

    // 更新整体显示
    updateDisplay() {
        this.updateRequestDisplay();
        this.updateResponseDisplay();
        this.updateStatsDisplay();
        this.updateLogsDisplay();
    }

    // 清空调试数据
    clear() {
        this.logs = [];
        this.currentSession = null;
        
        if (this.requestElement) {
            this.requestElement.innerHTML = '<div class="debug-placeholder">等待API请求...</div>';
        }
        if (this.responseElement) {
            this.responseElement.innerHTML = '<div class="debug-placeholder">等待API响应...</div>';
        }
        if (this.statsElement) {
            this.statsElement.innerHTML = '<div class="debug-placeholder">等待统计数据...</div>';
        }
        if (this.logsElement) {
            this.logsElement.innerHTML = '<div class="debug-placeholder">等待调试日志...</div>';
        }

        this.log('调试数据已清空', 'info');
    }

    // 导出调试数据
    async exportDebugData() {
        const debugData = {
            session: this.currentSession,
            logs: this.logs,
            exportTime: new Date().toISOString(),
            version: '1.0.0'
        };

        try {
            const dataStr = JSON.stringify(debugData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-debug-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.log('调试数据已导出', 'success');
        } catch (error) {
            this.log('导出失败: ' + error.message, 'error');
        }
    }

    // 格式化JSON
    formatJSON(obj) {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (error) {
            return String(obj);
        }
    }

    // 格式化时间戳
    formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
    }

    // 格式化字节大小
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 获取当前状态
    getStatus() {
        return {
            isVisible: this.isVisible,
            sessionActive: !!this.currentSession,
            logCount: this.logs.length
        };
    }
}

// 导出调试器实例
window.aiDebugger = new AIDebugger();

// 当DOM加载完成时初始化
document.addEventListener('DOMContentLoaded', () => {
    window.aiDebugger.init();
});
