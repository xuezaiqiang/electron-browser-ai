// 🎯 智能元素定位器 - 多策略元素查找
class SmartElementFinder {
    constructor() {
        this.strategies = [
            'id',           // ID选择器
            'className',    // 类名选择器
            'xpath',        // XPath选择器
            'css',          // CSS选择器
            'text',         // 文本内容匹配
            'placeholder',  // 占位符匹配
            'label',        // 标签关联
            'attribute',    // 属性匹配
            'position',     // 位置定位
            'semantic'      // 语义理解
        ];
        
        this.commonSelectors = {
            // 搜索相关
            searchBox: [
                '#kw', '#q', '#search', '#searchInput',
                'input[name="q"]', 'input[name="wd"]', 'input[name="search"]',
                'input[type="search"]', 'input[placeholder*="搜索"]',
                '.search-input', '.search-box', '[class*="search"]'
            ],
            searchButton: [
                '#su', '#search-btn', '.search-btn', '.btn-search',
                'button[type="submit"]', 'input[type="submit"]',
                'button:contains("搜索")', 'button:contains("Search")'
            ],
            
            // 登录相关
            username: [
                '#username', '#user', '#email', '#login',
                'input[name="username"]', 'input[name="user"]', 'input[name="email"]',
                'input[type="email"]', 'input[placeholder*="用户名"]', 'input[placeholder*="邮箱"]'
            ],
            password: [
                '#password', '#pwd', '#pass',
                'input[name="password"]', 'input[name="pwd"]', 'input[type="password"]'
            ],
            loginButton: [
                '#login', '#signin', '.login-btn', '.signin-btn',
                'button[type="submit"]', 'button:contains("登录")', 'button:contains("Login")'
            ],
            
            // 表单相关
            submitButton: [
                'button[type="submit"]', 'input[type="submit"]',
                '.submit-btn', '.btn-submit', '#submit'
            ],
            
            // 导航相关
            nextButton: [
                '.next', '.btn-next', '#next', 'button:contains("下一页")',
                'button:contains("Next")', 'a:contains("下一页")'
            ],
            prevButton: [
                '.prev', '.btn-prev', '#prev', 'button:contains("上一页")',
                'button:contains("Previous")', 'a:contains("上一页")'
            ]
        };
    }
    
    // 主要的元素查找方法
    async findElement(webview, description, context = {}) {
        console.log(`查找元素: ${description}`);
        
        // 1. 尝试预定义选择器
        const predefinedResult = await this.tryPredefinedSelectors(webview, description);
        if (predefinedResult.found) {
            return predefinedResult;
        }
        
        // 2. 尝试智能解析
        const smartResult = await this.trySmartParsing(webview, description, context);
        if (smartResult.found) {
            return smartResult;
        }
        
        // 3. 尝试文本匹配
        const textResult = await this.tryTextMatching(webview, description);
        if (textResult.found) {
            return textResult;
        }
        
        // 4. 尝试语义匹配
        const semanticResult = await this.trySemanticMatching(webview, description);
        if (semanticResult.found) {
            return semanticResult;
        }
        
        return {
            found: false,
            error: `无法找到元素: ${description}`,
            suggestions: await this.getSuggestions(webview, description)
        };
    }
    
    // 尝试预定义选择器
    async tryPredefinedSelectors(webview, description) {
        const normalizedDesc = description.toLowerCase().trim();
        
        // 匹配常见元素类型
        for (const [type, selectors] of Object.entries(this.commonSelectors)) {
            if (this.matchesElementType(normalizedDesc, type)) {
                console.log(`尝试预定义选择器类型: ${type}`);
                
                for (const selector of selectors) {
                    const result = await this.testSelector(webview, selector);
                    if (result.found) {
                        return {
                            ...result,
                            strategy: 'predefined',
                            elementType: type
                        };
                    }
                }
            }
        }
        
        return { found: false };
    }
    
    // 匹配元素类型
    matchesElementType(description, type) {
        const typeKeywords = {
            searchBox: ['搜索框', '搜索', 'search', '查找'],
            searchButton: ['搜索按钮', '搜索', 'search button', '查找按钮'],
            username: ['用户名', '账号', 'username', 'user', '邮箱', 'email'],
            password: ['密码', 'password', 'pwd'],
            loginButton: ['登录', '登录按钮', 'login', 'signin', '登入'],
            submitButton: ['提交', '提交按钮', 'submit', '确认'],
            nextButton: ['下一页', '下一步', 'next', '继续'],
            prevButton: ['上一页', '上一步', 'previous', 'prev', '返回']
        };
        
        const keywords = typeKeywords[type] || [];
        return keywords.some(keyword => description.includes(keyword));
    }
    
    // 测试选择器
    async testSelector(webview, selector) {
        return new Promise((resolve) => {
            const script = `
                (function() {
                    try {
                        const element = document.querySelector('${selector}');
                        if (element && element.offsetParent !== null) {
                            const rect = element.getBoundingClientRect();
                            return {
                                found: true,
                                selector: '${selector}',
                                tagName: element.tagName,
                                text: element.textContent?.trim() || '',
                                value: element.value || '',
                                rect: {
                                    x: rect.x,
                                    y: rect.y,
                                    width: rect.width,
                                    height: rect.height
                                }
                            };
                        }
                        return { found: false };
                    } catch (e) {
                        return { found: false, error: e.message };
                    }
                })();
            `;
            
            try {
                webview.executeJavaScript(script, (result) => {
                    try {
                        // 确保结果可以序列化
                        const safeResult = result ? {
                            found: !!result.found,
                            selector: result.selector || selector,
                            element: result.element ? {
                                tagName: result.element.tagName,
                                text: result.element.text || result.element.textContent,
                                id: result.element.id,
                                className: result.element.className
                            } : null,
                            confidence: result.confidence || 0.5
                        } : { found: false };

                        resolve(safeResult);
                    } catch (serializationError) {
                        console.warn('结果序列化失败:', serializationError);
                        resolve({ found: false, error: 'serialization_failed' });
                    }
                });
            } catch (error) {
                resolve({ found: false, error: error.message });
            }
        });
    }
    
    // 智能解析描述
    async trySmartParsing(webview, description, context) {
        // 提取可能的选择器信息
        const selectorHints = this.extractSelectorHints(description);
        
        for (const hint of selectorHints) {
            const result = await this.testSelector(webview, hint);
            if (result.found) {
                return {
                    ...result,
                    strategy: 'smart_parsing'
                };
            }
        }
        
        return { found: false };
    }
    
    // 提取选择器提示
    extractSelectorHints(description) {
        const hints = [];
        
        // ID提示
        const idMatch = description.match(/id[为是](.+?)[\s,，]/);
        if (idMatch) {
            hints.push(`#${idMatch[1].trim()}`);
        }
        
        // 类名提示
        const classMatch = description.match(/class[为是](.+?)[\s,，]/);
        if (classMatch) {
            hints.push(`.${classMatch[1].trim()}`);
        }
        
        // 文本提示
        const textMatch = description.match(/文本[为是包含](.+?)[\s,，]/);
        if (textMatch) {
            const text = textMatch[1].trim();
            hints.push(`*:contains("${text}")`);
        }
        
        // 属性提示
        const attrMatch = description.match(/(.+?)属性[为是](.+?)[\s,，]/);
        if (attrMatch) {
            const attr = attrMatch[1].trim();
            const value = attrMatch[2].trim();
            hints.push(`[${attr}="${value}"]`);
        }
        
        return hints;
    }
    
    // 尝试文本匹配
    async tryTextMatching(webview, description) {
        // 提取可能的文本内容
        const textHints = this.extractTextHints(description);
        
        for (const text of textHints) {
            const result = await this.findByText(webview, text);
            if (result.found) {
                return {
                    ...result,
                    strategy: 'text_matching'
                };
            }
        }
        
        return { found: false };
    }
    
    // 提取文本提示
    extractTextHints(description) {
        const hints = [];
        
        // 直接文本匹配
        const quotedText = description.match(/["'"](.+?)["'"]/);
        if (quotedText) {
            hints.push(quotedText[1]);
        }
        
        // 按钮文本
        const buttonText = description.match(/按钮(.+?)[\s,，]?/);
        if (buttonText) {
            hints.push(buttonText[1].trim());
        }
        
        // 链接文本
        const linkText = description.match(/链接(.+?)[\s,，]?/);
        if (linkText) {
            hints.push(linkText[1].trim());
        }
        
        return hints;
    }
    
    // 通过文本查找元素
    async findByText(webview, text) {
        return new Promise((resolve) => {
            const script = `
                (function() {
                    try {
                        // 查找包含指定文本的元素
                        const xpath = "//*[contains(text(), '${text}')]";
                        const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                        const element = result.singleNodeValue;
                        
                        if (element && element.offsetParent !== null) {
                            const rect = element.getBoundingClientRect();
                            return {
                                found: true,
                                selector: \`xpath://*[contains(text(), '${text}')]\`,
                                tagName: element.tagName,
                                text: element.textContent?.trim() || '',
                                rect: {
                                    x: rect.x,
                                    y: rect.y,
                                    width: rect.width,
                                    height: rect.height
                                }
                            };
                        }
                        
                        return { found: false };
                    } catch (e) {
                        return { found: false, error: e.message };
                    }
                })();
            `;
            
            try {
                webview.executeJavaScript(script, (result) => {
                    resolve(result || { found: false });
                });
            } catch (error) {
                resolve({ found: false, error: error.message });
            }
        });
    }
    
    // 尝试语义匹配
    async trySemanticMatching(webview, description) {
        // 这里可以集成更高级的AI语义理解
        // 暂时返回未找到
        return { found: false };
    }
    
    // 获取建议
    async getSuggestions(webview, description) {
        return new Promise((resolve) => {
            const script = `
                (function() {
                    try {
                        const suggestions = [];
                        
                        // 获取所有可交互元素
                        const interactiveElements = document.querySelectorAll(
                            'button, input, a, select, textarea, [onclick], [role="button"]'
                        );
                        
                        for (let i = 0; i < Math.min(interactiveElements.length, 10); i++) {
                            const el = interactiveElements[i];
                            if (el.offsetParent !== null) {
                                suggestions.push({
                                    tagName: el.tagName,
                                    text: el.textContent?.trim().substring(0, 50) || '',
                                    id: el.id || '',
                                    className: el.className || '',
                                    type: el.type || ''
                                });
                            }
                        }
                        
                        return suggestions;
                    } catch (e) {
                        return [];
                    }
                })();
            `;
            
            try {
                webview.executeJavaScript(script, (result) => {
                    resolve(result || []);
                });
            } catch (error) {
                resolve([]);
            }
        });
    }
}

// 导出类
window.SmartElementFinder = SmartElementFinder;
