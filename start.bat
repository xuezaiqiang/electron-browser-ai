@echo off
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
set LANG=zh_CN.UTF-8
set LC_ALL=zh_CN.UTF-8
echo 🚀 启动Electron应用...
npm start
