// 🚀 高级自动化执行引擎 - 处理复杂操作序列
class AutomationEngine {
    constructor() {
        this.commandParser = null;
        this.actionExecutor = null;
        this.isRunning = false;
        this.currentWorkflow = null;
        this.executionQueue = [];
        this.retryCount = 3;
        this.stepDelay = 1000; // 步骤间延迟
        this.pageLoadTimeout = 10000; // 页面加载超时
        
        // 预定义的工作流模板
        this.workflowTemplates = {
            'search_workflow': {
                name: '搜索工作流',
                description: '在指定网站搜索内容',
                steps: [
                    { type: 'navigate', description: '导航到网站' },
                    { type: 'wait', duration: 3000, description: '等待页面加载' },
                    { type: 'input', description: '输入搜索内容' },
                    { type: 'click', description: '点击搜索按钮' },
                    { type: 'wait', duration: 2000, description: '等待搜索结果' }
                ]
            },
            'form_fill_workflow': {
                name: '表单填写工作流',
                description: '自动填写表单',
                steps: [
                    { type: 'form_fill', description: '填写表单字段' },
                    { type: 'click', description: '提交表单' },
                    { type: 'wait', duration: 3000, description: '等待提交结果' }
                ]
            },
            'login_workflow': {
                name: '登录工作流',
                description: '自动登录网站',
                steps: [
                    { type: 'navigate', description: '导航到登录页面' },
                    { type: 'input', target: '用户名', description: '输入用户名' },
                    { type: 'input', target: '密码', description: '输入密码' },
                    { type: 'click', target: '登录按钮', description: '点击登录' },
                    { type: 'wait', duration: 5000, description: '等待登录完成' }
                ]
            }
        };
        
        // 执行历史
        this.executionHistory = [];
        this.maxHistorySize = 50;
    }
    
    // 初始化引擎
    init(commandParser, actionExecutor) {
        this.commandParser = commandParser;
        this.actionExecutor = actionExecutor;
        console.log('自动化执行引擎初始化完成');
    }
    
    // 执行自然语言命令
    async executeCommand(webview, userCommand) {
        console.log(`🤖 执行自然语言命令: ${userCommand}`);

        try {
            // 🆕 优先使用Python自动化系统
            console.log('🐍 尝试使用Python自动化系统执行命令');
            const pythonResult = await this.executePythonCommand(userCommand);

            if (pythonResult.success) {
                console.log('✅ Python自动化执行成功');
                this.recordExecution(userCommand, { type: 'python_automation' }, pythonResult, true);

                return {
                    success: true,
                    command: { type: 'python_automation', originalInput: userCommand },
                    result: pythonResult,
                    message: pythonResult.message || 'Python自动化执行成功'
                };
            } else {
                console.warn('⚠️ Python自动化执行失败，回退到JavaScript执行器:', pythonResult.error);
            }

            // 回退到JavaScript执行器
            console.log('🔄 回退到JavaScript自动化执行器');

            // 1. 解析命令
            const parsedCommand = await this.commandParser.parseCommand(userCommand);
            console.log('命令解析结果:', parsedCommand);

            if (!parsedCommand || parsedCommand.type === 'unknown') {
                throw new Error(`无法理解命令: ${userCommand}`);
            }

            // 2. 根据命令类型选择执行策略
            let result;
            if (parsedCommand.type === 'navigate_search') {
                result = await this.executeSearchWorkflow(webview, parsedCommand);
            } else if (parsedCommand.type === 'workflow') {
                result = await this.executeWorkflow(webview, parsedCommand);
            } else if (parsedCommand.type === 'create_workflow') {
                result = await this.executeCreateWorkflow(webview, parsedCommand);
            } else {
                result = await this.actionExecutor.executeCommand(webview, parsedCommand);
            }

            // 3. 记录执行历史
            this.recordExecution(userCommand, parsedCommand, result, true);

            return {
                success: true,
                command: parsedCommand,
                result: result,
                message: result.message || 'JavaScript自动化执行成功'
            };

        } catch (error) {
            console.error('❌ 命令执行失败:', error);
            this.recordExecution(userCommand, null, null, false, error.message);

            return {
                success: false,
                error: error.message,
                command: userCommand
            };
        }
    }

    // 🆕 使用Python自动化系统执行命令
    async executePythonCommand(userCommand) {
        try {
            console.log('🐍 调用Python自动化系统:', userCommand);

            // 将自然语言命令转换为Python工作流
            const workflow = await this.convertToPythonWorkflow(userCommand);
            console.log('🐍 转换后的工作流:', workflow);

            if (!workflow || workflow.length === 0) {
                console.warn('🐍 工作流转换失败，无法生成有效的工作流');
                return {
                    success: false,
                    error: '无法将命令转换为Python工作流'
                };
            }

            console.log('🐍 准备调用Python自动化，工作流步骤数:', workflow.length);

            // 调用主进程的Python自动化
            const result = await window.pythonAPI.executeWorkflow(workflow, {
                headless: false, // 显示浏览器窗口
                timeout: 30000   // 30秒超时
            });

            console.log('🐍 Python自动化执行完成，结果:', result);
            return result;

        } catch (error) {
            console.error('🐍 Python自动化调用失败:', error);
            return {
                success: false,
                error: error.message || 'Python自动化调用失败'
            };
        }
    }

    // 🆕 将自然语言命令转换为Python工作流
    async convertToPythonWorkflow(userCommand) {
        const lowerCommand = userCommand.toLowerCase();

        // 搜索类命令
        if (lowerCommand.includes('搜索') || lowerCommand.includes('search')) {
            return this.createSearchWorkflow(userCommand);
        }

        // 导航类命令
        if (lowerCommand.includes('打开') || lowerCommand.includes('访问') || lowerCommand.includes('navigate')) {
            return this.createNavigateWorkflow(userCommand);
        }

        // 点击类命令
        if (lowerCommand.includes('点击') || lowerCommand.includes('click')) {
            return this.createClickWorkflow(userCommand);
        }

        // 输入类命令
        if (lowerCommand.includes('输入') || lowerCommand.includes('填写') || lowerCommand.includes('input')) {
            return this.createInputWorkflow(userCommand);
        }

        // 截图命令
        if (lowerCommand.includes('截图') || lowerCommand.includes('screenshot')) {
            return [{ type: 'screenshot', description: '截图保存当前页面' }];
        }

        // 通用命令 - 让Python自动化系统自己解析
        return [{
            type: 'universal_command',
            command: userCommand,
            description: `执行命令: ${userCommand}`
        }];
    }

    // 创建搜索工作流
    createSearchWorkflow(userCommand) {
        // 提取搜索关键词和网站
        let query = '';
        let site = 'baidu'; // 默认百度
        let url = 'https://www.baidu.com';

        // 检测网站
        if (userCommand.includes('淘宝')) {
            site = 'taobao';
            url = 'https://www.taobao.com';
        } else if (userCommand.includes('百度')) {
            site = 'baidu';
            url = 'https://www.baidu.com';
        } else if (userCommand.includes('京东')) {
            site = 'jd';
            url = 'https://www.jd.com';
        }

        // 提取搜索关键词
        const searchMatch = userCommand.match(/搜索["""]?([^"""]+)["""]?/);
        if (searchMatch) {
            query = searchMatch[1].trim();
        } else {
            // 如果没有明确的搜索关键词，使用整个命令作为查询
            query = userCommand.replace(/(在|用|打开|访问)?(淘宝|百度|京东)?(搜索|查找)?/g, '').trim();
        }

        return [
            { type: 'navigate', url: url, description: `打开${site}` },
            { type: 'search', query: query, site: site, description: `搜索"${query}"` },
            { type: 'screenshot', description: '截图保存搜索结果' }
        ];
    }

    // 创建导航工作流
    createNavigateWorkflow(userCommand) {
        // 提取URL
        const urlMatch = userCommand.match(/(https?:\/\/[^\s]+)/);
        let url = urlMatch ? urlMatch[1] : '';

        if (!url) {
            // 尝试提取网站名称
            if (userCommand.includes('淘宝')) {
                url = 'https://www.taobao.com';
            } else if (userCommand.includes('百度')) {
                url = 'https://www.baidu.com';
            } else if (userCommand.includes('京东')) {
                url = 'https://www.jd.com';
            }
        }

        if (!url) {
            return null; // 无法确定要访问的网站
        }

        return [
            { type: 'navigate', url: url, description: `访问 ${url}` },
            { type: 'wait', duration: 3000, description: '等待页面加载' }
        ];
    }

    // 创建点击工作流
    createClickWorkflow(userCommand) {
        // 提取要点击的元素
        const clickMatch = userCommand.match(/点击["""]?([^"""]+)["""]?/);
        const target = clickMatch ? clickMatch[1].trim() : '按钮';

        return [
            { type: 'click', target: target, description: `点击 ${target}` }
        ];
    }

    // 创建输入工作流
    createInputWorkflow(userCommand) {
        // 提取输入内容
        const inputMatch = userCommand.match(/输入["""]?([^"""]+)["""]?/);
        const text = inputMatch ? inputMatch[1].trim() : '';

        return [
            { type: 'input', text: text, description: `输入 ${text}` }
        ];
    }

    // 执行搜索工作流
    async executeSearchWorkflow(webview, command) {
        console.log(`执行搜索工作流: 在 ${command.site} 搜索 ${command.query}`);
        
        const workflow = {
            name: '搜索工作流',
            steps: [
                {
                    type: 'navigate',
                    url: command.url,
                    description: `导航到 ${command.site}`,
                    timeout: this.pageLoadTimeout
                },
                {
                    type: 'wait',
                    duration: 3000,
                    description: '等待页面加载完成'
                },
                {
                    type: 'smart_search',
                    query: command.query,
                    site: command.site,
                    description: `搜索: ${command.query}`
                }
            ]
        };
        
        return await this.executeWorkflowSteps(webview, workflow);
    }

    // 执行工作流创建
    async executeCreateWorkflow(webview, command) {
        console.log('创建并执行自定义工作流');

        if (!command.workflowSteps || command.workflowSteps.length === 0) {
            throw new Error('工作流步骤为空');
        }

        // 转换解析的步骤为执行步骤
        let currentSite = null; // 跟踪当前网站

        const executionSteps = command.workflowSteps.map((step, index) => {
            const execStep = {
                type: step.type,
                description: step.description,
                originalText: step.originalText,
                stepNumber: step.stepNumber || (index + 1)
            };

            switch (step.type) {
                case 'navigate':
                    currentSite = step.site; // 记录当前网站
                    execStep.url = step.url || this.getSiteUrl(step.site);
                    execStep.site = step.site;
                    console.log(`导航步骤: "${step.site}" -> ${execStep.url}`);

                    // 如果网站信息缺失，尝试从原始文本中提取
                    if (!step.site && step.originalText) {
                        const siteMatch = step.originalText.match(/(打开|访问|导航到?)\s*(.+)/);
                        if (siteMatch && siteMatch[2]) {
                            currentSite = siteMatch[2].trim();
                            execStep.site = currentSite;
                            execStep.url = this.getSiteUrl(currentSite);
                            console.log(`从原始文本提取网站: "${currentSite}" -> ${execStep.url}`);
                        }
                    }
                    break;
                case 'search':
                    execStep.query = step.query;
                    execStep.site = currentSite; // 使用当前网站
                    execStep.type = 'smart_search'; // 使用智能搜索
                    console.log(`搜索步骤: 在 ${currentSite} 搜索 ${step.query}`);
                    break;
                case 'click':
                    execStep.target = step.target;
                    execStep.site = currentSite; // 传递网站信息
                    break;
                case 'input':
                    execStep.value = step.value;
                    execStep.site = currentSite;
                    break;
                case 'wait':
                    execStep.duration = step.duration || 2000;
                    break;
                case 'screenshot':
                    // 保持原类型
                    break;
                default:
                    execStep.type = 'custom';
                    execStep.customAction = step.originalText;
            }

            return execStep;
        });

        const workflow = {
            name: '自定义工作流',
            description: `用户创建的 ${executionSteps.length} 步工作流`,
            steps: executionSteps,
            custom: true
        };

        return await this.executeWorkflowSteps(webview, workflow);
    }

    // 获取网站URL（从命令解析器复制）
    getSiteUrl(siteName) {
        if (!siteName) return 'https://www.baidu.com';

        const siteMap = {
            '淘宝': 'https://www.taobao.com',
            'taobao': 'https://www.taobao.com',
            '百度': 'https://www.baidu.com',
            'baidu': 'https://www.baidu.com',
            '谷歌': 'https://www.google.com',
            'google': 'https://www.google.com',
            '京东': 'https://www.jd.com',
            'jd': 'https://www.jd.com',
            '知乎': 'https://www.zhihu.com',
            'zhihu': 'https://www.zhihu.com'
        };

        const normalizedName = siteName.toLowerCase().trim();
        return siteMap[normalizedName] || siteMap[siteName] || `https://www.${siteName}.com`;
    }
    
    // 执行工作流步骤
    async executeWorkflowSteps(webview, workflow) {
        console.log(`开始执行工作流: ${workflow.name}`);
        
        this.isRunning = true;
        this.currentWorkflow = workflow;
        const results = [];
        
        try {
            for (let i = 0; i < workflow.steps.length; i++) {
                const step = workflow.steps[i];
                console.log(`执行步骤 ${i + 1}/${workflow.steps.length}: ${step.description}`);
                
                let stepResult;
                let retryCount = 0;
                
                while (retryCount < this.retryCount) {
                    try {
                        stepResult = await this.executeStep(webview, step);
                        break; // 成功则跳出重试循环
                    } catch (error) {
                        retryCount++;
                        console.warn(`步骤执行失败 (尝试 ${retryCount}/${this.retryCount}):`, error.message);
                        
                        if (retryCount >= this.retryCount) {
                            throw error;
                        }
                        
                        // 重试前等待
                        await this.delay(1000);
                    }
                }
                
                results.push({
                    step: i + 1,
                    description: step.description,
                    success: true,
                    result: stepResult,
                    retries: retryCount
                });
                
                // 步骤间延迟
                if (i < workflow.steps.length - 1) {
                    await this.delay(this.stepDelay);
                }
            }
            
            return {
                success: true,
                message: `工作流 "${workflow.name}" 执行完成`,
                steps: results,
                totalSteps: workflow.steps.length
            };
            
        } catch (error) {
            console.error('工作流执行失败:', error);
            
            return {
                success: false,
                message: `工作流执行失败: ${error.message}`,
                steps: results,
                error: error.message
            };
        } finally {
            this.isRunning = false;
            this.currentWorkflow = null;
        }
    }
    
    // 执行单个步骤
    async executeStep(webview, step) {
        switch (step.type) {
            case 'navigate':
                return await this.actionExecutor.executeNavigate(webview, step);
                
            case 'click':
                return await this.actionExecutor.executeClick(webview, step);
                
            case 'input':
                return await this.actionExecutor.executeInput(webview, step);
                
            case 'wait':
                return await this.executeWait(step);
                
            case 'smart_search':
                return await this.executeSmartSearch(webview, step);
                
            case 'form_fill':
                return await this.actionExecutor.executeFormFill(webview, step);
                
            case 'extract':
                return await this.actionExecutor.executeExtract(webview, step);
                
            case 'screenshot':
                return await this.actionExecutor.executeScreenshot(webview, step);
                
            default:
                throw new Error(`不支持的步骤类型: ${step.type}`);
        }
    }
    
    // 执行等待
    async executeWait(step) {
        const duration = step.duration || 1000;
        console.log(`等待 ${duration}ms`);
        
        await this.delay(duration);
        
        return {
            success: true,
            message: `等待 ${duration}ms 完成`
        };
    }
    
    // 执行智能搜索
    async executeSmartSearch(webview, step) {
        console.log(`智能搜索: ${step.query} (网站: ${step.site})`);
        
        // 使用动作执行器的搜索功能
        return await this.actionExecutor.performSearch(webview, step.query, step.site);
    }
    
    // 创建自定义工作流
    createWorkflow(name, description, steps) {
        const workflow = {
            name: name,
            description: description,
            steps: steps,
            created: Date.now(),
            custom: true
        };
        
        this.workflowTemplates[name] = workflow;
        console.log(`创建自定义工作流: ${name}`);
        
        return workflow;
    }
    
    // 获取工作流模板
    getWorkflowTemplate(name) {
        return this.workflowTemplates[name] || null;
    }
    
    // 列出所有工作流模板
    listWorkflowTemplates() {
        return Object.keys(this.workflowTemplates).map(key => ({
            name: key,
            ...this.workflowTemplates[key]
        }));
    }
    
    // 停止当前执行
    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            console.log('自动化执行已停止');
            return true;
        }
        return false;
    }
    
    // 获取执行状态
    getStatus() {
        return {
            isRunning: this.isRunning,
            currentWorkflow: this.currentWorkflow?.name || null,
            queueLength: this.executionQueue.length,
            lastExecution: this.executionHistory[0] || null
        };
    }
    
    // 记录执行历史
    recordExecution(userCommand, parsedCommand, result, success, error = null) {
        const record = {
            timestamp: Date.now(),
            userCommand: userCommand,
            parsedCommand: parsedCommand,
            result: result,
            success: success,
            error: error,
            duration: result?.duration || 0
        };
        
        this.executionHistory.unshift(record);
        
        // 限制历史记录大小
        if (this.executionHistory.length > this.maxHistorySize) {
            this.executionHistory = this.executionHistory.slice(0, this.maxHistorySize);
        }
    }
    
    // 获取执行历史
    getExecutionHistory(limit = 10) {
        return this.executionHistory.slice(0, limit);
    }
    
    // 获取执行统计
    getExecutionStats() {
        const total = this.executionHistory.length;
        if (total === 0) return null;
        
        const successful = this.executionHistory.filter(h => h.success).length;
        const avgDuration = this.executionHistory.reduce((sum, h) => sum + (h.duration || 0), 0) / total;
        
        return {
            total: total,
            successful: successful,
            failed: total - successful,
            successRate: ((successful / total) * 100).toFixed(1) + '%',
            avgDuration: Math.round(avgDuration) + 'ms'
        };
    }
    
    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 设置配置
    setConfig(config) {
        if (config.retryCount !== undefined) {
            this.retryCount = Math.max(0, config.retryCount);
        }
        if (config.stepDelay !== undefined) {
            this.stepDelay = Math.max(0, config.stepDelay);
        }
        if (config.pageLoadTimeout !== undefined) {
            this.pageLoadTimeout = Math.max(1000, config.pageLoadTimeout);
        }
        
        console.log('自动化引擎配置已更新:', config);
    }
}

// 导出类
window.AutomationEngine = AutomationEngine;
