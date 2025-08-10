#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强的WebView自动化 - 集成AI视觉分析和HTML解析
"""

import json
import sys
import os
import re
import requests
import time
import base64
from typing import Dict, List, Optional, Any

# 设置UTF-8编码
if sys.platform.startswith('win'):
    import locale
    import codecs
    
    os.system('chcp 65001 > nul')
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    os.environ['LANG'] = 'zh_CN.UTF-8'
    os.environ['LC_ALL'] = 'zh_CN.UTF-8'
    
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

class EnhancedWebViewAutomation:
    """增强的WebView自动化控制器 - 集成AI视觉分析"""
    
    def __init__(self, ipc_port=3001):
        self.ipc_port = ipc_port
        self.ai_api_url = None
        self.last_screenshot = None
        self.last_html = None
        
    def set_ai_api(self, ai_api_url: str):
        """设置AI API地址"""
        self.ai_api_url = ai_api_url
    
    def send_ipc_command(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        """发送HTTP请求到Electron IPC服务器"""
        try:
            url = f"http://localhost:{self.ipc_port}/api/webview/{endpoint}"
            response = requests.post(
                url,
                json=kwargs,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text}"
                }
                
        except requests.exceptions.ConnectionError:
            return {
                "success": False,
                "error": "无法连接到Electron应用，请确保应用正在运行"
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_page_screenshot(self) -> Optional[str]:
        """获取页面截图"""
        try:
            url = f"http://localhost:{self.ipc_port}/api/capture-screenshot"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    self.last_screenshot = result.get("url")
                    return self.last_screenshot
            return None
        except Exception as e:
            print(f"获取截图失败: {e}")
            return None
    
    def get_page_html(self) -> Optional[str]:
        """获取页面HTML"""
        try:
            url = f"http://localhost:{self.ipc_port}/api/extract-page-data"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                self.last_html = result.get("html", "")
                return self.last_html
            return None
        except Exception as e:
            print(f"获取HTML失败: {e}")
            return None
    
    def analyze_page_with_ai(self, task_description: str) -> Dict[str, Any]:
        """使用AI分析页面内容和截图"""
        if not self.ai_api_url:
            return {"success": False, "error": "AI API未配置"}
        
        # 获取页面数据
        screenshot = self.get_page_screenshot()
        html = self.get_page_html()
        
        if not screenshot and not html:
            return {"success": False, "error": "无法获取页面数据"}
        
        # 构建AI分析提示
        prompt = f"""
        你是一个专业的网页自动化专家。请分析当前页面并提供精确的操作指令。

        任务描述: {task_description}

        页面信息:
        - 有截图: {"是" if screenshot else "否"}
        - 有HTML: {"是" if html else "否"}

        请返回严格的JSON格式响应:
        {{
            "analysis": "页面分析结果",
            "elements_found": [
                {{
                    "type": "搜索框|按钮|链接|输入框",
                    "selector": "CSS选择器",
                    "xpath": "XPath选择器(如果需要)",
                    "text": "元素文本内容",
                    "confidence": 0.95,
                    "position": {{"x": 100, "y": 200}},
                    "description": "元素描述"
                }}
            ],
            "recommended_actions": [
                {{
                    "action": "navigate|click|input|wait",
                    "target": "目标选择器或URL",
                    "value": "输入值(如果是input操作)",
                    "description": "操作描述",
                    "order": 1
                }}
            ],
            "success": true,
            "confidence": 0.9
        }}

        特别注意:
        1. 如果是搜索任务，必须找到搜索框和搜索按钮
        2. 提供多个备选选择器以提高成功率
        3. 确保选择器的准确性和可用性
        4. 按操作顺序排列recommended_actions
        """
        
        try:
            # 准备AI请求数据
            payload = {
                "messages": [
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                "model": "doubao-seed-1-6-250615",
                "temperature": 0.3  # 降低温度以获得更准确的结果
            }
            
            # 如果有截图，添加到请求中
            if screenshot:
                payload["image"] = screenshot
            
            # 如果有HTML，添加到上下文中
            if html:
                payload["messages"][0]["content"] += f"\n\nHTML片段(前2000字符):\n{html[:2000]}"
            
            response = requests.post(
                self.ai_api_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=60
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # 尝试解析AI返回的JSON
                try:
                    ai_analysis = json.loads(ai_content)
                    return ai_analysis
                except json.JSONDecodeError:
                    # 如果不是JSON，尝试提取JSON部分
                    json_match = re.search(r'\{.*\}', ai_content, re.DOTALL)
                    if json_match:
                        try:
                            ai_analysis = json.loads(json_match.group())
                            return ai_analysis
                        except json.JSONDecodeError:
                            pass
                    
                    return {
                        "success": False,
                        "error": "AI返回格式错误",
                        "raw_response": ai_content
                    }
            else:
                return {
                    "success": False,
                    "error": f"AI API请求失败: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"AI分析异常: {str(e)}"
            }
    
    def execute_ai_guided_task(self, task_description: str) -> Dict[str, Any]:
        """执行AI指导的任务"""
        print(f"🤖 开始AI指导的任务: {task_description}")

        # 1. 尝试AI分析页面
        analysis = self.analyze_page_with_ai(task_description)
        if not analysis.get("success"):
            print(f"⚠️ AI分析失败，回退到规则分析: {analysis.get('error')}")
            # 回退到基于规则的分析
            analysis = self.fallback_rule_analysis(task_description)
            if not analysis.get("success"):
                return {
                    "success": False,
                    "error": f"分析失败: {analysis.get('error')}",
                    "analysis": analysis
                }
        
        print(f"✅ AI分析完成，置信度: {analysis.get('confidence', 0)}")
        print(f"📋 找到 {len(analysis.get('elements_found', []))} 个相关元素")
        print(f"🎯 推荐 {len(analysis.get('recommended_actions', []))} 个操作")
        
        # 2. 执行推荐的操作
        results = []
        actions = analysis.get("recommended_actions", [])
        
        for i, action in enumerate(sorted(actions, key=lambda x: x.get("order", 0))):
            print(f"🔄 执行操作 {i+1}/{len(actions)}: {action.get('description', '')}")
            
            action_result = self.execute_single_action(action)
            results.append({
                "action": action,
                "result": action_result,
                "success": action_result.get("success", False)
            })
            
            if not action_result.get("success"):
                print(f"❌ 操作失败: {action_result.get('error')}")
                # 继续执行其他操作，不要因为一个失败就停止
            else:
                print(f"✅ 操作成功")
                # 操作间隔
                time.sleep(1)
        
        # 3. 汇总结果
        successful_actions = [r for r in results if r["success"]]
        
        return {
            "success": len(successful_actions) > 0,
            "message": f"完成 {len(successful_actions)}/{len(results)} 个操作",
            "analysis": analysis,
            "action_results": results,
            "task_description": task_description
        }
    
    def execute_single_action(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """执行单个操作（带重试机制）"""
        action_type = action.get("action")
        target = action.get("target")
        value = action.get("value", "")

        # 对于关键操作，添加重试机制
        max_retries = 3 if action_type in ["input", "click"] else 1

        for attempt in range(max_retries):
            try:
                if action_type == "navigate":
                    result = self.send_ipc_command("navigate", url=target)
                elif action_type == "click":
                    result = self.send_ipc_command("click", selector=target)
                elif action_type == "input":
                    result = self.send_ipc_command("input", selector=target, text=value)
                elif action_type == "submit":
                    result = self.send_ipc_command("submit", selector=target)
                elif action_type == "wait":
                    wait_time = float(value) if value else 2.0
                    time.sleep(wait_time)
                    result = {"success": True, "message": f"等待 {wait_time} 秒"}
                else:
                    result = {
                        "success": False,
                        "error": f"不支持的操作类型: {action_type}"
                    }

                # 如果成功，直接返回
                if result.get("success"):
                    return result

                # 如果失败且还有重试机会
                if attempt < max_retries - 1:
                    print(f"🔄 操作失败，重试 {attempt + 1}/{max_retries}: {result.get('error')}")
                    time.sleep(2)  # 等待2秒后重试
                else:
                    return result

            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"🔄 操作异常，重试 {attempt + 1}/{max_retries}: {str(e)}")
                    time.sleep(2)
                else:
                    return {
                        "success": False,
                        "error": f"操作异常: {str(e)}"
                    }

        return {
            "success": False,
            "error": "重试次数已用完"
        }

    def fallback_rule_analysis(self, task_description: str) -> Dict[str, Any]:
        """基于规则的回退分析"""
        print("🔄 使用规则分析模式")

        task_lower = task_description.lower()

        # 检测任务类型和目标网站
        if '淘宝' in task_description and '搜索' in task_description:
            # 提取搜索关键词
            search_match = re.search(r'搜索["""]?([^"""]+)["""]?', task_description)
            query = search_match.group(1).strip() if search_match else ""

            if not query:
                # 尝试其他提取方式
                query = re.sub(r'(打开|在|用|访问)?(淘宝|天猫)?(搜索|查找|买)?', '', task_description).strip()

            return {
                "success": True,
                "analysis": "规则分析：淘宝搜索任务",
                "elements_found": [
                    {
                        "type": "搜索框",
                        "selector": "#q",
                        "confidence": 0.8,
                        "description": "淘宝主搜索框"
                    }
                ],
                "recommended_actions": [
                    {
                        "action": "navigate",
                        "target": "https://www.taobao.com",
                        "description": "导航到淘宝首页",
                        "order": 1
                    },
                    {
                        "action": "input",
                        "target": "#q",
                        "value": query,
                        "description": f"在搜索框输入: {query}",
                        "order": 2
                    },
                    {
                        "action": "wait",
                        "target": "",
                        "value": "5",
                        "description": "等待搜索完成",
                        "order": 3
                    }
                ],
                "confidence": 0.8
            }

        elif '百度' in task_description and '搜索' in task_description:
            search_match = re.search(r'搜索["""]?([^"""]+)["""]?', task_description)
            query = search_match.group(1).strip() if search_match else ""

            return {
                "success": True,
                "analysis": "规则分析：百度搜索任务",
                "elements_found": [
                    {
                        "type": "搜索框",
                        "selector": "#kw",
                        "confidence": 0.9,
                        "description": "百度搜索框"
                    }
                ],
                "recommended_actions": [
                    {
                        "action": "navigate",
                        "target": "https://www.baidu.com",
                        "description": "导航到百度首页",
                        "order": 1
                    },
                    {
                        "action": "input",
                        "target": "#kw",
                        "value": query,
                        "description": f"在搜索框输入并搜索: {query}",
                        "order": 2
                    },
                    {
                        "action": "wait",
                        "target": "",
                        "value": "3",
                        "description": "等待搜索完成",
                        "order": 3
                    }
                ],
                "confidence": 0.9
            }

        return {
            "success": False,
            "error": "无法识别任务类型"
        }

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='增强的WebView自动化控制器')
    parser.add_argument('--command', type=str, help='要执行的自然语言命令')
    parser.add_argument('--ai-api', type=str, help='AI API地址')
    parser.add_argument('--ipc-port', type=int, default=3001, help='IPC通信端口')
    
    args = parser.parse_args()
    
    # 初始化自动化控制器
    automation = EnhancedWebViewAutomation(ipc_port=args.ipc_port)
    
    if args.ai_api:
        automation.set_ai_api(args.ai_api)
    
    if args.command:
        # 执行AI指导的任务
        result = automation.execute_ai_guided_task(args.command)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("请使用 --command 参数指定要执行的命令")

if __name__ == "__main__":
    main()
