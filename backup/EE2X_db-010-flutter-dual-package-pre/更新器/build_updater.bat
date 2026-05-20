@echo off
setlocal
cd /d "%~dp0"
py -3.12 -m PyInstaller ^
  --noconfirm ^
  --onefile ^
  --windowed ^
  --name ee2x-up ^
  --paths src ^
  src\ee2x_update_suite\updater_gui\__main__.py
endlocal
