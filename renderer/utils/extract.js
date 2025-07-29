// 页面数据提取工具
class PageExtractor {
    constructor() {
        this.webview = null;
        this.extractionOptions = {
            includeHTML: true,
            includeCSS: true,
            includeJS: true,
            includeImages: false,
            includeMetadata: true,
            maxContentLength: 50000, // 最大内容长度
            excludeSelectors: [
                'script[src*="analytics"]',
                'script[src*="tracking"]',
                'iframe[src*="ads"]',
                '.advertisement',
                '.ad-banner'
            ]
        };
    }

    // 初始化提取器
    init(webview) {
        this.webview = webview;
    }

    // 设置提取选项
    setOptions(options) {
        this.extractionOptions = { ...this.extractionOptions, ...options };
    }

    // 统一的webview脚本执行方法
    async executeScript(script) {
        if (!this.webview) {
            throw new Error('WebView not initialized');
        }

        return new Promise((resolve, reject) => {
            try {
                // 尝试使用回调方式
                if (typeof this.webview.executeJavaScript === 'function') {
                    this.webview.executeJavaScript(script, false, (result) => {
                        resolve(result);
                    });
                } else {
                    reject(new Error('WebView executeJavaScript not available'));
                }
            } catch (error) {
                // 如果回调方式失败，尝试Promise方式
                if (this.webview.executeJavaScript) {
                    this.webview.executeJavaScript(script)
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(error);
                }
            }
        });
    }

    // 提取页面数据
    async extractPageData() {
        if (!this.webview) {
            throw new Error('WebView not initialized');
        }

        try {
            const extractionScript = this.buildExtractionScript();
            const result = await this.executeScript(extractionScript);

            return this.processExtractedData(result);
        } catch (error) {
            console.error('Page extraction failed:', error);
            throw new Error(`页面数据提取失败: ${error.message}`);
        }
    }

    // 构建提取脚本
    buildExtractionScript() {
        return `
            (function() {
                const options = ${JSON.stringify(this.extractionOptions)};
                const result = {
                    url: window.location.href,
                    title: document.title,
                    timestamp: new Date().toISOString(),
                    html: '',
                    css: '',
                    scripts: '',
                    metadata: {},
                    structure: {},
                    performance: {}
                };

                try {
                    // 提取HTML
                    if (options.includeHTML) {
                        result.html = document.documentElement.outerHTML;
                        
                        // 移除排除的选择器
                        if (options.excludeSelectors && options.excludeSelectors.length > 0) {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = result.html;
                            
                            options.excludeSelectors.forEach(selector => {
                                try {
                                    const elements = tempDiv.querySelectorAll(selector);
                                    elements.forEach(el => el.remove());
                                } catch (e) {
                                    console.warn('Invalid selector:', selector);
                                }
                            });
                            
                            result.html = tempDiv.innerHTML;
                        }
                    }

                    // 提取CSS
                    if (options.includeCSS) {
                        const cssRules = [];
                        
                        // 内联样式
                        const styleElements = document.querySelectorAll('style');
                        styleElements.forEach((style, index) => {
                            cssRules.push(\`/* Inline Style \${index + 1} */\`);
                            cssRules.push(style.textContent);
                        });
                        
                        // 外部样式表
                        Array.from(document.styleSheets).forEach((sheet, index) => {
                            try {
                                if (sheet.href) {
                                    cssRules.push(\`/* External Stylesheet: \${sheet.href} */\`);
                                }
                                
                                const rules = Array.from(sheet.cssRules || sheet.rules || []);
                                rules.forEach(rule => {
                                    cssRules.push(rule.cssText);
                                });
                            } catch (e) {
                                cssRules.push(\`/* Could not access stylesheet \${index + 1}: \${e.message} */\`);
                            }
                        });
                        
                        result.css = cssRules.join('\\n');
                    }

                    // 提取JavaScript
                    if (options.includeJS) {
                        const scripts = [];
                        
                        document.querySelectorAll('script').forEach((script, index) => {
                            if (script.src) {
                                scripts.push(\`// External script \${index + 1}: \${script.src}\`);
                            } else if (script.textContent.trim()) {
                                scripts.push(\`// Inline script \${index + 1}\`);
                                scripts.push(script.textContent);
                            }
                        });
                        
                        result.scripts = scripts.join('\\n\\n');
                    }

                    // 提取元数据
                    if (options.includeMetadata) {
                        result.metadata = {
                            charset: document.characterSet,
                            lang: document.documentElement.lang,
                            viewport: document.querySelector('meta[name="viewport"]')?.content,
                            description: document.querySelector('meta[name="description"]')?.content,
                            keywords: document.querySelector('meta[name="keywords"]')?.content,
                            author: document.querySelector('meta[name="author"]')?.content,
                            robots: document.querySelector('meta[name="robots"]')?.content,
                            canonical: document.querySelector('link[rel="canonical"]')?.href,
                            ogTitle: document.querySelector('meta[property="og:title"]')?.content,
                            ogDescription: document.querySelector('meta[property="og:description"]')?.content,
                            ogImage: document.querySelector('meta[property="og:image"]')?.content,
                            twitterCard: document.querySelector('meta[name="twitter:card"]')?.content
                        };
                    }

                    // 提取页面结构信息
                    result.structure = {
                        headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
                            tag: h.tagName.toLowerCase(),
                            text: h.textContent.trim(),
                            id: h.id,
                            class: h.className
                        })),
                        links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
                            text: a.textContent.trim(),
                            href: a.href,
                            target: a.target
                        })).slice(0, 50), // 限制链接数量
                        images: Array.from(document.querySelectorAll('img')).map(img => ({
                            src: img.src,
                            alt: img.alt,
                            width: img.width,
                            height: img.height
                        })).slice(0, 20), // 限制图片数量
                        forms: Array.from(document.querySelectorAll('form')).map(form => ({
                            action: form.action,
                            method: form.method,
                            inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
                                type: input.type,
                                name: input.name,
                                placeholder: input.placeholder,
                                required: input.required
                            }))
                        }))
                    };

                    // 提取性能信息
                    if (window.performance && window.performance.timing) {
                        const timing = window.performance.timing;
                        result.performance = {
                            loadTime: timing.loadEventEnd - timing.navigationStart,
                            domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
                            firstPaint: window.performance.getEntriesByType ? 
                                window.performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime : null
                        };
                    }

                    // 截断过长的内容
                    if (options.maxContentLength) {
                        if (result.html.length > options.maxContentLength) {
                            result.html = result.html.substring(0, options.maxContentLength) + '\\n<!-- Content truncated -->';
                        }
                        if (result.css.length > options.maxContentLength) {
                            result.css = result.css.substring(0, options.maxContentLength) + '\\n/* Content truncated */';
                        }
                        if (result.scripts.length > options.maxContentLength) {
                            result.scripts = result.scripts.substring(0, options.maxContentLength) + '\\n// Content truncated';
                        }
                    }

                } catch (error) {
                    result.error = error.message;
                    console.error('Extraction error:', error);
                }

                return result;
            })();
        `;
    }

    // 处理提取的数据
    processExtractedData(rawData) {
        if (rawData.error) {
            throw new Error(rawData.error);
        }

        // 安全地清理和格式化数据，只保留可序列化的字段
        const processedData = {
            url: rawData.url || '',
            title: rawData.title || '',
            timestamp: rawData.timestamp || new Date().toISOString(),
            html: rawData.html || '',
            css: rawData.css || '',
            scripts: rawData.scripts || '',
            metadata: this.sanitizeObject(rawData.metadata) || {},
            structure: this.sanitizeObject(rawData.structure) || {},
            performance: this.sanitizeObject(rawData.performance) || {},
            extractedAt: new Date().toISOString(),
            size: {
                html: rawData.html ? rawData.html.length : 0,
                css: rawData.css ? rawData.css.length : 0,
                scripts: rawData.scripts ? rawData.scripts.length : 0
            }
        };

        // 添加统计信息
        processedData.stats = this.generateStats(processedData);

        return processedData;
    }

    // 清理对象，移除不可序列化的属性
    sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        try {
            // 尝试序列化来检测问题
            JSON.stringify(obj);
            return obj;
        } catch (error) {
            console.warn('Object contains non-serializable data, cleaning:', error);

            // 递归清理对象
            const cleaned = {};
            for (const [key, value] of Object.entries(obj)) {
                try {
                    if (value === null || value === undefined) {
                        cleaned[key] = value;
                    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                        cleaned[key] = value;
                    } else if (Array.isArray(value)) {
                        cleaned[key] = value.map(item => this.sanitizeObject(item));
                    } else if (typeof value === 'object') {
                        cleaned[key] = this.sanitizeObject(value);
                    }
                    // 跳过函数、Date对象等不可序列化的类型
                } catch (e) {
                    console.warn(`Skipping non-serializable property: ${key}`);
                }
            }
            return cleaned;
        }
    }

    // 生成统计信息
    generateStats(data) {
        const stats = {
            totalElements: 0,
            totalText: 0,
            headingCount: data.structure.headings ? data.structure.headings.length : 0,
            linkCount: data.structure.links ? data.structure.links.length : 0,
            imageCount: data.structure.images ? data.structure.images.length : 0,
            formCount: data.structure.forms ? data.structure.forms.length : 0
        };

        // 计算HTML中的元素数量
        if (data.html) {
            const elementMatches = data.html.match(/<[^>]+>/g);
            stats.totalElements = elementMatches ? elementMatches.length : 0;
            
            // 提取纯文本长度
            const textContent = data.html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            stats.totalText = textContent.length;
        }

        return stats;
    }

    // 提取特定元素的数据
    async extractSpecificElements(selectors) {
        if (!this.webview) {
            throw new Error('WebView not initialized');
        }

        const script = `
            (function() {
                const selectors = ${JSON.stringify(selectors)};
                const result = {};
                
                selectors.forEach(selector => {
                    try {
                        const elements = document.querySelectorAll(selector);
                        result[selector] = Array.from(elements).map(el => ({
                            tagName: el.tagName.toLowerCase(),
                            textContent: el.textContent.trim(),
                            innerHTML: el.innerHTML,
                            attributes: Array.from(el.attributes).reduce((attrs, attr) => {
                                attrs[attr.name] = attr.value;
                                return attrs;
                            }, {}),
                            boundingRect: el.getBoundingClientRect()
                        }));
                    } catch (error) {
                        result[selector] = { error: error.message };
                    }
                });
                
                return result;
            })();
        `;

        try {
            return await this.executeScript(script);
        } catch (error) {
            console.error('Specific element extraction failed:', error);
            throw new Error(`特定元素提取失败: ${error.message}`);
        }
    }

    // 提取页面文本内容
    async extractTextContent() {
        if (!this.webview) {
            throw new Error('WebView not initialized');
        }

        const script = `
            (function() {
                // 移除脚本和样式标签
                const clonedDoc = document.cloneNode(true);
                const scripts = clonedDoc.querySelectorAll('script, style, noscript');
                scripts.forEach(el => el.remove());
                
                // 提取纯文本
                const textContent = clonedDoc.body ? clonedDoc.body.textContent : clonedDoc.textContent;
                
                return {
                    fullText: textContent.replace(/\\s+/g, ' ').trim(),
                    wordCount: textContent.split(/\\s+/).filter(word => word.length > 0).length,
                    paragraphs: Array.from(document.querySelectorAll('p')).map(p => p.textContent.trim()).filter(text => text.length > 0)
                };
            })();
        `;

        try {
            return await this.executeScript(script);
        } catch (error) {
            console.error('Text content extraction failed:', error);
            throw new Error(`文本内容提取失败: ${error.message}`);
        }
    }

    // 检查页面是否完全加载
    async isPageLoaded() {
        if (!this.webview) {
            return false;
        }

        try {
            const result = await this.executeScript(`
                document.readyState === 'complete' &&
                window.performance &&
                window.performance.timing.loadEventEnd > 0
            `);
            return result;
        } catch (error) {
            console.error('Page load check failed:', error);
            return false;
        }
    }
}

// 导出提取器实例
window.pageExtractor = new PageExtractor();
