const { contextBridge, ipcRenderer, shell } = require('electron')

// 在preload中无法直接访问app，需要通过主进程获取路径

contextBridge.exposeInMainWorld('ee2x', {
  cfgGet: () => ipcRenderer.invoke('cfg:get'),
  cfgSet: (cfg) => ipcRenderer.invoke('cfg:set', cfg),
  detect: () => ipcRenderer.invoke('game:detect'),
  chooseExe: () => ipcRenderer.invoke('game:chooseExe'),
  chooseDir: () => ipcRenderer.invoke('game:chooseDir'),
  chooseImage: () => ipcRenderer.invoke('ui:chooseImage'),
  start: () => ipcRenderer.invoke('game:start'),
  latest: (baseUrl) => ipcRenderer.invoke('server:latest', baseUrl),
  changelog: (baseUrl) => ipcRenderer.invoke('server:changelog', baseUrl),
  versions: (baseUrl) => ipcRenderer.invoke('server:versions', baseUrl),
  versionDetail: (baseUrl, ver) => ipcRenderer.invoke('server:versionDetail', { baseUrl, ver }),
  testServer: (baseUrl) => ipcRenderer.invoke('server:test', baseUrl),
  runUpdate: (latest) => ipcRenderer.invoke('update:run', latest),
  onUpdateProgress: (cb) => ipcRenderer.on('update:progress', (_evt, payload) => { try { cb(payload) } catch {} }),
  onUpdateStage: (cb) => ipcRenderer.on('update:stage', (_evt, payload) => { try { cb(payload) } catch {} }),
  needs: (baseUrl) => ipcRenderer.invoke('update:diff', baseUrl),
  createShortcut: () => ipcRenderer.invoke('shortcut:create'),
  createShortcutInGameDir: () => ipcRenderer.invoke('shortcut:createGameDir')
  ,openConfig: () => ipcRenderer.invoke('cfg:openFile')
  ,reloadConfig: () => ipcRenderer.invoke('cfg:reload')
  ,shortcutExistsDesktop: () => ipcRenderer.invoke('shortcut:existsDesktop')
  ,openExternal: (url) => shell.openExternal(url)
  ,openPageWindow: (url, title) => ipcRenderer.invoke('win:openPageWindow', { url, title })
  ,captureToClipboard: () => ipcRenderer.invoke('win:captureToClipboard')
  ,broadcast: (base) => ipcRenderer.invoke('server:broadcast', base)
  ,results: (base) => ipcRenderer.invoke('server:results', base)
  ,applyResolution: (res) => ipcRenderer.invoke('win:applyResolution', res)
  ,historyGet: () => ipcRenderer.invoke('history:get')
  ,historyDelete: (key) => ipcRenderer.invoke('history:delete', key)
  ,updateCancel: () => ipcRenderer.invoke('update:cancel')
  ,update2Manifest: () => ipcRenderer.invoke('update2:manifest')
  ,update2Download: (url) => ipcRenderer.invoke('update2:download', url)
  ,runUpdater: () => ipcRenderer.invoke('launcher:runUpdater')
  ,extractAndInstallLauncher: () => ipcRenderer.invoke('launcher:extractAndInstall')
  ,restartLauncher: () => ipcRenderer.invoke('launcher:restart')
  ,forceAlign: () => ipcRenderer.invoke('align:prune')
  ,selectFile: (type) => ipcRenderer.invoke('selectFile', type)
  ,setResizable: (resizable) => ipcRenderer.invoke('setResizable', resizable)
  ,getWindowSize: () => ipcRenderer.invoke('getWindowSize')
  ,saveWindowSize: () => ipcRenderer.invoke('saveWindowSize')
  ,saveBackgroundFile: (filePath, fileType) => ipcRenderer.invoke('saveBackgroundFile', { filePath, fileType })
  ,setBackgroundPath: (relativePath, fileType) => ipcRenderer.invoke('setBackgroundPath', { relativePath, fileType })
  ,getBackgroundInfo: () => ipcRenderer.invoke('getBackgroundInfo')
  ,getBackgroundHistory: () => ipcRenderer.invoke('getBackgroundHistory')
  ,getLauncherPath: () => ipcRenderer.invoke('getLauncherPath')
  ,getCurrentVersion: () => ipcRenderer.invoke('getCurrentVersion')
  ,openGameDirectory: () => ipcRenderer.invoke('openGameDirectory')
  ,userGet: () => ipcRenderer.invoke('user:get')
  ,userSet: (u) => ipcRenderer.invoke('user:set', u)
  ,userClear: () => ipcRenderer.invoke('user:clear')
  ,authRegister: (payload) => ipcRenderer.invoke('auth:register', payload)
  ,authLogin: (payload) => ipcRenderer.invoke('auth:login', payload)
  ,authLogout: () => ipcRenderer.invoke('auth:logout')
  ,authUpdateAvatar: (payload) => ipcRenderer.invoke('auth:updateAvatar', payload)
  ,authUpdateSignature: (payload) => ipcRenderer.invoke('auth:updateSignature', payload)
  ,testUserServer: (baseUrl) => ipcRenderer.invoke('userServer:test', baseUrl)
  ,userHeartbeat: () => ipcRenderer.invoke('user:heartbeat')
  ,userRuntimeReport: (payload) => ipcRenderer.invoke('user:runtimeReport', payload)
  ,userRuntimeSummary: () => ipcRenderer.invoke('user:runtimeSummary')
  ,cfgAutoDetectServers: () => ipcRenderer.invoke('cfg:autoDetect')
  ,onNetworkIP: (cb) => ipcRenderer.on('network:ip', (_evt, ip) => { try { cb(ip) } catch {} })
  ,networkStart: () => ipcRenderer.invoke('network:start')
  ,networkStop: () => ipcRenderer.invoke('network:stop')
  ,networkStatus: () => ipcRenderer.invoke('network:status')
  ,networkTest: (addr) => ipcRenderer.invoke('network:test', addr)
  ,userOnlineReport: (payload) => ipcRenderer.invoke('user:onlineReport', payload)
  ,getOnlineUsers: () => ipcRenderer.invoke('user:onlineList')
  ,friendsList: () => ipcRenderer.invoke('friends:list')
  ,friendsAdd: (friend) => ipcRenderer.invoke('friends:add', friend)
  ,friendsRemove: (name) => ipcRenderer.invoke('friends:remove', name)
  ,battleGetRecent: () => ipcRenderer.invoke('battle:getRecent')
  ,battleGetHistory: () => ipcRenderer.invoke('battle:getHistory')
  ,battleGetRecentByPath: (csvPath) => ipcRenderer.invoke('battle:getRecentByPath', csvPath)
  ,battleDeleteRecord: (csvPath) => ipcRenderer.invoke('battle:deleteRecord', csvPath)
  ,battleSaveHotkey: (hotkey) => ipcRenderer.invoke('battle:setHotkey', hotkey)
  ,battleTestApi: () => ipcRenderer.invoke('battle:testApi')
  ,battleOpenCsv: (filePath) => ipcRenderer.invoke('battle:openCsv', filePath)
  ,battleTrigger: () => ipcRenderer.invoke('battle:trigger')
  ,onKicked: (cb) => ipcRenderer.on('user:kicked', (_evt) => { try { cb() } catch {} })
  ,changePassword: (payload) => ipcRenderer.invoke('user:changePassword', payload)
  ,changeUsername: (payload) => ipcRenderer.invoke('user:changeUsername', payload)
  ,getSecurityQuestion: (username) => ipcRenderer.invoke('user:getSecurityQuestion', username)
  ,resetPassword: (payload) => ipcRenderer.invoke('user:resetPassword', payload)
  ,setSecurityQuestion: (payload) => ipcRenderer.invoke('user:setSecurityQuestion', payload)
  ,confirmLogin: (payload) => ipcRenderer.invoke('user:confirmLogin', payload)
  ,onBattleFlash: (cb) => ipcRenderer.on('battle:flash', () => { try { cb() } catch {} })
})
