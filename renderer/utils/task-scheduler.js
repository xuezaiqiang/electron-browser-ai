// 🤖 通用浏览器自动化任务调度器
class TaskScheduler {
    constructor() {
        this.tasks = new Map();
        this.timers = new Map();
        this.taskIdCounter = 1;
        this.eventListeners = new Map();

        // 新增：通用自动化组件
        this.commandParser = null;
        this.actionExecutor = null;
        this.automationEngine = null;
        this.initializeAutomationComponents();

        // 从本地存储恢复任务
        this.loadTasksFromStorage();

        // 定期检查任务状态
        this.startStatusChecker();
    }

    // 初始化通用自动化组件
    initializeAutomationComponents() {
        // 等待组件加载完成
        if (window.UniversalCommandParser && window.UniversalActionExecutor && window.AutomationEngine) {
            this.commandParser = new UniversalCommandParser();
            this.actionExecutor = new UniversalActionExecutor();
            this.automationEngine = new AutomationEngine();

            // 初始化执行器（需要AI API和截图工具）
            if (window.aiAPI && window.screenCapture) {
                this.actionExecutor.init(window.aiAPI, window.screenCapture);
                this.automationEngine.init(this.commandParser, this.actionExecutor);
            } else {
                // 等待AI API和截图工具初始化
                setTimeout(() => {
                    if (window.aiAPI && window.screenCapture) {
                        this.actionExecutor.init(window.aiAPI, window.screenCapture);
                        this.automationEngine.init(this.commandParser, this.actionExecutor);
                        console.log('✅ 自动化组件延迟初始化完成');
                    }
                }, 2000);
            }

            console.log('✅ 通用自动化组件初始化完成');
        } else {
            // 延迟初始化
            setTimeout(() => this.initializeAutomationComponents(), 1000);
        }
    }

    // 创建新任务
    createTask(parseResult) {
        const taskId = `task_${this.taskIdCounter++}`;
        const task = {
            id: taskId,
            originalText: parseResult.originalText,
            scheduledTime: parseResult.time.scheduledTime,
            action: parseResult.action,
            site: parseResult.site,
            searchQuery: parseResult.searchQuery,
            status: 'pending', // pending, running, completed, failed, cancelled
            createdAt: new Date(),
            executedAt: null,
            error: null,
            result: null
        };

        this.tasks.set(taskId, task);
        this.scheduleTask(task);
        this.saveTasksToStorage();
        this.notifyListeners('taskCreated', task);

        return task;
    }

    // 调度任务
    scheduleTask(task) {
        const now = new Date();
        const delay = task.scheduledTime.getTime() - now.getTime();

        if (delay <= 0) {
            // 立即执行
            this.executeTask(task.id);
        } else {
            // 设置定时器
            const timerId = setTimeout(() => {
                this.executeTask(task.id);
            }, delay);

            this.timers.set(task.id, timerId);
            console.log(`任务 ${task.id} 已调度，将在 ${task.scheduledTime.toLocaleString()} 执行`);
        }
    }

    // 🆕 通用命令执行方法（支持自然语言）
    async executeUniversalCommand(userInput) {
        console.log('🤖 执行通用命令:', userInput);

        if (!this.automationEngine) {
            throw new Error('自动化引擎未初始化完成，请稍后重试');
        }

        try {
            // 获取webview
            const webview = document.getElementById('webview');
            if (!webview) {
                throw new Error('浏览器组件不可用');
            }

            // 使用自动化引擎执行命令
            const result = await this.automationEngine.executeCommand(webview, userInput);
            console.log('执行结果:', result);

            return result;

        } catch (error) {
            console.error('通用命令执行失败:', error);
            throw error;
        }
    }

    // 生成命令建议
    generateCommandSuggestions(originalText) {
        const suggestions = [];

        // 基于输入内容提供相关建议
        const lowerText = originalText.toLowerCase();

        if (lowerText.includes('天气') || lowerText.includes('weather')) {
            suggestions.push('• 搜索天气信息：搜索今日天气');
            suggestions.push('• 查询天气：查询北京天气');
        }

        if (lowerText.includes('查询') || lowerText.includes('搜索') || lowerText.includes('search')) {
            suggestions.push('• 搜索内容：搜索[关键词]');
            suggestions.push('• 查询信息：查询[内容]');
        }

        if (lowerText.includes('点击') || lowerText.includes('click')) {
            suggestions.push('• 点击元素：点击[按钮名称]');
            suggestions.push('• 选择选项：选择[选项名称]');
        }

        if (lowerText.includes('输入') || lowerText.includes('填写')) {
            suggestions.push('• 输入文本：输入[内容]');
            suggestions.push('• 在字段输入：在[字段名]输入[内容]');
        }

        if (lowerText.includes('打开') || lowerText.includes('访问')) {
            suggestions.push('• 打开网页：打开[网址]');
            suggestions.push('• 访问页面：访问[URL]');
        }

        // 如果没有匹配的建议，提供通用建议
        if (suggestions.length === 0) {
            suggestions.push('• 点击元素：点击[按钮名称]');
            suggestions.push('• 输入文本：输入[内容]');
            suggestions.push('• 搜索内容：搜索[关键词]');
            suggestions.push('• 打开网页：打开[网址]');
        }

        return suggestions;
    }

    // 直接执行任务（不创建任务记录）- 保持向后兼容
    async executeTaskDirectly(parseResult) {
        console.log(`直接执行任务: ${parseResult.originalText}`);

        // 如果是新的通用命令格式，使用新的执行器
        if (parseResult.originalText && this.commandParser && parseResult.useUniversalParser) {
            return await this.executeUniversalCommand(parseResult.originalText);
        }

        // 否则使用旧的执行逻辑
        try {
            // 根据任务类型执行不同的操作
            switch (parseResult.action) {
                case 'search':
                    await this.executeSearchTaskDirect(parseResult);
                    break;
                case 'navigate':
                    await this.executeNavigateTaskDirect(parseResult);
                    break;
                case 'click':
                    await this.executeClickTaskDirect(parseResult);
                    break;
                case 'input':
                    await this.executeInputTaskDirect(parseResult);
                    break;
                case 'wait':
                    await this.executeWaitTaskDirect(parseResult);
                    break;
                default:
                    throw new Error(`未知的任务类型: ${parseResult.action}`);
            }

            console.log(`任务直接执行完成: ${parseResult.originalText}`);

        } catch (error) {
            console.error(`任务直接执行失败: ${parseResult.originalText}`, error);
            throw error;
        }
    }

    // 执行任务
    async executeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'pending') {
            return;
        }

        try {
            task.status = 'running';
            task.executedAt = new Date();
            this.notifyListeners('taskStarted', task);

            console.log(`开始执行任务: ${task.originalText}`);

            // 根据任务类型执行不同的操作
            switch (task.action) {
                case 'search':
                    await this.executeSearchTask(task);
                    break;
                case 'navigate':
                    await this.executeNavigateTask(task);
                    break;
                case 'click':
                    await this.executeClickTask(task);
                    break;
                case 'input':
                    await this.executeInputTask(task);
                    break;
                case 'wait':
                    await this.executeWaitTask(task);
                    break;
                default:
                    throw new Error(`未知的任务类型: ${task.action}`);
            }

            task.status = 'completed';
            task.result = '任务执行成功';
            console.log(`任务执行完成: ${task.originalText}`);

        } catch (error) {
            task.status = 'failed';
            task.error = error.message;
            console.error(`任务执行失败: ${task.originalText}`, error);
        }

        // 清理定时器
        if (this.timers.has(taskId)) {
            clearTimeout(this.timers.get(taskId));
            this.timers.delete(taskId);
        }

        this.saveTasksToStorage();
        this.notifyListeners('taskCompleted', task);
    }

    // 执行搜索任务 - 改进版本，增加调试信息
    async executeSearchTask(task) {
        const webview = document.getElementById('webview');
        if (!webview) {
            throw new Error('找不到浏览器组件');
        }

        console.log(`执行搜索任务: ${task.searchQuery} 在 ${task.site?.name || '当前页面'}`);

        // 如果指定了网站，先导航到该网站
        if (task.site) {
            console.log(`导航到网站: ${task.site.url}`);
            await this.navigateToSite(webview, task.site.url);
            await this.waitForPageLoad(webview);
            console.log('页面加载完成');

            // 添加页面状态检查
            await this.debugPageState(webview);
        }

        // 查找搜索框并输入搜索内容
        if (task.searchQuery) {
            console.log(`开始输入搜索内容: ${task.searchQuery}`);

            // 针对百度使用更精确的选择器
            let searchSelector = task.site?.searchSelector;
            if (!searchSelector && task.site?.url?.includes('baidu.com')) {
                searchSelector = '#kw';
            } else if (!searchSelector) {
                searchSelector = 'input[type="search"], input[name="q"], #kw, .search-input';
            }

            const inputSuccess = await this.inputText(webview, searchSelector, task.searchQuery);
            if (!inputSuccess) {
                // 添加详细的错误诊断
                await this.debugSearchBoxIssue(webview);
                throw new Error('无法找到搜索框或输入失败');
            }

            console.log('搜索内容输入完成，开始提交搜索');

            // 等待一下确保输入完成
            await this.sleep(500);

            // 验证输入是否成功
            const inputVerified = await this.verifyInputContent(webview, task.searchQuery);
            if (!inputVerified) {
                console.warn('输入内容验证失败，但继续尝试提交');
            }

            // 提交搜索（按回车或点击搜索按钮）
            const submitSuccess = await this.submitSearch(webview, searchSelector);
            if (!submitSuccess) {
                console.error('搜索提交失败，进行诊断');
                await this.debugSubmitIssue(webview);
                throw new Error('搜索提交失败');
            }

            console.log('搜索提交成功');
        }
    }

    // 执行导航任务
    async executeNavigateTask(task) {
        const webview = document.getElementById('webview');
        if (!webview) {
            throw new Error('找不到浏览器组件');
        }

        let url = task.searchQuery;
        if (task.site) {
            url = task.site.url;
        }

        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        await this.navigateToSite(webview, url);
    }

    // 执行点击任务
    async executeClickTask(task) {
        const webview = document.getElementById('webview');
        if (!webview) {
            throw new Error('找不到浏览器组件');
        }

        const selector = task.searchQuery;
        await this.clickElement(webview, selector);
    }

    // 执行输入任务
    async executeInputTask(task) {
        const webview = document.getElementById('webview');
        if (!webview) {
            throw new Error('找不到浏览器组件');
        }

        // 假设输入格式为 "selector:text"
        const parts = task.searchQuery.split(':');
        if (parts.length >= 2) {
            const selector = parts[0].trim();
            const text = parts.slice(1).join(':').trim();
            await this.inputText(webview, selector, text);
        }
    }

    // 执行等待任务
    async executeWaitTask(task) {
        const seconds = parseInt(task.searchQuery) || 1;
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }

    // 导航到指定网站
    navigateToSite(webview, url) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('导航超时'));
            }, 15000);

            let resolved = false;
            const cleanup = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    webview.removeEventListener('dom-ready', onDomReady);
                    webview.removeEventListener('did-finish-load', onFinishLoad);
                    webview.removeEventListener('did-fail-load', onFailLoad);
                }
            };

            const onDomReady = () => {
                cleanup();
                resolve();
            };

            const onFinishLoad = () => {
                cleanup();
                resolve();
            };

            const onFailLoad = (event) => {
                cleanup();
                reject(new Error(`页面加载失败: ${event.errorDescription || '未知错误'}`));
            };

            webview.addEventListener('dom-ready', onDomReady);
            webview.addEventListener('did-finish-load', onFinishLoad);
            webview.addEventListener('did-fail-load', onFailLoad);

            // 更新地址栏
            const urlInput = document.getElementById('url-input');
            if (urlInput) {
                urlInput.value = url;
            }

            webview.src = url;
        });
    }

    // 等待页面加载完成
    waitForPageLoad(webview, timeout = 5000) {
        return new Promise((resolve) => {
            setTimeout(resolve, timeout);
        });
    }

    // 在页面中输入文本 - 改进版本，优先使用更可靠的方法
    async inputText(webview, selector, text) {
        console.log(`开始输入文本: "${text}"`);

        if (!text) {
            console.warn('输入文本为空');
            return false;
        }

        // 首先尝试改进的JavaScript方法（更可靠）
        console.log('优先使用改进的JavaScript输入方法');
        const fallbackResult = await this.inputTextFallback(webview, selector, text);

        if (fallbackResult) {
            console.log('JavaScript输入方法成功');
            return true;
        }

        // 如果JavaScript方法失败，尝试sendInputEvent方法
        try {
            if (webview.sendInputEvent) {
                console.log('回退到sendInputEvent方法');

                // 先点击页面确保焦点
                await this.clickSearchBox(webview);
                await new Promise(resolve => setTimeout(resolve, 200));

                // 清空现有内容 (Ctrl+A + Delete)
                webview.sendInputEvent({
                    type: 'keyDown',
                    keyCode: 'A',
                    modifiers: ['control']
                });
                webview.sendInputEvent({
                    type: 'keyUp',
                    keyCode: 'A',
                    modifiers: ['control']
                });

                await new Promise(resolve => setTimeout(resolve, 100));

                webview.sendInputEvent({
                    type: 'keyDown',
                    keyCode: 'Delete'
                });
                webview.sendInputEvent({
                    type: 'keyUp',
                    keyCode: 'Delete'
                });

                await new Promise(resolve => setTimeout(resolve, 100));

                // 逐字符输入文本
                for (const char of text) {
                    webview.sendInputEvent({
                        type: 'char',
                        keyCode: char
                    });
                    await new Promise(resolve => setTimeout(resolve, 30));
                }

                console.log('sendInputEvent文本输入完成');
                return true;
            }

        } catch (error) {
            console.error('sendInputEvent输入失败:', error);
        }

        console.error('所有输入方法都失败了');
        return false;
    }

    // 点击搜索框
    async clickSearchBox(webview) {
        return new Promise((resolve) => {
            const script = `
                (function() {
                    const selectors = ['#kw', 'input[name="wd"]', 'input[type="search"]', 'input[name="q"]'];
                    for (const sel of selectors) {
                        const element = document.querySelector(sel);
                        if (element && element.offsetParent !== null) {
                            element.focus();
                            element.click();
                            return true;
                        }
                    }
                    return false;
                })();
            `;

            try {
                webview.executeJavaScript(script, (result) => {
                    resolve(result || false);
                });
            } catch (error) {
                console.error('点击搜索框失败:', error);
                resolve(false);
            }
        });
    }

    // 回退的输入方法 - 使用最简单的方式避免序列化问题
    async inputTextFallback(webview, selector, text) {
        console.log('使用回退输入方法');

        return new Promise((resolve) => {
            // 使用最简单的脚本，只返回基本类型
            const script = `
                (function() {
                    try {
                        const selectors = ['#kw', 'input[name="wd"]', 'input[type="search"]', 'input[name="q"]', '.s_ipt'];
                        let found = false;
                        let element = null;

                        // 首先尝试找到搜索框
                        for (const sel of selectors) {
                            element = document.querySelector(sel);
                            if (element && element.offsetParent !== null) {
                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            console.log('未找到搜索框');
                            return false;
                        }

                        console.log('找到搜索框:', element.tagName, element.id, element.className);

                        // 多种方法尝试输入
                        try {
                            // 方法1: 直接设置value
                            element.focus();
                            element.click();
                            element.value = '';
                            element.value = '${text.replace(/'/g, "\\'")}';

                            // 触发多种事件确保输入被识别
                            element.dispatchEvent(new Event('focus', { bubbles: true }));
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                            element.dispatchEvent(new Event('keyup', { bubbles: true }));

                            console.log('输入完成，当前值:', element.value);
                            return true;

                        } catch (inputError) {
                            console.error('输入失败:', inputError);

                            // 方法2: 使用模拟键盘输入
                            try {
                                element.focus();
                                element.select();

                                // 清空内容
                                document.execCommand('selectAll');
                                document.execCommand('delete');

                                // 插入文本
                                document.execCommand('insertText', false, '${text.replace(/'/g, "\\'")}');

                                console.log('使用execCommand输入完成');
                                return true;

                            } catch (execError) {
                                console.error('execCommand输入失败:', execError);
                                return false;
                            }
                        }

                    } catch (e) {
                        console.error('输入方法异常:', e);
                        return false;
                    }
                })();
            `;

            try {
                webview.executeJavaScript(script, (result) => {
                    console.log('回退输入方法结果:', result);
                    resolve(Boolean(result));
                });
            } catch (error) {
                console.error('回退输入方法失败:', error);
                resolve(false);
            }
        });
    }

    // 点击页面元素
    async clickElement(webview, selector) {
        const script = `
            (function() {
                const element = document.querySelector('${selector}');
                if (element) {
                    element.click();
                    return true;
                }
                return false;
            })();
        `;

        return new Promise((resolve, reject) => {
            try {
                webview.executeJavaScript(script, (result) => {
                    try {
                        if (result) {
                            resolve();
                        } else {
                            reject(new Error(`找不到元素: ${selector}`));
                        }
                    } catch (callbackError) {
                        console.error('点击元素回调错误:', callbackError);
                        reject(callbackError);
                    }
                });
            } catch (executeError) {
                console.error('点击元素执行错误:', executeError);
                reject(executeError);
            }
        });
    }

    // 提交搜索 - 简化版本
    async submitSearch(webview, searchSelector) {
        console.log('开始提交搜索');

        try {
            // 方法1: 尝试使用sendInputEvent发送回车键
            if (webview.sendInputEvent) {
                console.log('使用sendInputEvent发送回车键');
                webview.sendInputEvent({
                    type: 'keyDown',
                    keyCode: 'Enter'
                });
                webview.sendInputEvent({
                    type: 'keyUp',
                    keyCode: 'Enter'
                });

                await new Promise(resolve => setTimeout(resolve, 500));
                console.log('回车键发送完成');
                return true;
            }

            // 方法2: 回退到简化的executeJavaScript
            return await this.submitSearchFallback(webview);

        } catch (error) {
            console.error('提交搜索失败:', error);
            return await this.submitSearchFallback(webview);
        }
    }

    // 回退的提交搜索方法 - 改进版本
    async submitSearchFallback(webview) {
        console.log('使用改进的提交搜索方法');

        return new Promise((resolve) => {
            const script = `
                (function() {
                    try {
                        console.log('开始搜索提交流程');

                        // 方法1: 点击百度搜索按钮
                        const baiduButtons = ['#su', '.s_btn', 'input[value="百度一下"]', 'button[type="submit"]'];
                        for (const btnSel of baiduButtons) {
                            const button = document.querySelector(btnSel);
                            if (button && button.offsetParent !== null) {
                                console.log('找到搜索按钮:', btnSel);
                                button.click();
                                return { success: true, method: 'button_click', selector: btnSel };
                            }
                        }

                        // 方法2: 查找搜索框并按回车
                        const inputSelectors = ['#kw', 'input[name="wd"]', 'input[type="search"]', 'input[name="q"]', '.s_ipt'];
                        for (const sel of inputSelectors) {
                            const element = document.querySelector(sel);
                            if (element && element.offsetParent !== null && element.value.trim()) {
                                console.log('找到搜索框，尝试回车:', sel, '值:', element.value);
                                element.focus();

                                // 尝试多种回车事件
                                const events = [
                                    new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }),
                                    new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }),
                                    new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })
                                ];

                                events.forEach(event => element.dispatchEvent(event));

                                // 也尝试表单提交
                                const form = element.closest('form');
                                if (form) {
                                    console.log('找到表单，尝试提交');
                                    form.submit();
                                }

                                return { success: true, method: 'enter_key', selector: sel };
                            }
                        }

                        // 方法3: 查找任何提交按钮
                        const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], .search-btn, .btn-search');
                        for (const btn of submitButtons) {
                            if (btn.offsetParent !== null) {
                                console.log('找到通用提交按钮');
                                btn.click();
                                return { success: true, method: 'generic_submit' };
                            }
                        }

                        console.log('未找到任何提交方式');
                        return { success: false, reason: 'no_submit_method_found' };

                    } catch (e) {
                        console.error('提交搜索异常:', e);
                        return { success: false, error: e.message };
                    }
                })();
            `;

            try {
                webview.executeJavaScript(script, (result) => {
                    console.log('改进提交搜索结果:', result);
                    resolve(result && result.success);
                });
            } catch (error) {
                console.error('改进提交搜索失败:', error);
                resolve(false);
            }
        });
    }



    // 🔍 调试页面状态
    async debugPageState(webview) {
        return new Promise((resolve) => {
            const script = `
                (function() {
                    const info = {
                        url: window.location.href,
                        title: document.title,
                        readyState: document.readyState,
                        searchBoxes: [],
                        forms: document.forms.length,
                        buttons: document.querySelectorAll('button, input[type="submit"]').length
                    };

                    // 查找所有可能的搜索框
                    const selectors = ['#kw', 'input[name="wd"]', 'input[type="search"]', 'input[name="q"]', '.s_ipt'];
                    selectors.forEach(sel => {
                        const elem = document.querySelector(sel);
                        if (elem) {
                            info.searchBoxes.push({
                                selector: sel,
                                visible: elem.offsetParent !== null,
                                value: elem.value,
                                placeholder: elem.placeholder
                            });
                        }
                    });

                    return info;
                })();
            `;

            webview.executeJavaScript(script, (result) => {
                console.log('📊 页面状态调试信息:', result);
                resolve(result);
            });
        });
    }

    // 🔍 调试搜索框问题
    async debugSearchBoxIssue(webview) {
        return new Promise((resolve) => {
            const script = `
                (function() {
                    const debug = {
                        allInputs: [],
                        searchElements: [],
                        focusableElements: []
                    };

                    // 所有输入框
                    document.querySelectorAll('input').forEach((input, index) => {
                        debug.allInputs.push({
                            index: index,
                            type: input.type,
                            name: input.name,
                            id: input.id,
                            className: input.className,
                            visible: input.offsetParent !== null,
                            placeholder: input.placeholder
                        });
                    });

                    // 搜索相关元素
                    const searchSelectors = ['#kw', 'input[name="wd"]', 'input[type="search"]', 'input[name="q"]', '.s_ipt'];
                    searchSelectors.forEach(sel => {
                        const elem = document.querySelector(sel);
                        if (elem) {
                            debug.searchElements.push({
                                selector: sel,
                                found: true,
                                visible: elem.offsetParent !== null,
                                disabled: elem.disabled,
                                readonly: elem.readOnly
                            });
                        } else {
                            debug.searchElements.push({
                                selector: sel,
                                found: false
                            });
                        }
                    });

                    return debug;
                })();
            `;

            webview.executeJavaScript(script, (result) => {
                console.log('🔍 搜索框调试信息:', result);
                resolve(result);
            });
        });
    }

    // 🔍 验证输入内容
    async verifyInputContent(webview, expectedText) {
        return new Promise((resolve) => {
            const script = `
                (function() {
                    const selectors = ['#kw', 'input[name="wd"]', 'input[type="search"]', 'input[name="q"]', '.s_ipt'];
                    for (const sel of selectors) {
                        const elem = document.querySelector(sel);
                        if (elem && elem.offsetParent !== null) {
                            const actualValue = elem.value;
                            const expected = '${expectedText.replace(/'/g, "\\'")}';
                            return {
                                found: true,
                                selector: sel,
                                expected: expected,
                                actual: actualValue,
                                matches: actualValue === expected
                            };
                        }
                    }
                    return { found: false };
                })();
            `;

            webview.executeJavaScript(script, (result) => {
                console.log('✅ 输入内容验证:', result);
                resolve(result && result.matches);
            });
        });
    }

    // 🔍 调试提交问题
    async debugSubmitIssue(webview) {
        return new Promise((resolve) => {
            const script = `
                (function() {
                    const debug = {
                        submitButtons: [],
                        forms: [],
                        searchBoxValue: null
                    };

                    // 查找提交按钮
                    const buttonSelectors = ['#su', '.s_btn', 'input[value="百度一下"]', 'button[type="submit"]', 'input[type="submit"]'];
                    buttonSelectors.forEach(sel => {
                        const elem = document.querySelector(sel);
                        debug.submitButtons.push({
                            selector: sel,
                            found: !!elem,
                            visible: elem ? elem.offsetParent !== null : false,
                            disabled: elem ? elem.disabled : null
                        });
                    });

                    // 查找表单
                    Array.from(document.forms).forEach((form, index) => {
                        debug.forms.push({
                            index: index,
                            action: form.action,
                            method: form.method,
                            elements: form.elements.length
                        });
                    });

                    // 当前搜索框值
                    const searchBox = document.querySelector('#kw') || document.querySelector('input[name="wd"]');
                    if (searchBox) {
                        debug.searchBoxValue = searchBox.value;
                    }

                    return debug;
                })();
            `;

            webview.executeJavaScript(script, (result) => {
                console.log('🔍 提交问题调试信息:', result);
                resolve(result);
            });
        });
    }

    // 取消任务
    cancelTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            return false;
        }

        if (task.status === 'pending') {
            task.status = 'cancelled';
            
            // 清理定时器
            if (this.timers.has(taskId)) {
                clearTimeout(this.timers.get(taskId));
                this.timers.delete(taskId);
            }

            this.saveTasksToStorage();
            this.notifyListeners('taskCancelled', task);
            return true;
        }

        return false;
    }

    // 获取所有任务
    getAllTasks() {
        return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
    }

    // 获取待执行的任务
    getPendingTasks() {
        return this.getAllTasks().filter(task => task.status === 'pending');
    }

    // 清理已完成的任务
    cleanupCompletedTasks() {
        const toDelete = [];
        for (const [id, task] of this.tasks) {
            if (task.status === 'completed' || task.status === 'failed') {
                const age = Date.now() - task.executedAt?.getTime();
                if (age > 24 * 60 * 60 * 1000) { // 24小时后清理
                    toDelete.push(id);
                }
            }
        }

        toDelete.forEach(id => this.tasks.delete(id));
        this.saveTasksToStorage();
    }

    // 保存任务到本地存储
    saveTasksToStorage() {
        try {
            const tasksData = Array.from(this.tasks.entries()).map(([id, task]) => [
                id,
                {
                    ...task,
                    scheduledTime: task.scheduledTime.toISOString(),
                    createdAt: task.createdAt.toISOString(),
                    executedAt: task.executedAt?.toISOString() || null
                }
            ]);
            localStorage.setItem('aiChatTasks', JSON.stringify(tasksData));
        } catch (error) {
            console.error('保存任务失败:', error);
        }
    }

    // 从本地存储加载任务
    loadTasksFromStorage() {
        try {
            const data = localStorage.getItem('aiChatTasks');
            if (data) {
                const tasksData = JSON.parse(data);
                for (const [id, taskData] of tasksData) {
                    const task = {
                        ...taskData,
                        scheduledTime: new Date(taskData.scheduledTime),
                        createdAt: new Date(taskData.createdAt),
                        executedAt: taskData.executedAt ? new Date(taskData.executedAt) : null
                    };

                    this.tasks.set(id, task);

                    // 重新调度待执行的任务
                    if (task.status === 'pending') {
                        this.scheduleTask(task);
                    }
                }
            }
        } catch (error) {
            console.error('加载任务失败:', error);
        }
    }

    // 开始状态检查器
    startStatusChecker() {
        setInterval(() => {
            this.cleanupCompletedTasks();
        }, 60 * 60 * 1000); // 每小时检查一次
    }

    // 添加事件监听器
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    // 移除事件监听器
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // 通知监听器
    notifyListeners(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('事件监听器错误:', error);
                }
            });
        }
    }

    // 直接执行搜索任务
    async executeSearchTaskDirect(parseResult) {
        const webview = document.getElementById('webview');
        if (!webview) {
            throw new Error('找不到浏览器组件');
        }

        console.log(`直接执行搜索任务: ${parseResult.searchQuery} 在 ${parseResult.site?.name || '当前页面'}`);

        // 如果指定了网站，先导航到该网站
        if (parseResult.site) {
            console.log(`导航到网站: ${parseResult.site.url}`);
            await this.navigateToSite(webview, parseResult.site.url);
            await this.waitForPageLoad(webview);
            console.log('页面加载完成');
        }

        // 输入搜索内容
        if (parseResult.searchQuery) {
            console.log(`开始输入搜索内容: ${parseResult.searchQuery}`);
            const inputSuccess = await this.inputText(webview, null, parseResult.searchQuery);

            if (inputSuccess) {
                console.log('搜索内容输入完成，开始提交搜索');
                await this.submitSearch(webview);
                console.log('搜索提交完成');
            } else {
                throw new Error('搜索内容输入失败');
            }
        }
    }

    // 直接执行导航任务
    async executeNavigateTaskDirect(parseResult) {
        const webview = document.getElementById('webview');
        if (!webview) {
            throw new Error('找不到浏览器组件');
        }

        const url = parseResult.site?.url || parseResult.searchQuery;
        console.log(`直接导航到: ${url}`);
        await this.navigateToSite(webview, url);
        await this.waitForPageLoad(webview);
    }

    // 直接执行点击任务
    async executeClickTaskDirect(parseResult) {
        const webview = document.getElementById('webview');
        if (!webview) {
            throw new Error('找不到浏览器组件');
        }

        await this.clickElement(webview, parseResult.searchQuery);
    }

    // 直接执行输入任务
    async executeInputTaskDirect(parseResult) {
        const webview = document.getElementById('webview');
        if (!webview) {
            throw new Error('找不到浏览器组件');
        }

        // 假设输入格式为 "selector:text"
        const parts = parseResult.searchQuery.split(':');
        if (parts.length >= 2) {
            const selector = parts[0].trim();
            const text = parts.slice(1).join(':').trim();
            await this.inputText(webview, selector, text);
        }
    }

    // 直接执行等待任务
    async executeWaitTaskDirect(parseResult) {
        const seconds = parseInt(parseResult.searchQuery) || 1;
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }
}

// 导出模块
window.TaskScheduler = TaskScheduler;
