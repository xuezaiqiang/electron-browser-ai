// 悬浮按钮功能模块
class FloatingButton {
    constructor() {
        this.button = null;
        this.isProcessing = false;
        this.currentState = 'idle'; // idle, loading, success, error
        this.tooltip = '点击生成页面使用说明 (Ctrl+G)';
        
        this.init();
    }

    // 初始化悬浮按钮
    init() {
        this.button = document.getElementById('floating-button');
        
        if (!this.button) {
            console.error('Floating button element not found');
            return;
        }

        this.setupButton();
        this.setupEventListeners();
        this.setupTooltip();
        this.setupProgressRing();
    }

    // 设置按钮基本属性
    setupButton() {
        this.button.setAttribute('role', 'button');
        this.button.setAttribute('tabindex', '0');
        this.button.setAttribute('aria-label', this.tooltip);
        this.button.setAttribute('data-tooltip', this.tooltip);
    }

    // 设置事件监听器
    setupEventListeners() {
        // 点击事件
        this.button.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleClick();
        });

        // 键盘事件
        this.button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleClick();
            }
        });

        // 鼠标悬停事件
        this.button.addEventListener('mouseenter', () => {
            if (!this.isProcessing) {
                this.button.classList.add('expanded');
            }
        });

        this.button.addEventListener('mouseleave', () => {
            this.button.classList.remove('expanded');
        });

        // 触摸事件（移动设备）
        this.button.addEventListener('touchstart', (e) => {
            e.preventDefault();
        });

        this.button.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handleClick();
        });
    }

    // 设置工具提示
    setupTooltip() {
        // 动态更新工具提示内容
        this.updateTooltip();
    }

    // 设置进度环
    setupProgressRing() {
        const progressRing = document.createElement('svg');
        progressRing.className = 'progress-ring';
        progressRing.innerHTML = `
            <circle cx="32" cy="32" r="30"></circle>
        `;
        
        this.button.appendChild(progressRing);
    }

    // 处理点击事件
    async handleClick() {
        if (this.isProcessing) {
            return;
        }

        try {
            await this.startProcessing();
            
            // 触发主应用的文档生成功能
            if (window.app && typeof window.app.generateDocumentation === 'function') {
                await window.app.generateDocumentation();
                this.showSuccess();
            } else {
                throw new Error('应用未正确初始化');
            }
        } catch (error) {
            console.error('Documentation generation failed:', error);
            this.showError();
            
            // 显示错误通知
            if (window.app && typeof window.app.showNotification === 'function') {
                window.app.showNotification(`生成失败: ${error.message}`, 'error');
            }
        }
    }

    // 开始处理状态
    async startProcessing() {
        this.isProcessing = true;
        this.currentState = 'loading';
        
        this.button.classList.add('loading');
        this.button.classList.remove('success', 'error', 'expanded');
        
        this.updateIcon('⏳');
        this.updateText('处理中');
        this.updateTooltip('正在生成页面说明...');
        
        // 禁用按钮交互
        this.button.style.pointerEvents = 'none';
    }

    // 显示成功状态
    showSuccess() {
        this.isProcessing = false;
        this.currentState = 'success';
        
        this.button.classList.remove('loading');
        this.button.classList.add('success');
        
        this.updateIcon('✅');
        this.updateText('完成');
        this.updateTooltip('文档生成成功！');
        
        // 恢复按钮交互
        this.button.style.pointerEvents = 'auto';
        
        // 2秒后恢复默认状态
        setTimeout(() => {
            this.resetToDefault();
        }, 2000);
    }

    // 显示错误状态
    showError() {
        this.isProcessing = false;
        this.currentState = 'error';
        
        this.button.classList.remove('loading');
        this.button.classList.add('error');
        
        this.updateIcon('❌');
        this.updateText('失败');
        this.updateTooltip('文档生成失败，点击重试');
        
        // 恢复按钮交互
        this.button.style.pointerEvents = 'auto';
        
        // 3秒后恢复默认状态
        setTimeout(() => {
            this.resetToDefault();
        }, 3000);
    }

    // 恢复默认状态
    resetToDefault() {
        this.isProcessing = false;
        this.currentState = 'idle';
        
        this.button.classList.remove('loading', 'success', 'error');
        
        this.updateIcon('🤖');
        this.updateText('生成说明');
        this.updateTooltip('点击生成页面使用说明 (Ctrl+G)');
        
        // 确保按钮交互可用
        this.button.style.pointerEvents = 'auto';
    }

    // 更新图标
    updateIcon(icon) {
        const iconElement = this.button.querySelector('.btn-icon');
        if (iconElement) {
            iconElement.textContent = icon;
        }
    }

    // 更新文本
    updateText(text) {
        const textElement = this.button.querySelector('.btn-text');
        if (textElement) {
            textElement.textContent = text;
        }
    }

    // 更新工具提示
    updateTooltip(tooltip = null) {
        if (tooltip) {
            this.tooltip = tooltip;
        }
        
        this.button.setAttribute('aria-label', this.tooltip);
        this.button.setAttribute('data-tooltip', this.tooltip);
    }

    // 设置按钮可见性
    setVisible(visible) {
        if (visible) {
            this.button.style.display = 'flex';
        } else {
            this.button.style.display = 'none';
        }
    }

    // 设置按钮启用/禁用状态
    setEnabled(enabled) {
        if (enabled) {
            this.button.style.pointerEvents = 'auto';
            this.button.style.opacity = '1';
            this.button.removeAttribute('disabled');
        } else {
            this.button.style.pointerEvents = 'none';
            this.button.style.opacity = '0.5';
            this.button.setAttribute('disabled', 'true');
        }
    }

    // 更新按钮位置
    setPosition(bottom = 30, right = 30) {
        this.button.style.bottom = `${bottom}px`;
        this.button.style.right = `${right}px`;
    }

    // 获取当前状态
    getState() {
        return {
            isProcessing: this.isProcessing,
            currentState: this.currentState,
            isVisible: this.button.style.display !== 'none',
            isEnabled: this.button.style.pointerEvents !== 'none'
        };
    }

    // 手动触发动画
    triggerAnimation(type) {
        switch (type) {
            case 'pulse':
                this.button.style.animation = 'pulse 0.6s ease';
                setTimeout(() => {
                    this.button.style.animation = '';
                }, 600);
                break;
            case 'shake':
                this.button.style.animation = 'errorShake 0.6s ease';
                setTimeout(() => {
                    this.button.style.animation = '';
                }, 600);
                break;
            case 'bounce':
                this.button.style.animation = 'successPulse 0.6s ease';
                setTimeout(() => {
                    this.button.style.animation = '';
                }, 600);
                break;
        }
    }

    // 销毁按钮（清理事件监听器）
    destroy() {
        if (this.button) {
            // 移除所有事件监听器
            this.button.replaceWith(this.button.cloneNode(true));
        }
    }
}

// 当DOM加载完成时初始化悬浮按钮
document.addEventListener('DOMContentLoaded', () => {
    // 等待主应用初始化完成后再初始化悬浮按钮
    setTimeout(() => {
        window.floatingButton = new FloatingButton();
    }, 100);
});
