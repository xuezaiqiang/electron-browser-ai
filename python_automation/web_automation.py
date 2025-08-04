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
import re
import requests

# 设置UTF-8编码
if sys.platform.startswith('win'):
    import locale
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())
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
from bs4 import BeautifulSoup
import argparse

class AIWebAutomation:
    def __init__(self, headless: bool = False, timeout: int = 10, ai_api_url: str = None):
        """初始化AI增强的Web自动化"""
        self.timeout = timeout
        self.driver = None
        self.wait = None
        self.ai_api_url = ai_api_url or "http://localhost:3000/api/ai"  # 默认AI API地址
        self.setup_driver(headless)

        # AI解析缓存
        self.page_analysis_cache = {}
        self.automation_scripts_cache = {}
        
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

    def get_page_html(self) -> str:
        """获取当前页面的HTML结构"""
        try:
            return self.driver.page_source
        except Exception as e:
            print(f"[ERROR] 获取页面HTML失败: {e}")
            return ""

    def simplify_html(self, html: str) -> str:
        """简化HTML结构，只保留关键元素"""
        try:
            soup = BeautifulSoup(html, 'html.parser')

            # 移除不必要的标签
            for tag in soup(['script', 'style', 'meta', 'link', 'noscript']):
                tag.decompose()

            # 移除注释
            from bs4 import Comment
            for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
                comment.extract()

            # 保留关键属性
            important_attrs = ['id', 'class', 'name', 'type', 'placeholder', 'value', 'href', 'src', 'data-*']

            for tag in soup.find_all():
                # 保留重要属性
                attrs_to_keep = {}
                for attr, value in tag.attrs.items():
                    if any(attr.startswith(imp.replace('*', '')) for imp in important_attrs):
                        attrs_to_keep[attr] = value
                tag.attrs = attrs_to_keep

                # 简化文本内容
                if tag.string and len(tag.string.strip()) > 100:
                    tag.string = tag.string.strip()[:100] + "..."

            return str(soup)
        except Exception as e:
            print(f"[ERROR] HTML简化失败: {e}")
            return html

    def send_to_ai(self, prompt: str, html: str = None) -> Dict[str, Any]:
        """发送请求到AI模型进行分析"""
        try:
            payload = {
                "html": html or "",
                "css": "",
                "scripts": "",
                "url": self.driver.current_url if self.driver else "",
                "title": self.driver.title if self.driver else "",
                "metadata": {
                    "type": "automation-analysis",
                    "source": "selenium-automation"
                },
                "structure": {},
                "performance": {},
                "screenshot": None,
                "customPrompt": prompt,
                "automationMode": True
            }

            response = requests.post(
                self.ai_api_url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )

            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    return {
                        "success": True,
                        "content": result.get('documentation') or result.get('content', ''),
                        "analysis": result
                    }
                else:
                    return {
                        "success": False,
                        "error": result.get('error', 'AI分析失败')
                    }
            else:
                return {
                    "success": False,
                    "error": f"AI API请求失败: {response.status_code}"
                }

        except Exception as e:
            print(f"[ERROR] AI请求失败: {e}")
            return {
                "success": False,
                "error": f"AI请求异常: {str(e)}"
            }

    def analyze_page_for_task(self, task_description: str) -> Dict[str, Any]:
        """使用AI分析页面，生成自动化任务的元素定位信息"""
        try:
            print(f"[AI-ANALYZE] 分析页面以执行任务: {task_description}")

            # 获取页面HTML
            html = self.get_page_html()
            simplified_html = self.simplify_html(html)

            # 构建AI分析提示
            prompt = f"""
你是一个专业的网页自动化专家。请分析以下HTML页面结构，为指定的任务生成精确的元素定位信息。

任务描述：{task_description}

请分析页面并返回JSON格式的结果，包含以下信息：

{{
    "success": true/false,
    "task_analysis": {{
        "understood_task": "对任务的理解",
        "required_actions": ["需要执行的动作列表"],
        "target_elements": [
            {{
                "action": "input/click/select/wait",
                "description": "元素描述",
                "selectors": [
                    {{
                        "type": "css/xpath/id/name",
                        "value": "选择器值",
                        "confidence": 0.9
                    }}
                ],
                "input_value": "如果是输入动作，这里是要输入的值",
                "wait_condition": "如果需要等待，这里是等待条件"
            }}
        ]
    }},
    "automation_script": {{
        "steps": [
            {{
                "step": 1,
                "action": "navigate/find_element/input_text/click/wait",
                "selector": "元素选择器",
                "value": "输入值或其他参数",
                "description": "步骤描述",
                "timeout": 10
            }}
        ]
    }},
    "fallback_selectors": [
        "备用选择器列表"
    ],
    "confidence": 0.85,
    "notes": "分析说明和建议"
}}

分析要求：
1. 仔细分析HTML结构，找出最可靠的元素选择器
2. 优先使用id、name等唯一标识符
3. 为每个选择器提供置信度评分
4. 提供多个备用选择器以提高成功率
5. 考虑页面的动态加载和异步更新
6. 生成完整的自动化执行步骤

当前页面URL: {self.driver.current_url if self.driver else 'unknown'}
页面标题: {self.driver.title if self.driver else 'unknown'}

HTML结构（已简化）：
{simplified_html[:8000]}  # 限制长度避免token超限
"""

            # 发送到AI进行分析
            ai_result = self.send_to_ai(prompt, simplified_html)

            if ai_result.get('success'):
                try:
                    # 解析AI返回的JSON
                    analysis = json.loads(ai_result['content'])

                    # 缓存分析结果
                    cache_key = f"{self.driver.current_url}_{hash(task_description)}"
                    self.page_analysis_cache[cache_key] = analysis

                    print(f"[AI-SUCCESS] 页面分析完成，找到 {len(analysis.get('task_analysis', {}).get('target_elements', []))} 个目标元素")
                    return analysis

                except json.JSONDecodeError as e:
                    print(f"[AI-ERROR] AI返回的JSON格式错误: {e}")
                    return {
                        "success": False,
                        "error": "AI返回格式错误",
                        "raw_response": ai_result['content']
                    }
            else:
                return {
                    "success": False,
                    "error": ai_result.get('error', 'AI分析失败')
                }

        except Exception as e:
            print(f"[ERROR] 页面分析失败: {e}")
            return {
                "success": False,
                "error": f"页面分析异常: {str(e)}"
            }

    def execute_ai_generated_script(self, script_data: Dict[str, Any]) -> Dict[str, Any]:
        """执行AI生成的自动化脚本"""
        try:
            print(f"[AI-EXECUTE] 开始执行AI生成的自动化脚本")

            steps = script_data.get('automation_script', {}).get('steps', [])
            if not steps:
                return {
                    "success": False,
                    "error": "没有找到可执行的步骤"
                }

            results = []

            for step in steps:
                step_num = step.get('step', 0)
                action = step.get('action', '')
                selector = step.get('selector', '')
                value = step.get('value', '')
                description = step.get('description', '')
                timeout = step.get('timeout', 10)

                print(f"[STEP-{step_num}] {description}")

                try:
                    if action == 'find_element':
                        element = self.find_element_by_ai_selector(selector, timeout)
                        if element:
                            results.append({
                                "step": step_num,
                                "success": True,
                                "message": f"成功找到元素: {selector}"
                            })
                        else:
                            results.append({
                                "step": step_num,
                                "success": False,
                                "message": f"未找到元素: {selector}"
                            })

                    elif action == 'input_text':
                        element = self.find_element_by_ai_selector(selector, timeout)
                        if element:
                            element.clear()
                            element.send_keys(value)
                            results.append({
                                "step": step_num,
                                "success": True,
                                "message": f"成功输入文本: {value}"
                            })
                        else:
                            results.append({
                                "step": step_num,
                                "success": False,
                                "message": f"输入失败，未找到元素: {selector}"
                            })

                    elif action == 'click':
                        element = self.find_element_by_ai_selector(selector, timeout)
                        if element:
                            element.click()
                            results.append({
                                "step": step_num,
                                "success": True,
                                "message": f"成功点击元素: {selector}"
                            })
                        else:
                            results.append({
                                "step": step_num,
                                "success": False,
                                "message": f"点击失败，未找到元素: {selector}"
                            })

                    elif action == 'wait':
                        wait_time = float(value) if value else 2.0
                        time.sleep(wait_time)
                        results.append({
                            "step": step_num,
                            "success": True,
                            "message": f"等待 {wait_time} 秒"
                        })

                    elif action == 'navigate':
                        self.driver.get(value)
                        time.sleep(2)
                        results.append({
                            "step": step_num,
                            "success": True,
                            "message": f"导航到: {value}"
                        })

                    else:
                        results.append({
                            "step": step_num,
                            "success": False,
                            "message": f"不支持的动作: {action}"
                        })

                except Exception as step_error:
                    results.append({
                        "step": step_num,
                        "success": False,
                        "message": f"步骤执行异常: {str(step_error)}"
                    })

                # 步骤间等待
                time.sleep(1)

            # 统计执行结果
            success_count = sum(1 for r in results if r.get('success'))
            total_count = len(results)

            return {
                "success": success_count > 0,
                "message": f"脚本执行完成: {success_count}/{total_count} 步骤成功",
                "results": results,
                "success_rate": success_count / total_count if total_count > 0 else 0
            }

        except Exception as e:
            print(f"[ERROR] AI脚本执行失败: {e}")
            return {
                "success": False,
                "error": f"脚本执行异常: {str(e)}"
            }

    def find_element_by_ai_selector(self, selector_info: str, timeout: int = 10):
        """根据AI提供的选择器信息查找元素"""
        try:
            # 如果selector_info是字符串，直接使用
            if isinstance(selector_info, str):
                selectors = [{"type": "css", "value": selector_info, "confidence": 0.8}]
            else:
                # 如果是复杂对象，解析选择器列表
                selectors = selector_info if isinstance(selector_info, list) else [selector_info]

            # 按置信度排序，优先尝试高置信度的选择器
            selectors.sort(key=lambda x: x.get('confidence', 0), reverse=True)

            for selector in selectors:
                try:
                    selector_type = selector.get('type', 'css').lower()
                    selector_value = selector.get('value', '')

                    if not selector_value:
                        continue

                    print(f"[FIND] 尝试选择器: {selector_type} = {selector_value}")

                    if selector_type == 'css':
                        element = WebDriverWait(self.driver, timeout).until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, selector_value))
                        )
                    elif selector_type == 'xpath':
                        element = WebDriverWait(self.driver, timeout).until(
                            EC.presence_of_element_located((By.XPATH, selector_value))
                        )
                    elif selector_type == 'id':
                        element = WebDriverWait(self.driver, timeout).until(
                            EC.presence_of_element_located((By.ID, selector_value))
                        )
                    elif selector_type == 'name':
                        element = WebDriverWait(self.driver, timeout).until(
                            EC.presence_of_element_located((By.NAME, selector_value))
                        )
                    elif selector_type == 'class':
                        element = WebDriverWait(self.driver, timeout).until(
                            EC.presence_of_element_located((By.CLASS_NAME, selector_value))
                        )
                    else:
                        print(f"[WARNING] 不支持的选择器类型: {selector_type}")
                        continue

                    # 检查元素是否可见和可交互
                    if element.is_displayed() and element.is_enabled():
                        print(f"[SUCCESS] 找到可用元素: {selector_type} = {selector_value}")
                        return element
                    else:
                        print(f"[WARNING] 元素不可交互: {selector_type} = {selector_value}")
                        continue

                except TimeoutException:
                    print(f"[TIMEOUT] 选择器超时: {selector_type} = {selector_value}")
                    continue
                except Exception as e:
                    print(f"[ERROR] 选择器错误: {selector_type} = {selector_value}, 错误: {e}")
                    continue

            print(f"[FAILED] 所有选择器都失败了")
            return None

        except Exception as e:
            print(f"[ERROR] 元素查找异常: {e}")
            return None

    def execute_smart_task(self, task_description: str) -> Dict[str, Any]:
        """执行智能任务：分析页面 + 生成脚本 + 执行操作"""
        try:
            print(f"[SMART-TASK] 开始执行智能任务: {task_description}")

            # 第一步：AI分析页面
            analysis_result = self.analyze_page_for_task(task_description)

            if not analysis_result.get('success'):
                return {
                    "success": False,
                    "error": f"页面分析失败: {analysis_result.get('error')}",
                    "stage": "analysis"
                }

            # 第二步：执行AI生成的脚本
            execution_result = self.execute_ai_generated_script(analysis_result)

            return {
                "success": execution_result.get('success', False),
                "message": execution_result.get('message', ''),
                "analysis": analysis_result,
                "execution": execution_result,
                "task_description": task_description
            }

        except Exception as e:
            print(f"[ERROR] 智能任务执行失败: {e}")
            return {
                "success": False,
                "error": f"智能任务异常: {str(e)}",
                "stage": "execution"
            }
    
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

    def execute_universal_command(self, command: str, use_ai: bool = True) -> Dict[str, Any]:
        """执行通用自然语言命令 - AI增强版本"""
        try:
            print(f"[UNIVERSAL] 执行通用命令: {command}")

            # 如果启用AI，优先使用AI智能分析
            if use_ai:
                print(f"[AI-MODE] 使用AI智能分析命令")

                # 检查是否需要先导航到网站
                command_lower = command.lower()
                target_url = None

                if '淘宝' in command:
                    target_url = 'https://www.taobao.com'
                elif '百度' in command:
                    target_url = 'https://www.baidu.com'
                elif '京东' in command:
                    target_url = 'https://www.jd.com'
                elif '知乎' in command:
                    target_url = 'https://www.zhihu.com'

                # 如果需要导航且当前不在目标网站
                if target_url and (not self.driver.current_url.startswith(target_url.split('/')[2])):
                    print(f"[NAVIGATE] 先导航到目标网站: {target_url}")
                    nav_result = self.navigate(target_url)
                    if not nav_result.get('success'):
                        return nav_result

                    # 等待页面加载
                    time.sleep(3)

                # 使用AI智能分析和执行
                return self.execute_smart_task(command)

            # 回退到传统的命令解析
            print(f"[TRADITIONAL-MODE] 使用传统命令解析")
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
    parser = argparse.ArgumentParser(description='AI增强的Web自动化工具')
    parser.add_argument('--workflow', type=str, help='工作流JSON文件路径')
    parser.add_argument('--headless', action='store_true', help='无头模式运行')
    parser.add_argument('--command', type=str, help='直接执行的自然语言命令')
    parser.add_argument('--ai-api', type=str, help='AI API地址', default='http://localhost:3000/api/ai')
    parser.add_argument('--no-ai', action='store_true', help='禁用AI功能，使用传统模式')
    args = parser.parse_args()

    automation = AIWebAutomation(headless=args.headless, ai_api_url=args.ai_api)
    
    try:
        if args.command:
            # 直接执行自然语言命令
            print(f"[COMMAND] 执行命令: {args.command}")
            use_ai = not args.no_ai
            result = automation.execute_universal_command(args.command, use_ai=use_ai)
            print(f"\n[RESULT] 执行结果: {json.dumps(result, ensure_ascii=False, indent=2)}")

        elif args.workflow:
            # 从文件读取工作流
            with open(args.workflow, 'r', encoding='utf-8') as f:
                workflow_data = json.load(f)

            result = automation.execute_workflow(workflow_data.get('steps', []))
            print(f"\n[RESULT] 执行结果: {json.dumps(result, ensure_ascii=False, indent=2)}")

        else:
            # AI增强的示例工作流
            print("[DEMO] 运行AI增强的示例...")

            # 示例1：智能搜索
            demo_command = "在百度搜索今日天气"
            print(f"\n[DEMO-1] 执行: {demo_command}")
            result1 = automation.execute_universal_command(demo_command, use_ai=True)
            print(f"结果: {result1.get('message', '执行完成')}")

            time.sleep(3)

            # 示例2：淘宝搜索
            demo_command2 = "在淘宝搜索手机"
            print(f"\n[DEMO-2] 执行: {demo_command2}")
            result2 = automation.execute_universal_command(demo_command2, use_ai=True)
            print(f"结果: {result2.get('message', '执行完成')}")

            print(f"\n[DEMO-RESULT] 演示完成")

    except KeyboardInterrupt:
        print("\n[INTERRUPT] 用户中断执行")
    except Exception as e:
        print(f"[ERROR] 执行失败: {e}")
    finally:
        automation.close()

if __name__ == "__main__":
    main()
