@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "FLUTTER_BIN=D:\flutter\bin\flutter.bat"
set "SRC_DIR=%SCRIPT_DIR%flutter_publish_tool"
set "STAGE_DIR=%TEMP%\ee2x_flutter_publish_tool_ascii"
set "OUT_DIR=%SCRIPT_DIR%dist\ee2x-flutter-publisher"
set "ALT_OUT_DIR=%SCRIPT_DIR%dist\ee2x-flutter-publisher-next"
set "BRIDGE_EXE=%SCRIPT_DIR%dist\ee2x-bridge.exe"

for /f %%i in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyyMMdd-HHmmss')"') do set "BUILD_ID=%%i"
for /f %%i in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyy-MM-dd HH:mm:ss')"') do set "BUILD_TIME=%%i"

call "%SCRIPT_DIR%build_bridge.bat"
if errorlevel 1 (
  echo [ERROR] Failed to build bridge sidecar.
  exit /b 1
)

if not exist "%BRIDGE_EXE%" (
  echo [ERROR] Missing bridge sidecar after build: %BRIDGE_EXE%
  exit /b 1
)

if not exist "%FLUTTER_BIN%" (
  echo [ERROR] Flutter not found: %FLUTTER_BIN%
  exit /b 1
)

if not exist "%SRC_DIR%\pubspec.yaml" (
  echo [ERROR] Flutter project not found: %SRC_DIR%
  exit /b 1
)

if exist "%STAGE_DIR%" rmdir /s /q "%STAGE_DIR%"
robocopy "%SRC_DIR%" "%STAGE_DIR%" /MIR /XD build .dart_tool >nul
if errorlevel 8 (
  echo [ERROR] Failed to mirror Flutter project to ASCII staging path.
  exit /b 1
)

if exist "%STAGE_DIR%\windows\flutter\ephemeral" rmdir /s /q "%STAGE_DIR%\windows\flutter\ephemeral"

pushd "%STAGE_DIR%"
call "%FLUTTER_BIN%" pub get
if errorlevel 1 (
  popd
  echo [ERROR] flutter pub get failed.
  exit /b 1
)

call "%FLUTTER_BIN%" build windows --dart-define=EE2X_BUILD_ID=%BUILD_ID% --dart-define=EE2X_BUILD_TIME=%BUILD_TIME%
if errorlevel 1 (
  popd
  echo [ERROR] flutter build windows failed.
  exit /b 1
)
popd

if exist "%OUT_DIR%" rmdir /s /q "%OUT_DIR%"
mkdir "%OUT_DIR%"
robocopy "%STAGE_DIR%\build\windows\x64\runner\Release" "%OUT_DIR%" /E >nul
if errorlevel 8 (
  echo [ERROR] Failed to copy build output into official directory: %OUT_DIR%
  echo [WARN] Trying fallback directory for manual recovery...
  if exist "%ALT_OUT_DIR%" rmdir /s /q "%ALT_OUT_DIR%"
  mkdir "%ALT_OUT_DIR%"
  robocopy "%STAGE_DIR%\build\windows\x64\runner\Release" "%ALT_OUT_DIR%" /E >nul
  if errorlevel 8 (
    echo [ERROR] Failed to copy build output into %OUT_DIR% and %ALT_OUT_DIR%.
    exit /b 1
  )
  echo [WARN] Fallback build saved to:
  echo %ALT_OUT_DIR%
  echo [ERROR] Official output directory was not updated. Please close the running EXE and rebuild.
  exit /b 1
)

copy /Y "%BRIDGE_EXE%" "%OUT_DIR%\ee2x-bridge.exe" >nul
if errorlevel 1 (
  echo [ERROR] Failed to copy bridge sidecar into official directory.
  exit /b 1
)

> "%OUT_DIR%\BUILD_INFO.txt" (
  echo BUILD_ID=%BUILD_ID%
  echo BUILD_TIME=%BUILD_TIME%
)

echo [OK] Flutter publisher built to:
echo %OUT_DIR%
echo [OK] Build marker:
echo %BUILD_ID% ^| %BUILD_TIME%
exit /b 0
