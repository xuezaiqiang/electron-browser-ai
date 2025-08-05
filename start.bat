@echo off
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
set LANG=zh_CN.UTF-8
set LC_ALL=zh_CN.UTF-8
set NODE_OPTIONS=--max-old-space-size=4096
echo 启动Electron应用...
echo 当前代码页: %CODEPAGE%
echo 编码设置: UTF-8
npm start
