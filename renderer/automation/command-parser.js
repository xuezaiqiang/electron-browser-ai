// 🤖 增强的AI命令解析器 - 支持通用浏览器自动化
class UniversalCommandParser {
    constructor() {
        this.commandTypes = {
            // 基础操作
            CLICK: 'click',
            INPUT: 'input',
            SELECT: 'select',
            SCROLL: 'scroll',
            
            // 导航操作
            NAVIGATE: 'navigate',
            REFRESH: 'refresh',
            BACK: 'back',
            FORWARD: 'forward',
            
            // 数据操作
            EXTRACT: 'extract',
            DOWNLOAD: 'download',
            UPLOAD: 'upload',
            SCREENSHOT: 'screenshot',
            
            // 表单操作
            FORM_FILL: 'form_fill',
            FORM_SUBMIT: 'form_submit',
            
            // 等待操作
            WAIT: 'wait',
            WAIT_FOR: 'wait_for',
            
            // 循环操作
            LOOP: 'loop',
            REPEAT: 'repeat',
            
            // 条件操作
            IF: 'if',
            
            // 数据处理
            SAVE: 'save',
            EXPORT: 'export',
            
            // 监控操作
            MONITOR: 'monitor'
        };
        
        this.initializePatterns();
    }
    
    // 初始化命令模式
    initializePatterns() {
        this.patterns = {
            // 点击操作
            click: [
                /点击(.+)/,
                /click\s+(.+)/i,
                /按(.+)/,
                /选择(.+)/
            ],
            
            // 输入操作
            input: [
                /在(.+)输入(.+)/,
                /输入(.+)/,
                /填写(.+)/,
                /type\s+(.+)/i
            ],
            
            // 导航操作
            navigate: [
                /打开(.+)/,
                /访问(.+)/,
                /导航到(.+)/,
                /go\s+to\s+(.+)/i,
                /navigate\s+to\s+(.+)/i
            ],
            
            // 表单填写
            form_fill: [
                /填写表单[:：](.+)/,
                /表单填写[:：](.+)/,
                /fill\s+form[:：](.+)/i
            ],
            
            // 数据提取和搜索
            extract: [
                /提取(.+)/,
                /获取(.+)/,
                /抓取(.+)/,
                /查询(.+)/,
                /搜索(.+)/,
                /查找(.+)/,
                /立即查询(.+)/,
                /立即搜索(.+)/,
                /extract\s+(.+)/i,
                /scrape\s+(.+)/i,
                /search\s+(.+)/i,
                /query\s+(.+)/i
            ],

            // 复合操作 - 导航+搜索
            navigate_search: [
                /用(.+)查询(.+)/,
                /用(.+)搜索(.+)/,
                /在(.+)搜索(.+)/,
                /在(.+)查询(.+)/,
                /打开(.+)搜索(.+)/,
                /访问(.+)搜索(.+)/,
                /立即用(.+)查询(.+)/,
                /立即用(.+)搜索(.+)/,
                /立即在(.+)搜索(.+)/,
                /立即在(.+)查询(.+)/,
                /go\s+to\s+(.+)\s+search\s+(.+)/i,
                /search\s+(.+)\s+on\s+(.+)/i
            ],

            // 工作流创建
            create_workflow: [
                /请帮我创建一个工作流/,
                /创建工作流/,
                /制作自动化流程/,
                /设计操作序列/,
                /create\s+workflow/i
            ],
            
            // 等待操作
            wait: [
                /等待(\d+)秒/,
                /等待(.+)/,
                /wait\s+(\d+)/i,
                /wait\s+for\s+(.+)/i
            ],
            
            // 循环操作
            loop: [
                /重复(.+)(\d+)次/,
                /循环(.+)/,
                /repeat\s+(.+)\s+(\d+)\s+times/i,
                /loop\s+(.+)/i
            ],
            
            // 下载操作
            download: [
                /下载(.+)/,
                /保存(.+)/,
                /download\s+(.+)/i
            ],
            
            // 截图操作
            screenshot: [
                /截图/,
                /截屏/,
                /保存截图/,
                /screenshot/i,
                /capture/i
            ]
        };
    }
    
    // 解析用户命令
    async parseCommand(userInput) {
        console.log('解析命令:', userInput);

        // 预处理输入
        const cleanInput = this.preprocessInput(userInput);

        // 首先检查是否是工作流创建命令
        if (this.isWorkflowCommand(cleanInput)) {
            return this.parseWorkflowCommand(cleanInput);
        }

        // 尝试匹配复杂命令（多步骤）
        const complexCommand = this.parseComplexCommand(cleanInput);
        if (complexCommand) {
            return complexCommand;
        }

        // 尝试匹配简单命令
        const simpleCommand = this.parseSimpleCommand(cleanInput);
        if (simpleCommand) {
            return simpleCommand;
        }

        // 使用AI解析
        return await this.parseWithAI(cleanInput);
    }
    
    // 预处理输入
    preprocessInput(input) {
        return input.trim()
            .replace(/，/g, ',')
            .replace(/。/g, '.')
            .replace(/：/g, ':')
            .replace(/；/g, ';');
    }

    // 检查是否是工作流命令
    isWorkflowCommand(input) {
        // 检查是否包含工作流关键词和数字步骤
        const hasWorkflowKeyword = /请帮我创建|创建工作流|工作流|制作流程/.test(input);
        const hasNumberedSteps = /\d+\.\s*/.test(input);

        return hasWorkflowKeyword || hasNumberedSteps;
    }

    // 解析工作流命令
    parseWorkflowCommand(input) {
        const workflowSteps = this.parseWorkflowSteps(input);

        return {
            type: 'create_workflow',
            workflowSteps: workflowSteps,
            description: `创建包含 ${workflowSteps.length} 个步骤的工作流`,
            originalInput: input,
            timestamp: Date.now()
        };
    }
    
    // 解析简单命令
    parseSimpleCommand(input) {
        for (const [commandType, patterns] of Object.entries(this.patterns)) {
            for (const pattern of patterns) {
                const match = input.match(pattern);
                if (match) {
                    return this.buildCommand(commandType, match, input);
                }
            }
        }
        return null;
    }
    
    // 构建命令对象
    buildCommand(type, match, originalInput) {
        const command = {
            type: type,
            originalInput: originalInput,
            timestamp: Date.now()
        };
        
        switch (type) {
            case 'click':
                command.target = match[1];
                command.description = `点击 ${match[1]}`;
                break;
                
            case 'input':
                if (match.length > 2) {
                    command.target = match[1];
                    command.value = match[2];
                    command.description = `在 ${match[1]} 输入 ${match[2]}`;
                } else {
                    command.value = match[1];
                    command.description = `输入 ${match[1]}`;
                }
                break;
                
            case 'navigate':
                command.url = this.normalizeUrl(match[1]);
                command.description = `导航到 ${command.url}`;
                break;
                
            case 'form_fill':
                command.formData = this.parseFormData(match[1]);
                command.description = `填写表单`;
                break;
                
            case 'extract':
                command.target = match[1];
                command.description = `提取 ${match[1]}`;
                break;

            case 'navigate_search':
                command.site = match[1];
                command.query = match[2];
                command.url = this.getSiteUrl(match[1]);
                command.description = `在 ${match[1]} 搜索 ${match[2]}`;
                break;

            case 'create_workflow':
                command.workflowSteps = this.parseWorkflowSteps(originalInput);
                command.description = `创建包含 ${command.workflowSteps.length} 个步骤的工作流`;
                break;
                
            case 'wait':
                if (match[1] && /^\d+$/.test(match[1])) {
                    command.duration = parseInt(match[1]) * 1000; // 转换为毫秒
                    command.description = `等待 ${match[1]} 秒`;
                } else {
                    command.condition = match[1];
                    command.description = `等待 ${match[1]}`;
                }
                break;
                
            case 'loop':
                command.action = match[1];
                command.times = match[2] ? parseInt(match[2]) : 1;
                command.description = `重复 ${command.action} ${command.times} 次`;
                break;
                
            case 'download':
                command.target = match[1];
                command.description = `下载 ${match[1]}`;
                break;
                
            case 'screenshot':
                command.description = '截图';
                break;
        }
        
        return command;
    }
    
    // 解析复杂命令 (多步骤)
    parseComplexCommand(input) {
        // 检测是否包含多个步骤
        const stepSeparators = [',', '，', ';', '；', '然后', '接着', '再', 'then', 'and'];
        
        for (const separator of stepSeparators) {
            if (input.includes(separator)) {
                const steps = input.split(new RegExp(`\\s*${separator}\\s*`));
                if (steps.length > 1) {
                    return {
                        type: 'workflow',
                        steps: steps.map(step => this.parseSimpleCommand(step.trim())).filter(Boolean),
                        description: `执行多步骤操作: ${input}`,
                        originalInput: input,
                        timestamp: Date.now()
                    };
                }
            }
        }
        
        return null;
    }
    
    // 使用AI解析复杂命令
    async parseWithAI(input) {
        try {
            // 构建AI提示
            const prompt = this.buildAIPrompt(input);
            
            // 调用AI API
            const aiResponse = await this.callAI(prompt);
            
            // 解析AI响应
            return this.parseAIResponse(aiResponse, input);
            
        } catch (error) {
            console.error('AI解析失败:', error);
            return {
                type: 'unknown',
                originalInput: input,
                error: 'AI解析失败',
                description: `无法解析命令: ${input}`,
                timestamp: Date.now()
            };
        }
    }
    
    // 构建AI提示
    buildAIPrompt(input) {
        return `
请解析以下浏览器自动化命令，返回JSON格式的操作步骤：

用户命令: "${input}"

支持的操作类型:
- click: 点击元素
- input: 输入文本
- navigate: 页面导航
- extract: 提取数据
- form_fill: 填写表单
- wait: 等待
- loop: 循环操作
- download: 下载文件
- screenshot: 截图

请返回格式:
{
  "type": "操作类型",
  "target": "目标元素或URL",
  "value": "输入值(如果需要)",
  "description": "操作描述"
}

如果是多步骤操作，请返回:
{
  "type": "workflow",
  "steps": [多个操作对象],
  "description": "整体描述"
}
        `;
    }
    
    // 调用AI API
    async callAI(prompt) {
        if (window.aiAPI && window.aiAPI.sendToModel) {
            const response = await window.aiAPI.sendToModel({
                customPrompt: prompt,
                chatMode: true
            });
            return response;
        }
        throw new Error('AI API不可用');
    }
    
    // 解析AI响应
    parseAIResponse(response, originalInput) {
        try {
            if (response.success && response.content) {
                // 尝试从响应中提取JSON
                const jsonMatch = response.content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    parsed.originalInput = originalInput;
                    parsed.timestamp = Date.now();
                    parsed.aiGenerated = true;
                    return parsed;
                }
            }
        } catch (error) {
            console.error('解析AI响应失败:', error);
        }
        
        // 回退到未知命令
        return {
            type: 'unknown',
            originalInput: originalInput,
            description: `无法解析命令: ${originalInput}`,
            timestamp: Date.now()
        };
    }
    
    // 标准化URL
    normalizeUrl(url) {
        if (!url) return '';

        // 如果已经是完整URL，直接返回
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        // 如果是域名，添加https://
        if (url.includes('.')) {
            return `https://${url}`;
        }

        // 否则作为搜索词处理
        return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }

    // 获取网站URL
    getSiteUrl(siteName) {
        const siteMap = {
            '百度': 'https://www.baidu.com',
            'baidu': 'https://www.baidu.com',
            '谷歌': 'https://www.google.com',
            'google': 'https://www.google.com',
            '必应': 'https://www.bing.com',
            'bing': 'https://www.bing.com',
            '搜狗': 'https://www.sogou.com',
            'sogou': 'https://www.sogou.com',
            '360搜索': 'https://www.so.com',
            '360': 'https://www.so.com',
            '淘宝': 'https://www.taobao.com',
            'taobao': 'https://www.taobao.com',
            '京东': 'https://www.jd.com',
            'jd': 'https://www.jd.com',
            '知乎': 'https://www.zhihu.com',
            'zhihu': 'https://www.zhihu.com',
            '微博': 'https://weibo.com',
            'weibo': 'https://weibo.com'
        };

        const normalizedName = siteName.toLowerCase().trim();
        return siteMap[normalizedName] || siteMap[siteName] || this.normalizeUrl(siteName);
    }

    // 解析工作流步骤
    parseWorkflowSteps(input) {
        const steps = [];

        // 按行分割并查找数字编号的步骤
        const lines = input.split('\n');

        for (const line of lines) {
            const trimmedLine = line.trim();
            // 匹配 "数字. 内容" 格式
            const stepMatch = trimmedLine.match(/^(\d+)\.\s*(.+)$/);

            if (stepMatch) {
                const stepNumber = parseInt(stepMatch[1]);
                const stepContent = stepMatch[2].trim();
                const step = this.parseWorkflowStep(stepContent, stepNumber);
                if (step) {
                    steps.push(step);
                }
            }
        }

        return steps;
    }

    // 解析单个工作流步骤
    parseWorkflowStep(stepText, stepNumber) {
        console.log(`解析步骤 ${stepNumber}: "${stepText}"`);

        const step = {
            stepNumber: stepNumber,
            originalText: stepText,
            description: stepText
        };

        // 识别步骤类型
        if (/打开|访问|导航/.test(stepText)) {
            step.type = 'navigate';
            const siteMatch = stepText.match(/(打开|访问|导航到?)\s*(.+)/);
            if (siteMatch && siteMatch[2]) {
                step.site = siteMatch[2].trim();
                step.url = this.getSiteUrl(step.site);
                console.log(`解析导航步骤: "${step.site}" -> ${step.url}`);
            } else {
                console.warn(`导航步骤解析失败: "${stepText}"`);
            }
        } else if (/搜索/.test(stepText)) {
            step.type = 'search';
            const queryMatch = stepText.match(/搜索\s*[""]?(.+?)[""]?$/);
            if (queryMatch && queryMatch[1]) {
                step.query = queryMatch[1].trim().replace(/[""]/g, '');
                console.log(`解析搜索步骤: 查询 "${step.query}"`);
            } else {
                console.warn(`搜索步骤解析失败: "${stepText}"`);
            }
        } else if (/点击/.test(stepText)) {
            step.type = 'click';
            const targetMatch = stepText.match(/点击\s*(.+)/);
            if (targetMatch && targetMatch[1]) {
                step.target = targetMatch[1].trim();
            }
        } else if (/截图|保存/.test(stepText)) {
            step.type = 'screenshot';
        } else if (/输入|填写/.test(stepText)) {
            step.type = 'input';
            const inputMatch = stepText.match(/输入|填写\s*(.+)/);
            if (inputMatch && inputMatch[1]) {
                step.value = inputMatch[1].trim();
            }
        } else if (/等待/.test(stepText)) {
            step.type = 'wait';
            const timeMatch = stepText.match(/等待\s*(\d+)/);
            if (timeMatch) {
                step.duration = parseInt(timeMatch[1]) * 1000;
            } else {
                step.duration = 2000; // 默认2秒
            }
        } else {
            step.type = 'custom';
        }

        return step;
    }
    
    // 解析表单数据
    parseFormData(formString) {
        const formData = {};
        const pairs = formString.split(/[,，]/);
        
        for (const pair of pairs) {
            const match = pair.trim().match(/(.+?)[填写输入是为](.+)/);
            if (match) {
                const field = match[1].trim();
                const value = match[2].trim();
                formData[field] = value;
            }
        }
        
        return formData;
    }
}

// 导出类
window.UniversalCommandParser = UniversalCommandParser;
