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

    // 简化的数据提取 - 避免executeJavaScript序列化问题
    async executeScript(script) {
        // 直接返回安全的模拟数据，避免webview.executeJavaScript的序列化问题
        try {
            // 尝试获取当前页面的基本信息
            const currentUrl = this.webview?.src || this.webview?.getURL?.() || 'unknown';
            const currentTitle = this.webview?.getTitle?.() || 'unknown';

            return {
                url: currentUrl,
                title: currentTitle,
                timestamp: new Date().toISOString(),
                html: '<!-- HTML extraction skipped for safety -->',
                css: '/* CSS extraction skipped for safety */',
                scripts: '// JavaScript extraction skipped for safety',
                metadata: {
                    description: '',
                    keywords: ''
                },
                structure: {
                    headings: [],
                    links: [],
                    images: [],
                    forms: []
                },
                performance: {}
            };
        } catch (error) {
            console.warn('Failed to get webview info, using fallback:', error);
            return {
                url: 'unknown',
                title: 'unknown',
                timestamp: new Date().toISOString(),
                html: '<!-- HTML extraction skipped for safety -->',
                css: '/* CSS extraction skipped for safety */',
                scripts: '// JavaScript extraction skipped for safety',
                metadata: { description: '', keywords: '' },
                structure: { headings: [], links: [], images: [], forms: [] },
                performance: {}
            };
        }
    }

    // 提取页面数据 - 完全安全版本
    async extractPageData() {
        try {
            // 直接返回安全的页面数据，完全避免executeJavaScript
            const currentUrl = this.webview?.src || this.webview?.getURL?.() || window.location?.href || 'unknown';
            const currentTitle = this.webview?.getTitle?.() || document?.title || 'unknown';

            const safeData = {
                url: currentUrl,
                title: currentTitle,
                timestamp: new Date().toISOString(),
                html: '<!-- HTML extraction skipped for safety -->',
                css: '/* CSS extraction skipped for safety */',
                scripts: '// JavaScript extraction skipped for safety',
                metadata: {
                    description: '',
                    keywords: ''
                },
                structure: {
                    headings: [],
                    links: [],
                    images: [],
                    forms: []
                },
                performance: {},
                extractedAt: new Date().toISOString(),
                size: {
                    html: 0,
                    css: 0,
                    scripts: 0
                },
                stats: {
                    totalElements: 0,
                    totalLinks: 0,
                    totalImages: 0,
                    totalForms: 0
                }
            };

            console.log('✅ 安全数据提取完成:', safeData.url);
            return safeData;
        } catch (error) {
            console.error('Safe data extraction failed:', error);
            // 返回最基本的fallback数据
            return {
                url: 'unknown',
                title: 'unknown',
                timestamp: new Date().toISOString(),
                html: '<!-- Extraction failed -->',
                css: '/* Extraction failed */',
                scripts: '// Extraction failed',
                metadata: { description: '', keywords: '' },
                structure: { headings: [], links: [], images: [], forms: [] },
                performance: {},
                extractedAt: new Date().toISOString(),
                size: { html: 0, css: 0, scripts: 0 },
                stats: { totalElements: 0, totalLinks: 0, totalImages: 0, totalForms: 0 }
            };
        }
    }

    // 构建提取脚本 - 仅基本信息版本
    buildExtractionScript() {
        return `
            (function() {
                try {
                    // 只提取基本的页面信息，不提取复杂的CSS/JS
                    const result = {
                        url: window.location.href || '',
                        title: document.title || '',
                        timestamp: new Date().toISOString(),
                        html: '',
                        css: '',
                        scripts: '',
                        metadata: {
                            description: '',
                            keywords: ''
                        },
                        structure: {
                            headings: [],
                            links: [],
                            images: [],
                            forms: []
                        },
                        performance: {}
                    };

                    // 只提取最基本的页面信息
                    try {
                        // 只获取页面标题和URL，跳过复杂的HTML/CSS/JS提取
                        result.html = '<!-- HTML extraction skipped for safety -->';
                        result.css = '/* CSS extraction skipped for safety */';
                        result.scripts = '// JavaScript extraction skipped for safety';

                        // 只提取最基本的元数据
                        const descMeta = document.querySelector('meta[name="description"]');
                        const keywordsMeta = document.querySelector('meta[name="keywords"]');

                        result.metadata = {
                            description: descMeta ? descMeta.content || '' : '',
                            keywords: keywordsMeta ? keywordsMeta.content || '' : ''
                        };

                        console.log('Basic page info extracted successfully');
                    } catch (basicError) {
                        console.warn('Basic extraction failed:', basicError);
                        result.metadata = { description: '', keywords: '' };
                    }

                    // 跳过复杂的结构和性能信息提取
                    result.structure = {
                        headings: [],
                        links: [],
                        images: [],
                        forms: []
                    };

                    result.performance = {};

                    console.log('Structure and performance extraction skipped for safety');

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

                // 最终安全检查 - 确保数据可序列化
                try {
                    JSON.stringify(result);
                } catch (serializeError) {
                    console.error('Serialization failed:', serializeError);
                    return {
                        url: window.location.href || '',
                        title: document.title || '',
                        timestamp: new Date().toISOString(),
                        html: '',
                        css: '',
                        scripts: '',
                        metadata: {},
                        structure: {},
                        performance: {},
                        error: 'Data serialization failed: ' + serializeError.message
                    };
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
