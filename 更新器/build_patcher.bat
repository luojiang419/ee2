@echo off
setlocal
cd /d "%~dp0"
py -3.12 -m PyInstaller ^
  --noconfirm ^
  --onefile ^
  --windowed ^
  --name ee2x-patcher ^
  --paths src ^
  src\ee2x_update_suite\patcher_v2\__main__.py
endlocal
