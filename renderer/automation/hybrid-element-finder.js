// 🎯 混合智能元素定位器 - 结合HTML分析和AI视觉识别
class HybridElementFinder {
    constructor() {
        this.htmlFinder = null; // SmartElementFinder实例
        this.visionAnalyzer = null; // VisionPageAnalyzer实例
        this.strategies = [
            'html_priority',    // HTML优先策略
            'vision_priority',  // 视觉优先策略
            'hybrid_fusion',    // 混合融合策略
            'fallback_chain'    // 回退链策略
        ];
        this.currentStrategy = 'hybrid_fusion';
        this.confidenceThreshold = 0.7;
        this.findHistory = [];
    }
    
    // 初始化混合定位器
    init(htmlFinder, visionAnalyzer) {
        this.htmlFinder = htmlFinder;
        this.visionAnalyzer = visionAnalyzer;
        console.log('混合智能元素定位器初始化完成');
    }
    
    // 主要的元素查找方法
    async findElement(webview, description, options = {}) {
        console.log(`混合定位器查找元素: ${description}`);
        
        const startTime = Date.now();
        const strategy = options.strategy || this.currentStrategy;
        
        try {
            let result;
            
            switch (strategy) {
                case 'html_priority':
                    result = await this.htmlPriorityFind(webview, description, options);
                    break;
                case 'vision_priority':
                    result = await this.visionPriorityFind(webview, description, options);
                    break;
                case 'hybrid_fusion':
                    result = await this.hybridFusionFind(webview, description, options);
                    break;
                case 'fallback_chain':
                    result = await this.fallbackChainFind(webview, description, options);
                    break;
                default:
                    result = await this.hybridFusionFind(webview, description, options);
            }
            
            // 记录查找历史
            this.recordFindHistory(description, result, strategy, Date.now() - startTime);
            
            return result;
            
        } catch (error) {
            console.error('混合元素定位失败:', error);
            return {
                found: false,
                error: error.message,
                strategy: strategy,
                duration: Date.now() - startTime
            };
        }
    }
    
    // HTML优先策略
    async htmlPriorityFind(webview, description, options) {
        console.log('使用HTML优先策略');
        
        // 1. 首先尝试HTML分析
        if (this.htmlFinder) {
            const htmlResult = await this.htmlFinder.findElement(webview, description, options);
            
            if (htmlResult.found && htmlResult.confidence > this.confidenceThreshold) {
                return {
                    ...htmlResult,
                    strategy: 'html_priority',
                    method: 'html_analysis'
                };
            }
        }
        
        // 2. HTML失败时使用视觉分析作为补充
        if (this.visionAnalyzer) {
            const visionResult = await this.visionAnalyzer.findElement(webview, description);
            
            if (visionResult.found) {
                return {
                    ...visionResult,
                    strategy: 'html_priority',
                    method: 'vision_fallback'
                };
            }
        }
        
        return {
            found: false,
            strategy: 'html_priority',
            error: 'HTML和视觉分析都未找到元素'
        };
    }
    
    // 视觉优先策略
    async visionPriorityFind(webview, description, options) {
        console.log('使用视觉优先策略');
        
        // 1. 首先尝试视觉分析
        if (this.visionAnalyzer) {
            const visionResult = await this.visionAnalyzer.findElement(webview, description);
            
            if (visionResult.found && visionResult.confidence > this.confidenceThreshold) {
                return {
                    ...visionResult,
                    strategy: 'vision_priority',
                    method: 'vision_analysis'
                };
            }
        }
        
        // 2. 视觉失败时使用HTML分析作为补充
        if (this.htmlFinder) {
            const htmlResult = await this.htmlFinder.findElement(webview, description, options);
            
            if (htmlResult.found) {
                return {
                    ...htmlResult,
                    strategy: 'vision_priority',
                    method: 'html_fallback'
                };
            }
        }
        
        return {
            found: false,
            strategy: 'vision_priority',
            error: '视觉和HTML分析都未找到元素'
        };
    }
    
    // 混合融合策略
    async hybridFusionFind(webview, description, options) {
        console.log('使用混合融合策略');
        
        const results = [];
        
        // 1. 并行执行HTML和视觉分析
        const promises = [];
        
        if (this.htmlFinder) {
            promises.push(
                this.htmlFinder.findElement(webview, description, options)
                    .then(result => ({
                        type: 'html',
                        result: result,
                        success: true
                    }))
                    .catch(error => ({
                        type: 'html',
                        error: error.message,
                        success: false
                    }))
            );
        }

        if (this.visionAnalyzer) {
            promises.push(
                this.visionAnalyzer.findElement(webview, description)
                    .then(result => ({
                        type: 'vision',
                        result: result,
                        success: true
                    }))
                    .catch(error => ({
                        type: 'vision',
                        error: error.message,
                        success: false
                    }))
            );
        }
        
        const analysisResults = await Promise.all(promises);
        
        // 2. 收集有效结果
        for (const analysis of analysisResults) {
            if (analysis.success && analysis.result && analysis.result.found) {
                results.push({
                    ...analysis.result,
                    source: analysis.type
                });
            } else if (!analysis.success) {
                console.warn(`${analysis.type} 分析失败:`, analysis.error);
            }
        }
        
        // 3. 如果没有找到任何结果
        if (results.length === 0) {
            return {
                found: false,
                strategy: 'hybrid_fusion',
                error: '所有分析方法都未找到元素',
                analysisResults: analysisResults
            };
        }
        
        // 4. 融合多个结果
        const fusedResult = this.fuseResults(results, description);
        
        return {
            ...fusedResult,
            strategy: 'hybrid_fusion',
            method: 'fusion',
            sourceResults: results
        };
    }
    
    // 回退链策略
    async fallbackChainFind(webview, description, options) {
        console.log('使用回退链策略');
        
        const methods = [
            { name: 'html_predefined', fn: () => this.htmlFinder?.tryPredefinedSelectors(webview, description) },
            { name: 'html_smart', fn: () => this.htmlFinder?.trySmartParsing(webview, description, options) },
            { name: 'vision_analysis', fn: () => this.visionAnalyzer?.findElement(webview, description) },
            { name: 'html_text', fn: () => this.htmlFinder?.tryTextMatching(webview, description) },
            { name: 'html_semantic', fn: () => this.htmlFinder?.trySemanticMatching(webview, description) }
        ];
        
        for (const method of methods) {
            if (!method.fn) continue;
            
            try {
                console.log(`尝试方法: ${method.name}`);
                const result = await method.fn();
                
                if (result && result.found) {
                    return {
                        ...result,
                        strategy: 'fallback_chain',
                        method: method.name
                    };
                }
            } catch (error) {
                console.log(`方法 ${method.name} 失败:`, error.message);
                continue;
            }
        }
        
        return {
            found: false,
            strategy: 'fallback_chain',
            error: '所有回退方法都失败了'
        };
    }
    
    // 融合多个分析结果
    fuseResults(results, description) {
        if (results.length === 1) {
            return results[0];
        }
        
        // 按置信度排序
        results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
        
        const bestResult = results[0];
        
        // 如果最佳结果置信度很高，直接使用
        if (bestResult.confidence > 0.8) {
            return bestResult;
        }
        
        // 否则尝试交叉验证
        const htmlResults = results.filter(r => r.source === 'html');
        const visionResults = results.filter(r => r.source === 'vision');
        
        // 如果HTML和视觉都找到了结果，优先选择HTML结果（更精确）
        if (htmlResults.length > 0 && visionResults.length > 0) {
            const htmlResult = htmlResults[0];
            const visionResult = visionResults[0];
            
            // 增强HTML结果的置信度（因为有视觉验证）
            return {
                ...htmlResult,
                confidence: Math.min((htmlResult.confidence || 0.7) + 0.2, 1.0),
                verified: true,
                visionSupport: visionResult
            };
        }
        
        return bestResult;
    }
    
    // 获取元素的精确位置信息
    async getElementPosition(webview, element) {
        if (!element || !element.selector) {
            return null;
        }
        
        return new Promise((resolve) => {
            const script = `
                (function() {
                    try {
                        const el = document.querySelector('${element.selector}');
                        if (el) {
                            const rect = el.getBoundingClientRect();
                            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
                            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
                            
                            return {
                                x: rect.left + scrollX,
                                y: rect.top + scrollY,
                                width: rect.width,
                                height: rect.height,
                                centerX: rect.left + scrollX + rect.width / 2,
                                centerY: rect.top + scrollY + rect.height / 2,
                                visible: rect.width > 0 && rect.height > 0,
                                inViewport: rect.top >= 0 && rect.left >= 0 && 
                                           rect.bottom <= window.innerHeight && 
                                           rect.right <= window.innerWidth
                            };
                        }
                        return null;
                    } catch (e) {
                        return { error: e.message };
                    }
                })();
            `;
            
            webview.executeJavaScript(script, (result) => {
                resolve(result);
            });
        });
    }
    
    // 验证元素是否仍然存在
    async verifyElement(webview, element) {
        if (!element || !element.selector) {
            return false;
        }
        
        return new Promise((resolve) => {
            const script = `
                (function() {
                    try {
                        const el = document.querySelector('${element.selector}');
                        return el !== null;
                    } catch (e) {
                        return false;
                    }
                })();
            `;
            
            webview.executeJavaScript(script, (result) => {
                resolve(!!result);
            });
        });
    }
    
    // 记录查找历史
    recordFindHistory(description, result, strategy, duration) {
        this.findHistory.push({
            timestamp: Date.now(),
            description: description,
            strategy: strategy,
            found: result.found,
            confidence: result.confidence,
            duration: duration,
            method: result.method
        });
        
        // 限制历史记录数量
        if (this.findHistory.length > 100) {
            this.findHistory = this.findHistory.slice(-50);
        }
    }
    
    // 获取查找统计信息
    getStatistics() {
        const total = this.findHistory.length;
        if (total === 0) return null;
        
        const successful = this.findHistory.filter(h => h.found).length;
        const avgDuration = this.findHistory.reduce((sum, h) => sum + h.duration, 0) / total;
        
        const strategyStats = {};
        this.findHistory.forEach(h => {
            if (!strategyStats[h.strategy]) {
                strategyStats[h.strategy] = { total: 0, successful: 0 };
            }
            strategyStats[h.strategy].total++;
            if (h.found) strategyStats[h.strategy].successful++;
        });
        
        return {
            total: total,
            successRate: (successful / total * 100).toFixed(1) + '%',
            avgDuration: Math.round(avgDuration) + 'ms',
            strategies: strategyStats
        };
    }
    
    // 设置策略
    setStrategy(strategy) {
        if (this.strategies.includes(strategy)) {
            this.currentStrategy = strategy;
            console.log(`切换到策略: ${strategy}`);
        } else {
            console.warn(`未知策略: ${strategy}`);
        }
    }
    
    // 设置置信度阈值
    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
        console.log(`置信度阈值设置为: ${this.confidenceThreshold}`);
    }
}

// 导出类
window.HybridElementFinder = HybridElementFinder;
