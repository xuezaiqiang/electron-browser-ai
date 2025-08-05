/**
 * WebView控制器 - 提供对Electron应用内webview的控制接口
 */

class WebViewController {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.isReady = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 监听webview就绪状态
        this.mainWindow.webContents.on('dom-ready', () => {
            this.isReady = true;
        });
    }

    // 等待webview就绪
    async waitForReady(timeout = 10000) {
        if (this.isReady) return true;
        
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('WebView未在指定时间内就绪'));
            }, timeout);

            const checkReady = () => {
                if (this.isReady) {
                    clearTimeout(timer);
                    resolve(true);
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
    }

    // 导航到指定URL
    async navigate(url) {
        try {
            await this.waitForReady();

            // 直接使用executeJavaScript，不需要嵌套Promise
            const result = await this.mainWindow.webContents.executeJavaScript(`
                (function() {
                    try {
                        const webview = document.getElementById('webview');
                        if (!webview) {
                            return { success: false, error: 'WebView元素未找到' };
                        }

                        // 直接设置URL，不等待加载完成
                        webview.src = '${url}';

                        // 更新地址栏
                        const urlInput = document.getElementById('url-input');
                        if (urlInput) {
                            urlInput.value = '${url}';
                        }

                        return {
                            success: true,
                            url: '${url}',
                            message: '导航命令已发送'
                        };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                })();
            `);

            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 在webview中执行JavaScript
    async executeScript(script) {
        try {
            await this.waitForReady();
            
            return new Promise((resolve, reject) => {
                this.mainWindow.webContents.executeJavaScript(`
                    (function() {
                        try {
                            const webview = document.getElementById('webview');
                            if (!webview) {
                                return { success: false, error: 'WebView元素未找到' };
                            }
                            
                            return new Promise((resolve) => {
                                webview.executeJavaScript(\`${script.replace(/`/g, '\\`')}\`, (result) => {
                                    resolve({ success: true, result: result });
                                });
                            });
                        } catch (error) {
                            return { success: false, error: error.message };
                        }
                    })();
                `).then(resolve).catch(reject);
            });
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 查找元素
    async findElement(selector) {
        const script = `
            (function() {
                try {
                    const element = document.querySelector('${selector}');
                    if (element) {
                        return {
                            found: true,
                            tagName: element.tagName,
                            text: element.textContent?.trim() || '',
                            visible: element.offsetParent !== null,
                            enabled: !element.disabled
                        };
                    }
                    return { found: false };
                } catch (error) {
                    return { found: false, error: error.message };
                }
            })();
        `;
        
        const result = await this.executeScript(script);
        return result.success ? result.result : { found: false, error: result.error };
    }

    // 点击元素
    async clickElement(selector) {
        const script = `
            (function() {
                try {
                    const element = document.querySelector('${selector}');
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => {
                            element.focus();
                            element.click();
                        }, 500);
                        return {
                            success: true,
                            message: '点击成功',
                            element: {
                                tagName: element.tagName,
                                text: element.textContent?.trim() || ''
                            }
                        };
                    }
                    return { success: false, message: '元素未找到' };
                } catch (error) {
                    return { success: false, message: error.message };
                }
            })();
        `;
        
        const result = await this.executeScript(script);
        return result.success ? result.result : { success: false, error: result.error };
    }

    // 输入文本
    async inputText(selector, text) {
        const script = `
            (function() {
                try {
                    const element = document.querySelector('${selector}');
                    if (element) {
                        element.focus();
                        element.value = '';
                        element.value = '${text.replace(/'/g, "\\'")}';
                        
                        // 触发输入事件
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        
                        return {
                            success: true,
                            message: '文本输入成功',
                            text: '${text}'
                        };
                    }
                    return { success: false, message: '输入框未找到' };
                } catch (error) {
                    return { success: false, message: error.message };
                }
            })();
        `;
        
        const result = await this.executeScript(script);
        return result.success ? result.result : { success: false, error: result.error };
    }

    // 搜索操作（分步骤执行）
    async search(query, site = 'baidu') {
        try {
            // 1. 导航到搜索网站
            let url;
            let searchSelector;

            switch (site.toLowerCase()) {
                case 'baidu':
                    url = 'https://www.baidu.com';
                    searchSelector = '#kw';
                    break;
                case 'taobao':
                    url = 'https://www.taobao.com';
                    searchSelector = '.search-combobox-input';
                    break;
                default:
                    url = 'https://www.baidu.com';
                    searchSelector = '#kw';
            }



            // 1. 先导航
            const navResult = await this.navigate(url);
            if (!navResult.success) {
                return { success: false, error: `导航失败: ${navResult.error}` };
            }

            // 2. 等待页面加载
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 3. 执行搜索
            const searchResult = await this.mainWindow.webContents.executeJavaScript(`
                (function() {
                    try {
                        const webview = document.getElementById('webview');
                        if (!webview) {
                            return { success: false, error: 'WebView元素未找到' };
                        }

                        // 在webview中执行搜索
                        webview.executeJavaScript(\`
                            (function() {
                                try {
                                    const searchInput = document.querySelector('${searchSelector}');
                                    if (searchInput) {
                                        searchInput.focus();
                                        searchInput.value = '${query}';

                                        // 触发输入事件
                                        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

                                        // 按回车提交
                                        const enterEvent = new KeyboardEvent('keydown', {
                                            key: 'Enter',
                                            code: 'Enter',
                                            keyCode: 13,
                                            bubbles: true
                                        });
                                        searchInput.dispatchEvent(enterEvent);

                                        return { success: true, message: '搜索执行成功' };
                                    } else {
                                        return { success: false, error: '未找到搜索框' };
                                    }
                                } catch (error) {
                                    return { success: false, error: error.message };
                                }
                            })();
                        \`);

                        return { success: true, message: '搜索命令已发送' };
                    } catch (error) {
                        return { success: false, error: error.message };
                    }
                })();
            `);

            return {
                success: searchResult.success,
                message: searchResult.success ? `成功在${site}搜索: ${query}` : searchResult.error,
                query: query,
                site: site,
                url: url
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 获取当前页面信息
    async getPageInfo() {
        const script = `
            (function() {
                return {
                    url: window.location.href,
                    title: document.title,
                    readyState: document.readyState
                };
            })();
        `;
        
        const result = await this.executeScript(script);
        return result.success ? result.result : { error: result.error };
    }
}

module.exports = WebViewController;
