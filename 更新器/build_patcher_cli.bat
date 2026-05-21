@echo off
setlocal
cd /d "%~dp0"
py -3.12 -m PyInstaller ^
  --noconfirm ^
  --onefile ^
  --console ^
  --name ee2x-patcher-cli ^
  --paths src ^
  src\ee2x_update_suite\patcher_v2\__main__.py
endlocal
