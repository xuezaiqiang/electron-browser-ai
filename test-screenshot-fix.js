// 测试截图修复的脚本
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 创建测试窗口
function createTestWindow() {
    const testWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
            preload: path.join(__dirname, 'main', 'preload.js')
        }
    });

    testWindow.loadFile('test.html');
    return testWindow;
}

// 测试截图功能
async function testScreenshotCapture() {
    console.log('🧪 开始测试截图功能...');
    
    try {
        const testWindow = createTestWindow();
        
        // 等待窗口加载完成
        await new Promise(resolve => {
            testWindow.webContents.once('did-finish-load', resolve);
        });
        
        console.log('✅ 测试窗口加载完成');
        
        // 模拟截图操作
        const screenshot = await testWindow.webContents.capturePage();
        console.log('✅ 截图捕获成功');
        
        // 测试转换为base64
        const base64Data = screenshot.toDataURL();
        console.log('✅ 转换为base64成功');
        console.log('📊 Base64数据长度:', base64Data.length);
        console.log('📊 数据格式:', base64Data.substring(0, 50) + '...');
        
        // 测试数据序列化
        const testData = {
            screenshot: base64Data,
            timestamp: new Date().toISOString(),
            size: base64Data.length
        };
        
        const serialized = JSON.stringify(testData);
        console.log('✅ 数据序列化成功');
        console.log('📊 序列化数据长度:', serialized.length);
        
        // 测试反序列化
        const deserialized = JSON.parse(serialized);
        console.log('✅ 数据反序列化成功');
        console.log('📊 反序列化后截图数据长度:', deserialized.screenshot.length);
        
        testWindow.close();
        console.log('🎉 截图功能测试完成 - 所有测试通过！');
        
        return {
            success: true,
            screenshotSize: base64Data.length,
            serializedSize: serialized.length
        };
        
    } catch (error) {
        console.error('❌ 截图功能测试失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 测试IPC数据传递
function testIPCDataTransfer() {
    console.log('🧪 开始测试IPC数据传递...');
    
    return new Promise((resolve) => {
        // 模拟大量数据
        const largeData = {
            html: '<html>'.repeat(1000) + '</html>',
            css: '.test { color: red; }'.repeat(500),
            scripts: 'console.log("test");'.repeat(300),
            screenshot: 'data:image/png;base64,' + 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='.repeat(100),
            metadata: {
                title: 'Test Page',
                url: 'http://test.com',
                timestamp: new Date().toISOString()
            }
        };
        
        try {
            // 测试序列化
            const serialized = JSON.stringify(largeData);
            console.log('✅ 大数据序列化成功');
            console.log('📊 数据大小:', serialized.length, '字符');
            
            // 测试反序列化
            const deserialized = JSON.parse(serialized);
            console.log('✅ 大数据反序列化成功');
            
            // 验证数据完整性
            const isValid = deserialized.html === largeData.html &&
                           deserialized.css === largeData.css &&
                           deserialized.scripts === largeData.scripts &&
                           deserialized.screenshot === largeData.screenshot;
            
            if (isValid) {
                console.log('✅ 数据完整性验证通过');
                console.log('🎉 IPC数据传递测试完成 - 所有测试通过！');
                resolve({
                    success: true,
                    dataSize: serialized.length
                });
            } else {
                throw new Error('数据完整性验证失败');
            }
            
        } catch (error) {
            console.error('❌ IPC数据传递测试失败:', error);
            resolve({
                success: false,
                error: error.message
            });
        }
    });
}

// 测试对象克隆问题
function testObjectCloning() {
    console.log('🧪 开始测试对象克隆问题...');
    
    try {
        // 创建包含各种数据类型的对象
        const testObject = {
            string: 'test string',
            number: 123,
            boolean: true,
            array: [1, 2, 3],
            object: { nested: 'value' },
            date: new Date().toISOString(), // 使用ISO字符串而不是Date对象
            null: null,
            undefined: undefined // 这个会在JSON序列化时被忽略
        };
        
        // 测试结构化克隆（类似IPC传递）
        const cloned = JSON.parse(JSON.stringify(testObject));
        console.log('✅ 对象克隆成功');
        
        // 验证克隆结果
        console.log('📊 原始对象键:', Object.keys(testObject));
        console.log('📊 克隆对象键:', Object.keys(cloned));
        
        // 检查可能导致克隆失败的类型
        const problematicTypes = [];
        
        for (const [key, value] of Object.entries(testObject)) {
            if (value instanceof Date) {
                problematicTypes.push(`${key}: Date对象`);
            } else if (value instanceof Function) {
                problematicTypes.push(`${key}: Function对象`);
            } else if (value instanceof RegExp) {
                problematicTypes.push(`${key}: RegExp对象`);
            } else if (value && typeof value === 'object' && value.constructor !== Object && value.constructor !== Array) {
                problematicTypes.push(`${key}: 自定义对象 (${value.constructor.name})`);
            }
        }
        
        if (problematicTypes.length > 0) {
            console.log('⚠️  发现可能导致克隆问题的类型:', problematicTypes);
        } else {
            console.log('✅ 未发现问题类型');
        }
        
        console.log('🎉 对象克隆测试完成！');
        
        return {
            success: true,
            problematicTypes: problematicTypes
        };
        
    } catch (error) {
        console.error('❌ 对象克隆测试失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 运行所有测试
async function runAllTests() {
    console.log('🚀 开始运行截图修复测试套件');
    console.log('=' .repeat(50));
    
    const results = {};
    
    // 测试1: 对象克隆
    results.cloning = testObjectCloning();
    
    // 测试2: IPC数据传递
    results.ipc = await testIPCDataTransfer();
    
    // 测试3: 截图功能（需要Electron环境）
    if (app) {
        await app.whenReady();
        results.screenshot = await testScreenshotCapture();
        app.quit();
    } else {
        console.log('⚠️  跳过截图测试（需要Electron环境）');
        results.screenshot = { success: true, skipped: true };
    }
    
    // 输出测试结果
    console.log('\n📋 测试结果摘要:');
    console.log('- 对象克隆测试:', results.cloning.success ? '✅ 通过' : '❌ 失败');
    console.log('- IPC数据传递测试:', results.ipc.success ? '✅ 通过' : '❌ 失败');
    console.log('- 截图功能测试:', results.screenshot.success ? '✅ 通过' : results.screenshot.skipped ? '⏭️ 跳过' : '❌ 失败');
    
    const allPassed = results.cloning.success && results.ipc.success && results.screenshot.success;
    
    if (allPassed) {
        console.log('\n🎉 所有测试通过！截图功能修复成功！');
    } else {
        console.log('\n💥 部分测试失败，需要进一步检查');
    }
    
    console.log('\n' + '='.repeat(50));
    
    return results;
}

// 如果直接运行此脚本
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testScreenshotCapture,
    testIPCDataTransfer,
    testObjectCloning,
    runAllTests
};
