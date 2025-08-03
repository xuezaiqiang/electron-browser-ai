// AI对话管理器
class AIChatManager {
    constructor() {
        this.nlpParser = new NLPParser();
        this.taskScheduler = new TaskScheduler();
        this.chatHistory = [];
        this.isProcessing = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadChatHistory();
        
        // 监听任务事件
        this.taskScheduler.addEventListener('taskCreated', (task) => {
            this.updateTasksList();
            this.addMessage('assistant', `任务已创建：${this.nlpParser.generateTaskDescription({
                success: true,
                time: { scheduledTime: task.scheduledTime },
                action: task.action,
                site: task.site,
                searchQuery: task.searchQuery
            })}`);
        });

        this.taskScheduler.addEventListener('taskStarted', (task) => {
            this.updateTasksList();
            this.addMessage('assistant', `开始执行任务：${task.originalText}`);
        });

        this.taskScheduler.addEventListener('taskCompleted', (task) => {
            this.updateTasksList();
            const status = task.status === 'completed' ? '✅ 成功' : '❌ 失败';
            const message = task.status === 'completed' ? 
                `任务执行完成：${task.originalText}` : 
                `任务执行失败：${task.originalText}，错误：${task.error}`;
            this.addMessage('assistant', `${status} ${message}`);
        });
    }

    // 初始化DOM元素
    initializeElements() {
        this.aiSidebar = document.getElementById('ai-sidebar');
        this.sidebarOverlay = document.getElementById('sidebar-overlay');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.sendButton = document.getElementById('send-chat');
        this.tasksList = document.getElementById('tasks-list');
        this.taskCount = document.getElementById('task-count');
        this.tasksSection = document.querySelector('.tasks-section');
        this.collapseBtn = document.getElementById('collapse-tasks');
    }

    // 设置事件监听器
    setupEventListeners() {
        // 发送按钮点击
        this.sendButton.addEventListener('click', () => {
            this.handleUserInput();
        });

        // 输入框回车键
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleUserInput();
            }
        });

        // 清空对话按钮
        document.getElementById('clear-chat').addEventListener('click', () => {
            this.clearChat();
        });

        // 关闭侧边栏按钮
        document.getElementById('close-sidebar').addEventListener('click', () => {
            this.hide();
        });

        // 最小化侧边栏按钮
        document.getElementById('minimize-sidebar').addEventListener('click', () => {
            this.hide();
        });

        // 点击遮罩关闭侧边栏
        this.sidebarOverlay.addEventListener('click', () => {
            this.hide();
        });

        // 自动调整输入框高度
        this.chatInput.addEventListener('input', () => {
            this.autoResizeTextarea();
        });

        // 任务列表折叠功能
        if (this.collapseBtn) {
            this.collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTasksList();
            });
        }

        // 点击任务区域头部也可以折叠
        const tasksHeader = document.getElementById('tasks-header');
        if (tasksHeader) {
            tasksHeader.addEventListener('click', () => {
                this.toggleTasksList();
            });
        }

        // 初始化折叠状态（从本地存储恢复）
        this.loadTasksCollapseState();
    }

    // 处理用户输入
    async handleUserInput() {
        const input = this.chatInput.value.trim();
        if (!input || this.isProcessing) {
            return;
        }

        this.isProcessing = true;
        this.sendButton.disabled = true;
        this.chatInput.value = '';

        // 添加处理状态样式
        const inputContainer = document.querySelector('.input-container');
        if (inputContainer) {
            inputContainer.classList.add('processing');
        }

        // 添加用户消息
        this.addMessage('user', input);

        try {
            // 直接使用AI模型进行智能解析，不再使用本地正则表达式
            await this.handleAISmartParsing(input);

        } catch (error) {
            console.error('处理用户输入失败:', error);
            this.addMessage('assistant', `❌ 处理指令时出错：${error.message}`);
        } finally {
            this.isProcessing = false;
            this.sendButton.disabled = false;

            // 移除处理状态样式
            const inputContainer = document.querySelector('.input-container');
            if (inputContainer) {
                inputContainer.classList.remove('processing');
            }
        }
    }

    // 使用AI增强解析
    async enhanceParsingWithAI(input, parseResult) {
        try {
            // 构建AI提示
            const prompt = `请分析以下用户指令，确认解析结果是否正确：

用户指令：${input}

解析结果：
- 时间：${this.nlpParser.formatTime(parseResult.time.scheduledTime)}
- 动作：${parseResult.action}
- 网站：${parseResult.site?.name || '未指定'}
- 搜索内容：${parseResult.searchQuery || '无'}

请确认这个解析是否正确，如果有问题请指出。只需要简短回复即可。`;

            // 发送到AI模型
            const aiResponse = await this.sendToAI(prompt);
            
            if (aiResponse && aiResponse.success) {
                // 可以根据AI的反馈调整解析结果
                console.log('AI增强解析反馈:', aiResponse.content);
            }

        } catch (error) {
            console.warn('AI增强解析失败:', error);
        }
    }

    // AI智能解析 - 理解任意自然语言
    async handleAISmartParsing(input) {
        // 显示打字指示器
        this.showTypingIndicator();

        try {
            const prompt = this.buildSmartParsingPrompt(input);
            const aiResponse = await this.sendToAI(prompt);

            // 添加详细的调试信息
            console.log('AI响应详情:', aiResponse);

            if (aiResponse && aiResponse.success) {
                try {
                    // AI API返回的格式是 {success: true, documentation: content}
                    // 我们需要从documentation字段获取内容
                    const aiContent = aiResponse.documentation || aiResponse.content;

                    if (!aiContent) {
                        this.hideTypingIndicator();
                        this.addMessage('assistant', '❌ AI返回了空的响应内容，请重试。');
                        return;
                    }

                    console.log('AI返回的原始内容:', aiContent);

                    // 解析AI返回的JSON
                    const aiResult = JSON.parse(aiContent);
                    console.log('解析后的AI结果:', aiResult);

                    this.hideTypingIndicator();

                    if (aiResult.success) {
                        await this.processAIParseResult(aiResult, input);
                    } else {
                        this.addMessage('assistant', `❌ ${aiResult.reason || '无法理解您的指令'}\n\n💡 ${aiResult.suggestion || '请尝试更明确的表达'}`);
                    }
                } catch (parseError) {
                    console.error('AI响应解析失败:', parseError);
                    const aiContent = aiResponse.documentation || aiResponse.content;
                    console.error('原始AI响应:', aiContent);
                    this.hideTypingIndicator();

                    // 显示更详细的错误信息
                    const errorMessage = `🤖 AI响应解析失败\n\n原始响应：${aiContent || 'undefined'}\n\n错误：${parseError.message}\n\n请重试或使用更简单的表达。`;
                    this.addMessage('assistant', errorMessage);
                }
            } else {
                this.hideTypingIndicator();
                console.error('AI响应失败:', aiResponse);
                this.addMessage('assistant', `❌ AI服务响应异常\n\n响应状态：${aiResponse ? aiResponse.success : 'null'}\n\n请稍后重试。`);
            }
        } catch (error) {
            console.error('AI智能解析失败:', error);
            this.hideTypingIndicator();
            this.addMessage('assistant', '❌ 处理您的指令时出现错误，请重试。');
        }
    }

    // 显示打字指示器
    showTypingIndicator() {
        this.hideTypingIndicator(); // 先清除已有的

        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = '<span></span><span></span><span></span>';

        this.chatMessages.appendChild(typingDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // 隐藏打字指示器
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // 构建智能解析提示词
    buildSmartParsingPrompt(input) {
        const currentTime = new Date();
        const timeStr = currentTime.toLocaleString('zh-CN');
        const currentYear = currentTime.getFullYear();
        const currentMonth = currentTime.getMonth() + 1;
        const currentDay = currentTime.getDate();

        return `你是一个专业的任务调度AI助手。请精确分析用户的自然语言指令，提取时间和任务信息。

当前时间：${timeStr}
当前日期：${currentYear}年${currentMonth}月${currentDay}日

用户指令：${input}

重要要求：
1. **立即执行判断**：如果用户说"现在"、"立即"、"马上"、"用百度搜索"（没有明确时间）等，应该设置为立即执行
2. 必须精确解析时间，不能忽略分钟和秒数
3. "九点三十五"应解析为21:35:00（晚上）或09:35:00（上午）
4. "九点三十五分"、"9点35分"、"21:35"等都要精确到分钟
5. 时间格式必须是本地时间的ISO格式：YYYY-MM-DDTHH:mm:ss（不要Z后缀，使用本地时区）
6. 如果是"今天晚上"，日期必须是当前日期，不能是明天
7. 时间必须基于中国时区（UTC+8）

请按以下JSON格式回复（只返回JSON，不要其他文字）：
{
    "success": true/false,
    "reason": "如果失败，说明原因",
    "suggestion": "如果失败，提供建议",
    "task": {
        "time": {
            "original": "用户的时间表达",
            "parsed": "2024-01-30T15:25:30.000Z",
            "description": "明天下午3点25分30秒",
            "isValid": true,
            "precision": "exact", // exact(精确到分秒) | approximate(大概时间)
            "executeNow": false // true表示立即执行，false表示定时执行
        },
        "action": {
            "type": "search/navigate/remind/check/open/visit/browse",
            "description": "搜索/访问/提醒/检查/打开/访问/浏览"
        },
        "target": {
            "site": "百度/谷歌/淘宝/京东/邮箱/新闻网站等",
            "url": "https://www.baidu.com",
            "content": "搜索内容或操作目标",
            "keywords": ["关键词1", "关键词2"]
        },
        "description": "完整的任务描述"
    }
}

智能解析规则：

🕐 时间理解（必须精确解析，不能忽略任何时间组件）：

**精确时间解析规则：**
- "九点三十五" → 21:35:00（晚上）或 09:35:00（上午，根据上下文）
- "九点三十五分" → 21:35:00 或 09:35:00
- "21点35分" → 21:35:00
- "9:35" → 09:35:00 或 21:35:00
- "下午三点二十五" → 15:25:00
- "晚上九点三十五" → 21:35:00
- "上午九点三十五" → 09:35:00

**时间组件处理：**
- 小时：支持12小时制和24小时制，中文数字和阿拉伯数字
- 分钟：必须精确保留，不能忽略或四舍五入到整点
- 秒数：如果用户指定了秒数，必须保留
- 时间段：上午、下午、晚上、中午等用于确定具体时间

**日期处理：**
- 今天、明天、后天等相对日期
- 具体日期：2025年7月31日
- 如果时间已过，自动调整到下一个相同时间点

**重要：绝对不能将"九点三十五"解析为"九点"，必须保留完整的时分秒信息！**

🎯 动作理解（理解各种表达方式）：
   - 搜索类：搜索、查找、找、看看、了解、查询、搜一下、查一查、找找看
   - 访问类：打开、访问、去、浏览、看、进入、登录、访问一下
   - 提醒类：提醒、通知、告诉我、叫我、提示我、别忘了
   - 检查类：检查、查看、看看、确认、核实、监控
   - 学习类：学习、了解、研究、看教程、学一下
   - 娱乐类：听音乐、看视频、玩游戏、放松一下

🌐 目标理解（智能网站推荐）：
   - 搜索引擎：百度、谷歌、必应、搜狗、360搜索
   - 购物网站：淘宝、京东、天猫、拼多多、苏宁
   - 社交媒体：微博、知乎、豆瓣、小红书、B站
   - 新闻资讯：新浪、腾讯、网易、澎湃、今日头条
   - 工作学习：邮箱、文档、日历、笔记、在线课程
   - 内容提取：引号内容、关键词、主题、情感倾向
   - 智能补全：根据上下文和用户意图补充缺失信息

🧠 智能处理策略：
   - 意图识别：分析用户真实意图，不仅仅是字面意思
   - 上下文理解：结合当前时间、常见习惯推断合理安排
   - 缺失补全：智能补全缺失的时间、网站或操作内容
   - 歧义消解：当存在多种理解时，选择最合理的解释
   - 个性化推荐：根据任务类型推荐最适合的时间和网站

📝 解析示例（展示各种自然语言表达）：

**立即执行示例：**
输入："用百度搜索今天天气"
输出：{"executeNow": true} - 立即执行搜索

输入："现在搜索济南天气"
输出：{"executeNow": true} - 立即执行搜索

输入："立即打开淘宝"
输出：{"executeNow": true} - 立即执行访问

输入："马上查看新闻"
输出：{"executeNow": true} - 立即执行搜索

**定时执行示例：**
输入："帮我明天上午搜索一下今天的新闻"
输出：{"executeNow": false} - 明天上午10点使用百度搜索"今天新闻"

输入："下午提醒我查看邮箱"
输出：{"executeNow": false} - 今天下午2点提醒查看邮箱

输入："晚上看看天气怎么样"
输出：{"executeNow": false} - 今天晚上7点使用百度搜索"天气预报"

⚠️ **时间精度重要示例（必须严格遵守）**：

输入："今天晚上九点三十五用百度搜索下济南天气"
正确输出：{
  "success": true,
  "task": {
    "time": {
      "original": "今天晚上九点三十五",
      "parsed": "2025-07-31T21:35:00",
      "description": "今天晚上21点35分",
      "isValid": true
    },
    "action": {"type": "search", "description": "搜索"},
    "target": {"site": "百度", "url": "https://www.baidu.com", "content": "济南天气"}
  }
}

输入："晚上九点52分用百度查询一下济南天气"
正确输出：{
  "success": true,
  "task": {
    "time": {
      "original": "晚上九点52分",
      "parsed": "2025-07-31T21:52:00",
      "description": "今天晚上21点52分",
      "isValid": true
    },
    "action": {"type": "search", "description": "搜索"},
    "target": {"site": "百度", "url": "https://www.baidu.com", "content": "济南天气"}
  }
}

输入："明天上午九点三十五分提醒我开会"
正确输出：明天上午09点35分 (不是09点00分)

输入："后天下午三点二十五搜索股票"
正确输出：后天下午15点25分 (不是15点00分)

**错误示例（绝对不能这样）：**
❌ "九点三十五" → "九点" (丢失了35分钟)
❌ "21:35" → "21:00" (丢失了35分钟)
❌ "三点二十五" → "三点" (丢失了25分钟)

输入："过一会儿帮我在淘宝找个手机壳"
输出：30分钟后在淘宝搜索"手机壳"

输入："工作结束后去B站看看有什么好视频"
输出：今天下午6点访问B站

输入："睡前提醒我设置明天的闹钟"
输出：今天晚上10点提醒设置闹钟

输入："明天中午订个外卖"
输出：明天中午12点在外卖平台搜索"午餐"

输入："下周一上班前查看一下股票行情"
输出：下周一上午9点搜索"股票行情"

输入："有空的时候学习一下Python编程"
输出：今天下午3点搜索"Python编程教程"

输入："晚饭后陪孩子看看动画片"
输出：今天晚上7点搜索"儿童动画片"`;
    }

    // 处理AI解析结果
    async processAIParseResult(aiResult, originalInput) {
        const task = aiResult.task;

        // 检查是否为立即执行
        if (task.time.executeNow) {
            console.log('检测到立即执行指令，直接执行任务');

            // 构建立即执行的解析结果
            const parseResult = {
                originalText: originalInput,
                success: true,
                time: {
                    scheduledTime: new Date(), // 当前时间
                    originalText: task.time.original || '立即执行',
                    isValid: true
                },
                action: task.action.type,
                site: task.target.site ? {
                    name: task.target.site,
                    url: task.target.url || this.getSiteUrl(task.target.site)
                } : null,
                searchQuery: task.target.content
            };

            // 🆕 优先使用新的通用自动化功能
            this.addMessage('assistant', `🚀 立即执行：${task.description}`);

            try {
                // 尝试使用新的通用命令执行器
                if (this.taskScheduler.commandParser && this.taskScheduler.actionExecutor) {
                    console.log('使用通用自动化执行器');
                    const result = await this.taskScheduler.executeUniversalCommand(originalInput);
                    this.addMessage('assistant', `✅ ${result.message}：${originalInput}`);
                } else {
                    // 回退到旧的执行方式
                    console.log('回退到传统执行方式');
                    parseResult.useUniversalParser = false; // 标记使用旧解析器
                    await this.taskScheduler.executeTaskDirectly(parseResult);
                    this.addMessage('assistant', `✅ 任务执行完成：${originalInput}`);
                }
            } catch (error) {
                console.error('立即执行任务失败:', error);
                this.addMessage('assistant', `❌ 任务执行失败：${error.message}`);

                // 如果是通用执行器失败，提供更详细的错误信息
                if (error.message.includes('无法理解该命令')) {
                    this.addMessage('assistant', `💡 提示：请尝试更明确的描述，例如：
• "点击登录按钮"
• "在搜索框输入关键词"
• "填写表单：姓名填张三，邮箱填test@email.com"
• "提取页面中的所有链接"
• "截图保存当前页面"`);
                }
            }
            return;
        }

        // 定时执行逻辑
        const scheduledTime = new Date(task.time.parsed);
        console.log('AI解析的时间字符串:', task.time.parsed);
        console.log('转换后的Date对象:', scheduledTime);
        console.log('当前时间:', new Date());

        if (isNaN(scheduledTime.getTime())) {
            this.addMessage('assistant', `❌ 时间解析错误\n\nAI返回的时间格式：${task.time.parsed}\n\n请重新输入。`);
            return;
        }

        if (scheduledTime <= new Date()) {
            this.addMessage('assistant', `⚠️ 指定时间已过期\n\n解析时间：${scheduledTime.toLocaleString('zh-CN')}\n当前时间：${new Date().toLocaleString('zh-CN')}\n\n💡 建议调整到未来时间。`);
            return;
        }

        // 构建解析结果
        const parseResult = {
            originalText: originalInput,
            success: true,
            time: {
                scheduledTime: scheduledTime,
                originalText: task.time.original,
                isValid: true
            },
            action: task.action.type,
            site: task.target.site ? {
                name: task.target.site,
                url: task.target.url || this.getSiteUrl(task.target.site)
            } : null,
            searchQuery: task.target.content
        };

        // 创建定时任务
        this.taskScheduler.createTask(parseResult);

        // 显示成功消息
        const successMessage = `✨ 智能解析成功！任务已创建

📋 **任务描述**
${task.description}

⏰ **执行时间**
${task.time.description}

🎯 **执行操作**
${task.action.description}${task.target.site ? `

🌐 **目标网站**
${task.target.site}` : ''}${task.target.content ? `

📝 **操作内容**
${task.target.content}` : ''}

🚀 任务将在指定时间自动执行，您可以在下方任务列表中查看进度。`;

        this.addMessage('assistant', successMessage);
    }

    // 获取网站URL
    getSiteUrl(siteName) {
        const siteMap = {
            '百度': 'https://www.baidu.com',
            '谷歌': 'https://www.google.com',
            '必应': 'https://www.bing.com',
            '淘宝': 'https://www.taobao.com',
            '京东': 'https://www.jd.com',
            '微博': 'https://weibo.com',
            '知乎': 'https://www.zhihu.com'
        };
        return siteMap[siteName] || 'https://www.baidu.com';
    }

    // 处理复杂指令（使用AI）- 保留作为备用
    async handleComplexCommand(input) {
        try {
            const prompt = `你是一个智能任务解析助手。请分析以下用户指令，提取关键信息并生成结构化的任务描述。

用户指令：${input}

请按以下JSON格式回复（只返回JSON，不要其他文字）：
{
    "success": true/false,
    "time": {
        "original": "用户输入的时间表达",
        "parsed": "2024-01-30 15:00:00",
        "isValid": true/false
    },
    "action": "search/navigate/click/input/wait",
    "site": {
        "name": "百度/谷歌/淘宝等",
        "url": "https://www.baidu.com"
    },
    "content": "搜索内容或操作目标",
    "description": "任务描述",
    "suggestions": ["改进建议1", "改进建议2"]
}

如果无法解析，请设置success为false并在suggestions中说明原因。

支持的时间表达：
- 绝对时间：下午3点、晚上8点半、明天上午9点
- 相对时间：今天、明天、后天
- 时间段：上午、下午、晚上、中午

支持的动作：
- search: 搜索操作
- navigate: 访问网站
- click: 点击元素
- input: 输入文本
- wait: 等待

支持的网站：
- 百度、谷歌、必应（搜索引擎）
- 淘宝、京东（购物网站）
- 其他网站URL`;

            const aiResponse = await this.sendToAI(prompt);

            if (aiResponse && aiResponse.success) {
                try {
                    // 尝试解析AI返回的JSON
                    const aiResult = JSON.parse(aiResponse.content);

                    if (aiResult.success && aiResult.time && aiResult.time.isValid) {
                        // AI成功解析，创建任务
                        const parseResult = {
                            originalText: input,
                            success: true,
                            time: {
                                scheduledTime: new Date(aiResult.time.parsed),
                                originalText: aiResult.time.original,
                                isValid: true
                            },
                            action: aiResult.action,
                            site: aiResult.site,
                            searchQuery: aiResult.content
                        };

                        // 验证时间
                        if (this.nlpParser.isValidFutureTime(parseResult.time.scheduledTime)) {
                            const task = this.taskScheduler.createTask(parseResult);
                            this.addMessage('assistant', `✅ AI成功解析您的指令：\n${aiResult.description}`);
                        } else {
                            this.addMessage('assistant', `⚠️ AI解析成功，但时间已过期：${aiResult.time.parsed}\n请指定未来的时间。`);
                        }
                    } else {
                        // AI无法解析
                        const suggestions = aiResult.suggestions ? aiResult.suggestions.join('\n- ') : '';
                        this.addMessage('assistant', `❌ 无法理解您的指令。\n\n建议：\n- ${suggestions}\n\n示例：\n- "在今天下午3点使用百度搜索天气预报"\n- "明天上午9点访问淘宝网站"`);
                    }
                } catch (parseError) {
                    // JSON解析失败，显示原始AI回复
                    this.addMessage('assistant', `🤖 AI分析结果：\n${aiResponse.content}\n\n请您重新用更明确的语言描述您的需求。`);
                }
            } else {
                this.addMessage('assistant', '❌ AI服务暂时不可用，请尝试使用更明确的表达方式。\n\n示例：\n- "在今天下午3点使用百度搜索天气预报"\n- "明天上午9点访问淘宝网站"');
            }

        } catch (error) {
            console.error('AI处理复杂指令失败:', error);
            this.addMessage('assistant', '❌ 处理指令时出错，请重试。');
        }
    }

    // 发送到AI模型 - 专用于聊天功能
    async sendToAI(prompt) {
        try {
            // 为AI聊天创建独立的API调用，避免影响页面分析功能
            const chatData = {
                html: '',
                css: '',
                scripts: '',
                url: 'ai-chat://command',
                title: 'AI Chat Command Parser',
                metadata: {
                    type: 'chat-command',
                    source: 'ai-chat-panel'
                },
                structure: {},
                performance: {},
                screenshot: null,
                customPrompt: prompt,
                chatMode: true  // 标识这是聊天模式的请求
            };

            const result = await window.aiAPI.sendToModel(chatData);
            return result;

        } catch (error) {
            console.error('AI聊天模型调用失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // 添加消息到对话
    addMessage(type, content) {
        // 移除欢迎消息（如果存在）
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';

        // 处理换行和格式化
        const formattedContent = content.replace(/\n/g, '<br>');
        bubbleDiv.innerHTML = formattedContent;

        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageDiv.appendChild(bubbleDiv);
        messageDiv.appendChild(timeDiv);
        this.chatMessages.appendChild(messageDiv);

        // 滚动到底部
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        // 保存到历史记录
        this.chatHistory.push({
            type,
            content,
            timestamp: new Date().toISOString()
        });

        this.saveChatHistory();
    }

    // 更新任务列表
    updateTasksList() {
        const tasks = this.taskScheduler.getAllTasks();
        
        // 更新任务计数
        if (this.taskCount) {
            this.taskCount.textContent = tasks.length;
        }

        if (tasks.length === 0) {
            this.tasksList.innerHTML = `
                <div class="no-tasks">
                    <div class="empty-icon">📋</div>
                    <p>还没有任务</p>
                    <span>快来创建第一个智能任务吧！</span>
                </div>
            `;
            return;
        }

        this.tasksList.innerHTML = '';
        
        tasks.forEach(task => {
            const taskDiv = document.createElement('div');
            taskDiv.className = `task-item ${task.status}`;
            
            const timeStr = this.nlpParser.formatTime(task.scheduledTime);
            const statusText = this.getStatusText(task.status);
            
            taskDiv.innerHTML = `
                <div class="task-header">
                    <span class="task-time">
                        <span class="status-indicator ${task.status}"></span>
                        ${timeStr}
                    </span>
                    <span class="task-status ${task.status}">${statusText}</span>
                </div>
                <div class="task-description">${task.originalText}</div>
                ${task.status === 'pending' ? `
                    <div class="task-actions">
                        <button class="task-action-btn cancel" onclick="window.aiChatManager.cancelTask('${task.id}')">取消</button>
                    </div>
                ` : ''}
                ${task.error ? `<div class="task-error">❌ 错误：${task.error}</div>` : ''}
                ${task.result ? `<div class="task-result">✅ ${task.result}</div>` : ''}
            `;
            
            this.tasksList.appendChild(taskDiv);
        });
    }

    // 获取状态文本
    getStatusText(status) {
        const statusMap = {
            'pending': '等待中',
            'running': '执行中',
            'completed': '已完成',
            'failed': '失败',
            'cancelled': '已取消'
        };
        return statusMap[status] || status;
    }

    // 取消任务
    cancelTask(taskId) {
        if (this.taskScheduler.cancelTask(taskId)) {
            this.updateTasksList();
            this.addMessage('assistant', '✅ 任务已取消');
        } else {
            this.addMessage('assistant', '❌ 无法取消该任务');
        }
    }

    // 清空对话
    clearChat() {
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">✨</div>
                <h4>欢迎使用AI智能助手</h4>
                <p>我可以理解您的自然语言指令，并在指定时间自动执行浏览器操作。</p>
                <div class="quick-examples">
                    <div class="example-item" onclick="insertExample(this.textContent)">
                        💡 明天上午10点搜索今天的新闻
                    </div>
                    <div class="example-item" onclick="insertExample(this.textContent)">
                        💡 下午3点提醒我查看邮箱
                    </div>
                    <div class="example-item" onclick="insertExample(this.textContent)">
                        💡 晚上8点用百度搜索天气
                    </div>
                </div>
            </div>
        `;
        this.chatHistory = [];
        this.saveChatHistory();
    }

    // 显示侧边栏
    show() {
        this.aiSidebar.classList.remove('hidden');
        this.sidebarOverlay.classList.remove('hidden');
        this.updateTasksList();

        // 延迟聚焦，确保动画完成
        setTimeout(() => {
            this.chatInput.focus();
        }, 300);
    }

    // 隐藏侧边栏
    hide() {
        this.aiSidebar.classList.add('hidden');
        this.sidebarOverlay.classList.add('hidden');
    }

    // 保存对话历史
    saveChatHistory() {
        try {
            localStorage.setItem('aiChatHistory', JSON.stringify(this.chatHistory));
        } catch (error) {
            console.error('保存对话历史失败:', error);
        }
    }

    // 加载对话历史
    loadChatHistory() {
        try {
            const data = localStorage.getItem('aiChatHistory');
            if (data) {
                this.chatHistory = JSON.parse(data);
                
                // 恢复对话显示
                this.chatMessages.innerHTML = '';
                this.chatHistory.forEach(message => {
                    this.addMessageToDisplay(message.type, message.content);
                });
            }
        } catch (error) {
            console.error('加载对话历史失败:', error);
        }
    }

    // 仅添加消息到显示（不保存到历史）
    addMessageToDisplay(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const formattedContent = content.replace(/\n/g, '<br>');
        contentDiv.innerHTML = formattedContent;
        
        messageDiv.appendChild(contentDiv);
        this.chatMessages.appendChild(messageDiv);
        
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // 自动调整输入框高度
    autoResizeTextarea() {
        const textarea = this.chatInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    // 切换任务列表折叠状态
    toggleTasksList() {
        if (this.tasksSection) {
            const isCollapsed = this.tasksSection.classList.contains('collapsed');

            if (isCollapsed) {
                this.tasksSection.classList.remove('collapsed');
            } else {
                this.tasksSection.classList.add('collapsed');
            }

            // 保存折叠状态到本地存储
            this.saveTasksCollapseState(!isCollapsed);
        }
    }

    // 保存任务列表折叠状态
    saveTasksCollapseState(isCollapsed) {
        try {
            localStorage.setItem('aiChatTasksCollapsed', JSON.stringify(isCollapsed));
        } catch (error) {
            console.error('保存任务折叠状态失败:', error);
        }
    }

    // 加载任务列表折叠状态
    loadTasksCollapseState() {
        try {
            const saved = localStorage.getItem('aiChatTasksCollapsed');
            if (saved !== null) {
                const isCollapsed = JSON.parse(saved);
                if (isCollapsed && this.tasksSection) {
                    this.tasksSection.classList.add('collapsed');
                }
            }
        } catch (error) {
            console.error('加载任务折叠状态失败:', error);
        }
    }
}

// 全局函数：插入示例文本
function insertExample(text) {
    const chatInput = document.getElementById('chat-input');
    if (chatInput && window.aiChatManager) {
        // 移除emoji和多余空格
        const cleanText = text.replace(/💡\s*/, '').trim();
        chatInput.value = cleanText;
        chatInput.focus();

        // 触发输入事件以调整高度
        window.aiChatManager.autoResizeTextarea();
    }
}

// 导出模块
window.AIChatManager = AIChatManager;
