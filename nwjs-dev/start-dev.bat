@echo off
chcp 65001
rem 推荐直接双击项目根目录 start-nw.bat（会自动起 Vite :5288 再开 NW.js）
rem 本脚本仅在 Vite 已在 http://127.0.0.1:5288/ 运行时手动打开 NW.js
start %NW_HOME%\nw.exe ./ test
exit
