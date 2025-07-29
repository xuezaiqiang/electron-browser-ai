// 豆包图片分析API测试脚本
const axios = require('axios');

async function testVisionAPI() {
    const config = {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        apiKey: '0bf1c076-b6e9-479a-9c55-051813ad5e4a',
        model: 'doubao-seed-1-6-250615' // 支持图片分析的模型
    };

    // 测试数据 - 包含文本和图片
    const testData = {
        model: config.model,
        messages: [
            {
                role: "system",
                content: "你是一个专业的网页分析助手，能够分析网页内容和截图并生成详细的使用说明。"
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "请分析这个网页截图，描述页面的主要功能和使用方法。"
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: "https://ark-project.tos-cn-beijing.ivolces.com/images/view.jpeg"
                        }
                    }
                ]
            }
        ]
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
    };

    try {
        console.log('🚀 开始测试豆包图片分析API...');
        console.log('📡 API地址:', config.baseURL);
        console.log('🤖 模型:', config.model);
        console.log('🔑 API密钥:', config.apiKey.substring(0, 8) + '...');
        console.log('🖼️  测试图片: 官方示例图片');
        
        const startTime = Date.now();
        
        const response = await axios.post(
            `${config.baseURL}/chat/completions`,
            testData,
            {
                headers: headers,
                timeout: 60000 // 图片分析可能需要更长时间
            }
        );

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log('\n✅ 图片分析API调用成功!');
        console.log('⏱️  响应时间:', duration + 'ms');
        console.log('📊 响应状态:', response.status);
        
        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const content = response.data.choices[0].message.content;
            console.log('\n🖼️  图片分析结果:');
            console.log('─'.repeat(60));
            console.log(content);
            console.log('─'.repeat(60));
            
            console.log('\n📈 统计信息:');
            console.log('- 分析内容长度:', content.length, '字符');
            console.log('- 使用模型:', response.data.model || config.model);
            console.log('- 支持功能: 文本 + 图片分析');
            
            return {
                success: true,
                content: content,
                duration: duration,
                model: response.data.model || config.model,
                supportsVision: true
            };
        } else {
            throw new Error('响应格式不正确');
        }
        
    } catch (error) {
        console.error('\n❌ 图片分析API调用失败:');
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

// 测试页面分析功能
async function testPageAnalysis() {
    const config = {
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        apiKey: '0bf1c076-b6e9-479a-9c55-051813ad5e4a',
        model: 'doubao-seed-1-6-250615'
    };

    // 模拟页面数据
    const pageData = {
        title: "百度首页",
        url: "https://www.baidu.com",
        html: `<html><head><title>百度一下，你就知道</title></head><body><div id="wrapper"><div id="head"><div class="head_wrapper"><div class="s_form"><div class="s_form_wrapper"><div id="lg"><img src="//www.baidu.com/img/bd_logo1.png" width="270" height="129"></div><form id="form" name="f" action="//www.baidu.com/s" class="fm"><input type="hidden" name="bdorz_come" value="1"><input type="hidden" name="ie" value="utf-8"><input type="hidden" name="f" value="8"><input type="hidden" name="rsv_bp" value="1"><span class="bg s_ipt_wr"><input id="kw" name="wd" class="s_ipt" value="" maxlength="255" autocomplete="off"></span><span class="bg s_btn_wr"><input type="submit" id="su" value="百度一下" class="bg s_btn"></span></form></div></div></div></div></body></html>`,
        css: `.s_form{width:641px;height:190px;}.s_ipt_wr{border:1px solid #b6b6b6;border-color:#7b7b7b #b6b6b6 #b6b6b6 #7b7b7b;background:#fff;display:inline-block;vertical-align:top;width:539px;margin-right:0;border-right-width:0;border-color:#b8b8b8 transparent #ccc #b8b8b8;overflow:hidden;}.s_ipt{width:526px;height:22px;font:16px/18px arial;line-height:22px;margin:6px 0 0 7px;padding:0;background:transparent;border:0;outline:0;-webkit-appearance:none;}`,
        scripts: `var bds={se:{},su:{urdata:[],urSendClick:function(){}},util:{},use:{},comm : {domain:"http://www.baidu.com",ubsurl : "http://nsclick.baidu.com/v.gif",tn:"baidu",queryEnc:"",queryId:"",inter:"",templateName:"baidu",sugHost : "http://suggestion.baidu.com/su",query : "",qid : "",cid : "",sid : "",indexSid : "",stoken : "",serverTime : "",user : "",username : "",loginAction : [],useFavo : "",pinyin : "",favoOn : "",curResultNum:"",rightResultExist:false,protectNum:0,zxlNum:0,pageNum:1,pageSize:10,newindex:0,async:1,maxPreloadThread:5,maxPreloadPic:50,isDebug:false,ishome : 1}};`
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
                content: [
                    {
                        type: "text",
                        text: `请分析以下网页内容并生成详细的使用说明：

## 网页基本信息：
- 页面标题：${pageData.title}
- 页面URL：${pageData.url}

## 网页HTML结构：
\`\`\`html
${pageData.html}
\`\`\`

## CSS样式：
\`\`\`css
${pageData.css}
\`\`\`

## JavaScript代码：
\`\`\`javascript
${pageData.scripts}
\`\`\`

请根据以上信息生成一份详细的网页使用说明，包括：
1. 页面主要功能概述
2. 各个界面元素的作用说明
3. 操作步骤指南
4. 注意事项和提示
5. 可能的交互方式

请用中文回答，格式要清晰易读。`
                    }
                ]
            }
        ]
    };

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
    };

    try {
        console.log('\n🔍 开始测试页面分析功能...');
        
        const startTime = Date.now();
        
        const response = await axios.post(
            `${config.baseURL}/chat/completions`,
            testData,
            {
                headers: headers,
                timeout: 45000
            }
        );

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log('\n✅ 页面分析成功!');
        console.log('⏱️  响应时间:', duration + 'ms');
        
        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const content = response.data.choices[0].message.content;
            console.log('\n📝 页面分析结果:');
            console.log('─'.repeat(60));
            console.log(content.substring(0, 500) + '...');
            console.log('─'.repeat(60));
            
            return {
                success: true,
                content: content,
                duration: duration
            };
        }
        
    } catch (error) {
        console.error('\n❌ 页面分析失败:', error.message);
        return { success: false, error: error.message };
    }
}

// 运行测试
if (require.main === module) {
    console.log('🧪 豆包图片分析模型测试');
    console.log('=' .repeat(60));
    
    Promise.all([
        testVisionAPI(),
        testPageAnalysis()
    ]).then(([visionResult, pageResult]) => {
        console.log('\n🎉 测试完成!');
        console.log('\n📋 测试结果摘要:');
        console.log('- 图片分析API:', visionResult.success ? '✅ 成功' : '❌ 失败');
        console.log('- 页面分析功能:', pageResult.success ? '✅ 成功' : '❌ 失败');
        
        if (visionResult.success) {
            console.log('- 图片分析响应时间:', visionResult.duration + 'ms');
            console.log('- 支持多模态:', visionResult.supportsVision ? '✅ 是' : '❌ 否');
        }
        
        if (pageResult.success) {
            console.log('- 页面分析响应时间:', pageResult.duration + 'ms');
        }
        
        console.log('\n' + '='.repeat(60));
    }).catch(error => {
        console.error('\n💥 测试脚本执行失败:', error.message);
    });
}

module.exports = { testVisionAPI, testPageAnalysis };
