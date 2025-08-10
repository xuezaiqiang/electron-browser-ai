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
            // 跳过waitForReady，直接执行
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
                // 设置超时
                const timeout = setTimeout(() => {
                    reject(new Error('脚本执行超时'));
                }, 15000); // 15秒超时

                this.mainWindow.webContents.executeJavaScript(`
                    (function() {
                        try {
                            const webview = document.getElementById('webview');
                            if (!webview) {
                                return { success: false, error: 'WebView元素未找到' };
                            }

                            return new Promise((resolve) => {
                                // 为webview脚本执行也设置超时
                                const webviewTimeout = setTimeout(() => {
                                    resolve({ success: false, error: 'WebView脚本执行超时' });
                                }, 30000); // 增加到30秒

                                try {
                                    // 使用新的API方式
                                    webview.executeJavaScript(\`${script.replace(/`/g, '\\`')}\`)
                                        .then((result) => {
                                            clearTimeout(webviewTimeout);
                                            resolve({ success: true, result: result });
                                        })
                                        .catch((error) => {
                                            clearTimeout(webviewTimeout);
                                            resolve({ success: false, error: error.message });
                                        });
                                } catch (error) {
                                    clearTimeout(webviewTimeout);
                                    resolve({ success: false, error: error.message });
                                }
                            });
                        } catch (error) {
                            return { success: false, error: error.message };
                        }
                    })();
                `).then((result) => {
                    clearTimeout(timeout);
                    resolve(result);
                }).catch((error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
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

    // 提交搜索（按回车或点击搜索按钮）
    async submitSearch(selector = null) {
        try {
            const result = await this.mainWindow.webContents.executeJavaScript(`
                (function() {
                    try {
                        const webview = document.getElementById('webview');
                        if (!webview) {
                            return { success: false, error: 'WebView元素未找到' };
                        }

                        // 直接执行提交搜索
                        webview.executeJavaScript(\`
                            try {
                                // 方法1: 尝试按回车键
                                const searchInput = document.querySelector('${selector || '#q, #kw, input[name="q"]'}');
                                if (searchInput) {
                                    searchInput.focus();

                                    // 创建回车键事件
                                    const enterEvent = new KeyboardEvent('keydown', {
                                        key: 'Enter',
                                        code: 'Enter',
                                        keyCode: 13,
                                        which: 13,
                                        bubbles: true,
                                        cancelable: true
                                    });

                                    searchInput.dispatchEvent(enterEvent);
                                    console.log('回车键事件已发送');

                                    // 等待一下再尝试点击搜索按钮
                                    setTimeout(() => {
                                        // 方法2: 尝试点击搜索按钮
                                        const searchButtons = [
                                            '.btn-search',
                                            '#su',
                                            'button[type="submit"]',
                                            '.search-button',
                                            '.s_btn',
                                            'input[type="submit"]'
                                        ];

                                        for (const btnSelector of searchButtons) {
                                            const button = document.querySelector(btnSelector);
                                            if (button && button.offsetParent !== null) {
                                                button.click();
                                                console.log('搜索按钮已点击:', btnSelector);
                                                break;
                                            }
                                        }
                                    }, 500);

                                } else {
                                    console.log('未找到搜索输入框');
                                }
                            } catch (error) {
                                console.error('提交搜索失败:', error);
                            }
                        \`);

                        return { success: true, message: '搜索提交命令已发送' };

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

    // 点击元素
    async clickElement(selector) {
        const script = `
            (function() {
                try {
                    const element = document.querySelector('${selector}');
                    if (!element) {
                        return { success: false, message: '元素未找到' };
                    }

                    // 检查元素是否可见
                    const rect = element.getBoundingClientRect();
                    if (rect.width === 0 || rect.height === 0) {
                        return { success: false, message: '元素不可见' };
                    }

                    // 安全的点击方法 - 避免崩溃
                    try {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                        // 使用更安全的点击方式
                        setTimeout(() => {
                            try {
                                if (document.contains(element)) {
                                    // 创建安全的点击事件
                                    const clickEvent = new MouseEvent('click', {
                                        view: window,
                                        bubbles: true,
                                        cancelable: true,
                                        button: 0
                                    });
                                    element.dispatchEvent(clickEvent);
                                }
                            } catch (clickError) {
                                console.warn('点击事件失败:', clickError);
                            }
                        }, 200);

                        return {
                            success: true,
                            message: '点击命令已发送',
                            element: {
                                tagName: element.tagName,
                                text: element.textContent?.trim() || ''
                            }
                        };
                    } catch (clickError) {
                        return { success: false, message: '点击操作失败: ' + clickError.message };
                    }
                } catch (error) {
                    return { success: false, message: '操作失败: ' + error.message };
                }
            })();
        `;

        const result = await this.executeScript(script);
        return result.success ? result.result : { success: false, error: result.error };
    }

    // 输入文本 - 超简化版本
    async inputText(selector, text) {
        try {
            // 跳过waitForReady，直接执行
            const result = await this.mainWindow.webContents.executeJavaScript(`
                (function() {
                    try {
                        const webview = document.getElementById('webview');
                        if (!webview) {
                            return { success: false, error: 'WebView元素未找到' };
                        }

                        // 直接执行，不等待回调
                        webview.executeJavaScript(\`
                            try {
                                const selectors = ['${selector}', '#q', 'input[name="q"]', '.search-combobox-input'];
                                let element = null;

                                for (const sel of selectors) {
                                    const el = document.querySelector(sel);
                                    if (el) {
                                        element = el;
                                        break;
                                    }
                                }

                                if (element) {
                                    element.focus();
                                    element.value = '${text.replace(/'/g, "\\'")}';
                                    element.dispatchEvent(new Event('input', { bubbles: true }));
                                    console.log('输入成功: ${text}');

                                    // 自动提交搜索
                                    setTimeout(() => {
                                        // 方法1: 按回车键
                                        const enterEvent = new KeyboardEvent('keydown', {
                                            key: 'Enter',
                                            code: 'Enter',
                                            keyCode: 13,
                                            which: 13,
                                            bubbles: true,
                                            cancelable: true
                                        });
                                        element.dispatchEvent(enterEvent);
                                        console.log('回车键已发送');

                                        // 方法2: 尝试点击搜索按钮
                                        setTimeout(() => {
                                            const searchButtons = [
                                                '.btn-search',
                                                '#su',
                                                'button[type="submit"]',
                                                '.search-button',
                                                '.s_btn'
                                            ];

                                            for (const btnSelector of searchButtons) {
                                                const button = document.querySelector(btnSelector);
                                                if (button && button.offsetParent !== null) {
                                                    button.click();
                                                    console.log('搜索按钮已点击:', btnSelector);
                                                    break;
                                                }
                                            }
                                        }, 500);
                                    }, 1000);
                                } else {
                                    console.log('未找到输入框');
                                }
                            } catch (error) {
                                console.error('输入失败:', error);
                            }
                        \`);

                        return { success: true, message: '输入命令已发送到WebView' };

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

    // AI驱动的智能搜索操作
    async search(query, site = 'baidu') {
        try {
            // 1. 获取网站配置
            const siteConfig = this.getSiteConfig(site);

            // 1. 先导航
            const navResult = await this.navigate(siteConfig.url);
            if (!navResult.success) {
                return { success: false, error: `导航失败: ${navResult.error}` };
            }

            // 2. 等待页面加载
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 3. 使用AI智能搜索
            const searchResult = await this.performIntelligentSearch(query, siteConfig);

            return {
                success: searchResult.success,
                message: searchResult.success ? `成功在${site}搜索: ${query}` : searchResult.error,
                query: query,
                site: site,
                url: siteConfig.url,
                details: searchResult
            };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // 获取网站配置
    getSiteConfig(site) {
        const configs = {
            'baidu': {
                url: 'https://www.baidu.com',
                name: '百度',
                searchSelectors: ['#kw', 'input[name="wd"]', '.s_ipt'],
                submitSelectors: ['#su', '.s_btn', 'input[type="submit"]']
            },
            'taobao': {
                url: 'https://www.taobao.com',
                name: '淘宝',
                searchSelectors: ['#q', 'input[name="q"]', '.search-combobox-input', 'input[data-spm="search"]'],
                submitSelectors: ['.btn-search', 'button[type="submit"]', '.search-button']
            },
            'jd': {
                url: 'https://www.jd.com',
                name: '京东',
                searchSelectors: ['#key', 'input[name="keyword"]', '.text'],
                submitSelectors: ['.button', 'button[type="submit"]', '.search-m']
            }
        };

        return configs[site.toLowerCase()] || configs['baidu'];
    }

    // AI驱动的智能搜索
    async performIntelligentSearch(query, siteConfig) {
        return await this.mainWindow.webContents.executeJavaScript(`
            (async function() {
                try {
                    const webview = document.getElementById('webview');
                    if (!webview) {
                        return { success: false, error: 'WebView元素未找到' };
                    }

                    // 在webview中执行智能搜索
                    return new Promise((resolve) => {
                        webview.executeJavaScript(\`
                            (function() {
                                try {
                                    // 智能查找搜索框
                                    const searchSelectors = ${JSON.stringify(siteConfig.searchSelectors)};
                                    const submitSelectors = ${JSON.stringify(siteConfig.submitSelectors)};

                                    let searchInput = null;

                                    // 尝试所有可能的搜索框选择器
                                    for (const selector of searchSelectors) {
                                        const element = document.querySelector(selector);
                                        if (element && element.offsetParent !== null) {
                                            searchInput = element;
                                            break;
                                        }
                                    }

                                    // 如果没找到，使用通用选择器
                                    if (!searchInput) {
                                        const genericSelectors = [
                                            'input[type="search"]',
                                            'input[placeholder*="搜索"]',
                                            'input[placeholder*="search"]',
                                            'input[name*="search"]',
                                            'input[name*="query"]',
                                            'input[name*="keyword"]',
                                            'input[class*="search"]',
                                            'input[id*="search"]'
                                        ];

                                        for (const selector of genericSelectors) {
                                            const element = document.querySelector(selector);
                                            if (element && element.offsetParent !== null) {
                                                searchInput = element;
                                                break;
                                            }
                                        }
                                    }

                                    if (!searchInput) {
                                        return { success: false, error: '未找到搜索框', selectors: searchSelectors };
                                    }

                                    // 聚焦并清空搜索框
                                    searchInput.focus();
                                    searchInput.value = '';

                                    // 输入搜索内容
                                    searchInput.value = '${query}';

                                    // 触发输入事件
                                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                                    searchInput.dispatchEvent(new Event('change', { bubbles: true }));

                                    // 等待一下确保输入完成
                                    setTimeout(() => {
                                        // 尝试提交搜索
                                        let submitted = false;

                                        // 方法1: 按回车键
                                        const enterEvent = new KeyboardEvent('keydown', {
                                            key: 'Enter',
                                            code: 'Enter',
                                            keyCode: 13,
                                            bubbles: true
                                        });
                                        searchInput.dispatchEvent(enterEvent);
                                        submitted = true;

                                        // 方法2: 如果回车不行，尝试点击搜索按钮
                                        setTimeout(() => {
                                            for (const selector of submitSelectors) {
                                                const button = document.querySelector(selector);
                                                if (button && button.offsetParent !== null) {
                                                    button.click();
                                                    submitted = true;
                                                    break;
                                                }
                                            }
                                        }, 500);

                                    }, 300);

                                    return {
                                        success: true,
                                        message: '搜索执行成功',
                                        foundSelector: searchInput.tagName + (searchInput.id ? '#' + searchInput.id : '') + (searchInput.className ? '.' + searchInput.className.split(' ').join('.') : ''),
                                        query: '${query}'
                                    };

                                } catch (error) {
                                    return { success: false, error: error.message };
                                }
                            })();
                        \`, (result) => {
                            resolve(result);
                        });
                    });

                } catch (error) {
                    return { success: false, error: error.message };
                }
            })();
        `);
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
