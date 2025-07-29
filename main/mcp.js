const ffi = require('ffi-napi');
const ref = require('ref-napi');

class MCPInterface {
    constructor() {
        this.user32 = null;
        this.kernel32 = null;
        this.initializeWinAPI();
    }

    // 初始化Windows API
    initializeWinAPI() {
        try {
            // 定义Windows API函数
            this.user32 = ffi.Library('user32', {
                'FindWindowW': ['long', ['string', 'string']],
                'GetWindowTextW': ['int', ['long', 'string', 'int']],
                'GetWindowRect': ['bool', ['long', 'pointer']],
                'SetCursorPos': ['bool', ['int', 'int']],
                'GetCursorPos': ['bool', ['pointer']],
                'mouse_event': ['void', ['uint32', 'uint32', 'uint32', 'uint32', 'pointer']],
                'keybd_event': ['void', ['uint8', 'uint8', 'uint32', 'pointer']],
                'GetForegroundWindow': ['long', []],
                'SetForegroundWindow': ['bool', ['long']],
                'ShowWindow': ['bool', ['long', 'int']],
                'GetWindowThreadProcessId': ['uint32', ['long', 'pointer']]
            });

            this.kernel32 = ffi.Library('kernel32', {
                'GetCurrentThreadId': ['uint32', []],
                'AttachThreadInput': ['bool', ['uint32', 'uint32', 'bool']]
            });

            console.log('Windows API initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Windows API:', error);
            this.user32 = null;
            this.kernel32 = null;
        }
    }

    // 检查API是否可用
    isAvailable() {
        return this.user32 !== null && this.kernel32 !== null;
    }

    // 执行鼠标点击
    async click(x, y, button = 'left') {
        if (!this.isAvailable()) {
            throw new Error('Windows API not available');
        }

        try {
            // 移动鼠标到指定位置
            this.user32.SetCursorPos(x, y);
            
            // 等待一小段时间
            await new Promise(resolve => setTimeout(resolve, 50));

            // 执行点击
            const MOUSEEVENTF_LEFTDOWN = 0x0002;
            const MOUSEEVENTF_LEFTUP = 0x0004;
            const MOUSEEVENTF_RIGHTDOWN = 0x0008;
            const MOUSEEVENTF_RIGHTUP = 0x0010;

            if (button === 'left') {
                this.user32.mouse_event(MOUSEEVENTF_LEFTDOWN, x, y, 0, null);
                await new Promise(resolve => setTimeout(resolve, 50));
                this.user32.mouse_event(MOUSEEVENTF_LEFTUP, x, y, 0, null);
            } else if (button === 'right') {
                this.user32.mouse_event(MOUSEEVENTF_RIGHTDOWN, x, y, 0, null);
                await new Promise(resolve => setTimeout(resolve, 50));
                this.user32.mouse_event(MOUSEEVENTF_RIGHTUP, x, y, 0, null);
            }

            return { success: true, x, y, button };
        } catch (error) {
            console.error('Click operation failed:', error);
            throw new Error(`点击操作失败: ${error.message}`);
        }
    }

    // 获取鼠标当前位置
    getCursorPosition() {
        if (!this.isAvailable()) {
            throw new Error('Windows API not available');
        }

        try {
            const point = Buffer.alloc(8); // POINT结构体 (x: 4字节, y: 4字节)
            this.user32.GetCursorPos(point);
            
            const x = point.readInt32LE(0);
            const y = point.readInt32LE(4);
            
            return { x, y };
        } catch (error) {
            console.error('Get cursor position failed:', error);
            throw new Error(`获取鼠标位置失败: ${error.message}`);
        }
    }

    // 获取窗口信息
    getWindowInfo(windowTitle = null) {
        if (!this.isAvailable()) {
            throw new Error('Windows API not available');
        }

        try {
            let hwnd;
            
            if (windowTitle) {
                // 查找指定标题的窗口
                hwnd = this.user32.FindWindowW(null, windowTitle);
            } else {
                // 获取当前前台窗口
                hwnd = this.user32.GetForegroundWindow();
            }

            if (hwnd === 0) {
                throw new Error('Window not found');
            }

            // 获取窗口标题
            const titleBuffer = Buffer.alloc(512);
            this.user32.GetWindowTextW(hwnd, titleBuffer, 256);
            const title = titleBuffer.toString('utf16le').replace(/\0.*$/, '');

            // 获取窗口位置和大小
            const rect = Buffer.alloc(16); // RECT结构体
            this.user32.GetWindowRect(hwnd, rect);
            
            const left = rect.readInt32LE(0);
            const top = rect.readInt32LE(4);
            const right = rect.readInt32LE(8);
            const bottom = rect.readInt32LE(12);

            return {
                hwnd: hwnd,
                title: title,
                rect: {
                    left: left,
                    top: top,
                    right: right,
                    bottom: bottom,
                    width: right - left,
                    height: bottom - top
                }
            };
        } catch (error) {
            console.error('Get window info failed:', error);
            throw new Error(`获取窗口信息失败: ${error.message}`);
        }
    }

    // 发送键盘输入
    async sendKeys(keys) {
        if (!this.isAvailable()) {
            throw new Error('Windows API not available');
        }

        try {
            const KEYEVENTF_KEYUP = 0x0002;
            
            // 简单的键码映射
            const keyCodes = {
                'enter': 0x0D,
                'space': 0x20,
                'tab': 0x09,
                'escape': 0x1B,
                'backspace': 0x08,
                'delete': 0x2E,
                'home': 0x24,
                'end': 0x23,
                'pageup': 0x21,
                'pagedown': 0x22,
                'up': 0x26,
                'down': 0x28,
                'left': 0x25,
                'right': 0x27
            };

            for (const key of keys.toLowerCase()) {
                let keyCode;
                
                if (keyCodes[key]) {
                    keyCode = keyCodes[key];
                } else if (key.length === 1) {
                    // 单个字符
                    keyCode = key.toUpperCase().charCodeAt(0);
                } else {
                    console.warn(`Unknown key: ${key}`);
                    continue;
                }

                // 按下键
                this.user32.keybd_event(keyCode, 0, 0, null);
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // 释放键
                this.user32.keybd_event(keyCode, 0, KEYEVENTF_KEYUP, null);
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            return { success: true, keys };
        } catch (error) {
            console.error('Send keys failed:', error);
            throw new Error(`发送按键失败: ${error.message}`);
        }
    }

    // 激活窗口
    activateWindow(hwnd) {
        if (!this.isAvailable()) {
            throw new Error('Windows API not available');
        }

        try {
            this.user32.SetForegroundWindow(hwnd);
            this.user32.ShowWindow(hwnd, 1); // SW_SHOWNORMAL
            return { success: true };
        } catch (error) {
            console.error('Activate window failed:', error);
            throw new Error(`激活窗口失败: ${error.message}`);
        }
    }
}

module.exports = MCPInterface;
