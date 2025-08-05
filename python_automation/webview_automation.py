#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WebView自动化 - 通过IPC控制Electron应用内的webview
"""

import json
import sys
import os
import re
import requests
import time
from typing import Dict, List, Optional, Any

# 设置UTF-8编码
if sys.platform.startswith('win'):
    import locale
    import codecs
    
    # 设置控制台编码
    os.system('chcp 65001 > nul')
    
    # 设置环境变量
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    os.environ['LANG'] = 'zh_CN.UTF-8'
    os.environ['LC_ALL'] = 'zh_CN.UTF-8'
    
    # 重新配置标准输出和错误输出
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        # Python 3.6及以下版本的兼容性处理
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

class WebViewAutomation:
    """WebView自动化控制器"""
    
    def __init__(self, ipc_port=3001):
        """
        初始化WebView自动化控制器
        
        Args:
            ipc_port: IPC通信端口
        """
        self.ipc_port = ipc_port
        self.base_url = f"http://localhost:{ipc_port}/api"
        self.ai_api_url = None
        

    
    def set_ai_api(self, ai_api_url: str):
        """设置AI API地址"""
        self.ai_api_url = ai_api_url

    
    def send_ipc_command(self, endpoint: str, **kwargs) -> Dict[str, Any]:
        """
        发送HTTP请求到Electron IPC服务器

        Args:
            endpoint: API端点
            **kwargs: 请求参数

        Returns:
            命令执行结果
        """
        try:
            url = f"http://localhost:{self.ipc_port}/api/webview/{endpoint}"
            response = requests.post(
                url,
                json=kwargs,
                headers={"Content-Type": "application/json"},
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                return result
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                return {
                    "success": False,
                    "error": error_msg
                }

        except requests.exceptions.ConnectionError:
            error_msg = "无法连接到Electron应用，请确保应用正在运行"
            return {
                "success": False,
                "error": error_msg
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def navigate(self, url: str) -> Dict[str, Any]:
        """导航到指定URL"""
        return self.send_ipc_command("navigate", url=url)

    def search(self, query: str, site: str = "baidu") -> Dict[str, Any]:
        """执行搜索操作"""
        return self.send_ipc_command("search", query=query, site=site)

    def click_element(self, selector: str) -> Dict[str, Any]:
        """点击元素"""
        return self.send_ipc_command("click", selector=selector)

    def input_text(self, selector: str, text: str) -> Dict[str, Any]:
        """输入文本"""
        return self.send_ipc_command("input", selector=selector, text=text)

    def execute_script(self, script: str) -> Dict[str, Any]:
        """执行JavaScript脚本"""
        return self.send_ipc_command("execute-script", script=script)

    def get_page_info(self) -> Dict[str, Any]:
        """获取页面信息"""
        return self.send_ipc_command("page-info")
    
    def send_to_ai(self, prompt: str, context: str = "") -> Dict[str, Any]:
        """发送请求到AI模型"""
        if not self.ai_api_url:
            return {"success": False, "error": "AI API未配置"}
        
        try:
            payload = {
                "messages": [
                    {"role": "user", "content": f"{prompt}\n\n上下文：{context}"}
                ],
                "model": "doubao-seed-1-6-250615",
                "temperature": 0.7
            }
            
            response = requests.post(
                self.ai_api_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "content": result.get("choices", [{}])[0].get("message", {}).get("content", ""),
                    "model": result.get("model", "unknown")
                }
            else:
                return {
                    "success": False,
                    "error": f"AI API请求失败: {response.status_code}"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"AI请求异常: {str(e)}"
            }
    
    def execute_universal_command(self, command: str, use_ai: bool = True) -> Dict[str, Any]:
        """
        执行通用自然语言命令
        
        Args:
            command: 自然语言命令
            use_ai: 是否使用AI分析命令
            
        Returns:
            执行结果
        """
        try:
            if use_ai and self.ai_api_url:
                # 使用AI分析命令意图
                ai_prompt = f"""
                请分析以下用户命令，并返回JSON格式的操作指令：
                
                用户命令：{command}
                
                请返回以下格式的JSON：
                {{
                    "action": "navigate|search|click|input",
                    "target": "目标URL或搜索词或元素选择器",
                    "site": "网站名称（如果是搜索）",
                    "text": "要输入的文本（如果是输入操作）"
                }}
                
                支持的操作：
                - navigate: 导航到网站
                - search: 搜索操作
                - click: 点击元素
                - input: 输入文本
                """
                
                ai_result = self.send_to_ai(ai_prompt)
                if ai_result.get("success"):
                    try:
                        ai_instruction = json.loads(ai_result["content"])
                        return self._execute_ai_instruction(ai_instruction)
                    except json.JSONDecodeError:
                        pass
            
            # 使用规则分析命令
            return self._execute_rule_based_command(command)
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "command": command
            }
    
    def _execute_ai_instruction(self, instruction: Dict[str, Any]) -> Dict[str, Any]:
        """执行AI分析的指令"""
        action = instruction.get("action")
        
        if action == "navigate":
            return self.navigate(instruction.get("target"))
        elif action == "search":
            return self.search(
                instruction.get("target"),
                instruction.get("site", "baidu")
            )
        elif action == "click":
            return self.click_element(instruction.get("target"))
        elif action == "input":
            return self.input_text(
                instruction.get("target"),
                instruction.get("text", "")
            )
        else:
            return {
                "success": False,
                "error": f"不支持的操作: {action}"
            }
    
    def _execute_rule_based_command(self, command: str) -> Dict[str, Any]:
        """基于规则分析并执行命令"""
        command_lower = command.lower()
        
        # 搜索命令
        if '搜索' in command or 'search' in command_lower:
            # 提取搜索关键词和网站
            if '淘宝' in command:
                site = 'taobao'
            elif '百度' in command:
                site = 'baidu'
            else:
                site = 'baidu'
            
            # 提取搜索词
            search_match = re.search(r'搜索["""]?([^"""]+)["""]?', command)
            if search_match:
                query = search_match.group(1).strip()
            else:
                # 移除网站名称和动作词，剩下的作为搜索词
                query = re.sub(r'(在|用|打开|访问)?(淘宝|百度|京东)?(搜索|查找)?', '', command).strip()
            
            if not query:
                return {"success": False, "message": "无法提取搜索关键词"}
            
            return self.search(query, site)
        
        # 导航命令
        elif '打开' in command or '访问' in command or 'navigate' in command_lower:
            # 提取URL
            url_match = re.search(r'(https?://[^\s]+)', command)
            if url_match:
                url = url_match.group(1)
            elif '淘宝' in command:
                url = 'https://www.taobao.com'
            elif '百度' in command:
                url = 'https://www.baidu.com'
            elif '京东' in command:
                url = 'https://www.jd.com'
            else:
                return {"success": False, "message": "无法确定要访问的网站"}
            
            return self.navigate(url)
        
        # 点击命令
        elif '点击' in command or 'click' in command_lower:
            if '第一' in command or 'first' in command_lower:
                # 点击第一个搜索结果
                return self.click_element('.result:first-child a, .c-container:first-child a')
            else:
                return {"success": False, "message": "暂不支持复杂的点击操作"}
        
        else:
            return {"success": False, "message": f"无法理解命令: {command}"}

def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description='WebView自动化控制器')
    parser.add_argument('--command', type=str, help='要执行的自然语言命令')
    parser.add_argument('--ai-api', type=str, help='AI API地址')
    parser.add_argument('--no-ai', action='store_true', help='禁用AI分析')
    parser.add_argument('--ipc-port', type=int, default=3001, help='IPC通信端口')

    args = parser.parse_args()

    # 初始化自动化控制器
    automation = WebViewAutomation(ipc_port=args.ipc_port)

    if args.ai_api:
        automation.set_ai_api(args.ai_api)

    if args.command:
        # 执行命令
        use_ai = not args.no_ai
        result = automation.execute_universal_command(args.command, use_ai=use_ai)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("请使用 --command 参数指定要执行的命令")

if __name__ == "__main__":
    main()
