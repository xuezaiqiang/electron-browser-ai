const axios = require('axios');

class ModelAPI {
    constructor() {
        this.config = {
            baseURL: 'https://ark.cn-beijing.volces.com/api/v3', // 豆包API地址
            model: 'doubao-seed-1-6-250615', // 默认使用支持图片的模型
            apiKey: '0bf1c076-b6e9-479a-9c55-051813ad5e4a', // API密钥
            timeout: 60000, // 增加到60秒，处理大图片时需要更长时间
            maxRetries: 3,
            apiType: 'doubao', // API类型：doubao, ollama, openai
            supportsVision: true // 支持图片分析
        };
        this.currentRequest = null;
        this.abortController = null;
    }

    // 设置模型配置
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    // 发送数据到AI模型生成使用说明
    async generateDocumentation(pageData) {
        try {
            // 取消之前的请求（如果存在）
            this.cancelCurrentRequest();

            // 识别请求类型
            const requestType = pageData.chatMode ? 'AI聊天' : '页面分析';
            const hasScreenshot = pageData.screenshot ? '有截图' : '无截图';
            const hasCustomPrompt = pageData.customPrompt ? '自定义提示词' : '默认提示词';

            console.log(`AI API请求 - 类型: ${requestType}, 截图: ${hasScreenshot}, 提示词: ${hasCustomPrompt}`);

            const prompt = this.buildPrompt(pageData);

            const response = await this.sendRequest({
                model: this.config.model,
                prompt: prompt,
                screenshot: pageData.screenshot, // 传递截图数据
                stream: false,
                options: {
                    temperature: 0.7,
                    max_tokens: 2000
                }
            });

            const result = this.parseResponse(response);
            console.log(`AI API响应 - 类型: ${requestType}, 成功: ${result.success}`);

            return result;
        } catch (error) {
            const requestType = pageData.chatMode ? 'AI聊天' : '页面分析';
            console.error(`AI API错误 - 类型: ${requestType}:`, error);

            // 根据错误类型提供更友好的错误信息
            let errorMessage = error.message;
            if (error.message.includes('timeout')) {
                if (pageData.chatMode) {
                    errorMessage = 'AI聊天响应超时，请重试';
                } else {
                    errorMessage = '页面分析超时，可能是图片过大或网络较慢，请重试';
                }
            } else if (error.message.includes('Network Error')) {
                errorMessage = '网络连接错误，请检查网络设置';
            } else if (error.message.includes('403')) {
                errorMessage = 'API访问被拒绝，请检查API密钥';
            } else if (error.message.includes('429')) {
                errorMessage = 'API请求频率过高，请稍后重试';
            }

            return {
                success: false,
                error: errorMessage,
                originalError: error.message,
                requestType: requestType,
                timestamp: new Date().toISOString()
            };
        }
    }

    // 构建发送给AI的提示词 - 主要基于截图分析
    buildPrompt(pageData) {
        const { screenshot, customPrompt, chatMode } = pageData;

        // 如果是聊天模式且有自定义提示词，直接使用（AI对话框功能）
        if (chatMode && customPrompt) {
            console.log('AI聊天模式：使用自定义提示词');
            return customPrompt;
        }

        // 如果是页面分析模式且有自定义提示词，也直接使用
        if (!chatMode && customPrompt) {
            console.log('页面分析模式：使用自定义提示词');
            return customPrompt;
        }

        let prompt = `请分析以下网页并生成详细的使用说明：

## 网页基本信息：
- 页面标题：${pageData.title || '未知'}
- 页面URL：${pageData.url || '未知'}
- 页面描述：${pageData.metadata?.description || '无'}`;

        // 如果有截图且支持视觉分析，强调基于截图的分析
        if (screenshot && this.config.supportsVision) {
            prompt += `

## 📸 页面截图分析（主要分析方式）：
我已经为您提供了页面的完整截图，请主要基于截图进行分析。请重点关注：

### 视觉布局分析
- 页面的整体布局结构和设计风格
- 主要内容区域的划分和层次
- 导航栏、侧边栏、主内容区的布局

### 交互元素识别
- 所有可见的按钮、链接、表单元素
- 菜单、下拉框、输入框等交互组件
- 图标、标签、提示信息等引导元素

### 视觉设计评估
- 色彩搭配和视觉层次
- 字体大小和可读性
- 图片、图标的使用效果
- 整体的用户界面友好程度

### 功能区域识别
- 主要功能模块的位置和作用
- 搜索、登录、购物车等常见功能
- 内容展示区域和操作区域的分布`;
        } else {
            prompt += `

## 📝 基本信息分析：
由于截图功能暂时不可用，将基于页面的基本信息进行分析。`;
        }

        prompt += `

请根据${screenshot && this.config.supportsVision ? '截图' : '基本信息'}生成一份详细的网页使用说明，包括：

## 1. 🎯 页面概述
- 网站/页面的主要用途和目标用户
- 页面类型（如：电商、新闻、工具、社交等）
- 整体设计风格和特点

## 2. 🔧 功能模块说明
- 主要功能区域的识别和详细说明
- 各个界面元素的具体作用和功能
- 重要按钮和链接的位置和用途

## 3. 📋 操作指南
- 详细的使用步骤和操作流程
- 常见任务的具体操作方法
- 从进入页面到完成目标的完整路径

## 4. 🖱️ 交互说明
- 所有可点击元素的说明
- 表单填写和提交的详细步骤
- 导航方式和页面跳转逻辑
- 快捷键或特殊操作方式

## 5. ⚠️ 注意事项
- 使用过程中需要注意的要点
- 可能遇到的问题和解决方法
- 安全性和隐私相关的提醒

## 6. 💡 用户体验评价
- 页面易用性的客观评价
- 设计优点和可能的改进建议
- 对不同用户群体的适用性分析

请用中文回答，格式清晰美观，内容详实易懂，重点突出实用性。`;

        return prompt;
    }

    // 发送请求到AI模型
    async sendRequest(data) {
        let lastError;

        for (let i = 0; i < this.config.maxRetries; i++) {
            try {
                // 根据API类型构建不同的请求
                const requestData = this.buildRequestData(data);
                const headers = this.buildHeaders();
                const endpoint = this.getEndpoint();

                // 创建 AbortController 用于取消请求
                this.abortController = new AbortController();

                this.currentRequest = axios.create({
                    baseURL: this.config.baseURL,
                    timeout: this.config.timeout,
                    headers: headers
                });

                console.log('Sending request to:', `${this.config.baseURL}${endpoint}`);
                console.log('Request data size:', JSON.stringify(requestData).length, 'characters');

                const response = await this.currentRequest.post(endpoint, requestData, {
                    signal: this.abortController.signal
                });
                console.log('Response received:', response.status);

                // 清理 AbortController
                this.abortController = null;
                this.currentRequest = null;

                return response.data;
            } catch (error) {
                lastError = error;

                // 检查是否是用户取消的请求
                if (error.name === 'AbortError' || error.code === 'ABORT_ERR') {
                    console.log('请求被用户取消');
                    throw new Error('请求已被取消');
                }

                console.error(`Request attempt ${i + 1} failed:`);
                console.error('Status:', error.response?.status);
                console.error('Status text:', error.response?.statusText);
                console.error('Response data:', error.response?.data);

                if (error.response?.status === 400) {
                    console.error('Bad Request (400) - 请求格式可能有问题');
                    if (error.response?.data?.error) {
                        console.error('Error details:', error.response.data.error);
                    }
                } else if (error.response?.status === 401) {
                    console.error('Unauthorized (401) - API密钥可能无效');
                } else if (error.response?.status === 403) {
                    console.error('Forbidden (403) - 访问被拒绝');
                }

                if (i < this.config.maxRetries - 1) {
                    // 等待一段时间后重试
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
        }

        // 构建详细的错误信息
        let errorMessage = 'AI模型请求失败';
        if (lastError.response?.status === 400) {
            errorMessage += ': 请求格式错误 (400)';
            if (lastError.response?.data?.error?.message) {
                errorMessage += ` - ${lastError.response.data.error.message}`;
            }
        } else if (lastError.response?.status === 401) {
            errorMessage += ': API密钥无效 (401)';
        } else if (lastError.response?.status === 403) {
            errorMessage += ': 访问被拒绝 (403)';
        } else if (lastError.response?.status === 429) {
            errorMessage += ': 请求频率过高 (429)';
        } else if (lastError.response?.status >= 500) {
            errorMessage += ': 服务器错误 (5xx)';
        } else {
            errorMessage += `: ${lastError.message}`;
        }

        // 清理资源
        this.abortController = null;
        this.currentRequest = null;

        throw new Error(errorMessage);
    }

    // 构建请求数据
    buildRequestData(data) {
        if (this.config.apiType === 'doubao') {
            // 豆包API格式 - 支持图片分析
            let userMessage;

            // 如果有截图且模型支持视觉，使用多模态格式
            if (data.screenshot && this.config.supportsVision) {
                console.log('Building multimodal request with screenshot, size:', data.screenshot.length);
                userMessage = {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: data.prompt
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: data.screenshot
                            }
                        }
                    ]
                };
            } else {
                // 纯文本格式
                console.log('Building text-only request');
                userMessage = {
                    role: "user",
                    content: data.prompt
                };
            }

            const requestData = {
                model: this.config.model,
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的网页分析助手，能够分析网页内容和截图并生成详细的使用说明。"
                    },
                    userMessage
                ],
                max_tokens: 2000,
                temperature: 0.7
            };

            console.log('Request data prepared:', {
                model: requestData.model,
                messageCount: requestData.messages.length,
                hasScreenshot: !!(data.screenshot && this.config.supportsVision),
                userMessageType: Array.isArray(userMessage.content) ? 'multimodal' : 'text'
            });

            return requestData;
        } else if (this.config.apiType === 'ollama') {
            // Ollama格式
            return {
                model: this.config.model,
                prompt: data.prompt,
                stream: false,
                options: data.options || {}
            };
        } else {
            // OpenAI格式
            return {
                model: this.config.model,
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的网页分析助手。"
                    },
                    {
                        role: "user",
                        content: data.prompt
                    }
                ],
                temperature: data.options?.temperature || 0.7,
                max_tokens: data.options?.max_tokens || 2000
            };
        }
    }

    // 构建请求头
    buildHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (this.config.apiType === 'doubao' && this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        } else if (this.config.apiType === 'openai' && this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }

        return headers;
    }

    // 获取API端点
    getEndpoint() {
        if (this.config.apiType === 'doubao') {
            return '/chat/completions';
        } else if (this.config.apiType === 'ollama') {
            return '/api/generate';
        } else {
            return '/chat/completions';
        }
    }

    // 解析AI响应
    parseResponse(response) {
        try {
            let content = '';
            let model = this.config.model;

            if (this.config.apiType === 'doubao') {
                // 豆包API响应格式
                if (response.choices && response.choices.length > 0) {
                    content = response.choices[0].message.content;
                    model = response.model || this.config.model;
                } else {
                    throw new Error('Invalid doubao response format');
                }
            } else if (this.config.apiType === 'ollama') {
                // Ollama响应格式
                if (response.response) {
                    content = response.response;
                    model = response.model || this.config.model;
                } else {
                    throw new Error('Invalid ollama response format');
                }
            } else {
                // OpenAI格式
                if (response.choices && response.choices.length > 0) {
                    content = response.choices[0].message.content;
                    model = response.model || this.config.model;
                } else {
                    throw new Error('Invalid openai response format');
                }
            }

            return {
                success: true,
                documentation: content,
                model: model,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error parsing response:', error);
            return {
                success: false,
                error: 'Failed to parse AI response: ' + error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // 截断文本以避免超出token限制
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text || '';
        }
        return text.substring(0, maxLength) + '\n... (内容已截断)';
    }

    // 取消当前请求
    cancelCurrentRequest() {
        if (this.abortController) {
            try {
                this.abortController.abort('Request cancelled by user');
                console.log('已取消当前AI请求');
            } catch (error) {
                console.warn('取消请求时出错:', error.message);
            }
            this.abortController = null;
        }
        this.currentRequest = null;
    }

    // 测试连接
    async testConnection() {
        try {
            if (this.config.apiType === 'doubao') {
                // 豆包API测试连接 - 发送一个简单的测试请求
                const testData = {
                    model: this.config.model,
                    messages: [
                        {
                            role: "user",
                            content: "你好"
                        }
                    ]
                };

                const headers = this.buildHeaders();
                const response = await axios.post(
                    `${this.config.baseURL}/chat/completions`,
                    testData,
                    {
                        headers: headers,
                        timeout: 10000
                    }
                );

                return {
                    success: true,
                    models: [{ name: this.config.model }],
                    message: '豆包API连接成功'
                };
            } else if (this.config.apiType === 'ollama') {
                // Ollama测试连接
                const response = await axios.get(`${this.config.baseURL}/api/tags`, {
                    timeout: 5000
                });
                return {
                    success: true,
                    models: response.data.models || []
                };
            } else {
                // OpenAI格式测试连接
                const headers = this.buildHeaders();
                const response = await axios.get(`${this.config.baseURL}/models`, {
                    headers: headers,
                    timeout: 5000
                });
                return {
                    success: true,
                    models: response.data.data || []
                };
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            };
        }
    }

    // 获取可用模型列表
    async getAvailableModels() {
        try {
            if (this.config.apiType === 'doubao') {
                // 豆包API只返回当前配置的模型
                return [{ name: this.config.model }];
            } else if (this.config.apiType === 'ollama') {
                const response = await axios.get(`${this.config.baseURL}/api/tags`);
                return response.data.models || [];
            } else {
                // OpenAI格式
                const headers = this.buildHeaders();
                const response = await axios.get(`${this.config.baseURL}/models`, {
                    headers: headers
                });
                return response.data.data || [];
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            return [];
        }
    }
}

module.exports = ModelAPI;
