@echo off
setlocal
cd /d "%~dp0"
python -m PyInstaller ^
  --noconfirm ^
  --onefile ^
  --windowed ^
  --name ee2x-pack-builder ^
  --paths src ^
  src\ee2x_update_suite\builder_gui\__main__.py
endlocal
