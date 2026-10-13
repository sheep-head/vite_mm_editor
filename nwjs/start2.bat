@echo off
chcp 65001
set p_path=%cd%
D:
cd D:\YT\disk\software\RM\nwjs-sdk-v0.63.1-win-x64
start nw.exe %p_path% test
exit
