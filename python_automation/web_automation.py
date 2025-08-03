#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
智能浏览器自动化 - Python实现
使用Selenium WebDriver进行可靠的页面操作
"""

import json
import time
import sys
import os
from typing import Dict, List, Optional, Any
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
import argparse

class WebAutomation:
    def __init__(self, headless: bool = False, timeout: int = 10):
        """初始化Web自动化"""
        self.timeout = timeout
        self.driver = None
        self.wait = None
        self.setup_driver(headless)
        
    def setup_driver(self, headless: bool):
        """设置Chrome WebDriver"""
        chrome_options = Options()
        if headless:
            chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
        try:
            # 使用webdriver-manager自动管理ChromeDriver
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.wait = WebDriverWait(self.driver, self.timeout)
            print("[SUCCESS] Chrome WebDriver 初始化成功")
        except Exception as e:
            print(f"[ERROR] WebDriver 初始化失败: {e}")
            sys.exit(1)
    
    def navigate(self, url: str) -> Dict[str, Any]:
        """导航到指定URL"""
        try:
            print(f"[NAVIGATE] 导航到: {url}")
            self.driver.get(url)
            time.sleep(2)  # 等待页面加载
            
            return {
                "success": True,
                "message": f"成功导航到 {url}",
                "current_url": self.driver.current_url,
                "title": self.driver.title
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"导航失败: {str(e)}"
            }
    
    def find_search_input(self, site_name: str = None) -> Optional[Any]:
        """智能查找搜索输入框"""
        # 不同网站的搜索框选择器
        search_selectors = {
            'taobao': [
                '#q',
                'input[name="q"]',
                '.search-combobox-input input',
                '[data-spm="search"] input'
            ],
            'baidu': [
                '#kw',
                'input[name="wd"]',
                '.s_ipt'
            ],
            'google': [
                'input[name="q"]',
                '.gLFyf',
                'textarea[name="q"]'
            ],
            'jd': [
                '#key',
                'input[name="keyword"]'
            ],
            'zhihu': [
                '.SearchBar-input input',
                'input[name="q"]'
            ]
        }
        
        # 通用选择器
        generic_selectors = [
            'input[type="search"]',
            'input[name="q"]',
            'input[name="query"]',
            'input[name="keyword"]',
            'input[name="search"]',
            'input[placeholder*="搜索"]',
            'input[placeholder*="search"]',
            '.search-input',
            '.search-box input',
            '#search-input'
        ]
        
        # 根据网站选择选择器
        selectors = []
        if site_name:
            site_key = site_name.lower()
            if site_key in search_selectors:
                selectors.extend(search_selectors[site_key])
        
        selectors.extend(generic_selectors)
        
        # 尝试找到搜索框
        for selector in selectors:
            try:
                element = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
                if element.is_displayed() and element.is_enabled():
                    print(f"[SUCCESS] 找到搜索框: {selector}")
                    return element
            except TimeoutException:
                continue

        return None

    def search(self, query: str, site_name: str = None) -> Dict[str, Any]:
        """执行搜索操作"""
        try:
            print(f"[SEARCH] 搜索: {query}")
            
            # 查找搜索输入框
            search_input = self.find_search_input(site_name)
            if not search_input:
                return {
                    "success": False,
                    "message": "未找到搜索输入框"
                }
            
            # 清空并输入搜索内容
            search_input.clear()
            search_input.send_keys(query)
            time.sleep(1)
            
            # 尝试提交搜索
            try:
                search_input.send_keys(Keys.RETURN)
            except:
                # 如果回车不行，尝试找搜索按钮
                search_buttons = [
                    'button[type="submit"]',
                    '.search-btn',
                    '.search-button',
                    'input[type="submit"]',
                    '[data-spm="search-btn"]'
                ]
                
                for btn_selector in search_buttons:
                    try:
                        btn = self.driver.find_element(By.CSS_SELECTOR, btn_selector)
                        if btn.is_displayed() and btn.is_enabled():
                            btn.click()
                            break
                    except:
                        continue
            
            time.sleep(3)  # 等待搜索结果加载
            
            return {
                "success": True,
                "message": f"搜索 '{query}' 完成",
                "current_url": self.driver.current_url
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"搜索失败: {str(e)}"
            }
    
    def click_first_result(self) -> Dict[str, Any]:
        """点击第一个搜索结果"""
        try:
            print("[CLICK] 点击第一个搜索结果")
            
            # 不同网站的结果选择器
            result_selectors = [
                '.item .title a',  # 淘宝
                '.result h3 a',   # 百度
                '.g h3 a',        # 谷歌
                '.gl-item .p-name a',  # 京东
                '.List-item .ContentItem-title a',  # 知乎
                'a[href*="item"]',  # 通用商品链接
                '.search-result a',
                '.result-item a',
                '.item-title a'
            ]
            
            for selector in result_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    for element in elements:
                        if element.is_displayed() and element.is_enabled():
                            element.click()
                            time.sleep(2)
                            return {
                                "success": True,
                                "message": "成功点击第一个结果",
                                "current_url": self.driver.current_url
                            }
                except:
                    continue
            
            return {
                "success": False,
                "message": "未找到可点击的搜索结果"
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"点击失败: {str(e)}"
            }
    
    def take_screenshot(self, filename: str = None) -> Dict[str, Any]:
        """截图"""
        try:
            if not filename:
                filename = f"screenshot_{int(time.time())}.png"
            
            screenshot_path = os.path.join(os.getcwd(), filename)
            self.driver.save_screenshot(screenshot_path)
            
            return {
                "success": True,
                "message": f"截图保存到: {screenshot_path}",
                "path": screenshot_path
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"截图失败: {str(e)}"
            }

    def execute_universal_command(self, command: str) -> Dict[str, Any]:
        """执行通用自然语言命令"""
        try:
            print(f"[UNIVERSAL] 执行通用命令: {command}")

            # 简单的命令解析
            command_lower = command.lower()

            if '搜索' in command or 'search' in command_lower:
                # 提取搜索关键词
                if '淘宝' in command:
                    site = 'taobao'
                    url = 'https://www.taobao.com'
                elif '百度' in command:
                    site = 'baidu'
                    url = 'https://www.baidu.com'
                else:
                    site = 'baidu'
                    url = 'https://www.baidu.com'

                # 提取搜索词
                import re
                search_match = re.search(r'搜索["""]?([^"""]+)["""]?', command)
                if search_match:
                    query = search_match.group(1).strip()
                else:
                    # 移除网站名称和动作词，剩下的作为搜索词
                    query = re.sub(r'(在|用|打开|访问)?(淘宝|百度|京东)?(搜索|查找)?', '', command).strip()

                if not query:
                    return {"success": False, "message": "无法提取搜索关键词"}

                # 执行搜索工作流
                nav_result = self.navigate(url)
                if not nav_result.get('success'):
                    return nav_result

                search_result = self.search(query, site)
                return search_result

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

            elif '点击' in command or 'click' in command_lower:
                if '第一' in command or 'first' in command_lower:
                    return self.click_first_result()
                else:
                    return {"success": False, "message": "暂不支持复杂的点击操作"}

            elif '截图' in command or 'screenshot' in command_lower:
                return self.take_screenshot()

            else:
                return {"success": False, "message": f"无法理解命令: {command}"}

        except Exception as e:
            return {"success": False, "message": f"通用命令执行失败: {str(e)}"}

    def execute_workflow(self, workflow: List[Dict[str, Any]]) -> Dict[str, Any]:
        """执行工作流"""
        results = []
        
        for i, step in enumerate(workflow, 1):
            print(f"\n[STEP] 执行步骤 {i}/{len(workflow)}: {step.get('description', step.get('type'))}")
            
            step_type = step.get('type')
            result = {"step": i, "type": step_type, "success": False}
            
            try:
                if step_type == 'navigate':
                    result.update(self.navigate(step.get('url')))
                elif step_type == 'search':
                    result.update(self.search(step.get('query'), step.get('site')))
                elif step_type == 'click':
                    if 'first' in step.get('target', '').lower():
                        result.update(self.click_first_result())
                    else:
                        result.update({"success": False, "message": "暂不支持此点击操作"})
                elif step_type == 'screenshot':
                    result.update(self.take_screenshot())
                elif step_type == 'wait':
                    duration = step.get('duration', 2000) / 1000
                    time.sleep(duration)
                    result.update({"success": True, "message": f"等待 {duration} 秒"})
                elif step_type == 'universal_command':
                    # 处理通用命令
                    command = step.get('command', '')
                    result.update(self.execute_universal_command(command))
                else:
                    result.update({"success": False, "message": f"不支持的步骤类型: {step_type}"})
                    
            except Exception as e:
                result.update({"success": False, "message": f"步骤执行异常: {str(e)}"})
            
            results.append(result)
            
            # 如果步骤失败，询问是否继续
            if not result.get('success'):
                print(f"[WARNING] 步骤 {i} 失败: {result.get('message')}")
                # 可以选择继续或停止
        
        return {
            "success": True,
            "message": f"工作流执行完成，共 {len(workflow)} 个步骤",
            "results": results
        }
    
    def close(self):
        """关闭浏览器"""
        if self.driver:
            self.driver.quit()
            print("[CLOSE] 浏览器已关闭")

def main():
    parser = argparse.ArgumentParser(description='Web自动化工具')
    parser.add_argument('--workflow', type=str, help='工作流JSON文件路径')
    parser.add_argument('--headless', action='store_true', help='无头模式运行')
    args = parser.parse_args()
    
    automation = WebAutomation(headless=args.headless)
    
    try:
        if args.workflow:
            # 从文件读取工作流
            with open(args.workflow, 'r', encoding='utf-8') as f:
                workflow_data = json.load(f)
            
            result = automation.execute_workflow(workflow_data.get('steps', []))
            print(f"\n[RESULT] 执行结果: {json.dumps(result, ensure_ascii=False, indent=2)}")
        else:
            # 示例工作流
            example_workflow = [
                {"type": "navigate", "url": "https://www.taobao.com"},
                {"type": "search", "query": "手机", "site": "taobao"},
                {"type": "click", "target": "第一个商品"},
                {"type": "screenshot"}
            ]

            result = automation.execute_workflow(example_workflow)
            print(f"\n[RESULT] 执行结果: {json.dumps(result, ensure_ascii=False, indent=2)}")

    except KeyboardInterrupt:
        print("\n[INTERRUPT] 用户中断执行")
    except Exception as e:
        print(f"[ERROR] 执行失败: {e}")
    finally:
        automation.close()

if __name__ == "__main__":
    main()
