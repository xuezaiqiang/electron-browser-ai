/**
 * Python自动化桥接器
 * 在Electron应用中调用Python自动化脚本
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class PythonAutomationBridge {
    constructor() {
        this.pythonPaths = ['python', 'python3', 'py']; // 尝试多个Python命令
        this.pythonPath = null;
        this.scriptPath = path.join(__dirname, 'web_automation.py');
        this.tempDir = path.join(__dirname, 'temp');
        this.ensureTempDir();
    }

    async ensureTempDir() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.error('创建临时目录失败:', error);
        }
    }

    /**
     * 执行自然语言命令（AI增强）
     * @param {string} command - 自然语言命令
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 执行结果
     */
    async executeCommand(command, options = {}) {
        try {
            // 优先使用增强版WebView自动化脚本
            const enhancedScriptPath = path.join(__dirname, 'enhanced_webview_automation.py');
            const fallbackScriptPath = path.join(__dirname, 'webview_automation.py');

            // 检查增强版脚本是否存在
            let scriptPath = enhancedScriptPath;
            try {
                require('fs').accessSync(enhancedScriptPath);
                console.log('🚀 使用增强版AI自动化脚本');
            } catch (error) {
                scriptPath = fallbackScriptPath;
                console.log('🔄 回退到基础WebView自动化脚本');
            }

            // 构建Python命令
            const args = [
                scriptPath,
                '--command', command
            ];

            if (options.aiApi) {
                args.push('--ai-api', options.aiApi);
            }



            // 添加IPC端口参数
            args.push('--ipc-port', '3001');



            // 执行Python脚本
            const result = await this.runPythonScript(args);
            return result;

        } catch (error) {
            console.error('WebView自动化执行失败:', error);
            return {
                success: false,
                message: `WebView自动化执行失败: ${error.message}`,
                error: error.toString()
            };
        }
    }

    /**
     * 执行Python自动化工作流
     * @param {Array} workflow - 工作流步骤数组
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 执行结果
     */
    async executeWorkflow(workflow, options = {}) {
        try {
            // 创建临时工作流文件
            const workflowData = {
                steps: workflow,
                options: options
            };
            
            const workflowFile = path.join(this.tempDir, `workflow_${Date.now()}.json`);
            await fs.writeFile(workflowFile, JSON.stringify(workflowData, null, 2), 'utf-8');

            // 构建Python命令
            const args = [
                this.scriptPath,
                '--workflow', workflowFile
            ];

            if (options.headless) {
                args.push('--headless');
            }

            console.log('🐍 启动Python自动化:', this.pythonPath, args.join(' '));

            // 执行Python脚本
            const result = await this.runPythonScript(args);

            // 清理临时文件
            try {
                await fs.unlink(workflowFile);
            } catch (error) {
                console.warn('清理临时文件失败:', error);
            }

            return result;

        } catch (error) {
            console.error('Python自动化执行失败:', error);
            return {
                success: false,
                message: `Python自动化执行失败: ${error.message}`,
                error: error.toString()
            };
        }
    }

    /**
     * 运行Python脚本
     * @param {Array} args - 命令行参数
     * @returns {Promise<Object>} 执行结果
     */
    async runPythonScript(args) {
        // 确保有可用的Python路径
        const pythonCmd = await this.findPythonPath();
        if (!pythonCmd) {
            throw new Error('未找到可用的Python命令');
        }

        return new Promise((resolve, reject) => {
            const python = spawn(pythonCmd, args, {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: __dirname,
                env: {
                    ...process.env,
                    PYTHONIOENCODING: 'utf-8',
                    LANG: 'zh_CN.UTF-8',
                    LC_ALL: 'zh_CN.UTF-8'
                },
                encoding: 'utf8'
            });

            let stdout = '';
            let stderr = '';

            python.stdout.on('data', (data) => {
                const output = data.toString('utf8');
                stdout += output;
                const cleanOutput = output.trim();
            });

            python.stderr.on('data', (data) => {
                const error = data.toString('utf8');
                stderr += error;
                const cleanError = error.trim();
            });

            python.on('close', (code) => {
                if (code === 0) {
                    try {
                        // 尝试解析JSON输出
                        const lines = stdout.split('\n');
                        let jsonResult = null;
                        
                        for (const line of lines.reverse()) {
                            if (line.trim().startsWith('{')) {
                                try {
                                    jsonResult = JSON.parse(line.trim());
                                    break;
                                } catch (e) {
                                    continue;
                                }
                            }
                        }

                        resolve({
                            success: true,
                            message: 'Python自动化执行成功',
                            result: jsonResult || { message: '执行完成', output: stdout },
                            stdout: stdout,
                            stderr: stderr
                        });
                    } catch (error) {
                        resolve({
                            success: true,
                            message: 'Python脚本执行完成，但输出解析失败',
                            stdout: stdout,
                            stderr: stderr
                        });
                    }
                } else {
                    reject(new Error(`Python脚本退出码: ${code}, 错误: ${stderr}`));
                }
            });

            python.on('error', (error) => {
                reject(new Error(`启动Python脚本失败: ${error.message}`));
            });
        });
    }

    /**
     * 查找可用的Python命令
     * @returns {Promise<string|null>} 可用的Python路径
     */
    async findPythonPath() {
        if (this.pythonPath) {
            return this.pythonPath;
        }

        for (const pythonCmd of this.pythonPaths) {
            try {
                const result = await this.testPythonCommand(pythonCmd);
                if (result.success) {
                    this.pythonPath = pythonCmd;
                    console.log(`✅ 找到可用的Python命令: ${pythonCmd}`);
                    return pythonCmd;
                }
            } catch (error) {
                continue;
            }
        }

        return null;
    }

    /**
     * 测试Python命令是否可用
     * @param {string} pythonCmd - Python命令
     * @returns {Promise<Object>} 测试结果
     */
    async testPythonCommand(pythonCmd) {
        return new Promise((resolve, reject) => {
            const python = spawn(pythonCmd, ['--version'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            python.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            python.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            python.on('close', (code) => {
                if (code === 0 || stdout.includes('Python') || stderr.includes('Python')) {
                    resolve({
                        success: true,
                        version: stdout.trim() || stderr.trim()
                    });
                } else {
                    reject(new Error(`Python命令 ${pythonCmd} 不可用`));
                }
            });

            python.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * 检查Python环境
     * @returns {Promise<Object>} 检查结果
     */
    async checkPythonEnvironment() {
        try {
            // 首先查找可用的Python命令
            const pythonCmd = await this.findPythonPath();
            if (!pythonCmd) {
                return {
                    success: false,
                    message: 'Python环境检查失败',
                    error: '未找到可用的Python命令',
                    suggestion: '请安装Python 3.7+并确保添加到系统PATH中。下载地址: https://www.python.org/downloads/'
                };
            }

            // 检查Python版本
            const versionResult = await this.runPythonScript(['-c', 'import sys; print(sys.version)']);

            // 检查selenium是否安装
            let seleniumVersion = null;
            try {
                const seleniumCheck = await this.runPythonScript(['-c', 'import selenium; print(selenium.__version__)']);
                seleniumVersion = seleniumCheck.stdout.trim();
            } catch (error) {
                return {
                    success: false,
                    message: 'Selenium库未安装',
                    error: 'import selenium failed',
                    pythonVersion: versionResult.stdout.trim(),
                    pythonPath: pythonCmd,
                    suggestion: '请安装selenium库: pip install selenium webdriver-manager'
                };
            }

            return {
                success: true,
                message: 'Python环境检查通过',
                pythonVersion: versionResult.stdout.trim(),
                seleniumVersion: seleniumVersion,
                pythonPath: pythonCmd
            };
        } catch (error) {
            return {
                success: false,
                message: 'Python环境检查失败',
                error: error.message,
                suggestion: '请确保已安装Python和selenium库: pip install selenium webdriver-manager'
            };
        }
    }

    /**
     * 安装Python依赖
     * @returns {Promise<Object>} 安装结果
     */
    async installDependencies() {
        try {
            const requirementsPath = path.join(__dirname, 'requirements.txt');
            const result = await this.runPythonScript(['-m', 'pip', 'install', '-r', requirementsPath]);
            
            return {
                success: true,
                message: 'Python依赖安装成功',
                output: result.stdout
            };
        } catch (error) {
            return {
                success: false,
                message: 'Python依赖安装失败',
                error: error.message
            };
        }
    }
}

// 导出类和便捷函数
module.exports = {
    PythonAutomationBridge,
    
    // 便捷函数：执行淘宝搜索
    async searchTaobao(query, options = {}) {
        const bridge = new PythonAutomationBridge();
        const workflow = [
            { type: 'navigate', url: 'https://www.taobao.com', description: '打开淘宝' },
            { type: 'search', query: query, site: 'taobao', description: `搜索"${query}"` },
            { type: 'screenshot', description: '截图保存结果' }
        ];
        
        if (options.clickFirst) {
            workflow.splice(2, 0, { type: 'click', target: '第一个商品', description: '点击第一个商品' });
        }
        
        return await bridge.executeWorkflow(workflow, options);
    },

    // 便捷函数：执行百度搜索
    async searchBaidu(query, options = {}) {
        const bridge = new PythonAutomationBridge();
        const workflow = [
            { type: 'navigate', url: 'https://www.baidu.com', description: '打开百度' },
            { type: 'search', query: query, site: 'baidu', description: `搜索"${query}"` },
            { type: 'screenshot', description: '截图保存结果' }
        ];
        
        return await bridge.executeWorkflow(workflow, options);
    },

    // 便捷函数：执行AI增强命令
    async executeAICommand(command, options = {}) {
        const bridge = new PythonAutomationBridge();
        return await bridge.executeCommand(command, {
            aiApi: 'http://localhost:3000/api/ai',
            ...options
        });
    },

    // 便捷函数：智能搜索（自动识别网站）
    async smartSearch(query, options = {}) {
        const bridge = new PythonAutomationBridge();
        const command = `搜索${query}`;
        return await bridge.executeCommand(command, {
            aiApi: 'http://localhost:3000/api/ai',
            ...options
        });
    },

    // 便捷函数：智能导航+搜索
    async smartNavigateAndSearch(site, query, options = {}) {
        const bridge = new PythonAutomationBridge();
        const command = `在${site}搜索${query}`;
        return await bridge.executeCommand(command, {
            aiApi: 'http://localhost:3000/api/ai',
            ...options
        });
    },

    // 便捷函数：检查环境
    async checkEnvironment() {
        const bridge = new PythonAutomationBridge();
        return await bridge.checkPythonEnvironment();
    }
};
