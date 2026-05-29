@echo off
setlocal
cd /d "%~dp0"
py -3.12 -m PyInstaller ^
  --noconfirm ^
  --onefile ^
  --console ^
  --name ee2x-bridge ^
  --distpath dist ^
  --workpath build\ee2x-bridge ^
  --specpath build\ee2x-bridge ^
  --paths src ^
  src\ee2x_update_suite\bridge\__main__.py
endlocal
