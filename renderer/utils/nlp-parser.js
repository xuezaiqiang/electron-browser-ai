// 自然语言解析模块
class NLPParser {
    constructor() {
        this.timePatterns = [
            // 绝对时间 - 按优先级排序，更具体的模式在前
            { pattern: /(\d{1,2})[点时](\d{1,2})分(\d{1,2})秒?/, type: 'absolute', format: 'HH:mm:ss' },
            { pattern: /(\d{1,2})[点时](\d{1,2})分/, type: 'absolute', format: 'HH:mm' },
            { pattern: /(\d{1,2})[点时]半/, type: 'absolute', format: 'HH:30' },
            { pattern: /(\d{1,2})[点时]/, type: 'absolute', format: 'HH:00' },
            // 24小时制格式
            { pattern: /(\d{1,2}):(\d{1,2}):(\d{1,2})/, type: 'absolute', format: 'HH:mm:ss' },
            { pattern: /(\d{1,2}):(\d{1,2})/, type: 'absolute', format: 'HH:mm' },
            
            // 相对时间
            { pattern: /(今天|今日)/, type: 'relative', offset: 0 },
            { pattern: /(明天|明日)/, type: 'relative', offset: 1 },
            { pattern: /(后天)/, type: 'relative', offset: 2 },
            
            // 时间段
            { pattern: /(上午|早上|早晨)/, type: 'period', period: 'morning' },
            { pattern: /(下午|午后)/, type: 'period', period: 'afternoon' },
            { pattern: /(晚上|夜晚|夜里)/, type: 'period', period: 'evening' },
            { pattern: /(中午|正午)/, type: 'period', period: 'noon' },
            { pattern: /(深夜|凌晨)/, type: 'period', period: 'midnight' }
        ];

        this.actionPatterns = [
            { pattern: /(搜索|查找|找|search)(.+)/, action: 'search', target: 2 },
            { pattern: /(访问|打开|去|浏览)(.+)/, action: 'navigate', target: 2 },
            { pattern: /(点击|click)(.+)/, action: 'click', target: 2 },
            { pattern: /(输入|填写|写入)(.+)/, action: 'input', target: 2 },
            { pattern: /(等待|wait)(\d+)(秒|分钟)?/, action: 'wait', target: 2 }
        ];

        this.sitePatterns = [
            { pattern: /(百度|baidu)/i, site: 'https://www.baidu.com', searchSelector: '#kw' },
            { pattern: /(谷歌|google)/i, site: 'https://www.google.com', searchSelector: 'input[name="q"]' },
            { pattern: /(必应|bing)/i, site: 'https://www.bing.com', searchSelector: '#sb_form_q' },
            { pattern: /(淘宝|taobao)/i, site: 'https://www.taobao.com', searchSelector: '#q' },
            { pattern: /(京东|jd)/i, site: 'https://www.jd.com', searchSelector: '#key' }
        ];
    }

    // 解析用户输入的自然语言指令
    parseCommand(input) {
        const result = {
            originalText: input,
            time: null,
            action: null,
            site: null,
            searchQuery: null,
            success: false,
            error: null
        };

        try {
            // 解析时间
            const timeInfo = this.parseTime(input);
            if (timeInfo) {
                result.time = timeInfo;
            }

            // 解析动作
            const actionInfo = this.parseAction(input);
            if (actionInfo) {
                result.action = actionInfo.action;
                result.searchQuery = actionInfo.target;
            }

            // 解析网站
            const siteInfo = this.parseSite(input);
            if (siteInfo) {
                result.site = siteInfo;
            }

            // 验证解析结果
            if (result.time && result.action) {
                result.success = true;
            } else {
                result.error = '无法解析时间或操作指令';
            }

        } catch (error) {
            result.error = `解析失败: ${error.message}`;
        }

        return result;
    }

    // 解析时间信息
    parseTime(input) {
        let timeResult = {
            originalText: null,
            scheduledTime: null,
            isValid: false
        };

        let absoluteTime = null;
        let relativeDay = 0;
        let period = null;

        // 查找时间模式
        for (const pattern of this.timePatterns) {
            const match = input.match(pattern.pattern);
            if (match) {
                timeResult.originalText = match[0];

                switch (pattern.type) {
                    case 'absolute':
                        if (pattern.format === 'HH:mm:ss') {
                            const hour = parseInt(match[1]);
                            const minute = parseInt(match[2]) || 0;
                            const second = parseInt(match[3]) || 0;
                            absoluteTime = { hour, minute, second };
                        } else if (pattern.format === 'HH:mm') {
                            const hour = parseInt(match[1]);
                            const minute = parseInt(match[2]) || 0;
                            absoluteTime = { hour, minute, second: 0 };
                        } else if (pattern.format === 'HH:30') {
                            const hour = parseInt(match[1]);
                            absoluteTime = { hour, minute: 30, second: 0 };
                        } else if (pattern.format === 'HH:00') {
                            const hour = parseInt(match[1]);
                            absoluteTime = { hour, minute: 0, second: 0 };
                        }
                        break;

                    case 'relative':
                        relativeDay = pattern.offset;
                        break;

                    case 'period':
                        period = pattern.period;
                        break;
                }
            }
        }

        // 计算最终时间
        if (absoluteTime) {
            const now = new Date();
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() + relativeDay);

            // 设置时、分、秒，确保精确到秒
            const hour = absoluteTime.hour;
            const minute = absoluteTime.minute || 0;
            const second = absoluteTime.second || 0;
            targetDate.setHours(hour, minute, second, 0);

            // 如果时间已过，则推到明天
            if (targetDate <= now && relativeDay === 0) {
                targetDate.setDate(targetDate.getDate() + 1);
            }

            timeResult.scheduledTime = targetDate;
            timeResult.isValid = true;
        } else if (period) {
            // 如果只有时间段，使用默认时间
            const now = new Date();
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() + relativeDay);

            switch (period) {
                case 'morning':
                    targetDate.setHours(9, 0, 0, 0);
                    break;
                case 'afternoon':
                    targetDate.setHours(14, 0, 0, 0);
                    break;
                case 'evening':
                    targetDate.setHours(19, 0, 0, 0);
                    break;
                case 'noon':
                    targetDate.setHours(12, 0, 0, 0);
                    break;
                case 'midnight':
                    targetDate.setHours(0, 0, 0, 0);
                    if (relativeDay === 0) {
                        targetDate.setDate(targetDate.getDate() + 1);
                    }
                    break;
            }

            if (targetDate <= now && relativeDay === 0) {
                targetDate.setDate(targetDate.getDate() + 1);
            }

            timeResult.scheduledTime = targetDate;
            timeResult.isValid = true;
        }

        return timeResult.isValid ? timeResult : null;
    }

    // 解析动作信息
    parseAction(input) {
        for (const pattern of this.actionPatterns) {
            const match = input.match(pattern.pattern);
            if (match) {
                return {
                    action: pattern.action,
                    target: match[pattern.target]?.trim().replace(/['"]/g, '') || null
                };
            }
        }
        return null;
    }

    // 解析网站信息
    parseSite(input) {
        for (const pattern of this.sitePatterns) {
            const match = input.match(pattern.pattern);
            if (match) {
                return {
                    name: match[0],
                    url: pattern.site,
                    searchSelector: pattern.searchSelector
                };
            }
        }
        return null;
    }

    // 生成任务描述
    generateTaskDescription(parseResult) {
        if (!parseResult.success) {
            return '无效的任务';
        }

        // 使用更精确的时间格式，包含秒数
        const timeStr = this.formatTime(parseResult.time.scheduledTime);
        const siteStr = parseResult.site ? parseResult.site.name : '当前页面';
        const actionStr = this.getActionDescription(parseResult.action);
        const queryStr = parseResult.searchQuery || '';

        return `${timeStr} 在${siteStr}${actionStr}${queryStr}`;
    }

    // 获取动作描述
    getActionDescription(action) {
        const descriptions = {
            'search': '搜索',
            'navigate': '访问',
            'click': '点击',
            'input': '输入',
            'wait': '等待'
        };
        return descriptions[action] || action;
    }

    // 验证时间是否有效（未来时间）
    isValidFutureTime(date) {
        return date && date > new Date();
    }

    // 格式化时间显示
    formatTime(date) {
        if (!date) return '无效时间';
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

// 导出模块
window.NLPParser = NLPParser;
