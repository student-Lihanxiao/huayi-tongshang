@echo off
chcp 65001 >nul
title Huayi Tongshang - Local Server + Public Tunnel

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\launch.ps1"
if errorlevel 1 pause
