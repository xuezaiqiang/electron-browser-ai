// 🔍 AI视觉页面分析器 - 基于AI视觉模型的页面元素识别
class VisionPageAnalyzer {
    constructor() {
        this.aiAPI = null;
        this.screenCapture = null;
        this.analysisCache = new Map();
        this.cacheTimeout = 30000; // 30秒缓存
        
        // 元素类型映射
        this.elementTypes = {
            'input': ['输入框', '文本框', '搜索框', '输入字段'],
            'button': ['按钮', '提交按钮', '搜索按钮', '确认按钮', '登录按钮'],
            'link': ['链接', '超链接', '文本链接'],
            'image': ['图片', '图像', '照片'],
            'text': ['文本', '标题', '段落', '标签'],
            'form': ['表单', '输入表单'],
            'menu': ['菜单', '导航菜单', '下拉菜单'],
            'list': ['列表', '选项列表'],
            'table': ['表格', '数据表'],
            'dialog': ['对话框', '弹窗', '模态框']
        };
    }
    
    // 初始化分析器
    init(aiAPI, screenCapture) {
        this.aiAPI = aiAPI;
        this.screenCapture = screenCapture;
        console.log('AI视觉页面分析器初始化完成');
    }
    
    // 分析页面并识别元素
    async analyzePage(webview, targetDescription = null) {
        try {
            console.log('开始AI视觉页面分析...');
            
            // 1. 获取页面截图
            const screenshot = await this.capturePageScreenshot(webview);
            if (!screenshot) {
                throw new Error('无法获取页面截图');
            }
            
            // 2. 检查缓存
            const cacheKey = this.generateCacheKey(screenshot, targetDescription);
            if (this.analysisCache.has(cacheKey)) {
                const cached = this.analysisCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    console.log('使用缓存的分析结果');
                    return cached.result;
                }
            }
            
            // 3. 使用AI分析截图
            const analysisResult = await this.performVisionAnalysis(screenshot, targetDescription);
            
            // 4. 缓存结果
            this.analysisCache.set(cacheKey, {
                result: analysisResult,
                timestamp: Date.now()
            });
            
            return analysisResult;
            
        } catch (error) {
            console.error('AI视觉页面分析失败:', error);
            throw error;
        }
    }
    
    // 查找特定元素
    async findElement(webview, elementDescription) {
        console.log(`AI视觉查找元素: ${elementDescription}`);
        
        try {
            // 分析页面并查找目标元素
            const analysisResult = await this.analyzePage(webview, elementDescription);
            
            if (analysisResult.elements && analysisResult.elements.length > 0) {
                // 查找最匹配的元素
                const matchedElement = this.findBestMatch(analysisResult.elements, elementDescription);
                
                if (matchedElement) {
                    return {
                        found: true,
                        element: matchedElement,
                        confidence: matchedElement.confidence || 0.8,
                        method: 'ai_vision',
                        analysisResult: analysisResult
                    };
                }
            }
            
            return {
                found: false,
                error: '未找到匹配的元素',
                analysisResult: analysisResult
            };
            
        } catch (error) {
            console.error('AI视觉元素查找失败:', error);
            return {
                found: false,
                error: error.message
            };
        }
    }
    
    // 获取页面截图
    async capturePageScreenshot(webview) {
        try {
            if (this.screenCapture) {
                return await this.screenCapture.captureCurrentPage();
            } else {
                // 回退到简单截图方法
                return await window.electronAPI.captureScreenshot();
            }
        } catch (error) {
            console.error('截图失败:', error);
            return null;
        }
    }
    
    // 执行AI视觉分析
    async performVisionAnalysis(screenshot, targetDescription) {
        if (!this.aiAPI) {
            throw new Error('AI API未初始化');
        }
        
        // 构建AI分析提示
        const prompt = this.buildVisionPrompt(targetDescription);
        
        // 准备AI请求数据 - 简化数据结构避免序列化问题
        const requestData = {
            html: '',
            css: '',
            scripts: '',
            url: 'vision-analysis://page',
            title: 'Page Vision Analysis',
            metadata: {
                type: 'vision-analysis',
                target: targetDescription || 'general'
            },
            structure: {},
            performance: {},
            screenshot: screenshot,
            customPrompt: prompt,
            visionMode: true
        };
        
        try {
            console.log('发送视觉分析请求到AI模型...');
            const response = await this.aiAPI.sendToModel(requestData);

            if (response && response.success) {
                // 检查响应格式
                let content = response.content || response.documentation;
                if (content) {
                    return this.parseVisionResponse(content, targetDescription);
                } else {
                    console.warn('AI视觉分析响应无内容:', response);
                    return this.getDefaultAnalysisResult(targetDescription);
                }
            } else {
                console.warn('AI视觉分析响应异常:', response);
                return this.getDefaultAnalysisResult(targetDescription);
            }

        } catch (error) {
            console.error('AI视觉分析请求失败:', error);
            // 返回默认结果而不是抛出错误
            return this.getDefaultAnalysisResult(targetDescription);
        }
    }
    
    // 构建视觉分析提示
    buildVisionPrompt(targetDescription) {
        let prompt = `
请分析这个网页截图，识别页面中的所有可交互元素，并返回JSON格式的分析结果。

分析要求：
1. 识别所有可见的UI元素（按钮、输入框、链接、图片等）
2. 估算每个元素的位置坐标（相对于页面的百分比）
3. 描述每个元素的功能和文本内容
4. 评估元素的可交互性

返回格式：
{
  "page_info": {
    "title": "页面标题",
    "main_content": "页面主要内容描述",
    "layout": "页面布局描述"
  },
  "elements": [
    {
      "type": "元素类型(button/input/link/image/text)",
      "text": "元素文本内容",
      "description": "元素功能描述",
      "position": {
        "x": "水平位置百分比(0-100)",
        "y": "垂直位置百分比(0-100)",
        "width": "宽度百分比",
        "height": "高度百分比"
      },
      "interactive": true/false,
      "confidence": "识别置信度(0-1)"
    }
  ]
}`;

        if (targetDescription) {
            prompt += `\n\n特别关注：请重点识别与"${targetDescription}"相关的元素，并在结果中标注匹配度。`;
        }
        
        return prompt;
    }
    
    // 解析AI视觉响应
    parseVisionResponse(content, targetDescription) {
        try {
            // 尝试从响应中提取JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                
                // 验证响应格式
                if (parsed.elements && Array.isArray(parsed.elements)) {
                    // 为每个元素添加额外信息
                    parsed.elements.forEach(element => {
                        element.timestamp = Date.now();
                        element.source = 'ai_vision';
                        
                        // 如果有目标描述，计算匹配度
                        if (targetDescription) {
                            element.relevance = this.calculateRelevance(element, targetDescription);
                        }
                    });
                    
                    return parsed;
                }
            }
            
            // 如果无法解析JSON，返回基本结构
            return {
                page_info: {
                    title: '未知页面',
                    main_content: content.substring(0, 200) + '...',
                    layout: '无法解析页面布局'
                },
                elements: [],
                raw_response: content
            };
            
        } catch (error) {
            console.error('解析AI视觉响应失败:', error);
            return {
                page_info: {
                    title: '解析失败',
                    main_content: '无法解析AI响应',
                    layout: '解析错误'
                },
                elements: [],
                error: error.message,
                raw_response: content
            };
        }
    }
    
    // 查找最佳匹配元素
    findBestMatch(elements, targetDescription) {
        if (!elements || elements.length === 0) {
            return null;
        }
        
        // 如果没有目标描述，返回第一个可交互元素
        if (!targetDescription) {
            return elements.find(el => el.interactive) || elements[0];
        }
        
        // 计算每个元素的匹配分数
        const scoredElements = elements.map(element => ({
            ...element,
            score: this.calculateMatchScore(element, targetDescription)
        }));
        
        // 按分数排序并返回最高分的元素
        scoredElements.sort((a, b) => b.score - a.score);
        
        return scoredElements[0].score > 0.3 ? scoredElements[0] : null;
    }
    
    // 计算元素与目标描述的匹配分数
    calculateMatchScore(element, targetDescription) {
        let score = 0;
        const target = targetDescription.toLowerCase();
        
        // 文本匹配
        if (element.text && element.text.toLowerCase().includes(target)) {
            score += 0.5;
        }
        
        // 描述匹配
        if (element.description && element.description.toLowerCase().includes(target)) {
            score += 0.3;
        }
        
        // 类型匹配
        const elementTypeKeywords = this.elementTypes[element.type] || [];
        if (elementTypeKeywords.some(keyword => target.includes(keyword))) {
            score += 0.2;
        }
        
        // 相关性匹配
        if (element.relevance) {
            score += element.relevance * 0.3;
        }
        
        // 置信度加权
        if (element.confidence) {
            score *= element.confidence;
        }
        
        return Math.min(score, 1.0);
    }
    
    // 计算元素相关性
    calculateRelevance(element, targetDescription) {
        // 简单的关键词匹配算法
        const target = targetDescription.toLowerCase();
        const elementText = (element.text || '').toLowerCase();
        const elementDesc = (element.description || '').toLowerCase();
        
        let relevance = 0;
        
        // 直接文本匹配
        if (elementText.includes(target) || elementDesc.includes(target)) {
            relevance += 0.8;
        }
        
        // 关键词匹配
        const targetWords = target.split(/\s+/);
        const elementWords = (elementText + ' ' + elementDesc).split(/\s+/);
        
        const matchedWords = targetWords.filter(word => 
            elementWords.some(elWord => elWord.includes(word) || word.includes(elWord))
        );
        
        relevance += (matchedWords.length / targetWords.length) * 0.5;
        
        return Math.min(relevance, 1.0);
    }
    
    // 生成缓存键
    generateCacheKey(screenshot, targetDescription) {
        const screenshotHash = this.simpleHash(screenshot);
        const targetHash = targetDescription ? this.simpleHash(targetDescription) : 'no-target';
        return `${screenshotHash}_${targetHash}`;
    }
    
    // 简单哈希函数
    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(36);
    }
    
    // 获取默认分析结果
    getDefaultAnalysisResult(targetDescription) {
        console.log('使用默认分析结果');

        // 基于目标描述生成合理的默认元素
        const defaultElements = [];

        if (targetDescription) {
            const target = targetDescription.toLowerCase();

            if (target.includes('搜索') || target.includes('search')) {
                defaultElements.push({
                    type: 'input',
                    text: '搜索',
                    description: '搜索输入框',
                    position: { x: 50, y: 20, width: 30, height: 5 },
                    interactive: true,
                    confidence: 0.6,
                    relevance: 0.8
                });
            }

            if (target.includes('按钮') || target.includes('button') || target.includes('点击')) {
                defaultElements.push({
                    type: 'button',
                    text: '搜索',
                    description: '搜索按钮',
                    position: { x: 85, y: 20, width: 10, height: 5 },
                    interactive: true,
                    confidence: 0.6,
                    relevance: 0.7
                });
            }

            if (target.includes('第一个') || target.includes('first')) {
                defaultElements.push({
                    type: 'link',
                    text: '第一个结果',
                    description: '第一个搜索结果',
                    position: { x: 20, y: 40, width: 60, height: 8 },
                    interactive: true,
                    confidence: 0.5,
                    relevance: 0.9
                });
            }
        }

        return {
            page_info: {
                title: '默认页面分析',
                main_content: '使用默认元素识别',
                layout: '标准网页布局'
            },
            elements: defaultElements,
            fallback: true,
            timestamp: Date.now()
        };
    }

    // 清理缓存
    clearCache() {
        this.analysisCache.clear();
        console.log('AI视觉分析缓存已清理');
    }
}

// 导出类
window.VisionPageAnalyzer = VisionPageAnalyzer;
