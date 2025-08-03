// ⚡ 通用动作执行器 - 执行各种浏览器自动化操作
class UniversalActionExecutor {
    constructor() {
        this.elementFinder = new SmartElementFinder();
        this.visionAnalyzer = new VisionPageAnalyzer();
        this.hybridFinder = new HybridElementFinder();
        this.executionHistory = [];
        this.isExecuting = false;
        this.useHybridFinder = true; // 默认使用混合定位器
        this.initialized = false;
    }

    // 初始化执行器
    init(aiAPI, screenCapture) {
        if (this.initialized) return;

        // 初始化视觉分析器
        this.visionAnalyzer.init(aiAPI, screenCapture);

        // 初始化混合定位器
        this.hybridFinder.init(this.elementFinder, this.visionAnalyzer);

        this.initialized = true;
        console.log('通用动作执行器初始化完成');
    }
    
    // 执行单个命令
    async executeCommand(webview, command) {
        if (!webview) {
            throw new Error('WebView不可用');
        }
        
        console.log('执行命令:', command);
        this.isExecuting = true;
        
        try {
            let result;
            
            switch (command.type) {
                case 'click':
                    result = await this.executeClick(webview, command);
                    break;
                case 'input':
                    result = await this.executeInput(webview, command);
                    break;
                case 'navigate':
                    result = await this.executeNavigate(webview, command);
                    break;
                case 'form_fill':
                    result = await this.executeFormFill(webview, command);
                    break;
                case 'extract':
                    result = await this.executeExtract(webview, command);
                    break;
                case 'wait':
                    result = await this.executeWait(webview, command);
                    break;
                case 'scroll':
                    result = await this.executeScroll(webview, command);
                    break;
                case 'screenshot':
                    result = await this.executeScreenshot(webview, command);
                    break;
                case 'download':
                    result = await this.executeDownload(webview, command);
                    break;
                case 'workflow':
                    result = await this.executeWorkflow(webview, command);
                    break;
                case 'navigate_search':
                    result = await this.executeNavigateSearch(webview, command);
                    break;
                default:
                    throw new Error(`不支持的命令类型: ${command.type}`);
            }
            
            // 记录执行历史
            this.recordExecution(command, result, true);
            return result;
            
        } catch (error) {
            console.error('命令执行失败:', error);
            this.recordExecution(command, null, false, error.message);
            throw error;
        } finally {
            this.isExecuting = false;
        }
    }
    
    // 执行点击操作
    async executeClick(webview, command) {
        console.log('执行点击操作:', command.target);
        
        // 查找元素 - 使用混合定位器
        const elementResult = await this.findElementWithStrategy(webview, command.target);
        if (!elementResult.found) {
            throw new Error(`无法找到要点击的元素: ${command.target}`);
        }
        
        // 执行点击
        return new Promise((resolve, reject) => {
            const script = `
                (function() {
                    try {
                        const element = document.querySelector('${elementResult.selector}');
                        if (element) {
                            // 滚动到元素可见
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            
                            // 等待一下再点击
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
                        return { success: false, message: '元素不存在' };
                    } catch (e) {
                        return { success: false, message: e.message };
                    }
                })();
            `;
            
            try {
                webview.executeJavaScript(script, (result) => {
                    if (result && result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result?.message || '点击失败'));
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // 执行输入操作
    async executeInput(webview, command) {
        console.log('执行输入操作:', command.value);
        
        let elementResult;
        if (command.target) {
            // 有指定目标元素
            elementResult = await this.findElementWithStrategy(webview, command.target);
        } else {
            // 自动查找输入框
            elementResult = await this.findElementWithStrategy(webview, '输入框');
        }
        
        if (!elementResult.found) {
            throw new Error(`无法找到输入元素: ${command.target || '输入框'}`);
        }
        
        // 执行输入
        return new Promise((resolve, reject) => {
            const script = `
                (function() {
                    try {
                        const element = document.querySelector('${elementResult.selector}');
                        if (element) {
                            // 聚焦元素
                            element.focus();
                            
                            // 清空现有内容
                            element.value = '';
                            
                            // 输入新内容
                            element.value = '${command.value.replace(/'/g, "\\'")}';
                            
                            // 触发事件
                            element.dispatchEvent(new Event('input', { bubbles: true }));
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                            
                            return {
                                success: true,
                                message: '输入成功',
                                value: element.value
                            };
                        }
                        return { success: false, message: '输入元素不存在' };
                    } catch (e) {
                        return { success: false, message: e.message };
                    }
                })();
            `;
            
            try {
                webview.executeJavaScript(script, (result) => {
                    if (result && result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result?.message || '输入失败'));
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // 执行导航操作
    async executeNavigate(webview, command) {
        console.log('执行导航操作:', command.url);
        
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                webview.removeEventListener('did-finish-load', onFinishLoad);
                webview.removeEventListener('did-fail-load', onFailLoad);
            };
            
            const onFinishLoad = () => {
                cleanup();
                resolve({
                    success: true,
                    message: '页面加载成功',
                    url: command.url
                });
            };
            
            const onFailLoad = (event) => {
                cleanup();
                reject(new Error(`页面加载失败: ${event.errorDescription || '未知错误'}`));
            };
            
            webview.addEventListener('did-finish-load', onFinishLoad);
            webview.addEventListener('did-fail-load', onFailLoad);
            
            try {
                webview.src = command.url;
                
                // 更新地址栏
                const urlInput = document.getElementById('url-input');
                if (urlInput) {
                    urlInput.value = command.url;
                }
            } catch (error) {
                cleanup();
                reject(error);
            }
        });
    }
    
    // 执行表单填写
    async executeFormFill(webview, command) {
        console.log('执行表单填写:', command.formData);
        
        const results = [];
        
        for (const [field, value] of Object.entries(command.formData)) {
            try {
                const inputCommand = {
                    type: 'input',
                    target: field,
                    value: value
                };
                
                const result = await this.executeInput(webview, inputCommand);
                results.push({
                    field: field,
                    value: value,
                    success: true,
                    result: result
                });
            } catch (error) {
                results.push({
                    field: field,
                    value: value,
                    success: false,
                    error: error.message
                });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        
        return {
            success: successCount > 0,
            message: `表单填写完成: ${successCount}/${results.length} 个字段成功`,
            results: results
        };
    }
    
    // 执行数据提取
    async executeExtract(webview, command) {
        console.log('执行数据提取:', command.target);
        
        return new Promise((resolve, reject) => {
            const script = `
                (function() {
                    try {
                        const data = [];
                        
                        // 根据目标类型提取数据
                        if ('${command.target}'.includes('表格') || '${command.target}'.includes('table')) {
                            // 提取表格数据
                            const tables = document.querySelectorAll('table');
                            tables.forEach(table => {
                                const rows = Array.from(table.rows);
                                const tableData = rows.map(row => 
                                    Array.from(row.cells).map(cell => cell.textContent.trim())
                                );
                                data.push({ type: 'table', data: tableData });
                            });
                        } else if ('${command.target}'.includes('链接') || '${command.target}'.includes('link')) {
                            // 提取链接
                            const links = document.querySelectorAll('a[href]');
                            links.forEach(link => {
                                data.push({
                                    type: 'link',
                                    text: link.textContent.trim(),
                                    href: link.href
                                });
                            });
                        } else {
                            // 通用文本提取
                            const elements = document.querySelectorAll('*');
                            elements.forEach(el => {
                                const text = el.textContent?.trim();
                                if (text && text.length > 0 && text.length < 200) {
                                    data.push({
                                        type: 'text',
                                        tagName: el.tagName,
                                        text: text
                                    });
                                }
                            });
                        }
                        
                        return {
                            success: true,
                            message: \`提取了 \${data.length} 条数据\`,
                            data: data.slice(0, 100) // 限制返回数据量
                        };
                    } catch (e) {
                        return { success: false, message: e.message };
                    }
                })();
            `;
            
            try {
                webview.executeJavaScript(script, (result) => {
                    if (result && result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result?.message || '数据提取失败'));
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // 执行等待操作
    async executeWait(webview, command) {
        console.log('执行等待操作:', command);
        
        if (command.duration) {
            // 等待指定时间
            await new Promise(resolve => setTimeout(resolve, command.duration));
            return {
                success: true,
                message: `等待 ${command.duration / 1000} 秒完成`
            };
        } else if (command.condition) {
            // 等待条件满足
            return await this.waitForCondition(webview, command.condition);
        }
        
        throw new Error('无效的等待命令');
    }
    
    // 等待条件满足
    async waitForCondition(webview, condition, timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const elementResult = await this.elementFinder.findElement(webview, condition);
            if (elementResult.found) {
                return {
                    success: true,
                    message: `条件满足: ${condition}`
                };
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        throw new Error(`等待超时: ${condition}`);
    }
    
    // 执行滚动操作
    async executeScroll(webview, command) {
        // 简单实现，可以扩展
        return new Promise((resolve) => {
            const script = `
                window.scrollBy(0, 500);
                ({ success: true, message: '滚动完成' });
            `;
            
            webview.executeJavaScript(script, (result) => {
                resolve(result || { success: true, message: '滚动完成' });
            });
        });
    }
    
    // 执行截图操作
    async executeScreenshot(webview, command) {
        try {
            const result = await window.electronAPI.captureScreenshot();
            return {
                success: result.success,
                message: result.success ? '截图成功' : '截图失败',
                screenshot: result.url
            };
        } catch (error) {
            throw new Error(`截图失败: ${error.message}`);
        }
    }
    
    // 执行下载操作
    async executeDownload(webview, command) {
        // 这里需要实现下载逻辑
        return {
            success: true,
            message: '下载功能待实现'
        };
    }
    
    // 执行工作流
    async executeWorkflow(webview, command) {
        console.log('执行工作流:', command.steps);
        
        const results = [];
        
        for (let i = 0; i < command.steps.length; i++) {
            const step = command.steps[i];
            if (!step) continue;
            
            try {
                console.log(`执行步骤 ${i + 1}/${command.steps.length}:`, step);
                const result = await this.executeCommand(webview, step);
                results.push({
                    step: i + 1,
                    command: step,
                    success: true,
                    result: result
                });
                
                // 步骤间等待
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`步骤 ${i + 1} 执行失败:`, error);
                results.push({
                    step: i + 1,
                    command: step,
                    success: false,
                    error: error.message
                });
                
                // 决定是否继续执行后续步骤
                if (step.critical !== false) {
                    throw new Error(`关键步骤 ${i + 1} 失败: ${error.message}`);
                }
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        
        return {
            success: successCount > 0,
            message: `工作流执行完成: ${successCount}/${results.length} 个步骤成功`,
            results: results
        };
    }

    // 执行导航+搜索复合操作
    async executeNavigateSearch(webview, command) {
        console.log('执行导航搜索:', command.site, '搜索', command.query);

        try {
            // 1. 先导航到目标网站
            const navigateResult = await this.executeNavigate(webview, {
                type: 'navigate',
                url: command.url,
                description: `导航到 ${command.site}`
            });

            if (!navigateResult.success) {
                throw new Error(`导航失败: ${navigateResult.message}`);
            }

            // 2. 等待页面加载
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 3. 查找搜索框并输入搜索内容
            const searchResult = await this.performSearch(webview, command.query, command.site);

            return {
                success: true,
                message: `在 ${command.site} 搜索 "${command.query}" 成功`,
                navigateResult: navigateResult,
                searchResult: searchResult
            };

        } catch (error) {
            console.error('导航搜索失败:', error);
            throw new Error(`导航搜索失败: ${error.message}`);
        }
    }

    // 在指定网站执行搜索
    async performSearch(webview, query, siteName) {
        // 处理 siteName 为 undefined 的情况
        const site = siteName || '通用';
        console.log(`在 ${site} 搜索: ${query}`);

        // 定义不同网站的搜索框选择器
        const searchSelectors = {
            '百度': ['#kw', 'input[name="wd"]', '.s_ipt'],
            'baidu': ['#kw', 'input[name="wd"]', '.s_ipt'],
            '谷歌': ['input[name="q"]', '.gLFyf', 'textarea[name="q"]'],
            'google': ['input[name="q"]', '.gLFyf', 'textarea[name="q"]'],
            '必应': ['#sb_form_q', 'input[name="q"]'],
            'bing': ['#sb_form_q', 'input[name="q"]'],
            '搜狗': ['#query', 'input[name="query"]'],
            'sogou': ['#query', 'input[name="query"]'],
            '360': ['#so_text1', 'input[name="q"]'],
            '淘宝': ['#q', 'input[name="q"]', '.search-combobox-input'],
            'taobao': ['#q', 'input[name="q"]', '.search-combobox-input'],
            '京东': ['#key', 'input[name="keyword"]'],
            'jd': ['#key', 'input[name="keyword"]'],
            '知乎': ['.SearchBar-input', 'input[name="q"]'],
            'zhihu': ['.SearchBar-input', 'input[name="q"]'],
            '微博': ['.gn_search_v2 input', 'input[name="keyword"]'],
            'weibo': ['.gn_search_v2 input', 'input[name="keyword"]']
        };

        // 获取对应网站的搜索框选择器
        let selectors = ['input[type="search"]', 'input[name="q"]', 'input[name="query"]', 'input[name="keyword"]'];

        if (siteName) {
            const siteSelectors = searchSelectors[siteName] || searchSelectors[siteName.toLowerCase()];
            if (siteSelectors) {
                selectors = siteSelectors;
            }
        }

        // 尝试找到搜索框并输入
        for (const selector of selectors) {
            try {
                const inputResult = await this.executeInput(webview, {
                    type: 'input',
                    target: selector,
                    value: query,
                    description: `在搜索框输入: ${query}`
                });

                if (inputResult.success) {
                    // 输入成功后，尝试提交搜索
                    await this.submitSearch(webview, selector, siteName);
                    return inputResult;
                }
            } catch (error) {
                console.log(`选择器 ${selector} 失败，尝试下一个...`);
                continue;
            }
        }

        throw new Error(`无法在 ${site} 找到搜索框`);
    }

    // 提交搜索
    async submitSearch(webview, inputSelector, siteName) {
        console.log(`提交搜索: ${siteName}`);

        // 定义不同网站的搜索按钮选择器
        const submitSelectors = {
            '百度': ['#su', '.s_btn', 'input[type="submit"]'],
            'baidu': ['#su', '.s_btn', 'input[type="submit"]'],
            '谷歌': ['input[name="btnK"]', '.gNO89b', 'button[type="submit"]'],
            'google': ['input[name="btnK"]', '.gNO89b', 'button[type="submit"]'],
            '必应': ['#sb_form_go', '.sb_btn', 'input[type="submit"]'],
            'bing': ['#sb_form_go', '.sb_btn', 'input[type="submit"]'],
            '搜狗': ['#stb', '.sb', 'input[type="submit"]'],
            'sogou': ['#stb', '.sb', 'input[type="submit"]'],
            '360': ['.so-search', 'input[type="submit"]'],
            '淘宝': ['.btn-search', 'button[type="submit"]'],
            'taobao': ['.btn-search', 'button[type="submit"]'],
            '京东': ['.button', 'button[type="submit"]'],
            'jd': ['.button', 'button[type="submit"]']
        };

        const selectors = submitSelectors[siteName] || submitSelectors[siteName.toLowerCase()] ||
                         ['button[type="submit"]', 'input[type="submit"]', '.search-btn', '.btn-search'];

        // 首先尝试按回车键
        try {
            await new Promise((resolve) => {
                const script = `
                    (function() {
                        const input = document.querySelector('${inputSelector}');
                        if (input) {
                            input.focus();
                            const event = new KeyboardEvent('keydown', {
                                key: 'Enter',
                                code: 'Enter',
                                keyCode: 13,
                                which: 13,
                                bubbles: true
                            });
                            input.dispatchEvent(event);
                            return { success: true, method: 'enter' };
                        }
                        return { success: false };
                    })();
                `;

                webview.executeJavaScript(script, (result) => {
                    resolve(result);
                });
            });

            console.log('通过回车键提交搜索');
            return { success: true, method: 'enter' };

        } catch (error) {
            console.log('回车键提交失败，尝试点击搜索按钮...');
        }

        // 如果回车键失败，尝试点击搜索按钮
        for (const selector of selectors) {
            try {
                const clickResult = await this.executeClick(webview, {
                    type: 'click',
                    target: selector,
                    description: `点击搜索按钮: ${selector}`
                });

                if (clickResult.success) {
                    console.log(`通过点击 ${selector} 提交搜索`);
                    return { success: true, method: 'click', selector: selector };
                }
            } catch (error) {
                console.log(`点击 ${selector} 失败，尝试下一个...`);
                continue;
            }
        }

        console.log('所有提交方式都失败了，但搜索内容已输入');
        return { success: true, method: 'input_only', message: '搜索内容已输入，请手动提交' };
    }

    // 使用策略查找元素
    async findElementWithStrategy(webview, target, options = {}) {
        // 确保初始化
        if (!this.initialized) {
            console.warn('执行器未初始化，使用基础元素查找器');
            return await this.elementFinder.findElement(webview, target, options);
        }

        // 根据配置选择查找器
        if (this.useHybridFinder && this.hybridFinder) {
            return await this.hybridFinder.findElement(webview, target, options);
        } else {
            return await this.elementFinder.findElement(webview, target, options);
        }
    }

    // 切换元素查找策略
    setElementFindingStrategy(useHybrid = true) {
        this.useHybridFinder = useHybrid;
        console.log(`元素查找策略切换为: ${useHybrid ? '混合定位器' : '基础定位器'}`);
    }

    // 获取元素查找统计信息
    getElementFindingStats() {
        if (this.hybridFinder) {
            return this.hybridFinder.getStatistics();
        }
        return null;
    }
    
    // 记录执行历史
    recordExecution(command, result, success, error = null) {
        this.executionHistory.push({
            timestamp: Date.now(),
            command: command,
            result: result,
            success: success,
            error: error
        });
        
        // 限制历史记录数量
        if (this.executionHistory.length > 100) {
            this.executionHistory.shift();
        }
    }
    
    // 获取执行历史
    getExecutionHistory() {
        return this.executionHistory;
    }
    
    // 清除执行历史
    clearExecutionHistory() {
        this.executionHistory = [];
    }
}

// 导出类
window.UniversalActionExecutor = UniversalActionExecutor;
