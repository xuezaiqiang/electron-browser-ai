// 豆包API测试脚本
const axios = require('axios');

async function testDoubaoAPI() {
    const config = {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        apiKey: '0bf1c076-b6e9-479a-9c55-051813ad5e4a',
        model: 'doubao-1-5-thinking-pro-250415'
    };

    const testData = {
        model: config.model,
        messages: [
            {
                role: "system",
                content: "你是一个专业的网页分析助手，能够分析网页内容并生成详细的使用说明。"
            },
            {
                role: "user",
                content: "请分析以下网页内容并生成使用说明：\n\n这是百度首页，包含搜索框、导航菜单等元素。"
            }
        ]
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
    };

    try {
        console.log('🚀 开始测试豆包API...');
        console.log('📡 API地址:', config.baseURL);
        console.log('🤖 模型:', config.model);
        console.log('🔑 API密钥:', config.apiKey.substring(0, 8) + '...');
        
        const startTime = Date.now();
        
        const response = await axios.post(
            `${config.baseURL}/chat/completions`,
            testData,
            {
                headers: headers,
                timeout: 30000
            }
        );

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log('\n✅ API调用成功!');
        console.log('⏱️  响应时间:', duration + 'ms');
        console.log('📊 响应状态:', response.status);
        
        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const content = response.data.choices[0].message.content;
            console.log('\n📝 生成的内容:');
            console.log('─'.repeat(50));
            console.log(content);
            console.log('─'.repeat(50));
            
            console.log('\n📈 统计信息:');
            console.log('- 内容长度:', content.length, '字符');
            console.log('- 使用模型:', response.data.model || config.model);
            
            return {
                success: true,
                content: content,
                duration: duration,
                model: response.data.model || config.model
            };
        } else {
            throw new Error('响应格式不正确');
        }
        
    } catch (error) {
        console.error('\n❌ API调用失败:');
        console.error('错误类型:', error.name);
        console.error('错误信息:', error.message);
        
        if (error.response) {
            console.error('HTTP状态:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
        
        return {
            success: false,
            error: error.message,
            details: error.response?.data
        };
    }
}

// 运行测试
if (require.main === module) {
    console.log('🧪 豆包API集成测试');
    console.log('=' .repeat(50));
    
    testDoubaoAPI().then(result => {
        if (result.success) {
            console.log('\n🎉 测试完成 - 豆包API集成成功!');
            console.log('\n📋 测试结果摘要:');
            console.log('- API连接: ✅ 正常');
            console.log('- 响应时间: ✅', result.duration + 'ms');
            console.log('- 内容生成: ✅ 成功');
            console.log('- 使用模型: ✅', result.model);
        } else {
            console.log('\n💥 测试失败 - 需要检查配置');
            console.log('\n🔍 故障排除建议:');
            console.log('1. 检查网络连接');
            console.log('2. 验证API密钥是否正确');
            console.log('3. 确认API地址格式');
            console.log('4. 检查模型名称是否正确');
        }
        
        console.log('\n' + '='.repeat(50));
    }).catch(error => {
        console.error('\n💥 测试脚本执行失败:', error.message);
    });
}

module.exports = { testDoubaoAPI };
