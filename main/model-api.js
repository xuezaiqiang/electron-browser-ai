const axios = require('axios');

class ModelAPI {
    constructor() {
        this.config = {
            baseURL: 'https://ark.cn-beijing.volces.com/api/v3', // 豆包API地址
            model: 'doubao-seed-1-6-250615', // 默认使用支持图片的模型
            apiKey: '0bf1c076-b6e9-479a-9c55-051813ad5e4a', // API密钥
            timeout: 30000,
            maxRetries: 3,
            apiType: 'doubao', // API类型：doubao, ollama, openai
            supportsVision: true // 支持图片分析
        };
        this.currentRequest = null;
    }

    // 设置模型配置
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    // 发送数据到AI模型生成使用说明
    async generateDocumentation(pageData) {
        try {
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

            return this.parseResponse(response);
        } catch (error) {
            console.error('Error generating documentation:', error);
            return {
                success: false,
                error: `AI模型请求失败: ${error.message}`,
                timestamp: new Date().toISOString()
            };
        }
    }

    // 构建发送给AI的提示词
    buildPrompt(pageData) {
        const { html, css, scripts, screenshot } = pageData;

        let prompt = `请分析以下网页内容并生成详细的使用说明：

## 网页基本信息：
- 页面标题：${pageData.title || '未知'}
- 页面URL：${pageData.url || '未知'}

## 网页HTML结构：
\`\`\`html
${this.truncateText(html, 3000)}
\`\`\`

## CSS样式：
\`\`\`css
${this.truncateText(css, 1500)}
\`\`\`

## JavaScript代码：
\`\`\`javascript
${this.truncateText(scripts, 1500)}
\`\`\``;

        // 如果有截图且支持视觉分析，添加图片分析说明
        if (screenshot && this.config.supportsVision) {
            prompt += `

## 页面截图分析：
我已经为您提供了页面的实际截图，请结合截图中的视觉元素进行分析。请特别关注：
- 页面的整体布局和设计风格
- 可见的按钮、链接、表单等交互元素
- 图片、图标等视觉元素
- 页面的色彩搭配和视觉层次
- 用户界面的友好程度`;
        }

        prompt += `

请根据以上信息${screenshot && this.config.supportsVision ? '（包括代码和截图）' : ''}生成一份详细的网页使用说明，包括：

1. **页面概述**
   - 网站/页面的主要用途和目标用户
   - 整体设计风格和特点

2. **功能模块分析**
   - 主要功能区域的识别和说明
   - 各个界面元素的作用和功能

3. **操作指南**
   - 详细的使用步骤和操作流程
   - 常见操作的具体方法

4. **交互说明**
   - 可点击的元素和链接
   - 表单填写和提交方式
   - 导航和页面跳转逻辑

5. **注意事项**
   - 使用过程中的注意点
   - 可能遇到的问题和解决方法

6. **用户体验评价**
   - 页面的易用性分析
   - 改进建议（如有）

请用中文回答，格式清晰，内容详实易懂。`;

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

                this.currentRequest = axios.create({
                    baseURL: this.config.baseURL,
                    timeout: this.config.timeout,
                    headers: headers
                });

                const response = await this.currentRequest.post(endpoint, requestData);
                return response.data;
            } catch (error) {
                lastError = error;
                console.warn(`Request attempt ${i + 1} failed:`, error.message);

                if (i < this.config.maxRetries - 1) {
                    // 等待一段时间后重试
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
        }

        throw lastError;
    }

    // 构建请求数据
    buildRequestData(data) {
        if (this.config.apiType === 'doubao') {
            // 豆包API格式 - 支持图片分析
            const userMessage = {
                role: "user",
                content: []
            };

            // 添加文本内容
            userMessage.content.push({
                type: "text",
                text: data.prompt
            });

            // 如果有截图且模型支持视觉，添加图片内容
            if (data.screenshot && this.config.supportsVision) {
                userMessage.content.push({
                    type: "image_url",
                    image_url: {
                        url: data.screenshot
                    }
                });
            }

            return {
                model: this.config.model,
                messages: [
                    {
                        role: "system",
                        content: "你是一个专业的网页分析助手，能够分析网页内容和截图并生成详细的使用说明。你可以同时分析网页的代码结构和视觉外观。"
                    },
                    userMessage
                ]
            };
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
        if (this.currentRequest) {
            this.currentRequest.cancel('Request cancelled by user');
            this.currentRequest = null;
        }
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
