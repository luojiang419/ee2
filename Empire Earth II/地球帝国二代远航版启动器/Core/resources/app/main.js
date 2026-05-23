const { app, BrowserWindow, ipcMain, dialog, shell, Menu, globalShortcut, screen, desktopCapturer, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const axios = require('axios')
const crypto = require('crypto')
const os = require('os')
const sshUploader = require('./sshUploader')
const battleParser = require('./battleParser')

let win
let tray = null
let gameScoreHotkeyRegistered = false
let recentBattleSummary = null
let recentBattleCachePath = path.join(getAppRoot(), 'Logs', 'battle-recent.json')
let battleCsvDir = path.join(getAppRoot(), 'data', 'game-csv')
let battleShotDir = path.join(getAppRoot(), 'data', 'Settlement-img')
let launcherReplacementInProgress = false
let embeddedGameUpdateInProgress = false


function createTray() {
  try {
    const { Tray, Menu } = require('electron')
    if (tray) return
    tray = new Tray(ICON_PATH)
    const contextMenu = Menu.buildFromTemplate([
      { label: '显示主界面', click: () => {
          if (win) {
            win.show()
            if (win.isMinimized()) win.restore()
            win.focus()
          }
      }},
      { label: '退出', click: () => {
          app.isQuitting = true
          if (win) win.destroy()
          app.quit()
      }}
    ])
    tray.setToolTip('EE2X 启动器')
    tray.setContextMenu(contextMenu)
    
    tray.on('click', () => {
      if (win) {
        if (win.isVisible()) {
           if (win.isMinimized()) {
             win.restore()
           } else {
             // 如果已经在前台，点击托盘可能是想隐藏？或者只是聚焦
             // 通常行为是点击显示/隐藏切换，或者总是显示
             // 这里我们实现：如果可见则聚焦，如果隐藏则显示
             win.focus()
           }
        } else {
          win.show()
          win.focus()
        }
      }
    })
  } catch (e) {
    log(`createTray error: ${e}`)
  }
}

function log(msg){
  try {
    const line = `[${new Date().toISOString()}] ${msg}\n`
    // 改为 AppRoot 下的 Logs 文件夹
    const p = path.join(getAppRoot(), 'Logs', 'launcher.log')
    fse.ensureDirSync(path.dirname(p))
    fs.appendFileSync(p, line)
  } catch {}
}

function prepareForLauncherReplacement(reason){
  try {
    launcherReplacementInProgress = true
    app.isQuitting = true
    try {
      if (typeof app.releaseSingleInstanceLock === 'function') {
        app.releaseSingleInstanceLock()
        log(`[LauncherRestart] 已释放单实例锁，原因: ${reason}`)
      }
    } catch (error) {
      log(`[LauncherRestart] 释放单实例锁失败 (${reason}): ${error}`)
    }
    try {
      if (win && !win.isDestroyed()) {
        win.hide()
        win.destroy()
      }
    } catch (error) {
      log(`[LauncherRestart] 关闭主窗口失败 (${reason}): ${error}`)
    }
    setTimeout(() => {
      try {
        if (launcherReplacementInProgress) {
          log(`[LauncherRestart] 退出兜底触发，强制结束旧进程: ${reason}`)
          app.exit(0)
        }
      } catch {}
    }, 1500)
  } catch (error) {
    log(`[LauncherRestart] 准备替换进程失败 (${reason}): ${error}`)
  }
}

function getGameDir(){
  const exeDir = path.dirname(process.execPath)
  return exeDir
}

function getAppRoot(){
  const exeDir = getGameDir()
  if (path.basename(exeDir).toLowerCase() === 'core') {
    return path.dirname(exeDir)
  }
  return exeDir
}

function getConfigPath(){
  return path.join(getAppRoot(), 'Config', 'ee2x-launcher.json')
}
function getSettingsPath(){
  return path.join(getAppRoot(), 'Config', 'ee2x-settings.json')
}
function getLauncherPublicDefaultsPath(){
  return path.join(getAppRoot(), 'Defaults', 'launcher-public.json')
}
function getLocalListPath(){
  return path.join(getAppRoot(), 'List', 'ee2x-user-list.json')
}
function getServerListPath(){
  return path.join(getAppRoot(), 'List', 'ee2x-server-list.json')
}
function getHistoryPath(){
  return path.join(getAppRoot(), 'Logs', 'update-history.json')
}

const PUBLIC_CONFIG_KEYS = new Set([
  'serverUrl',
  'userServerUrl',
  'updateServerHttp',
  'serverUrlPrimary',
  'serverUrlBackup',
  'updateServerWs',
  'networkServer',
  'battleApiUrl',
  'battleApiModel'
])

const LAUNCHER_PRIVATE_CONFIG_KEYS = [
  'gameExe',
  'gameExePath',
  'gameDir',
  'preferredResolution',
  'windowSize',
  'bgImagePosition',
  'bgImagePath',
  'bgType',
  'bgVideoPath',
  'bgVideoVolume',
  'bgFileType',
  'bgBlur',
  'theme',
  'battleHotkey',
  'battleApiKey',
  'askedDesktop',
  'networkMode',
  'tapStrategy',
  'broadcastMode',
  'closeAction',
  'launcherAutoUpdate',
  'updateChannel'
]

const SETTINGS_PRIVATE_CONFIG_KEYS = [
  'preferredResolution',
  'bgImagePath',
  'bgType',
  'bgVideoPath',
  'bgVideoVolume',
  'bgFileType',
  'bgBlur',
  'gameExe',
  'networkMode',
  'tapStrategy',
  'broadcastMode',
  'closeAction',
  'battleHotkey',
  'battleApiKey',
  'theme',
  'launcherAutoUpdate'
]

function readJsonFileSafe(filePath){
  try {
    if (!fs.existsSync(filePath)) return {}
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) || {}
  } catch { return {} }
}

function pickKeys(source, keys){
  const picked = {}
  if (!source || typeof source !== 'object') return picked
  const iterable = keys instanceof Set ? Array.from(keys) : keys
  for (const key of iterable) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      picked[key] = source[key]
    }
  }
  return picked
}
function findLauncherExecutablePath(){
  const candidates = [
    path.join(getGameDir(), '地球帝国二代远航版启动器.exe'),
    path.join(getAppRoot(), 'Core', '地球帝国二代远航版启动器.exe'),
    path.join(getAppRoot(), '地球帝国二代远航版启动器.exe')
  ]
  for (const candidate of candidates){
    if (fs.existsSync(candidate)) return candidate
  }
  return candidates[0]
}
const GAME_EXE_CANDIDATES = ['EE2X.exe', 'ee2x.exe', 'EE2.exe', 'Empire Earth II.exe']
const GAME_ROOT_MARKERS = ['UP15.dll', 'UP15_GameHelper.dll', 'UnofficialVersionConfig.txt', 'zips_ee2x', 'zips']
const GAME_ROOT_ERROR_MESSAGE = '未检测到完整的游戏根目录，请确认 Empire Earth II 根目录下存在 EE2X.exe 以及 UP1.5 基础文件（如 UP15.dll / UnofficialVersionConfig.txt / zips_ee2x）。官方一键更新不会自动补齐这些冻结区文件。'

function normalizePathSafe(targetPath){
  try {
    const text = String(targetPath || '').trim()
    if (!text) return ''
    return path.resolve(text)
  } catch {
    return String(targetPath || '').trim()
  }
}

function uniquePaths(paths){
  const seen = new Set()
  const result = []
  for (const candidate of paths || []) {
    const normalized = normalizePathSafe(candidate)
    if (!normalized) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
  }
  return result
}

function getGameExeCandidates(cfg){
  const configured = String((cfg && cfg.gameExe) || '').trim()
  return Array.from(new Set([configured, ...GAME_EXE_CANDIDATES].filter(Boolean)))
}
function isPathInside(parentPath, childPath){
  try {
    const parent = path.resolve(parentPath)
    const child = path.resolve(childPath)
    const relative = path.relative(parent, child)
    return relative && !relative.startsWith('..') && !path.isAbsolute(relative)
  } catch {
    return false
  }
}
function isLauncherInternalPath(targetPath){
  try {
    const normalized = normalizePathSafe(targetPath)
    const appRoot = normalizePathSafe(getAppRoot())
    const exeDir = normalizePathSafe(getGameDir())
    const coreDir = normalizePathSafe(path.join(getAppRoot(), 'Core'))
    if (!normalized) return false
    return normalized === appRoot || normalized === exeDir || normalized === coreDir || isPathInside(appRoot, normalized) || isPathInside(coreDir, normalized)
  } catch {
    return false
  }
}

function isUnofficialPatchSubdir(targetPath){
  try {
    const normalized = normalizePathSafe(targetPath)
    if (!normalized) return false
    return /[\\/]Unofficial Patch Files([\\/]|$)/i.test(normalized)
  } catch {
    return false
  }
}

function isTemporaryGamePath(targetPath){
  try {
    const normalized = normalizePathSafe(targetPath)
    if (!normalized) return false
    return /[\\/]temp_update([\\/]|$)/i.test(normalized) || /[\\/]update[\\/]runtime[\\/]staging([\\/]|$)/i.test(normalized)
  } catch {
    return false
  }
}

function getGameRootMarkers(dir){
  try {
    return GAME_ROOT_MARKERS.filter(name => fs.existsSync(path.join(dir, name)))
  } catch {
    return []
  }
}

function findRootGameExecutable(dir, candidates){
  try {
    for (const name of candidates || GAME_EXE_CANDIDATES) {
      const candidate = path.join(dir, name)
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate
      }
    }
  } catch {
    return null
  }
  return null
}

function inspectGameRootDirectory(dir, candidates){
  try {
    const normalizedDir = normalizePathSafe(dir)
    if (!normalizedDir) return { ok: false, reason: 'empty-path' }
    if (!fs.existsSync(normalizedDir)) return { ok: false, reason: 'missing-path' }
    if (!fs.statSync(normalizedDir).isDirectory()) return { ok: false, reason: 'not-directory' }
    if (isLauncherInternalPath(normalizedDir)) return { ok: false, reason: 'launcher-internal' }
    if (isUnofficialPatchSubdir(normalizedDir)) return { ok: false, reason: 'unofficial-patch-subdir' }
    if (isTemporaryGamePath(normalizedDir)) return { ok: false, reason: 'temporary-update-dir' }
    const gameExePath = findRootGameExecutable(normalizedDir, candidates)
    if (!gameExePath) return { ok: false, reason: 'missing-root-exe' }
    const markers = getGameRootMarkers(normalizedDir)
    if (markers.length === 0) {
      return { ok: false, reason: 'missing-root-markers', gameExePath }
    }
    return { ok: true, gameDir: normalizedDir, gameExePath, markers }
  } catch (error) {
    return { ok: false, reason: `inspect-error:${error && error.message || error}` }
  }
}

function looksLikeRealGameDir(dir, candidates){
  return !!inspectGameRootDirectory(dir, candidates).ok
}

function isEmbeddedLauncherGameDir(dirPath){
  return isLauncherInternalPath(dirPath)
}

function isEmbeddedLauncherGameExe(exePath){
  return isLauncherInternalPath(exePath)
}

function findCanonicalGameRootFromCandidate(candidate, candidates){
  try {
    const sourcePath = normalizePathSafe(candidate)
    if (!sourcePath) return null
    let currentPath = sourcePath
    if (fs.existsSync(currentPath)) {
      try {
        if (fs.statSync(currentPath).isFile()) currentPath = path.dirname(currentPath)
      } catch {}
    } else if (/\.exe$/i.test(currentPath)) {
      currentPath = path.dirname(currentPath)
    } else {
      return { ok: false, sourcePath, reason: 'missing-path' }
    }

    const visited = new Set()
    for (let i = 0; i < 12; i++) {
      const normalizedCurrent = normalizePathSafe(currentPath)
      if (!normalizedCurrent) break
      const key = normalizedCurrent.toLowerCase()
      if (visited.has(key)) break
      visited.add(key)
      const inspection = inspectGameRootDirectory(normalizedCurrent, candidates)
      if (inspection.ok) {
        return { ...inspection, sourcePath }
      }
      const parent = path.dirname(normalizedCurrent)
      if (!parent || parent === normalizedCurrent) {
        return { ok: false, sourcePath, reason: inspection.reason }
      }
      currentPath = parent
    }
  } catch {
    return null
  }
  return null
}

function collectGameLocationCandidates(cfg){
  const rootDir = getAppRoot()
  const launcherDir = getGameDir()
  const rootParent = path.dirname(rootDir)
  const launcherParent = path.dirname(launcherDir)
  const candidates = [
    cfg && cfg.gameExePath,
    cfg && cfg.gameDir,
    rootParent,
    rootDir,
    launcherParent,
    launcherDir
  ]
  let cursor = rootDir
  for (let i = 0; i < 8; i++) {
    candidates.push(cursor)
    const next = path.dirname(cursor)
    if (!next || next === cursor) break
    candidates.push(path.join(next, 'Empire Earth II'))
    cursor = next
  }
  return uniquePaths(candidates)
}

function resolveConfiguredGameLocation(cfg){
  try {
    const exeCandidates = getGameExeCandidates(cfg)
    for (const candidate of collectGameLocationCandidates(cfg)) {
      const result = findCanonicalGameRootFromCandidate(candidate, exeCandidates)
      if (result && result.ok) {
        return {
          gameDir: result.gameDir,
          gameExePath: result.gameExePath,
          markers: result.markers || [],
          sourcePath: result.sourcePath || '',
          repaired: !!(result.sourcePath && normalizePathSafe(result.sourcePath).toLowerCase() !== normalizePathSafe(result.gameExePath).toLowerCase())
        }
      }
    }
    return null
  } catch {
    return null
  }
}

function resolveGameBase(cfg){
  try {
    const resolved = resolveConfiguredGameLocation(cfg)
    if (resolved && resolved.gameDir) return resolved.gameDir
    return path.dirname(getAppRoot())
  } catch {
    return path.dirname(getAppRoot())
  }
}

function normalizeGameLocationInConfig(cfg, logContext = 'config'){
  try {
    const nextCfg = cfg && typeof cfg === 'object' ? cfg : {}
    const originalGameExePath = String(nextCfg.gameExePath || '').trim()
    const originalGameDir = String(nextCfg.gameDir || '').trim()
    const resolved = resolveConfiguredGameLocation(nextCfg)
    if (resolved) {
      nextCfg.gameDir = resolved.gameDir
      nextCfg.gameExePath = resolved.gameExePath
      nextCfg.gameExe = path.basename(resolved.gameExePath)
      const changed = originalGameDir !== resolved.gameDir || originalGameExePath !== resolved.gameExePath
      if (changed) {
        log(`[GamePath] ${logContext} 已修正游戏路径: exe="${originalGameExePath || '(空)'}", dir="${originalGameDir || '(空)'}" -> exe="${resolved.gameExePath}", dir="${resolved.gameDir}"`)
      }
      return { ok: true, changed, resolved }
    }
    if (originalGameDir || originalGameExePath) {
      log(`[GamePath] ${logContext} 未找到合法游戏根目录，已清空坏路径: exe="${originalGameExePath || '(空)'}", dir="${originalGameDir || '(空)'}"`)
    }
    nextCfg.gameDir = ''
    nextCfg.gameExePath = ''
    return { ok: false, changed: !!(originalGameDir || originalGameExePath), resolved: null }
  } catch (error) {
    log(`[GamePath] ${logContext} 路径归一化失败: ${error && error.message || error}`)
    return { ok: false, changed: false, resolved: null }
  }
}
function excludedRoot(){
  try { return path.normalize('d:\\app\\新版启动器\\地球帝国二代远航版启动器') } catch { return 'd:\\app\\新版启动器\\地球帝国二代远航版启动器' }
}
function isExcludedPath(p){
  // 用户要求取消所有保护，不再排除任何路径
  return false;
}
function loadHistory(){
  try { return JSON.parse(fs.readFileSync(getHistoryPath(), 'utf-8')) || [] } catch { return [] }
}
function saveHistory(items){
  try { fse.ensureDirSync(path.dirname(getHistoryPath())); fs.writeFileSync(getHistoryPath(), JSON.stringify(items, null, 2)) } catch {}
}

function getBattleHistoryPath(){
  return path.join(getAppRoot(), 'Logs', 'battle-history.json')
}
function getBattleRecentPath(){
  return path.join(getAppRoot(), 'Logs', 'battle-recent.json')
}
function getBattleShotDir(){
  return path.join(getAppRoot(), 'data', 'Settlement-img')
}
function getBattleCsvDir(){
  return path.join(getAppRoot(), 'data', 'game-csv')
}
function ensureBattleDirs(){
  try { fse.ensureDirSync(getBattleShotDir()) } catch {}
  try { fse.ensureDirSync(getBattleCsvDir()) } catch {}
  try { fse.ensureDirSync(path.dirname(getBattleRecentPath())) } catch {}
}

// CSV文件缓存
const csvDataCache = new Map()

// 扫描CSV目录，返回按时间戳降序排列的文件列表
function scanCsvFiles() {
  try {
    const csvDir = getBattleCsvDir()
    if (!fs.existsSync(csvDir)) {
      log('[Battle] CSV目录不存在，返回空列表')
      return []
    }
    const files = fs.readdirSync(csvDir)
    const pattern = /^ee2x-(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})-.+\.csv$/
    const result = []
    for (const fileName of files) {
      const m = fileName.match(pattern)
      if (!m) continue
      const ts = m[1] // e.g. '2026-03-27-13-48-35'
      const filePath = path.join(csvDir, fileName)
      // 格式化为可读时间
      const parts = ts.split('-')
      const time = `${parts[0]}-${parts[1]}-${parts[2]} ${parts[3]}:${parts[4]}:${parts[5]}`
      result.push({ fileName, filePath, timestamp: ts, time })
    }
    // 按时间戳降序排列（最新的在前）
    result.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    return result
  } catch (e) {
    log(`[Battle] 扫描CSV目录失败: ${e && e.message || e}`)
    return []
  }
}

// 解析单个CSV文件，返回结算数据对象
function parseCsvFile(filePath) {
  try {
    // 检查缓存
    if (csvDataCache.has(filePath)) {
      return csvDataCache.get(filePath)
    }
    if (!fs.existsSync(filePath)) {
      log(`[Battle] CSV文件不存在: ${filePath}`)
      return null
    }
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
    if (lines.length === 0) {
      log(`[Battle] CSV文件为空: ${filePath}`)
      return null
    }
    const duration = battleParser.extractBattleDurationFromText(content)
    const rows = battleParser.dedupeBattleRows(parseBattleRows(content))
    if (rows.length === 0) {
      log(`[Battle] CSV文件未解析到有效结算行: ${filePath}`)
      return null
    }
    // 从文件名提取时间戳
    const fileName = path.basename(filePath)
    const m = fileName.match(/^ee2x-(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})/)
    let time = ''
    if (m) {
      const p = m[1].split('-')
      time = `${p[0]}-${p[1]}-${p[2]} ${p[3]}:${p[4]}:${p[5]}`
    }
    // 排序：获胜方在前，各组内按总分降序
    const sortedRows = sortBattleRows(rows)
    const result = { time, duration, csvPath: filePath, rows: sortedRows }
    // 写入缓存
    csvDataCache.set(filePath, result)
    return result
  } catch (e) {
    log(`[Battle] 解析CSV文件失败: ${filePath}, 错误: ${e && e.message || e}`)
    return null
  }
}

function loadBattleHistory(){
  // 优先从JSON文件读取（OCR功能生成的数据）
  try {
    const jsonPath = getBattleHistoryPath()
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
      if (Array.isArray(data) && data.length > 0) return data
    }
  } catch {}
  // 回退：从CSV文件读取
  try {
    const files = scanCsvFiles()
    if (files.length === 0) return []
    return files.slice(0, 20).map(f => ({
      time: f.time,
      duration: '',
      csvPath: f.filePath,
      rows: [] // 历史列表不加载完整rows，节省性能
    }))
  } catch (e) {
    log(`[Battle] loadBattleHistory CSV回退失败: ${e && e.message || e}`)
    return []
  }
}
function saveBattleHistory(items){
  try { ensureBattleDirs(); fs.writeFileSync(getBattleHistoryPath(), JSON.stringify(items, null, 2)) } catch {}
}
function loadBattleRecent(){
  // 优先从JSON文件读取（OCR功能生成的数据）
  try {
    const jsonPath = getBattleRecentPath()
    if (fs.existsSync(jsonPath)) {
      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
      if (data && data.rows) return data
    }
  } catch {}
  // 回退：从CSV文件读取
  try {
    const files = scanCsvFiles()
    if (files.length === 0) return null
    const latest = files[0]
    return parseCsvFile(latest.filePath)
  } catch (e) {
    log(`[Battle] loadBattleRecent CSV回退失败: ${e && e.message || e}`)
    return null
  }
}
function saveBattleRecent(item){
  try { ensureBattleDirs(); fs.writeFileSync(getBattleRecentPath(), JSON.stringify(item, null, 2)) } catch {}
}
function normalizeBattleHotkey(hotkey){
  return String(hotkey || '').trim()
}
function unregisterBattleHotkey(){
  try {
    if (registerBattleHotkey._hotkey && globalShortcut.isRegistered(registerBattleHotkey._hotkey)) {
      globalShortcut.unregister(registerBattleHotkey._hotkey)
    }
  } catch {}
  registerBattleHotkey._hotkey = ''
  gameScoreHotkeyRegistered = false
}
function getBattleTimestamp(){
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}-${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`
}
function buildBattlePrompt(){
  return '请识别这张游戏结算截图。如果这不是游戏结算页面，只输出 NOT_SETTLEMENT。否则第一行输出游戏时长，格式：游戏时长,<时长值>。然后只输出 CSV 文本，表头固定为：玩家姓名,游戏分数,军事分数,经济分数,帝国分数,总分数。每行一位玩家。只提取图片里直接可见的原始数据，不要推断队伍，不要判断获胜/落败，不要输出颜色名、序号、说明文字、Markdown 或任何额外解释。'
}
function buildBattleDurationPrompt(){
  return '请只识别这张游戏结算截图底部的总游戏时间。如果不是结算页面，只输出 NOT_SETTLEMENT；如果能识别到时长，只输出类似 45:18 或 1:25:41 的时间文本，不要解释。'
}
function resolveBattleApiUrl(apiBase){
  const raw = String(apiBase || 'http://192.168.0.211:1234/v1/responses').trim()
  if (/\/chat\/completions$/i.test(raw)) return raw
  if (/\/responses$/i.test(raw)) return raw.replace(/\/responses$/i, '/chat/completions')
  return raw
}
async function requestBattleCompletion(image, cfg, prompt, maxTokens = 2000){
  const model = String(cfg.battleApiModel || 'qwen3.5-9b-vlm').trim()
  const apiUrl = resolveBattleApiUrl(cfg.battleApiUrl)
  const apiKey = String(cfg.battleApiKey || '').trim()
  const b64 = image.toPNG().toString('base64')
  const payload = {
    model,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } }
      ]
    }],
    max_tokens: maxTokens
  }
  const headers = { 'Content-Type': 'application/json' }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  const res = await axios.post(apiUrl, payload, { timeout: 120000, headers })
  const out = res && res.data
  let text = ''
  if (out && out.choices && out.choices[0] && out.choices[0].message) {
    text = out.choices[0].message.content || ''
  } else {
    text = extractResponsesText(out)
  }
  return { apiUrl, model, status: res.status, text, raw: out }
}
function isBattleOcrModel(model){
  return /ocr/i.test(String(model || ''))
}
async function captureBattleImage(){
  const displays = screen.getAllDisplays()
  if (!displays || displays.length === 0) throw new Error('未找到屏幕')
  const display = screen.getPrimaryDisplay()
  const width = Math.max(1, Math.round(display.size.width * (display.scaleFactor || 1)))
  const height = Math.max(1, Math.round(display.size.height * (display.scaleFactor || 1)))
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width, height } })
  const src = sources && sources[0]
  if (!src) throw new Error('未获取到屏幕截图源')
  return src.thumbnail.crop({ x: 0, y: 0, width, height })
}
function writeBattlePng(image, filePath){
  const buf = image.toPNG()
  fse.ensureDirSync(path.dirname(filePath))
  fs.writeFileSync(filePath, buf)
}
function parseCsvText(text){
  return battleParser.parseCsvText(text)
}
function parseBattleResponse(text){
  return battleParser.parseBattleResponse(text)
}
function parseOcrResponse(text){
  return battleParser.parseOcrResponse(text)
}
function parseCsvLine(line){
  return battleParser.parseCsvLine(line)
}
function parseBattleRows(csvText){
  return battleParser.parseBattleRows(csvText)
}
function getNameSimilarity(a, b){
  const x = String(a || '').replace(/\s+/g, '').toLowerCase()
  const y = String(b || '').replace(/\s+/g, '').toLowerCase()
  let count = 0
  const chars = new Set(x.split(''))
  for (const ch of y) { if (chars.has(ch)) count++ }
  return count
}
function classifyBattleRow(row){
  return battleParser.classifyBattleRow(row)
}
function applyBattleOutcomeInference(rows){
  return battleParser.applyBattleOutcomeInference(rows)
}
function dedupeBattleRows(rows){
  return battleParser.dedupeBattleRows(rows)
}
function normalizeBattleDuration(value){
  return battleParser.normalizeBattleDuration(value)
}
function extractBattleDurationFromText(text){
  return battleParser.extractBattleDurationFromText(text)
}
function sortBattleRows(rows) {
  return battleParser.sortBattleRows(rows)
}
function buildBattleCsv(rows, duration) {
  return battleParser.buildBattleCsv(rows, duration)
}
function showBattleFlash(){
  try {
    // 方案1：调用独立的 FlashScreen.exe 实现系统级全屏闪白（可覆盖全屏游戏）
    try {
      const flashExe = path.join(getGameDir(), 'FlashScreen.exe')
      if (fs.existsSync(flashExe)) {
        require('child_process').spawn(flashExe, ['120', '350'], {
          detached: true,
          stdio: 'ignore'
        }).unref()
        // exe 已启动，同时通知渲染进程做启动器内闪白
        if (win && !win.isDestroyed()) win.webContents.send('battle:flash')
        return
      }
    } catch {}
    // 方案2：回退 - 通知渲染进程在启动器窗口内闪白
    if (win && !win.isDestroyed()) {
      win.webContents.send('battle:flash')
    }
    // 方案3：回退 - 尝试 Electron 原生全屏白色窗口
    try {
      const display = screen.getPrimaryDisplay()
      const b = display.bounds
      const flash = new BrowserWindow({
        x: b.x, y: b.y,
        width: b.width, height: b.height,
        frame: false, transparent: false,
        resizable: false, movable: false,
        minimizable: false, maximizable: false,
        closable: false, skipTaskbar: true,
        alwaysOnTop: true, focusable: false,
        show: false, backgroundColor: '#ffffff',
        hasShadow: false, type: 'toolbar',
        webPreferences: { backgroundThrottling: false }
      })
      flash.setIgnoreMouseEvents(true)
      flash.setAlwaysOnTop(true, 'screen-saver', 1)
      flash.showInactive()
      setTimeout(() => { try { flash.close() } catch {} }, 600)
    } catch {}
  } catch {}
}
function extractResponsesText(out){
  if (Array.isArray(out && out.output)) {
    // 只提取 type === 'message' 的内容，跳过 reasoning
    return out.output
      .filter(x => x && x.type === 'message')
      .map(x => Array.isArray(x && x.content) ? x.content.map(c => c.text || '').join('') : (x && x.text) || '')
      .join('\n')
  }
  return String(out && (out.output_text || out.text || JSON.stringify(out)) || '')
}

async function testBattleApi(){
  try {
    const cfg = loadConfig()
    const apiUrl = resolveBattleApiUrl(cfg.battleApiUrl)
    const model = String(cfg.battleApiModel || 'qwen3.5-9b-vlm').trim()
    if (!apiUrl) return { ok:false, error:'未配置 API 地址' }
    const image = await captureBattleImage()
    const result = await requestBattleCompletion(image, cfg, '请只回复OK，用于测试游戏结算识别 API 是否正常响应。', 64)
    return { ok: true, status: result.status, text: String(result.text || '').trim().slice(0, 500), model, apiUrl }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) }
  }
}

async function requestBattleDurationOnly(image, cfg){
  try {
    const result = await requestBattleCompletion(image, cfg, buildBattleDurationPrompt(), 64)
    if (/NOT_SETTLEMENT/i.test(String(result.text || ''))) return ''
    return normalizeBattleDuration(extractBattleDurationFromText(result.text) || result.text)
  } catch (e) {
    log(`[Battle] 补充识别总时长失败: ${e && e.message || e}`)
    return ''
  }
}

async function triggerBattleCapture(){
  try {
    ensureBattleDirs()
    // 先截图，再闪白提示用户（避免截到白屏）
    const image = await captureBattleImage()
    showBattleFlash()
    const shotName = `ee2x-${getBattleTimestamp()}.png`
    const shotPath = path.join(getBattleShotDir(), shotName)
    writeBattlePng(image, shotPath)

    const cfg = loadConfig()
    const result = await requestBattleCompletion(image, cfg, buildBattlePrompt(), 2000)
    const text = String(result.text || '')
    const parsed = isBattleOcrModel(cfg.battleApiModel) ? parseOcrResponse(text) : parseBattleResponse(text)
    if (parsed.notSettlement) {
      log(`[Battle] 识别结果不是结算页面: ${text.slice(0, 300)}`)
      return { ok:false, error:'当前截图不是游戏结算页面' }
    }
    const csvText = parsed.csvText
    const rows = parseBattleRows(csvText)
    if (rows.length === 0) {
      log(`[Battle] 识别结果未解析到有效玩家数据: ${text.slice(0, 500)}`)
      return { ok:false, error:'识别结果未通过结算校验，未解析到有效玩家数据' }
    }

    const finalRows = applyBattleOutcomeInference(dedupeBattleRows(rows.map(row => {
      const matchName = row.name
      const recent = loadBattleRecent()
      const roster = (recent && Array.isArray(recent.players)) ? recent.players : []
      const picked = roster.find(nm => getNameSimilarity(matchName, nm) > 2)
      const fixedName = picked || row.name
      const cls = classifyBattleRow({ ...row, name: fixedName })
      return { ...row, name: fixedName, team: cls.team, result: cls.result, spectator: cls.spectator }
    })))

    let duration = normalizeBattleDuration(parsed.duration || extractBattleDurationFromText(text))
    if (!duration) {
      duration = await requestBattleDurationOnly(image, cfg)
    }
    const sortedRows = sortBattleRows(finalRows)
    const csv = buildBattleCsv(sortedRows, duration)
    const csvName = `ee2x-${getBattleTimestamp()}-ocr.csv`
    const csvPath = path.join(getBattleCsvDir(), csvName)
    fs.writeFileSync(csvPath, csv, 'utf8')
    const summary = {
      time: new Date().toISOString(),
      duration: duration || '',
      shotPath,
      csvPath,
      players: finalRows.map(r => r.name),
      rows: finalRows
    }
    saveBattleRecent(summary)
    const history = loadBattleHistory()
    history.unshift(summary)
    saveBattleHistory(history.slice(0, 20))
    recentBattleSummary = summary

    // 自动上传CSV到服务器并触发计分（异步，不阻塞返回）
    sshUploader.uploadAndProcess(csvPath).then(result => {
      log(`[Battle] 上传结果: ${JSON.stringify(result)}`)
    }).catch(err => {
      log(`[Battle] 上传失败: ${err.message}`)
    })

    log(`[Battle] 结算解析成功: rows=${finalRows.length}, duration=${duration || 'N/A'}, csv=${csvPath}`)
    return { ok:true, shotPath, csvPath, summary }
  } catch (e) {
    log(`triggerBattleCapture error: ${e && e.stack || e}`)
    return { ok:false, error:String(e && e.message || e) }
  }
}


function registerBattleHotkey(){
  try {
    const cfg = loadConfig()
    const hotkey = String(cfg.battleHotkey || '').trim()
    if (gameScoreHotkeyRegistered && globalShortcut.isRegistered && globalShortcut.isRegistered(hotkey)) return { ok:true, hotkey }
    try { if (gameScoreHotkeyRegistered && registerBattleHotkey._hotkey) globalShortcut.unregister(registerBattleHotkey._hotkey) } catch {}
    gameScoreHotkeyRegistered = false
    registerBattleHotkey._hotkey = hotkey
    if (!hotkey) return { ok:false, error:'未设置快捷键' }
    const ok = globalShortcut.register(hotkey, () => { void triggerBattleCapture() })
    gameScoreHotkeyRegistered = ok
    return ok ? { ok:true, hotkey } : { ok:false, error:'快捷键注册失败' }
  } catch (e) {
    return { ok:false, error:String(e && e.message || e) }
  }
}

function loadConfig(){
  const def = {
    serverUrl: 'http://115.231.35.105:3010',
    userServerUrl: 'http://115.231.35.105:3001',
    updateServerHttp: 'http://115.231.35.105:3010',
    serverUrlPrimary: 'http://122.10.116.142:1888',
    serverUrlBackup: '',
    updateServerWs: 'ws://115.231.35.105:3010/api/update/v1/channels/stable/ws',
    gameExe: 'EE2X.exe',
    gameExePath: '',
    gameDir: '',
    preferredResolution: '1280x800',
    windowSize: { width: 1280, height: 800 },
    bgImagePosition: { x: 0, y: 0, scale: 1 },
    bgImagePath: '',
    bgType: 'none',
    bgVideoPath: '',
    bgVideoVolume: 0,
    bgFileType: 'image',
    bgBlur: 0,
    theme: 'aoe',
    battleHotkey: '',
    networkServer: '81.71.49.16:1666',
    networkMode: 'tap',
    tapStrategy: 'auto',
    broadcastMode: 'manual',
    closeAction: 'exit',
    battleApiUrl: 'http://192.168.0.211:1234/v1/responses',
    battleApiKey: '',
    battleApiModel: 'qwen3.5-9b-vlm',
    askedDesktop: false,
    launcherAutoUpdate: false,
    updateChannel: 'stable'
  }
  const cfg = { ...def }
  const launcherPrivate = readJsonFileSafe(getConfigPath())
  const settingsPrivate = readJsonFileSafe(getSettingsPath())
  const publicDefaults = readJsonFileSafe(getLauncherPublicDefaultsPath())

  if (Object.keys(publicDefaults).length > 0) {
    Object.assign(cfg, pickKeys(publicDefaults, PUBLIC_CONFIG_KEYS))
  } else {
    Object.assign(cfg, pickKeys(launcherPrivate, PUBLIC_CONFIG_KEYS))
    Object.assign(cfg, pickKeys(settingsPrivate, PUBLIC_CONFIG_KEYS))
  }

  Object.assign(cfg, pickKeys(launcherPrivate, LAUNCHER_PRIVATE_CONFIG_KEYS))
  Object.assign(cfg, pickKeys(settingsPrivate, SETTINGS_PRIVATE_CONFIG_KEYS))
  try {
    ensureReleaseStateBootstrap(cfg)
  } catch (e) {
    log(`loadConfig release-state failed: ${e}`)
  }
  try {
    const cur = String(cfg.userServerUrl||'').trim().toLowerCase()
    const isLocal = !cur || cur.includes('localhost') || cur.startsWith('http://127.0.0.1')
    if (isLocal) {
      try {
        const su = String(cfg.serverUrl||'').trim()
        const u = new URL(su)
        const host = u.hostname
        if (host) cfg.userServerUrl = `http://${host}:3001`
      } catch {}
    }
  } catch {}

  const normalizedGameLocation = normalizeGameLocationInConfig(cfg, 'loadConfig')
  if (normalizedGameLocation.changed) {
    saveConfig(cfg, { skipGamePathNormalize: true })
  }

  return cfg
}

function saveConfig(cfg, options = {}){
  const nextCfg = cfg && typeof cfg === 'object' ? cfg : {}
  if (!options.skipGamePathNormalize) {
    normalizeGameLocationInConfig(nextCfg, 'saveConfig')
  }
  const launcherPrivate = pickKeys(nextCfg, LAUNCHER_PRIVATE_CONFIG_KEYS)
  const settingsPrivate = pickKeys(nextCfg, SETTINGS_PRIVATE_CONFIG_KEYS)
  try {
    fse.ensureDirSync(path.dirname(getConfigPath()))
    fs.writeFileSync(getConfigPath(), JSON.stringify(launcherPrivate, null, 2))
  } catch {}
  try {
    fse.ensureDirSync(path.dirname(getSettingsPath()))
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settingsPrivate, null, 2))
  } catch {}
}

function normalizeBaseUrl(url){
  return String(url || '')
    .trim()
    .replace(/\/$/, '')
    .replace(/\/manifest$/i, '')
    .replace(/\/publish$/i, '')
    .replace(/\/api\/version\/latest$/i, '')
    .replace(/\/api\/version\/history$/i, '')
    .replace(/\/api\/v1\/launcher\/versions$/i, '')
    .replace(/\/download$/i, '')
}

function splitBaseUrlCandidates(value){
  return String(value || '')
    .split(/[\n,;|]/)
    .map(item => normalizeBaseUrl(item))
    .filter(Boolean)
}

function getUpdateServerCandidates(cfg, preferredBaseUrl){
  return Array.from(new Set([
    ...splitBaseUrlCandidates(preferredBaseUrl),
    ...splitBaseUrlCandidates(cfg && cfg.serverUrl),
    ...splitBaseUrlCandidates(cfg && cfg.serverUrlPrimary),
    ...splitBaseUrlCandidates(cfg && cfg.serverUrlBackup),
    ...splitBaseUrlCandidates(cfg && cfg.updateServerHttp)
  ]))
}

function getStaticUpdateChannel(cfg){
  const channel = String((cfg && cfg.updateChannel) || 'stable').trim()
  return channel || 'stable'
}

async function fetchStaticLatestDescriptor(cfg, preferredBaseUrl){
  const channel = getStaticUpdateChannel(cfg)
  const candidates = getUpdateServerCandidates(cfg, preferredBaseUrl)
  let lastError = null
  for (const base of candidates){
    const apiUrl = `${base}/api/update/v1/channels/${channel}/latest`
    try {
      const res = await axios.get(apiUrl, { timeout: 5000 })
      const data = res && res.data || {}
      const packages = (data && data.packages && typeof data.packages === 'object') ? data.packages : {}
      const hasLegacyGame = !!(data && data.packageUrl)
      const hasUnifiedPackage = !!(
        (packages.game && packages.game.packageUrl) ||
        (packages.launcher && packages.launcher.packageUrl)
      )
      if (data && data.version && (hasLegacyGame || hasUnifiedPackage)) {
        return {
          base,
          channel,
          latest: {
            version: data.version || '',
            notes: data.releaseNotes || '',
            packageUrl: data.packageUrl || '',
            manifestUrl: data.manifestUrl || '',
            packageSha256: data.packageSha256 || '',
            packageSize: Number(data.packageSize) || 0,
            publishedAt: data.publishedAt || '',
            schemaVersion: data.schemaVersion || 1,
            required: data.required !== false,
            packages: {
              launcher: packages.launcher ? {
                packageUrl: packages.launcher.packageUrl || '',
                manifestUrl: packages.launcher.manifestUrl || '',
                packageSha256: packages.launcher.packageSha256 || '',
                packageSize: Number(packages.launcher.packageSize) || 0
              } : null,
              game: packages.game ? {
                packageUrl: packages.game.packageUrl || '',
                manifestUrl: packages.game.manifestUrl || '',
                packageSha256: packages.game.packageSha256 || '',
                packageSize: Number(packages.game.packageSize) || 0
              } : null
            }
          }
        }
      }
    } catch (e) {
      lastError = e
      log(`api latest failed ${apiUrl}: ${e}`)
    }
    const url = `${base}/updates/${channel}/latest.json`
    try {
      const res = await axios.get(url, { timeout: 5000 })
      const data = res && res.data || {}
      const packages = (data && data.packages && typeof data.packages === 'object') ? data.packages : {}
      const hasLegacyGame = !!(data && data.packageUrl)
      const hasUnifiedPackage = !!(
        (packages.game && packages.game.packageUrl) ||
        (packages.launcher && packages.launcher.packageUrl)
      )
      if (data && data.version && (hasLegacyGame || hasUnifiedPackage)) {
        return {
          base,
          channel,
          latest: {
            version: data.version || '',
            notes: data.releaseNotes || '',
            packageUrl: data.packageUrl || '',
            manifestUrl: data.manifestUrl || '',
            packageSha256: data.packageSha256 || '',
            packageSize: Number(data.packageSize) || 0,
            publishedAt: data.publishedAt || '',
            schemaVersion: data.schemaVersion || 1,
            required: data.required !== false,
            packages: {
              launcher: packages.launcher ? {
                packageUrl: packages.launcher.packageUrl || '',
                manifestUrl: packages.launcher.manifestUrl || '',
                packageSha256: packages.launcher.packageSha256 || '',
                packageSize: Number(packages.launcher.packageSize) || 0
              } : null,
              game: packages.game ? {
                packageUrl: packages.game.packageUrl || '',
                manifestUrl: packages.game.manifestUrl || '',
                packageSha256: packages.game.packageSha256 || '',
                packageSize: Number(packages.game.packageSize) || 0
              } : null
            }
          }
        }
      }
    } catch (e) {
      lastError = e
      log(`static latest failed ${url}: ${e}`)
    }
  }
  if (lastError) throw lastError
  throw new Error('static latest unavailable')
}

async function fetchReleaseManifestPayload(manifestUrl){
  const url = String(manifestUrl || '').trim()
  if (!url) return null
  try {
    const res = await axios.get(url, { timeout: 5000 })
    const data = res && res.data
    return data && typeof data === 'object' ? data : null
  } catch (e) {
    log(`fetchReleaseManifestPayload failed ${url}: ${e}`)
    return null
  }
}

function manifestFileCount(manifest){
  return Array.isArray(manifest && manifest.files) ? manifest.files.length : 0
}

function manifestDeleteCount(manifest){
  return Array.isArray(manifest && manifest.deleteList) ? manifest.deleteList.length : 0
}

function launcherManifestTriggersSelfUpdate(manifest){
  return manifestFileCount(manifest) > 0
}

async function resolveLauncherPackageForClient(pkg){
  if (!pkg || !pkg.manifestUrl) {
    return { package: pkg || null, manifest: null, ignored: false, fileCount: 0, deleteCount: 0 }
  }
  const manifest = await fetchReleaseManifestPayload(pkg.manifestUrl)
  if (!manifest) {
    return { package: pkg, manifest: null, ignored: false, fileCount: 0, deleteCount: 0 }
  }
  const fileCount = manifestFileCount(manifest)
  const deleteCount = manifestDeleteCount(manifest)
  if (launcherManifestTriggersSelfUpdate(manifest)) {
    return { package: pkg, manifest, ignored: false, fileCount, deleteCount }
  }
  if (deleteCount > 0) {
    log(`忽略 launcher 纯删除包: ${pkg.manifestUrl} (files=${fileCount}, delete=${deleteCount})`)
  } else {
    log(`忽略 launcher 空包: ${pkg.manifestUrl}`)
  }
  return { package: null, manifest, ignored: true, fileCount, deleteCount }
}

function mapRemoteVersionListResponse(data){
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.versions)) return data.versions
  if (data && data.history && Array.isArray(data.history)) return data.history
  return []
}

function toVersionEntry(item){
  if (!item) return null
  return {
    version: item.version || '',
    changelog: item.changelog || item.notes || '',
    notes: item.notes || item.changelog || '',
    date: item.date || item.created_at || '',
    created_at: item.created_at || item.date || '',
    updateLevel: item.updateLevel || item.type || '',
    updateType: item.updateType || item.type || '',
    force_update: !!item.force_update,
    file_name: item.file_name || '',
    file_size: item.file_size || 0,
    file_hash: item.file_hash || '',
    file_path: item.file_path || ''
  }
}

function versionToParts(version){
  return String(version || '')
    .replace(/^v/i, '')
    .split(/[.\-_]/)
    .map(part => {
      const m = String(part).match(/^(\d+)/)
      return m ? Number(m[1]) : 0
    })
}

function compareVersionStrings(a, b){
  const pa = versionToParts(a)
  const pb = versionToParts(b)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const va = pa[i] || 0
    const vb = pb[i] || 0
    if (va !== vb) return va - vb
  }
  return String(a || '').localeCompare(String(b || ''))
}

function getReleaseRuntimeDir(){
  return path.join(getAppRoot(), 'update', 'runtime')
}

function getReleaseStatePath(){
  return path.join(getReleaseRuntimeDir(), 'release-state.json')
}

function getLastUpdaterResultPath(){
  return path.join(getReleaseRuntimeDir(), 'last-updater-result.json')
}

function getLastUpdaterLogPath(){
  return path.join(getReleaseRuntimeDir(), 'last-updater-log.txt')
}

function getPatcherReadyFilePath(){
  return path.join(getReleaseRuntimeDir(), 'patcher-ready.flag')
}

function readReleaseState(){
  try {
    const statePath = getReleaseStatePath()
    if (!fs.existsSync(statePath)) return {}
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) || {}
  } catch (e) {
    log(`readReleaseState failed: ${e}`)
    return {}
  }
}

function writeReleaseState(state){
  try {
    const statePath = getReleaseStatePath()
    fse.ensureDirSync(path.dirname(statePath))
    fs.writeFileSync(statePath, JSON.stringify(state || {}, null, 2))
    return true
  } catch (e) {
    log(`writeReleaseState failed: ${e}`)
    return false
  }
}

function detectInstalledGameVersion(state){
  const scopedVersion = String(getScopeStateVersion(state, 'game') || '').trim()
  if (scopedVersion) return scopedVersion
  return String((state && state.version) || '').trim()
}

function detectInstalledLauncherVersion(state){
  const scopedVersion = String(getScopeStateVersion(state, 'launcher') || '').trim()
  if (scopedVersion) return scopedVersion
  return String(getScopeStateVersion(state, 'game') || state && state.version || '').trim()
}

function ensureReleaseStateBootstrap(cfg){
  void cfg
  const currentState = readReleaseState()
  const current = currentState && typeof currentState === 'object' ? { ...currentState } : {}
  const localGameVersion = detectInstalledGameVersion(current)
  const localLauncherVersion = detectInstalledLauncherVersion(current)
  const hasBootstrapVersion = !!(localGameVersion || localLauncherVersion)
  if (!hasBootstrapVersion && Object.keys(current).length === 0) {
    return {
      state: current,
      changed: false,
      localGameVersion: '',
      localLauncherVersion: ''
    }
  }

  const next = { ...current }
  const gameState = current.game && typeof current.game === 'object' ? { ...current.game } : {}
  const launcherState = current.launcher && typeof current.launcher === 'object' ? { ...current.launcher } : {}
  let changed = false

  if (localGameVersion && !gameState.version) {
    gameState.version = localGameVersion
    changed = true
  }
  if (localLauncherVersion && !launcherState.version) {
    launcherState.version = localLauncherVersion
    changed = true
  }
  if (Object.keys(gameState).length > 0) next.game = gameState
  if (Object.keys(launcherState).length > 0) next.launcher = launcherState
  if (localGameVersion && !next.version) {
    next.version = localGameVersion
    changed = true
  }
  if (!Object.prototype.hasOwnProperty.call(next, 'pendingVersion')) {
    next.pendingVersion = ''
    changed = true
  }
  if (!Object.prototype.hasOwnProperty.call(next, 'lastShownChangelogVersion')) {
    next.lastShownChangelogVersion = ''
    changed = true
  }
  if (changed) {
    writeReleaseState(next)
  }
  return {
    state: changed ? next : current,
    changed,
    localGameVersion,
    localLauncherVersion
  }
}

function readLastUpdaterResult(){
  try {
    const resultPath = getLastUpdaterResultPath()
    if (!fs.existsSync(resultPath)) return null
    const payload = JSON.parse(fs.readFileSync(resultPath, 'utf8')) || {}
    if (!payload || typeof payload !== 'object') return null
    if (!payload.logPath) payload.logPath = getLastUpdaterLogPath()
    payload.resultPath = resultPath
    return payload
  } catch (e) {
    log(`readLastUpdaterResult failed: ${e}`)
    return null
  }
}

const GAME_UPDATE_TEMP_SUFFIX = '.ee2x_tmp'
const GAME_UPDATE_MULTIPART_THRESHOLD_BYTES = 8 * 1024 * 1024
const GAME_UPDATE_MULTIPART_CONCURRENCY = 4
const GAME_UPDATE_MULTIPART_MAX_RETRIES = 2
const GAME_UPDATE_FROZEN_PREFIXES = []

function writeLastUpdaterResult(payload){
  try {
    const resultPath = getLastUpdaterResultPath()
    fse.ensureDirSync(path.dirname(resultPath))
    fs.writeFileSync(resultPath, JSON.stringify(payload || {}, null, 2))
  } catch (e) {
    log(`writeLastUpdaterResult failed: ${e}`)
  }
}

function appendUpdaterLog(logFilePath, message){
  try {
    if (!logFilePath) return
    fse.ensureDirSync(path.dirname(logFilePath))
    fs.appendFileSync(logFilePath, `[${new Date().toISOString()}] ${message}\n`)
  } catch {}
}

function normalizeReleaseRelativePath(value){
  return String(value || '')
    .replace(/\\/g, '/')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/{2,}/g, '/')
}

function releasePathWithinPrefixes(targetPath, prefixes){
  const normalized = normalizeReleaseRelativePath(targetPath)
  return (prefixes || []).some((prefix) => {
    const candidate = normalizeReleaseRelativePath(prefix)
    return candidate && (normalized === candidate || normalized.startsWith(`${candidate}/`))
  })
}

function safeJoinReleasePath(baseDir, relativePath){
  const normalizedRelativePath = normalizeReleaseRelativePath(relativePath)
  const resolvedBase = path.resolve(baseDir)
  const resolvedTarget = path.resolve(resolvedBase, normalizedRelativePath)
  if (resolvedTarget !== resolvedBase && !resolvedTarget.startsWith(`${resolvedBase}${path.sep}`)) {
    throw new Error(`非法更新路径: ${relativePath}`)
  }
  return resolvedTarget
}

function powershellLiteral(value){
  return String(value || '').replace(/'/g, "''")
}

async function computeFileSha256(filePath){
  return await new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

function emitUpdateStage(evt, payload){
  try { evt && evt.sender && evt.sender.send('update:stage', payload) } catch {}
}

function emitUpdateProgress(evt, payload){
  try { evt && evt.sender && evt.sender.send('update:progress', payload) } catch {}
}

function ensureUpdateNotCancelled(){
  if (cancelRequested) {
    throw new Error('更新已取消')
  }
}

function createDownloadProgressTracker(evt, totalBytes, strategy, concurrency){
  return {
    evt,
    totalBytes: Number(totalBytes || 0),
    strategy,
    concurrency,
    downloadedBytes: 0,
    startedAt: Date.now(),
    lastEmitAt: 0,
  }
}

function emitTrackedDownloadProgress(tracker, extra = {}, force = false){
  if (!tracker) return
  const now = Date.now()
  if (!force && now - tracker.lastEmitAt < 120 && tracker.downloadedBytes < tracker.totalBytes) {
    return
  }
  tracker.lastEmitAt = now
  const elapsedSeconds = Math.max((now - tracker.startedAt) / 1000, 0.001)
  emitUpdateProgress(tracker.evt, {
    stage: 'download',
    strategy: tracker.strategy,
    concurrency: tracker.concurrency,
    downloadedBytes: tracker.downloadedBytes,
    totalBytes: tracker.totalBytes,
    percent: tracker.totalBytes > 0 ? Math.floor((tracker.downloadedBytes / tracker.totalBytes) * 100) : 0,
    speedBytesPerSec: Math.floor(tracker.downloadedBytes / elapsedSeconds),
    ...extra,
  })
}

function createRangeDownloadError(message, code = 'range-download-error'){
  const error = new Error(message)
  error.code = code
  return error
}

function parseContentRangeHeader(value){
  const text = String(value || '').trim()
  const match = text.match(/^bytes\s+(\d+)-(\d+)\/(\d+)$/i)
  if (!match) return null
  return {
    start: Number(match[1]),
    end: Number(match[2]),
    total: Number(match[3]),
  }
}

async function probeMultipartDownloadSupport(url, totalBytes, logFilePath){
  if (!Number.isFinite(totalBytes) || totalBytes <= 1) return false
  const probeEnd = Math.min(15, totalBytes - 1)
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { Range: `bytes=0-${probeEnd}` },
      validateStatus: () => true,
    })
    const contentRange = parseContentRangeHeader(response.headers['content-range'])
    const bodyLength = Buffer.byteLength(Buffer.from(response.data || []))
    const ok = response.status === 206 &&
      contentRange &&
      contentRange.start === 0 &&
      contentRange.end === probeEnd &&
      contentRange.total === totalBytes &&
      bodyLength === probeEnd + 1
    appendUpdaterLog(
      logFilePath,
      `[range-probe] status=${response.status} contentRange=${response.headers['content-range'] || ''} bodyLength=${bodyLength} supported=${ok ? 'yes' : 'no'}`
    )
    return !!ok
  } catch (error) {
    appendUpdaterLog(logFilePath, `[range-probe] failed: ${error}`)
    return false
  }
}

async function downloadReleasePackageSingle(url, targetPath, tracker, logFilePath){
  ensureUpdateNotCancelled()
  appendUpdaterLog(logFilePath, `[download-single] ${url}`)
  await fse.ensureDir(path.dirname(targetPath))
  const response = await axios.get(url, { responseType: 'stream', timeout: 0 })
  return await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(targetPath)
    const fail = async (error) => {
      try { writer.destroy() } catch {}
      try { await fse.remove(targetPath) } catch {}
      reject(error)
    }
    response.data.on('data', (chunk) => {
      tracker.downloadedBytes += chunk.length
      if (cancelRequested) {
        response.data.destroy(new Error('更新已取消'))
        return
      }
      emitTrackedDownloadProgress(tracker)
    })
    response.data.on('error', fail)
    writer.on('error', fail)
    writer.on('finish', () => {
      emitTrackedDownloadProgress(tracker, {}, true)
      resolve()
    })
    response.data.pipe(writer)
  })
}

async function downloadReleasePackagePart(url, start, end, partPath, tracker, logFilePath){
  ensureUpdateNotCancelled()
  await fse.ensureDir(path.dirname(partPath))
  const response = await axios.get(url, {
    responseType: 'stream',
    timeout: 0,
    headers: { Range: `bytes=${start}-${end}` },
    validateStatus: () => true,
  })
  if (response.status !== 206) {
    throw createRangeDownloadError(`Range 下载未返回 206（${start}-${end} -> ${response.status}）`, 'range-unsupported')
  }
  const contentRange = parseContentRangeHeader(response.headers['content-range'])
  if (!contentRange || contentRange.start !== start || contentRange.end !== end) {
    throw createRangeDownloadError(`Content-Range 非法（${start}-${end} -> ${response.headers['content-range'] || '(空)' }）`, 'range-invalid')
  }
  return await new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(partPath)
    let writtenBytes = 0
    const fail = async (error) => {
      tracker.downloadedBytes = Math.max(0, tracker.downloadedBytes - writtenBytes)
      try { writer.destroy() } catch {}
      try { await fse.remove(partPath) } catch {}
      reject(error)
    }
    response.data.on('data', (chunk) => {
      writtenBytes += chunk.length
      tracker.downloadedBytes += chunk.length
      if (cancelRequested) {
        response.data.destroy(new Error('更新已取消'))
        return
      }
      emitTrackedDownloadProgress(tracker, {
        partStart: start,
        partEnd: end,
      })
    })
    response.data.on('error', fail)
    writer.on('error', fail)
    writer.on('finish', async () => {
      const expectedLength = end - start + 1
      if (writtenBytes !== expectedLength) {
        await fail(createRangeDownloadError(`分段长度不符（${start}-${end} expected=${expectedLength} actual=${writtenBytes}）`, 'range-length-mismatch'))
        return
      }
      resolve()
    })
    response.data.pipe(writer)
  })
}

async function downloadReleasePackagePartWithRetry(url, start, end, partPath, tracker, logFilePath){
  let lastError = null
  for (let attempt = 1; attempt <= GAME_UPDATE_MULTIPART_MAX_RETRIES; attempt += 1) {
    try {
      appendUpdaterLog(logFilePath, `[download-part] attempt=${attempt} range=${start}-${end}`)
      await downloadReleasePackagePart(url, start, end, partPath, tracker, logFilePath)
      return
    } catch (error) {
      lastError = error
      appendUpdaterLog(logFilePath, `[download-part] failed attempt=${attempt} range=${start}-${end}: ${error}`)
      try { await fse.remove(partPath) } catch {}
      if (error && error.code === 'range-unsupported') {
        break
      }
    }
  }
  throw lastError || createRangeDownloadError(`分段下载失败（${start}-${end}）`)
}

async function mergeDownloadParts(partPaths, targetPath){
  await fse.ensureDir(path.dirname(targetPath))
  await fse.remove(targetPath)
  const writer = fs.createWriteStream(targetPath)
  try {
    for (const partPath of partPaths) {
      ensureUpdateNotCancelled()
      await new Promise((resolve, reject) => {
        const reader = fs.createReadStream(partPath)
        reader.on('error', reject)
        reader.on('end', resolve)
        reader.pipe(writer, { end: false })
      })
    }
    await new Promise((resolve, reject) => {
      writer.on('error', reject)
      writer.on('finish', resolve)
      writer.end()
    })
  } catch (error) {
    try { writer.destroy() } catch {}
    throw error
  }
}

async function downloadReleasePackageMultipart(url, targetPath, totalBytes, tracker, logFilePath){
  const partCount = Math.max(1, Math.min(GAME_UPDATE_MULTIPART_CONCURRENCY, totalBytes))
  const chunkSize = Math.ceil(totalBytes / partCount)
  const parts = []
  for (let index = 0; index < partCount; index += 1) {
    const start = index * chunkSize
    if (start >= totalBytes) break
    const end = Math.min(totalBytes - 1, start + chunkSize - 1)
    parts.push({
      index,
      start,
      end,
      path: `${targetPath}.part${index}`,
    })
  }
  appendUpdaterLog(logFilePath, `[download-multipart] parts=${parts.length} totalBytes=${totalBytes}`)
  const settled = await Promise.allSettled(
    parts.map((part) =>
      downloadReleasePackagePartWithRetry(
        url,
        part.start,
        part.end,
        part.path,
        tracker,
        logFilePath,
      )
    )
  )
  const firstFailure = settled.find((item) => item.status === 'rejected')
  if (firstFailure && firstFailure.status === 'rejected') {
    for (const part of parts) {
      try { await fse.remove(part.path) } catch {}
    }
    throw firstFailure.reason
  }
  await mergeDownloadParts(parts.map((part) => part.path), targetPath)
  for (const part of parts) {
    try { await fse.remove(part.path) } catch {}
  }
  emitTrackedDownloadProgress(tracker, {}, true)
}

async function downloadReleasePackage(url, targetPath, evt, logFilePath, expectedTotalBytes = 0){
  ensureUpdateNotCancelled()
  const totalBytes = Number(expectedTotalBytes || 0)
  const useMultipart = totalBytes >= GAME_UPDATE_MULTIPART_THRESHOLD_BYTES && await probeMultipartDownloadSupport(url, totalBytes, logFilePath)
  const tracker = createDownloadProgressTracker(
    evt,
    totalBytes,
    useMultipart ? 'multipart' : 'single',
    useMultipart ? GAME_UPDATE_MULTIPART_CONCURRENCY : 1,
  )
  emitUpdateStage(evt, {
    stage: 'download_start',
    strategy: tracker.strategy,
    concurrency: tracker.concurrency,
    totalBytes,
  })
  if (!useMultipart) {
    await downloadReleasePackageSingle(url, targetPath, tracker, logFilePath)
    return
  }
  try {
    await downloadReleasePackageMultipart(url, targetPath, totalBytes, tracker, logFilePath)
  } catch (error) {
    appendUpdaterLog(logFilePath, `[download-multipart] fallback to single: ${error}`)
    emitUpdateStage(evt, {
      stage: 'download_fallback',
      strategy: 'single',
      reason: String(error && error.message || error),
    })
    tracker.strategy = 'single'
    tracker.concurrency = 1
    tracker.downloadedBytes = 0
    tracker.startedAt = Date.now()
    await downloadReleasePackageSingle(url, targetPath, tracker, logFilePath)
  }
}

async function runSubprocess(command, args, logFilePath){
  const { spawn } = require('child_process')
  appendUpdaterLog(logFilePath, `[spawn] ${command} ${args.join(' ')}`)
  return await new Promise((resolve, reject) => {
    let stderr = ''
    let stdout = ''
    const child = spawn(command, args, { windowsHide: true })
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}`))
    })
  })
}

async function extractReleasePackage(zipPath, extractDir, logFilePath){
  await fse.remove(extractDir)
  await fse.ensureDir(extractDir)
  if (process.platform === 'win32') {
    const script = [
      `$zip = '${powershellLiteral(zipPath)}'`,
      `$dest = '${powershellLiteral(extractDir)}'`,
      "Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force"
    ].join('; ')
    await runSubprocess('powershell', ['-NoProfile', '-Command', script], logFilePath)
    return
  }
  await runSubprocess('unzip', ['-o', zipPath, '-d', extractDir], logFilePath)
}

async function validateExtractedGameTree(extractDir, manifest, logFilePath){
  const topLevelEntries = (await fse.readdir(extractDir)).filter((name) => name && name !== '__MACOSX')
  if (topLevelEntries.length !== 1 || topLevelEntries[0] !== manifest.rootDirName) {
    throw new Error(`更新包顶层目录非法: ${topLevelEntries.join(', ') || '(空)'}`)
  }
  if (String(manifest.rootDirName || '') !== 'Empire Earth II') {
    throw new Error(`manifest.rootDirName 非法: ${manifest.rootDirName || '(空)'}`)
  }
  const extractedRoot = path.join(extractDir, manifest.rootDirName)
  for (const fileEntry of (manifest.files || [])) {
    ensureUpdateNotCancelled()
    const relPath = normalizeReleaseRelativePath(fileEntry.path)
    if (!relPath) throw new Error('manifest 中存在空路径。')
    const sourcePath = safeJoinReleasePath(extractedRoot, relPath)
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      throw new Error(`更新包缺少文件: ${relPath}`)
    }
    if (fs.statSync(sourcePath).size !== Number(fileEntry.size || 0)) {
      throw new Error(`文件大小不匹配: ${relPath}`)
    }
    const sourceHash = await computeFileSha256(sourcePath)
    if (sourceHash !== String(fileEntry.sha256 || '')) {
      throw new Error(`文件哈希不匹配: ${relPath}`)
    }
  }
  appendUpdaterLog(logFilePath, `[validate] ${manifest.files.length || 0} files verified`)
  return extractedRoot
}

async function applyGameReleaseManifest({
  gameRoot,
  extractedRoot,
  manifest,
  backupDir,
  evt,
  logFilePath
}){
  const touchedRecords = []
  const summary = {
    updatedFiles: 0,
    deletedFiles: 0,
    backedUpFiles: 0,
    skippedFrozenFiles: 0,
    skippedFrozenPaths: []
  }
  await fse.ensureDir(backupDir)
  try {
    const totalFiles = Math.max((manifest.files || []).length, 1)
    let index = 0
    for (const fileEntry of (manifest.files || [])) {
      ensureUpdateNotCancelled()
      index += 1
      const relPath = normalizeReleaseRelativePath(fileEntry.path)
      if (releasePathWithinPrefixes(relPath, GAME_UPDATE_FROZEN_PREFIXES)) {
        summary.skippedFrozenFiles += 1
        summary.skippedFrozenPaths.push(relPath)
        appendUpdaterLog(logFilePath, `[frozen-skip] ${relPath}`)
        continue
      }
      const sourcePath = safeJoinReleasePath(extractedRoot, relPath)
      const targetPath = safeJoinReleasePath(gameRoot, relPath)
      const existed = fs.existsSync(targetPath)
      const backupPath = safeJoinReleasePath(backupDir, relPath)
      if (existed) {
        await fse.ensureDir(path.dirname(backupPath))
        await fse.copy(targetPath, backupPath, { overwrite: true, errorOnExist: false })
        summary.backedUpFiles += 1
        // 先删除旧文件，再复制新文件，避免 rename 覆盖冲突（如 .vbs/.dll 被系统锁定）
        try { await fse.remove(targetPath) } catch (delErr) {
          appendUpdaterLog(logFilePath, `[delete-before-copy-warn] ${relPath}: ${delErr.message || delErr}`)
        }
      }
      await fse.ensureDir(path.dirname(targetPath))
      await fse.copy(sourcePath, targetPath, { overwrite: true, errorOnExist: false })
      touchedRecords.push({ path: relPath, existed, deleted: false })
      summary.updatedFiles += 1
      emitUpdateStage(evt, {
        stage: 'apply_file',
        file: relPath,
        index,
        total: totalFiles,
        percent: 40 + Math.floor((index / totalFiles) * 50)
      })
    }

    for (const deletePath of (manifest.deleteList || [])) {
      ensureUpdateNotCancelled()
      const relPath = normalizeReleaseRelativePath(deletePath)
      if (!relPath) continue
      if (releasePathWithinPrefixes(relPath, GAME_UPDATE_FROZEN_PREFIXES)) {
        summary.skippedFrozenFiles += 1
        summary.skippedFrozenPaths.push(relPath)
        appendUpdaterLog(logFilePath, `[frozen-delete-skip] ${relPath}`)
        continue
      }
      const targetPath = safeJoinReleasePath(gameRoot, relPath)
      if (!fs.existsSync(targetPath)) continue
      const backupPath = safeJoinReleasePath(backupDir, relPath)
      await fse.ensureDir(path.dirname(backupPath))
      await fse.copy(targetPath, backupPath, { overwrite: true, errorOnExist: false })
      await fse.remove(targetPath)
      touchedRecords.push({ path: relPath, existed: true, deleted: true })
      summary.backedUpFiles += 1
      summary.deletedFiles += 1
      appendUpdaterLog(logFilePath, `[delete] ${relPath}`)
    }
  } catch (error) {
    for (const record of touchedRecords.reverse()) {
      const targetPath = safeJoinReleasePath(gameRoot, record.path)
      const backupPath = safeJoinReleasePath(backupDir, record.path)
      try {
        if (record.existed && fs.existsSync(backupPath)) {
          await fse.remove(targetPath)
          await fse.ensureDir(path.dirname(targetPath))
          await fse.copy(backupPath, targetPath, { overwrite: true, errorOnExist: false })
        } else if (!record.existed) {
          await fse.remove(targetPath)
        }
      } catch (rollbackError) {
        appendUpdaterLog(logFilePath, `[rollback-error] ${rollbackError}`)
      }
    }
    throw error
  }
  return summary
}

function updateLocalVersionHistory(version, releaseNotes, publishedAt){
  try {
    const versionPath = path.join(getAppRoot(), 'update', 'version_history.json')
    const current = readJsonFileSafe(versionPath)
    const history = Array.isArray(current.history) ? current.history : []
    const nextHistory = history.filter((item) => String(item && item.version || '') !== String(version || ''))
    nextHistory.unshift({
      version: String(version || ''),
      updated_at: String(publishedAt || new Date().toISOString()),
      description: String(releaseNotes || '').trim() || `同步到服务器版本 ${version}`
    })
    fse.ensureDirSync(path.dirname(versionPath))
    fs.writeFileSync(versionPath, JSON.stringify({
      history: nextHistory.slice(0, 20)
    }, null, 2))
  } catch (e) {
    log(`updateLocalVersionHistory failed: ${e}`)
  }
}

function rememberPendingGameUpdate(version, releaseNotes, required){
  const nextVersion = String(version || '').trim()
  if (!nextVersion) return
  const state = readReleaseState()
  if (
    String(state.pendingVersion || '') === nextVersion &&
    String(state.releaseNotes || '') === String(releaseNotes || '') &&
    Boolean(state.required) === Boolean(required !== false)
  ) {
    return
  }
  state.pendingVersion = nextVersion
  state.releaseNotes = String(releaseNotes || '')
  state.required = required !== false
  writeReleaseState(state)
}

function clearPendingGameUpdate(version){
  const state = readReleaseState()
  if (!state.pendingVersion) return
  if (version && String(state.pendingVersion || '') !== String(version || '')) return
  state.pendingVersion = ''
  writeReleaseState(state)
}

async function cleanupDirectorySafe(targetDir, logFilePath){
  try {
    if (!targetDir) return
    await fse.remove(targetDir)
    appendUpdaterLog(logFilePath, `[cleanup] removed ${targetDir}`)
  } catch (error) {
    appendUpdaterLog(logFilePath, `[cleanup] failed ${targetDir}: ${error}`)
  }
}

async function cleanupOldGameUpdateBackups(runtimeDir, keepBackupDir, logFilePath){
  try {
    const backupsRoot = path.join(runtimeDir, 'backups')
    if (!fs.existsSync(backupsRoot)) return
    const keepNormalized = keepBackupDir ? normalizePathSafe(keepBackupDir) : ''
    const entries = (await fse.readdir(backupsRoot))
      .map((name) => path.join(backupsRoot, name))
      .filter((entry) => {
        try { return fs.statSync(entry).isDirectory() } catch { return false }
      })
      .sort((a, b) => {
        try {
          return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs
        } catch {
          return 0
        }
      })
    let kept = 0
    for (const entry of entries) {
      const normalizedEntry = normalizePathSafe(entry)
      if (keepNormalized && normalizedEntry === keepNormalized) {
        kept += 1
        continue
      }
      if (kept < 1) {
        kept += 1
        continue
      }
      await cleanupDirectorySafe(entry, logFilePath)
    }
  } catch (error) {
    appendUpdaterLog(logFilePath, `[cleanup-backups] failed: ${error}`)
  }
}

function persistAppliedGameRelease(latest, gamePackage){
  const now = new Date().toISOString()
  const state = readReleaseState()
  const gameState = state.game && typeof state.game === 'object' ? { ...state.game } : {}
  gameState.version = String(latest.version || '')
  gameState.packageSha256 = String(gamePackage.packageSha256 || '')
  gameState.packageUrl = String(gamePackage.packageUrl || '')
  gameState.manifestUrl = String(gamePackage.manifestUrl || '')
  gameState.appliedAt = now
  state.game = gameState
  state.required = latest.required !== false
  state.releaseNotes = String(latest.notes || '')
  state.pendingVersion = ''
  state.appliedAt = now
  state.version = gameState.version
  state.packageSha256 = gameState.packageSha256
  state.lastShownChangelogVersion = ''
  writeReleaseState(state)
}

function buildUpdaterResultPayload(payload){
  return {
    ...payload,
    logPath: getLastUpdaterLogPath(),
    resultPath: getLastUpdaterResultPath()
  }
}

function queryProcessesByExecutablePath(executablePath){
  const normalizedPath = normalizePathSafe(executablePath)
  if (!normalizedPath || process.platform !== 'win32') return []
  try {
    const script = [
      `$target = [System.IO.Path]::GetFullPath('${powershellLiteral(normalizedPath)}')`,
      "$items = Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -and [string]::Equals([System.IO.Path]::GetFullPath($_.ExecutablePath), $target, [System.StringComparison]::OrdinalIgnoreCase) } | Select-Object ProcessId, Name, ExecutablePath",
      "if ($items) { $items | ConvertTo-Json -Compress }"
    ].join('; ')
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    const { spawnSync } = require('child_process')
    const completed = spawnSync('powershell', ['-NoProfile', '-EncodedCommand', encoded], {
      encoding: 'utf-8',
      timeout: 8000,
      windowsHide: true
    })
    if (completed.status !== 0) return []
    const stdout = String(completed.stdout || '').trim()
    if (!stdout) return []
    const payload = JSON.parse(stdout)
    const items = Array.isArray(payload) ? payload : [payload]
    return items.filter(Boolean)
  } catch {
    return []
  }
}

function isGameProcessRunning(gameExePath){
  return queryProcessesByExecutablePath(gameExePath).length > 0
}

async function runEmbeddedGameUpdater(evt, cfg, preferredBaseUrl, options = {}){
  cancelRequested = false
  const forceSync = !!(options && options.force)
  const logFilePath = getLastUpdaterLogPath()
  appendUpdaterLog(logFilePath, `[invoke] launcher:runUpdater(game force=${forceSync ? 1 : 0})`)
  const resolved = resolveConfiguredGameLocation(cfg)
  if (!resolved) {
    emitUpdateStage(evt, { stage: 'failed', message: GAME_ROOT_ERROR_MESSAGE })
    throw new Error(GAME_ROOT_ERROR_MESSAGE)
  }
  const { base, channel, latest } = await fetchStaticLatestDescriptor(cfg, preferredBaseUrl)
  const gamePackage = resolveLatestPackage(latest, 'game')
  if (!gamePackage) {
    emitUpdateStage(evt, { stage: 'failed', message: '服务器当前版本未提供 game 更新包。' })
    throw new Error('服务器当前版本未提供 game 更新包。')
  }
  const currentState = readReleaseState()
  const localVersionBefore = String(getScopeStateVersion(currentState, 'game') || '')
  const localShaBefore = String(getScopeStateHash(currentState, 'game') || '')
  if (
    !forceSync &&
    localVersionBefore === String(latest.version || '') &&
    localShaBefore === String(gamePackage.packageSha256 || '')
  ) {
    appendUpdaterLog(
      logFilePath,
      `[skip] localVersion=${localVersionBefore || '(empty)'} localSha=${localShaBefore || '(empty)'} latestVersion=${String(latest.version || '')} latestSha=${String(gamePackage.packageSha256 || '')}`
    )
    emitUpdateStage(evt, { stage: 'done', message: '当前已经是最新版本。', percent: 100 })
    const payload = buildUpdaterResultPayload({
      ok: true,
      scope: 'game',
      version: String(latest.version || ''),
      skipped: true,
      message: '已是最新版本',
      localVersion: localVersionBefore,
      localPackageSha256: localShaBefore,
      latestVersion: String(latest.version || ''),
      latestPackageSha256: String(gamePackage.packageSha256 || ''),
      summary: {
        version: String(latest.version || ''),
        scope: 'game',
        updatedFiles: 0,
        deletedFiles: 0,
        backedUpFiles: 0,
        skippedFrozenFiles: 0,
        skippedFrozenPaths: []
      }
    })
    writeLastUpdaterResult(payload)
    return payload
  }
  if (isGameProcessRunning(resolved.gameExePath)) {
    rememberPendingGameUpdate(latest.version, latest.notes, latest.required)
    appendUpdaterLog(logFilePath, `[blocked] game is running, pendingVersion=${String(latest.version || '')}`)
    emitUpdateStage(evt, { stage: 'waiting_game_exit', message: '当前游戏正在运行，退出游戏后将自动同步。' })
    const payload = buildUpdaterResultPayload({
      ok: false,
      blocked: true,
      code: 'game-running',
      scope: 'game',
      version: String(latest.version || ''),
      error: '当前游戏正在运行，已记录待更新版本。退出游戏后将自动同步。'
    })
    writeLastUpdaterResult(payload)
    return payload
  }

  const runtimeDir = getReleaseRuntimeDir()
  const stagingDir = path.join(runtimeDir, 'staging', `game-${String(latest.version || 'latest')}`)
  const extractDir = path.join(stagingDir, 'extracted')
  const backupDir = path.join(runtimeDir, 'backups', `${new Date().toISOString().replace(/[:.]/g, '-')}--game`)
  try {
    const manifestPayload = await fetchReleaseManifestPayload(gamePackage.manifestUrl)
    if (!manifestPayload) {
      emitUpdateStage(evt, { stage: 'failed', message: '无法读取服务器 game manifest。' })
      throw new Error('无法读取服务器 game manifest。')
    }
    if (String(manifestPayload.packageSha256 || '') !== String(gamePackage.packageSha256 || '')) {
      emitUpdateStage(evt, { stage: 'failed', message: 'latest.json 与 release-manifest.json 的包哈希不一致。' })
      throw new Error('latest.json 与 release-manifest.json 的包哈希不一致。')
    }
    const packagePath = path.join(stagingDir, String(manifestPayload.packageFileName || 'EE2X-game.zip'))
    emitUpdateStage(evt, { stage: 'prepare', message: `准备同步到 ${latest.version || '(未知版本)'}` })
    appendUpdaterLog(logFilePath, `[start] base=${base} channel=${channel} version=${latest.version || ''} root=${resolved.gameDir}`)
    await downloadReleasePackage(gamePackage.packageUrl, packagePath, evt, logFilePath, gamePackage.packageSize)
    emitUpdateStage(evt, { stage: 'verify', message: '校验下载包' })
    const downloadedHash = await computeFileSha256(packagePath)
    if (downloadedHash !== String(gamePackage.packageSha256 || '')) {
      emitUpdateStage(evt, { stage: 'failed', message: '下载包 SHA-256 校验失败。' })
      throw new Error('下载包 SHA-256 校验失败。')
    }
    emitUpdateStage(evt, { stage: 'extract', message: '解压更新包' })
    await extractReleasePackage(packagePath, extractDir, logFilePath)
    emitUpdateStage(evt, { stage: 'validate', message: '校验文件清单' })
    const extractedRoot = await validateExtractedGameTree(extractDir, manifestPayload, logFilePath)
    emitUpdateStage(evt, { stage: 'apply', message: '应用游戏更新', percent: 40 })
    const summary = await applyGameReleaseManifest({
      gameRoot: resolved.gameDir,
      extractedRoot,
      manifest: manifestPayload,
      backupDir,
      evt,
      logFilePath
    })
    persistAppliedGameRelease(latest, gamePackage)
    clearPendingGameUpdate(latest.version)
    updateLocalVersionHistory(latest.version, latest.notes, latest.publishedAt)
    saveConfig(cfg, { skipGamePathNormalize: true })
    emitUpdateStage(evt, { stage: 'done', message: `已同步到 ${latest.version || '(未知版本)'}`, percent: 100 })
    const payload = buildUpdaterResultPayload({
      ok: true,
      scope: 'game',
      version: String(latest.version || ''),
      base,
      channel,
      summary: {
        version: String(latest.version || ''),
        scope: 'game',
        ...summary
      }
    })
    writeLastUpdaterResult(payload)
    appendUpdaterLog(logFilePath, `[done] version=${latest.version || ''} updated=${summary.updatedFiles} deleted=${summary.deletedFiles}`)
    await cleanupDirectorySafe(stagingDir, logFilePath)
    await cleanupOldGameUpdateBackups(runtimeDir, backupDir, logFilePath)
    return payload
  } catch (error) {
    emitUpdateStage(evt, { stage: 'failed', message: String(error && error.message || error) })
    throw error
  }
}

function clearUpdaterDiagnostics(){
  try { fse.ensureDirSync(getReleaseRuntimeDir()) } catch {}
  for (const targetPath of [getLastUpdaterResultPath(), getLastUpdaterLogPath(), getPatcherReadyFilePath()]) {
    try {
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath)
    } catch (e) {
      log(`clearUpdaterDiagnostics failed for ${targetPath}: ${e}`)
    }
  }
}

function describeUpdaterEarlyExit(code, signal){
  const details = []
  if (code !== null && code !== undefined) details.push(`exit code=${code}`)
  if (signal) details.push(`signal=${signal}`)
  if (details.length > 0) return `更新器启动后立即退出（${details.join(', ')}）`
  return '更新器启动后立即退出'
}

function resolveLatestPackage(latest, scope){
  const packages = latest && latest.packages ? latest.packages : null
  if (packages && packages[scope] && packages[scope].packageUrl) return packages[scope]
  if (scope === 'game' && latest && latest.packageUrl) {
    return {
      packageUrl: latest.packageUrl || '',
      manifestUrl: latest.manifestUrl || '',
      packageSha256: latest.packageSha256 || '',
      packageSize: Number(latest.packageSize) || 0
    }
  }
  return null
}

function getScopeStateVersion(state, scope){
  const scoped = state && state[scope]
  if (scoped && scoped.version) return scoped.version
  if (scope === 'game' && state && state.version) return state.version
  return ''
}

function getScopeStateHash(state, scope){
  const scoped = state && state[scope]
  if (scoped && scoped.packageSha256) return scoped.packageSha256
  if (scope === 'game' && state && state.packageSha256) return state.packageSha256
  return ''
}

async function getUnifiedReleaseStatus(cfg, preferredBaseUrl){
  const { base, channel, latest } = await fetchStaticLatestDescriptor(cfg, preferredBaseUrl)
  const bootstrap = ensureReleaseStateBootstrap(cfg)
  const state = bootstrap.state
  const resolvedGame = resolveConfiguredGameLocation(cfg)
  const gameRunning = !!(resolvedGame && isGameProcessRunning(resolvedGame.gameExePath))
  const rawLauncherPkg = resolveLatestPackage(latest, 'launcher')
  const launcherPkgResolution = await resolveLauncherPackageForClient(rawLauncherPkg)
  const launcherPkg = launcherPkgResolution.package
  const gamePkg = resolveLatestPackage(latest, 'game')
  const localLauncherVersion = String(bootstrap.localLauncherVersion || '')
  const localGameVersion = String(bootstrap.localGameVersion || '')
  const localLauncherHash = String(getScopeStateHash(state, 'launcher') || '')
  const localGameHash = String(getScopeStateHash(state, 'game') || '')
  const launcherHashMismatch = !!(
    launcherPkg &&
    localLauncherHash &&
    launcherPkg.packageSha256 &&
    localLauncherHash !== launcherPkg.packageSha256
  )
  const gameHashMismatch = !!(
    gamePkg &&
    localGameHash &&
    gamePkg.packageSha256 &&
    localGameHash !== gamePkg.packageSha256
  )
  const launcherNeedsUpdate = !!(
    launcherPkg &&
    (
      localLauncherVersion !== String(latest.version || '') ||
      launcherHashMismatch
    )
  )
  const gameNeedsUpdate = !!(
    gamePkg &&
    (
      localGameVersion !== String(latest.version || '') ||
      gameHashMismatch
    )
  )
  if (gameNeedsUpdate && gameRunning && latest && latest.version) {
    rememberPendingGameUpdate(latest.version, latest.notes || '', latest.required !== false)
  } else if (!gameNeedsUpdate && latest && latest.version) {
    clearPendingGameUpdate(latest.version)
  }
  const effectiveState = readReleaseState()
  const effectivePendingVersion = gameNeedsUpdate && gameRunning
    ? String(latest.version || '')
    : String((effectiveState && effectiveState.pendingVersion) || (state && state.pendingVersion) || '')
  const lastUpdaterResult = readLastUpdaterResult()
  const launcherRetryBlocked = !!(
    launcherNeedsUpdate &&
    lastUpdaterResult &&
    lastUpdaterResult.ok === false &&
    String(lastUpdaterResult.scope || '') === 'launcher' &&
    String(lastUpdaterResult.version || '') === String(latest.version || '')
  )
  const shouldShowChangelog = !!(
    latest &&
    latest.version &&
    !launcherNeedsUpdate &&
    !gameNeedsUpdate &&
    localGameVersion === String(latest.version || '') &&
    String((state && state.lastShownChangelogVersion) || '') !== String(latest.version || '') &&
    String(latest.notes || '').trim()
  )
  return {
    base,
    channel,
    latestVersion: latest.version || '',
    releaseNotes: latest.notes || '',
    required: latest.required !== false,
    pendingVersion: effectivePendingVersion,
    localLauncherVersion,
    localGameVersion,
    launcherHashMismatch,
    gameHashMismatch,
    launcherNeedsUpdate,
    gameNeedsUpdate,
    gameRunning,
    updateBlockedByGameProcess: !!(gameNeedsUpdate && gameRunning),
    launcherPackageIgnored: launcherPkgResolution.ignored,
    launcherRetryBlocked,
    lastUpdaterResult: launcherRetryBlocked ? lastUpdaterResult : null,
    lastUpdaterLogPath: launcherRetryBlocked
      ? String((lastUpdaterResult && lastUpdaterResult.logPath) || getLastUpdaterLogPath())
      : '',
    shouldShowChangelog,
    packages: {
      launcher: launcherPkg,
      game: gamePkg
    }
  }
}

function pickLatestVersionEntry(rawData, versions){
  if (!Array.isArray(versions) || versions.length === 0) return null
  const latestVersion = rawData && (rawData.latest || rawData.current_version)
  if (latestVersion) {
    const exact = versions.find(v => String(v.version || '') === String(latestVersion))
    if (exact) return exact
  }
  return versions.slice().sort((a, b) => compareVersionStrings(b.version, a.version))[0] || null
}

async function fetchLauncherVersionList(cfg, preferredBaseUrl){
  const candidates = getUpdateServerCandidates(cfg, preferredBaseUrl)
  let lastError = null
  for (const base of candidates) {
    try {
      const res = await axios.get(`${base}/manifest`, { timeout: 8000 })
      const manifest = res && res.data || {}
      if (manifest && (manifest.version || manifest.notes || manifest.download_url)) {
        return {
          base,
          versions: [{
            version: manifest.version || '',
            changelog: manifest.notes || '',
            notes: manifest.notes || '',
            date: manifest.created_at || '',
            created_at: manifest.created_at || '',
            force_update: !!manifest.force_update,
            file_size: manifest.file_size || 0,
            file_hash: manifest.file_hash || '',
            file_path: manifest.download_url || ''
          }]
        }
      }
    } catch (e) {
      lastError = e
      log(`launcher manifest list failed ${base}: ${e}`)
    }
  }
  if (lastError) throw lastError
  return { base: candidates[0] || '', versions: [] }
}

function ensureSettingsFile(){
  try {
    if (!fs.existsSync(getSettingsPath())){
      const tmpl = {
        preferredResolution: '1280x800',
        bgImagePath: '',
        bgType: 'none',
        bgVideoPath: '',
        bgVideoVolume: 0,
        bgFileType: 'image',
        bgBlur: 0,
        gameExe: 'EE2X.exe',
        networkMode: 'tap',
        tapStrategy: 'auto',
        broadcastMode: 'manual',
        closeAction: 'exit',
        battleHotkey: '',
        battleApiKey: '',
        theme: 'aoe',
        launcherAutoUpdate: false
      }
      fs.writeFileSync(getSettingsPath(), JSON.stringify(tmpl, null, 2))
    }
  } catch {}
}

function parseRes(str){
  try {
    const m = String(str||'').match(/(\d+)x(\d+)/i)
    const w = Math.max(400, Number(m && m[1] || 1280))
    const h = Math.max(300, Number(m && m[2] || 800))
    return { w, h }
  } catch { return { w:1280, h:800 } }
}

const ICON_PATH = path.join(getGameDir(), 'EE2X.ico')

async function createWindow(){
  const cfg = loadConfig()
  const { w, h } = parseRes(cfg.preferredResolution)
  win = new BrowserWindow({
    width: w,
    height: h,
    resizable: false,
    minWidth: w,
    minHeight: h,
    maxWidth: w,
    maxHeight: h,
    backgroundColor: '#0b0f19',
    title: '地球帝国二代远航版',
    icon: ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    }
  })
  // 使用 loadURL + pathToFileURL 解决中文路径下 loadFile ERR_FAILED 问题
  const { pathToFileURL } = require('url')
  const htmlPath = path.join(__dirname, 'renderer', 'index.html')
  await win.loadURL(pathToFileURL(htmlPath).href)
  win.on('unresponsive', () => log('window unresponsive'))
  win.webContents.on('render-process-gone', (e, details) => log(`renderer gone: ${details.reason}`))
  
  // 最小化到托盘逻辑
  win.on('minimize', (event) => {
    event.preventDefault()
    win.hide()
  })

  // 关闭到托盘逻辑
  win.on('close', async (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      
      const cfg = loadConfig()
      if (cfg.closeAction === 'minimize') {
        win.hide()
      } else if (cfg.closeAction === 'exit') {
        app.isQuitting = true
        win.destroy()
        app.quit()
      } else {
        // 默认为询问
        const { response, checkboxChecked } = await dialog.showMessageBox(win, {
          type: 'question',
          buttons: ['最小化到托盘', '退出程序'],
          title: '关闭提示',
          message: '您希望如何操作？',
          detail: '最小化到托盘可以保持后台运行',
          checkboxLabel: '记住我的选择',
          defaultId: 0,
          cancelId: 1
        })
        
        if (checkboxChecked) {
          cfg.closeAction = response === 0 ? 'minimize' : 'exit'
          saveConfig(cfg)
        }
        
        if (response === 0) {
          win.hide()
        } else {
          app.isQuitting = true
          win.destroy()
          app.quit()
        }
      }
    }
    return false
  })
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    log(`[LauncherRestart] 收到 second-instance 事件: isQuitting=${!!app.isQuitting}, replacementInProgress=${launcherReplacementInProgress}`)
    if (app.isQuitting || launcherReplacementInProgress) {
      log('[LauncherRestart] 已忽略 second-instance，因为旧进程正在退出交接')
      return
    }
    if (win) {
      if (win.isMinimized()) win.restore()
      if (!win.isVisible()) win.show()
      win.focus()
    }
  })
}

app.on('will-quit', () => {
  try { globalShortcut.unregisterAll() } catch {}
})

app.setAppUserModelId('com.ee2x.launcher')
app.disableHardwareAcceleration()
// 彻底禁用 GPU 进程，防止在某些环境下 GPU 进程启动失败导致 FATAL 崩溃
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.commandLine.appendSwitch('no-sandbox')
Menu.setApplicationMenu(null)
process.on('uncaughtException', (err) => { log(`uncaughtException: ${err && err.stack || err}`) })
process.on('unhandledRejection', (err) => { log(`unhandledRejection: ${err && err.stack || err}`) })
app.whenReady().then(async () => {
  if (!gotTheLock) return
  try {
    log('app ready')
    // 清理 Logs 文件夹（保留播报缓存和结算历史）
    const logsDir = path.join(getAppRoot(), 'Logs')
    try {
      if (fs.existsSync(logsDir)) {
        const keepFiles = new Set(['broadcast-cache.json', 'battle-recent.json', 'battle-history.json', 'battle-image-state.json'])
        const files = fs.readdirSync(logsDir)
        for (const file of files) {
          if (!keepFiles.has(file)) {
            const filePath = path.join(logsDir, file)
            try {
              fs.unlinkSync(filePath)
            } catch {}
          }
        }
        log('Logs folder cleaned')
      }
    } catch (e) { log('Failed to clean Logs: ' + e) }
    ensureSettingsFile()
    await createWindow()
    try { registerBattleHotkey() } catch {}
    recentBattleSummary = loadBattleRecent()
    // startChatServer() // Start Chat Server
    // startNetworkService() // Removed auto-start
    log('window created')
    createTray()
  } catch (e) {
    log(`createWindow error: ${e && e.stack || e}`)
  }
})

ipcMain.handle('cfg:get', async () => loadConfig())
ipcMain.handle('cfg:set', async (evt, cfg) => { saveConfig(cfg); try { registerBattleHotkey() } catch {}; return true })
ipcMain.handle('battle:getRecent', async () => recentBattleSummary || loadBattleRecent())
ipcMain.handle('battle:getHistory', async () => loadBattleHistory())
ipcMain.handle('battle:getRecentByPath', async (evt, csvPath) => {
  try {
    if (!csvPath) return null
    csvDataCache.delete(csvPath)
    return parseCsvFile(csvPath)
  } catch { return null }
})
ipcMain.handle('battle:deleteRecord', async (evt, csvPath) => {
  try {
    if (!csvPath) return { ok: false, error: '路径为空' }
    // 删除CSV文件
    if (fs.existsSync(csvPath)) {
      fs.unlinkSync(csvPath)
      csvDataCache.delete(csvPath)
    }
    // 从history JSON中移除该条记录
    const history = loadBattleHistory()
    const newHistory = history.filter(item => item.csvPath !== csvPath)
    saveBattleHistory(newHistory)
    // 如果删除的是最近一条，顺延下一条作为最近记录
    const recent = loadBattleRecent()
    if (recent && recent.csvPath === csvPath) {
      try { fs.unlinkSync(getBattleRecentPath()) } catch {}
      recentBattleSummary = null
      // 顺延：优先从剩余history取第一条，否则扫描CSV目录
      let nextItem = null
      if (newHistory.length > 0) {
        nextItem = newHistory[0]
      } else {
        const csvFiles = scanCsvFiles()
        if (csvFiles.length > 0) nextItem = { csvPath: csvFiles[0].filePath, time: csvFiles[0].time }
      }
      if (nextItem && nextItem.csvPath) {
        const full = parseCsvFile(nextItem.csvPath)
        const newRecent = full || nextItem
        saveBattleRecent(newRecent)
        recentBattleSummary = newRecent
      }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) }
  }
})
ipcMain.handle('battle:setHotkey', async (evt, hotkey) => {
  const cfg = loadConfig()
  cfg.battleHotkey = normalizeBattleHotkey(hotkey)
  saveConfig(cfg)
  const res = registerBattleHotkey()
  return res
})
ipcMain.handle('battle:testApi', async () => testBattleApi())
ipcMain.handle('battle:openCsv', async (evt, filePath) => {
  try {
    if (!filePath) return { ok:false, error:'文件路径为空' }
    await shell.openPath(filePath)
    return { ok:true }
  } catch (e) {
    return { ok:false, error:String(e && e.message || e) }
  }
})
ipcMain.handle('battle:trigger', async () => triggerBattleCapture())

ipcMain.handle('openGameDirectory', async () => {
  try {
    const { shell } = require('electron')
    const cfg = loadConfig()
    const resolved = resolveConfiguredGameLocation(cfg)

    if (resolved && require('fs').existsSync(resolved.gameDir)) {
      log(`[GamePath] openGameDirectory 打开根目录: dir="${resolved.gameDir}"`)
      await shell.openPath(resolved.gameDir)
      return { success: true }
    } else {
      log('[GamePath] openGameDirectory 未找到合法游戏根目录')
      return { success: false, error: GAME_ROOT_ERROR_MESSAGE }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('game:detect', async () => {
  const cfg = loadConfig()
  const normalized = normalizeGameLocationInConfig(cfg, 'game:detect')
  if (normalized.ok) {
    saveConfig(cfg, { skipGamePathNormalize: true })
    log(`[GamePath] game:detect 发现合法游戏根目录: dir="${cfg.gameDir}", exe="${cfg.gameExePath}"`)
    return cfg.gameExePath
  }
  log('[GamePath] game:detect 未发现合法游戏根目录')
  saveConfig(cfg, { skipGamePathNormalize: true })
  return null
})

ipcMain.handle('game:chooseExe', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters:[{ name:'可执行文件', extensions:['exe'] }] })
  if (r.canceled || r.filePaths.length === 0) return null
  const cfg = loadConfig()
  const previewCfg = { ...cfg, gameExePath: r.filePaths[0], gameDir: path.dirname(r.filePaths[0]) }
  const normalized = normalizeGameLocationInConfig(previewCfg, 'game:chooseExe')
  if (normalized.ok) return previewCfg.gameExePath
  log(`[GamePath] game:chooseExe 保留原始选择供界面显示: exe="${r.filePaths[0]}"`)
  return r.filePaths[0]
})

ipcMain.handle('game:chooseDir', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
  if (r.canceled || r.filePaths.length === 0) return null
  const cfg = loadConfig()
  const previewCfg = { ...cfg, gameDir: r.filePaths[0], gameExePath: '' }
  const normalized = normalizeGameLocationInConfig(previewCfg, 'game:chooseDir')
  if (normalized.ok) return previewCfg.gameDir
  log(`[GamePath] game:chooseDir 保留原始选择供界面显示: dir="${r.filePaths[0]}"`)
  return r.filePaths[0]
})

ipcMain.handle('ui:chooseImage', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters:[{ name:'图片', extensions:['png','jpg','jpeg','gif','webp'] }] })
  if (r.canceled || r.filePaths.length === 0) return null
  return r.filePaths[0]
})

ipcMain.handle('game:start', async () => {
  const cfg = loadConfig()
  const resolved = resolveConfiguredGameLocation(cfg)
  if (!resolved) {
    log(`[GameStart] 启动失败: ${GAME_ROOT_ERROR_MESSAGE}`)
    return { ok:false, error: GAME_ROOT_ERROR_MESSAGE }
  }
  try {
    const status = await getUnifiedReleaseStatus(cfg, '')
    if (status.gameNeedsUpdate) {
      const targetVersion = status.latestVersion || status.pendingVersion || '最新版本'
      const message = status.gameRunning
        ? `检测到服务器版本 ${targetVersion}，当前游戏退出后必须先完成同步。`
        : `检测到服务器版本 ${targetVersion}，请先完成同步更新。`
      log(`[GameStart] 启动被拦截: ${message}`)
      return { ok:false, error: message, code: 'update-required', version: targetVersion }
    }
  } catch (error) {
    log(`[GameStart] 更新检查失败，禁止启动: ${error}`)
    return { ok:false, error: `版本检查失败，请稍后重试：${String(error && error.message || error)}` }
  }
  const exePath = resolved.gameExePath
  cfg.gameDir = resolved.gameDir
  cfg.gameExePath = resolved.gameExePath
  saveConfig(cfg, { skipGamePathNormalize: true })
  const cwd = path.dirname(exePath)
  log(`[GameStart] 启动游戏: exe="${exePath}", cwd="${cwd}"`)
  require('child_process').spawn(exePath, [], { cwd, detached: true, stdio: 'ignore' }).unref()
  return { ok:true }
})

ipcMain.handle('server:latest', async (evt, baseUrl) => {
  const cfg = loadConfig()
  try {
    const { latest } = await fetchStaticLatestDescriptor(cfg, baseUrl)
    return {
      version: latest.version || null,
      notes: latest.notes || '',
      files: []
    }
  } catch (staticError) {
    log(`server:latest static fallback: ${staticError}`)
  }
  const candidates = Array.from(new Set([
    (baseUrl||'').replace(/\/$/, ''),
    (cfg.serverUrl||'').replace(/\/$/, '')
  ])).filter(Boolean)
  let res
  for (const base of candidates){
    try { res = await axios.get(`${base}/api/version/latest`); if (res) break } catch (e) { log(`latest failed ${base}: ${e}`) }
  }
  if (!res) throw new Error('latest failed')
  const data = res.data || {}
  const manifest = (data.manifest && Array.isArray(data.manifest.files)) ? data.manifest.files : []
  const files = manifest.map(f => ({
    name: f.path,
    path: f.path,
    size: f.size
  }))
  return {
    version: data.version || null,
    notes: data.changelog || '',
    files
  }
})

ipcMain.handle('server:changelog', async (evt, baseUrl) => {
  const cfg = loadConfig()
  try {
    const { versions } = await fetchLauncherVersionList(cfg, baseUrl)
    const latest = versions[0] || null
    if (latest) return { version: latest.version || null, changelog: latest.changelog || latest.notes || '' }
  } catch {}
  const url = `${normalizeBaseUrl(baseUrl)}/api/version/latest`
  const res = await axios.get(url)
  const data = res.data || {}
  return { version: data.version || null, changelog: data.changelog || '' }
})

ipcMain.handle('server:versions', async (evt, baseUrl) => {
  const cfg = loadConfig()
  const { versions } = await fetchLauncherVersionList(cfg, baseUrl)
  return { versions }
})

ipcMain.handle('server:versionDetail', async (evt, payload) => {
  const cfg = loadConfig()
  const { versions } = await fetchLauncherVersionList(cfg, payload.baseUrl)
  const found = versions.find(v => v && v.version === payload.ver)
  return found || null
})

ipcMain.handle('server:test', async (evt, baseUrl) => {
  const url = `${baseUrl.replace(/\/$/, '')}/api/version/latest`
  try {
    const res = await axios.get(url)
    return { ok: res.status === 200 }
  } catch {
    return { ok: false }
  }
})

ipcMain.handle('userServer:test', async (evt, baseUrl) => {
  try {
    const url = `${(baseUrl||'').replace(/\/$/, '')}/api/admin/users`
    const res = await axios.get(url, { timeout: 5000 })
    return { ok: res.status === 200 }
  } catch {
    return { ok:false }
  }
})

ipcMain.handle('cfg:autoDetect', async () => {
  // 自动探测逻辑已被禁用，直接返回 null 以强制使用配置文件中的端口
  return null;
})

async function downloadFile(url, dest){
  const res = await axios.get(url, { responseType: 'stream' })
  await fse.ensureDir(path.dirname(dest))
  const w = fs.createWriteStream(dest)
  await new Promise((resolve, reject) => { res.data.pipe(w).on('finish', resolve).on('error', reject) })
}

function buildLocalManifest(base, evt){
  // 用户要求不再校验文件清单，直接返回空清单
  // 这样所有服务器文件都会被视为需要下载
  if (evt){ try { evt.sender.send('update:stage', { stage: 'scan_local_done', scanned: 0 }) } catch {} }
  const manifest = { files: [] }
  try { fse.ensureDirSync(path.dirname(getLocalListPath())); fs.writeFileSync(getLocalListPath(), JSON.stringify(manifest, null, 2)) } catch {}
  return manifest
}

ipcMain.handle('update:diff', async (evt, baseUrl) => {
  const cfg = loadConfig()
  try {
    const { latest } = await fetchStaticLatestDescriptor(cfg, baseUrl)
    const bootstrap = ensureReleaseStateBootstrap(cfg)
    const localVersion = String(bootstrap.localGameVersion || '').trim()
    const hasUpdate = !!(latest.version && localVersion !== latest.version)
    const downloads = hasUpdate ? [{ path: latest.packageUrl || 'release-package', size: latest.packageSize || 0 }] : []
    try { evt.sender.send('update:stage', { stage: 'fetch_remote', remoteCount: downloads.length }) } catch {}
    try { evt.sender.send('update:stage', { stage: 'compare_done', downloadCount: downloads.length, totalBytes: latest.packageSize || 0 }) } catch {}
    return { ok:true, downloads, version: latest.version || null, changelog: latest.notes || '' }
  } catch (staticError) {
    log(`update:diff static fallback: ${staticError}`)
  }
  const url = `${(baseUrl||'').replace(/\/$/, '')}/api/version/latest`
  const res = await axios.get(url)
  const data = res.data || {}
  const remote = Array.isArray(data?.manifest?.files) ? data.manifest.files : []
  try { fse.ensureDirSync(path.dirname(getServerListPath())); fs.writeFileSync(getServerListPath(), JSON.stringify({ files: remote }, null, 2)) } catch {}
  const base = resolveGameBase(cfg)
  log(`更新检查 - 游戏基础目录: ${base}`)
  log(`更新检查 - 服务器文件数量: ${remote.length}`)
  try { evt.sender.send('update:stage', { stage: 'fetch_remote', remoteCount: remote.length }) } catch {}
  const downloads = remote.map(rf => ({ path: rf.path, size: rf.size }))
  const totalBytes = downloads.reduce((s,f)=> s + (Number(f.size)||0), 0)
  try { evt.sender.send('update:stage', { stage: 'compare_done', downloadCount: downloads.length, totalBytes }) } catch {}
  return { ok:true, downloads, version: data.version || null, changelog: data.changelog || '' }
})

ipcMain.handle('launcher:runUpdater', async (evt, payload) => {
  clearUpdaterDiagnostics()
  if (embeddedGameUpdateInProgress) {
    return {
      ok: false,
      inProgress: true,
      error: '更新正在进行中，请稍候。',
      logPath: getLastUpdaterLogPath(),
      resultPath: getLastUpdaterResultPath()
    }
  }
  const requestedScope = String((payload && payload.scope) || 'game').trim()
  const scope = requestedScope === 'game' ? 'game' : 'game'
  const forceSync = !!(payload && payload.force)
  const cfg = loadConfig()
  embeddedGameUpdateInProgress = true
  try {
    const result = await runEmbeddedGameUpdater(evt, cfg, '', { force: forceSync })
    return {
      ...result,
      scope,
      requestedScope,
      force: forceSync
    }
  } catch (error) {
    const payloadResult = buildUpdaterResultPayload({
      ok: false,
      scope,
      requestedScope,
      force: forceSync,
      version: '',
      error: String(error && error.message || error)
    })
    writeLastUpdaterResult(payloadResult)
    appendUpdaterLog(getLastUpdaterLogPath(), `[error] ${payloadResult.error}`)
    return payloadResult
  } finally {
    embeddedGameUpdateInProgress = false
  }
})


ipcMain.handle('align:prune', async (evt) => {
  // 先删除后下载模式：配合更新逻辑，不需要单独的清理步骤
  log('align:prune 被调用，但由于采用先删除后下载模式，已在更新过程中处理文件删除')
  try { evt && evt.sender && evt.sender.send('update:stage', { stage: 'prune_done', pruned: 0 }) } catch {}
  return { ok:true, pruned: 0, message: '先删除后下载模式：文件删除已在更新过程中处理' }
})

ipcMain.handle('history:get', async () => loadHistory())
ipcMain.handle('history:add', async (evt, item) => { try { const h = loadHistory(); h.unshift(item); saveHistory(h); return true } catch { return false } })
ipcMain.handle('history:delete', async (evt, key) => {
  try {
    const h = loadHistory()
    const ver = key && key.version
    const time = key && key.time
    const nh = (Array.isArray(h)?h:[]).filter(it => {
      if (ver && time) return !(it && it.version === ver && it.time === time)
      if (ver) return !(it && it.version === ver)
      if (time) return !(it && it.time === time)
      return true
    })
    saveHistory(nh)
    return true
  } catch { return false }
})

ipcMain.handle('shortcut:create', async () => {
  const desktop = app.getPath('desktop')
  const link = path.join(desktop, 'EE2X 启动器.lnk')
  const target = process.execPath
  const r = shell.writeShortcutLink(link, {
    target,
    args: '',
    description: '启动 EE2X 启动器',
    icon: ICON_PATH,
    workingDirectory: path.dirname(target)
  })
  return r
})

ipcMain.handle('shortcut:createGameDir', async () => {
  const cfg = loadConfig()
  const base = (cfg.gameDir && fs.existsSync(cfg.gameDir)) ? cfg.gameDir : getGameDir()
  const link = path.join(base, '地球帝国二代远航版.lnk')
  const target = process.execPath
  const r = shell.writeShortcutLink(link, {
    target,
    args: '',
    description: '地球帝国二代远航版',
    icon: ICON_PATH,
    workingDirectory: path.dirname(target)
  })
  return r
})


ipcMain.handle('shortcut:existsDesktop', async () => {
  try {
    const desktop = app.getPath('desktop')
    const link = path.join(desktop, '地球帝国二代远航版.lnk')
    return fs.existsSync(link)
  } catch { return false }
})

ipcMain.handle('cfg:openFile', async () => {
  try { await shell.openPath(getSettingsPath()); return true } catch { return false }
})

ipcMain.handle('shell:openPath', async (evt, targetPath) => {
  try {
    const result = await shell.openPath(String(targetPath || ''))
    return result ? { ok: false, error: result } : { ok: true }
  } catch (error) {
    return { ok: false, error: String(error && error.message || error) }
  }
})

ipcMain.handle('cfg:reload', async () => {
  return loadConfig()
})

ipcMain.handle('win:applyResolution', async (evt, resStr) => {
  try {
    const { w, h } = parseRes(resStr)
    if (win) {
      win.setResizable(true)
      win.setSize(w, h, true)
      win.setMinimumSize(w, h)
      win.setMaximumSize(w, h)
      win.setResizable(false)
    }
    const cfg = loadConfig()
    cfg.preferredResolution = `${w}x${h}`
    saveConfig(cfg)
    return { ok:true }
  } catch (e) { return { ok:false, error: String(e) } }
})

function originOf(u){
  try {
    const x = new URL(u)
    const hostOnly = x.hostname
    const port = (x.port || '').trim()
    const proto = (x.protocol || 'http:')
    const isWebPort = (port === '' || port === '80' || port === '443')
    const targetProto = proto
    const targetPort = isWebPort ? '' : ''
    return `${targetProto}//${hostOnly}${targetPort ? (':' + targetPort) : ''}`
  } catch {
    return (u || '').replace(/\/$/, '')
  }
}

function originWithPort(u){
  try {
    const x = new URL(u)
    const host = x.hostname
    const port = (x.port || '').trim()
    const proto = (x.protocol || 'http:')
    return `${proto}//${host}${port ? (':' + port) : ''}`
  } catch {
    return (u || '').replace(/\/$/, '')
  }
}

ipcMain.handle('server:broadcast', async (evt, baseOverride) => {
  const cfg = loadConfig()
  const o1 = originOf(baseOverride || cfg.serverUrl)
  const o2 = originWithPort(baseOverride || cfg.serverUrl)
  const bases = Array.from(new Set([o1, o2]))
  const candidates = []
  for (const origin of bases){
    candidates.push(
      `${origin}/web/broadcast.json`,
      `${origin}/web/match-broadcast.json`,
      `${origin}/api/broadcast`,
      `${origin}/api/rank/broadcast`,
      `${origin}/rank/broadcast.json`
    )
  }
  let data = null
  let lastUrl = null
  for (const url of candidates){
    try { const res = await axios.get(url, { timeout: 5000 }); if (res && res.data){ data = res.data; lastUrl = url; log(`broadcast from ${url}`); break } } catch { log(`broadcast failed ${url}`) }
  }
  if (!data) {
    // fallback: derive from /api/state
    for (const origin of bases) {
      const url = `${origin}/api/state`
      try {
        const res = await axios.get(url, { timeout: 5000 })
        const st = res && res.data
        const matches = (st && Array.isArray(st.matches)) ? st.matches.slice(-20) : []
        const players = (st && Array.isArray(st.players)) ? st.players : []
        if (matches.length) {
          data = { items: matches.map((m) => {
            const red = players.filter(p => Array.isArray(m.redIds) && m.redIds.includes(p.id))
            const blue = players.filter(p => Array.isArray(m.blueIds) && m.blueIds.includes(p.id))
            const redSnap = Array.isArray(m.redSnapshot) ? m.redSnapshot : []
            const blueSnap = Array.isArray(m.blueSnapshot) ? m.blueSnapshot : []
            const redUse = red.length ? red : redSnap
            const blueUse = blue.length ? blue : blueSnap
            const rn = red.map(p => p.name).join('、') || '—'
            const bn = blue.map(p => p.name).join('、') || '—'
            const label = m.type === 'solo' ? '单挑赛' : '团体赛'
            const ts = (m.endedAt || m.startedAt || new Date().toLocaleString('zh-CN'))
            const text = `${label} ${ts} 红方（${rn}） VS 蓝方（${bn}） ${m.winner ? (m.winner==='red'?'红方胜利':'蓝方胜利') : '未判定'}`
            const dice = (nm) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nm)}`
            return {
              text,
              time: ts,
              winner: m.winner || '',
              type: m.type || ((redUse.length + blueUse.length) === 2 ? 'solo' : 'team'),
              players: [...redUse.map(p=>p.name), ...blueUse.map(p=>p.name)],
              red: redUse.map(p=>p.name),
              blue: blueUse.map(p=>p.name),
              redAvatars: redUse.map(p=>p.avatarUrl || dice(p.name)),
              blueAvatars: blueUse.map(p=>p.avatarUrl || dice(p.name)),
              redTotal: redUse.reduce((s,p)=>s+((typeof p.power==='number')?Math.max(1,Math.min(100,p.power)):50),0),
              blueTotal: blueUse.reduce((s,p)=>s+((typeof p.power==='number')?Math.max(1,Math.min(100,p.power)):50),0),
              diff: Math.abs(
                redUse.reduce((s,p)=>s+((typeof p.power==='number')?Math.max(1,Math.min(100,p.power)):50),0)
                -
                blueUse.reduce((s,p)=>s+((typeof p.power==='number')?Math.max(1,Math.min(100,p.power)):50),0)
              )
            }
          }) }
          lastUrl = url
          log(`broadcast derived from ${url}`)
          break
        }
      } catch { log(`broadcast derive failed ${url}`) }
    }
  }
  if (!data) {
    const cached = loadBroadcastCache()
    if (Array.isArray(cached) && cached.length) return { ok:true, url: 'cache', items: cached }
    return { ok:false, error: '未获取到播报数据' }
  }
  let items = []
  if (Array.isArray(data)) items = data
  else if (data && Array.isArray(data.items)) items = data.items
  else if (data && typeof data === 'object') items = Object.values(data)
  items = items.map((x) => {
    if (typeof x === 'string') return { text: x }
    const o = x || {}
    const ts = o.time || o.ts || o.updated_at || null
    const red = o.red || o.redNames || null
    const blue = o.blue || o.blueNames || null
    const redAvatars = o.redAvatars || null
    const blueAvatars = o.blueAvatars || null
    const type = o.type || null
    const redTotal = o.redTotal || null
    const blueTotal = o.blueTotal || null
    const diff = o.diff || null
    const winner = o.winner || o.result || null
    const players = o.players || o.match || null
    const text = o.text || o.note || null
    const line = text || `${ts ? `[${ts}] ` : ''}${winner ? `胜方:${winner} ` : ''}${players ? `玩家:${Array.isArray(players)?players.join(','):players}` : ''}`.trim()
    const totalCount = (Array.isArray(red)?red.length:0) + (Array.isArray(blue)?blue.length:0)
    const calcType = type || (totalCount >= 3 ? 'team' : 'solo')
    return { text: line, time: ts, winner, type: calcType, players, red, blue, redAvatars, blueAvatars, redTotal, blueTotal, diff }
  })

  try {
    const base = originOf(lastUrl || cfg.serverUrl)
    const stateRes = await axios.get(`${base}/api/state`, { timeout: 5000 })
    const st = stateRes && stateRes.data || {}
    const players = Array.isArray(st.players) ? st.players : []
    const tiers = Array.isArray(st.tiers) ? st.tiers : []
    const clamp = (n) => Math.max(1, Math.min(100, Number(n||0)))
    const powerOf = (p) => {
      if (!p) return 50
      if (typeof p.power === 'number') return clamp(p.power)
      const t = tiers.find(x => x.id === p.currentTier)
      if (!t) return 50
      if (typeof t.powerScore === 'number') return clamp(101 - t.powerScore)
      if (typeof t.rating === 'number') return clamp((t.rating) * 20)
      const so = t.sortOrder || 6
      return clamp((6 - so) * 15)
    }
    const dice = (nm) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nm)}`

    items = items.map(it => {
      let red = Array.isArray(it.red) ? it.red : []
      let blue = Array.isArray(it.blue) ? it.blue : []
      if ((red.length === 0 || blue.length === 0) && typeof it.text === 'string') {
        const m = it.text.match(/红方（([^）]*)）.*蓝方（([^）]*)）/)
        if (m) {
          const parseNames = (s) => (s||'').split(/[、,，\s]+/).map(x=>x.trim()).filter(Boolean)
          red = red.length ? red : parseNames(m[1])
          blue = blue.length ? blue : parseNames(m[2])
        }
      }
      const redPlayers = red.map(nm => players.find(p => p.name === nm)).filter(Boolean)
      const bluePlayers = blue.map(nm => players.find(p => p.name === nm)).filter(Boolean)
      const redAv = Array.isArray(it.redAvatars) && it.redAvatars.length ? it.redAvatars : red.map((nm,i)=> (redPlayers[i]?.avatarUrl) || dice(nm))
      const blueAv = Array.isArray(it.blueAvatars) && it.blueAvatars.length ? it.blueAvatars : blue.map((nm,i)=> (bluePlayers[i]?.avatarUrl) || dice(nm))
      const rTot = typeof it.redTotal === 'number' ? it.redTotal : redPlayers.reduce((s,p)=> s + powerOf(p), 0)
      const bTot = typeof it.blueTotal === 'number' ? it.blueTotal : bluePlayers.reduce((s,p)=> s + powerOf(p), 0)
      const df = typeof it.diff === 'number' ? it.diff : Math.abs(rTot - bTot)
      const type = it.type || ((red.length + blue.length) === 2 ? 'solo' : 'team')
      return { ...it, red, blue, redAvatars: redAv, blueAvatars: blueAv, redTotal: rTot, blueTotal: bTot, diff: df, type }
    })
  } catch {}
  try { saveBroadcastCache(items) } catch {}
  return { ok:true, url: lastUrl, items }
})

ipcMain.handle('server:results', async (evt, baseOverride) => {
  const cfg = loadConfig()
  const o1 = originOf(baseOverride || cfg.serverUrl)
  const o2 = originWithPort(baseOverride || cfg.serverUrl)
  const bases = Array.from(new Set([o1, o2]))
  const candidates = []
  for (const origin of bases){
    candidates.push(
      `${origin}/web/results.json`,
      `${origin}/web/match-results.json`,
      `${origin}/api/results`,
      `${origin}/api/rank/results`,
      `${origin}/rank/results.json`
    )
  }
  let data = null
  let lastUrl = null
  for (const url of candidates){
    try { const res = await axios.get(url, { timeout: 5000 }); if (res && res.data){ data = res.data; lastUrl = url; log(`results from ${url}`); break } } catch { log(`results failed ${url}`) }
  }
  if (!data) {
    // fallback: derive from /api/state
    for (const origin of bases) {
      const url = `${origin}/api/state`
      try {
        const res = await axios.get(url, { timeout: 5000 })
        const st = res && res.data
        const matches = (st && Array.isArray(st.matches)) ? st.matches.slice(-50) : []
        const players = (st && Array.isArray(st.players)) ? st.players : []
        if (matches.length) {
          let redWins = 0, blueWins = 0
          const items = matches.map((m) => {
            const red = players.filter(p => Array.isArray(m.redIds) && m.redIds.includes(p.id))
            const blue = players.filter(p => Array.isArray(m.blueIds) && m.blueIds.includes(p.id))
            const redSnap = Array.isArray(m.redSnapshot) ? m.redSnapshot : []
            const blueSnap = Array.isArray(m.blueSnapshot) ? m.blueSnapshot : []
            const redUse = red.length ? red : redSnap
            const blueUse = blue.length ? blue : blueSnap
            const rn = red.map(p => p.name).join('、') || '—'
            const bn = blue.map(p => p.name).join('、') || '—'
            const label = m.type === 'solo' ? '单挑赛' : '团体赛'
            const ts = (m.endedAt || m.startedAt || new Date().toLocaleString('zh-CN'))
            if (m.winner === 'red') redWins++; else if (m.winner === 'blue') blueWins++
            const text = `${label} ${ts} 红方（${rn}） VS 蓝方（${bn}） ${m.winner ? (m.winner==='red'?'红方胜利':'蓝方胜利') : '未判定'}`
            const dice = (nm) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nm)}`
            return {
              text,
              time: ts,
              winner: m.winner || '',
              type: m.type || ((redUse.length + blueUse.length) === 2 ? 'solo' : 'team'),
              players: [...redUse.map(p=>p.name), ...blueUse.map(p=>p.name)],
              red: redUse.map(p=>p.name),
              blue: blueUse.map(p=>p.name),
              redAvatars: redUse.map(p=>p.avatarUrl || dice(p.name)),
              blueAvatars: blueUse.map(p=>p.avatarUrl || dice(p.name)),
              redTotal: redUse.reduce((s,p)=>s+((typeof p.power==='number')?Math.max(1,Math.min(100,p.power)):50),0),
              blueTotal: blueUse.reduce((s,p)=>s+((typeof p.power==='number')?Math.max(1,Math.min(100,p.power)):50),0),
              diff: Math.abs(
                redUse.reduce((s,p)=>s+((typeof p.power==='number')?Math.max(1,Math.min(100,p.power)):50),0)
                -
                blueUse.reduce((s,p)=>s+((typeof p.power==='number')?Math.max(1,Math.min(100,p.power)):50),0)
              )
            }
          })
          data = { items, summary: { total: items.length, redWins, blueWins } }
          lastUrl = url
          log(`results derived from ${url}`)
          break
        }
      } catch { log(`results derive failed ${url}`) }
    }
  }
  if (!data) return { ok:false, error: '未获取到结果数据' }
  let items = []
  if (Array.isArray(data)) items = data
  else if (data && Array.isArray(data.items)) items = data.items
  else if (data && typeof data === 'object') items = Object.values(data)
  let redWins = 0, blueWins = 0
  const norm = items.map((x) => {
    if (typeof x === 'string') return { text: x }
    const o = x || {}
    const ts = o.time || o.ts || o.updated_at || null
    const winner = (o.winner || o.result || '').toString().toLowerCase()
    if (winner.includes('red')) redWins++
    else if (winner.includes('blue')) blueWins++
    const red = o.red_total || o.red || null
    const blue = o.blue_total || o.blue || null
    const players = o.players || o.match || null
    const text = o.text || o.note || null
    const line = text || `${ts ? `[${ts}] ` : ''}${winner ? `胜方:${o.winner||o.result} ` : ''}${red!=null||blue!=null ? `红:${red||0} 蓝:${blue||0} ` : ''}${players ? `玩家:${Array.isArray(players)?players.join(','):players}` : ''}`.trim()
    return { text: line }
  })
  const summary = { redWins, blueWins, total: norm.length }
  return { ok:true, url: lastUrl, items: norm, summary }
})

ipcMain.handle('win:openPageWindow', async (evt, payload) => {
  const w = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0b0f19',
    title: (payload && payload.title) || 'EE2X',
    webPreferences: {
      preload: path.join(__dirname, 'toolpreload.js')
    }
  })
  await w.loadURL(payload && payload.url)
  return true
})

ipcMain.handle('win:captureToClipboard', async (evt) => {
  const bw = BrowserWindow.fromWebContents(evt.sender)
  let restore = null
  try { restore = await bw.webContents.executeJavaScript(`(function(){var a=document.getElementById('ee2xShotBtn');var b=document.getElementById('shotMainBtn');var pa=a&&a.style.display;var pb=b&&b.style.display; if(a) a.style.display='none'; if(b) b.style.display='none'; return {pa:pa||'', pb:pb||''};})()`) } catch {}
  const img = await bw.webContents.capturePage()
  const { clipboard } = require('electron')
  clipboard.writeImage(img)
  try { await bw.webContents.executeJavaScript(`(function(s){var a=document.getElementById('ee2xShotBtn');var b=document.getElementById('shotMainBtn'); if(a) a.style.display=s && s.pa!==undefined ? s.pa : ''; if(b) b.style.display=s && s.pb!==undefined ? s.pb : '';})(${JSON.stringify(restore)})`) } catch {}
  return true
})
let cancelRequested = false
  cancelRequested = false
ipcMain.handle('update:cancel', async () => { cancelRequested = true; return true })
ipcMain.handle('release:status', async (evt, preferredBaseUrl) => {
  try {
    const cfg = loadConfig()
    const status = await getUnifiedReleaseStatus(cfg, preferredBaseUrl)
    return { ok: true, ...status }
  } catch (error) {
    log(`release:status failed: ${error}`)
    return { ok: false, error: String(error && error.message || error) }
  }
})

ipcMain.handle('release:markChangelogShown', async (evt, version) => {
  try {
    const state = readReleaseState()
    state.lastShownChangelogVersion = String(version || '')
    writeReleaseState(state)
    return { ok: true }
  } catch (error) {
    log(`release:markChangelogShown failed: ${error}`)
    return { ok: false, error: String(error && error.message || error) }
  }
})

ipcMain.handle('update2:manifest', async () => {
  try {
    const cfg = loadConfig()
    const { latest } = await fetchStaticLatestDescriptor(cfg, '')
    const gamePackage = resolveLatestPackage(latest, 'game')
    if (!gamePackage) {
      return { ok: false, error: '服务器当前版本未提供 game 更新包。' }
    }
    return {
      ok: true,
      manifest: {
        version: latest.version || '',
        notes: latest.notes || '',
        download_url: gamePackage.packageUrl || '',
        force_update: latest.required !== false,
        file_size: gamePackage.packageSize || 0,
        file_hash: gamePackage.packageSha256 || '',
        created_at: latest.publishedAt || '',
        manifest_url: gamePackage.manifestUrl || '',
      }
    }
  } catch (error) {
    return {
      ok: false,
      error: String(error && error.message || error),
    }
  }
})

ipcMain.handle('update2:download', async (evt, url) => {
  return {
    ok: false,
    error: '更新功能已关闭，按钮仅保留为后续开发入口。',
  }
})
function getBroadcastCachePath(){
  return path.join(getAppRoot(), 'Logs', 'broadcast-cache.json')
}
function saveBroadcastCache(items){
  try { fse.ensureDirSync(path.dirname(getBroadcastCachePath())); fs.writeFileSync(getBroadcastCachePath(), JSON.stringify({ items, time: new Date().toISOString() }, null, 2)) } catch {}
}
function loadBroadcastCache(){
  try { const j = JSON.parse(fs.readFileSync(getBroadcastCachePath(), 'utf-8')); return Array.isArray(j && j.items) ? j.items : [] } catch { return [] }
}

// 用户认证API
function getUserPath(){
  return path.join(getAppRoot(), 'Config', 'ee2x-user.json')
}
function loadUser(){
  try { return JSON.parse(fs.readFileSync(getUserPath(), 'utf-8')) } catch { return null }
}
function saveUser(user){
  try {
    const p = getUserPath()
    const dir = path.dirname(p)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(p, JSON.stringify(user, null, 2))
    return true
  } catch (e) {
    log(`saveUser failed: ${e.message}`)
    return false
  }
}
function clearUser(){
  try { if (fs.existsSync(getUserPath())) fs.unlinkSync(getUserPath()); return true } catch { return false }
}

ipcMain.handle('user:get', async () => loadUser())
ipcMain.handle('user:set', async (evt, u) => { return saveUser(u) })
ipcMain.handle('user:clear', async () => { return clearUser() })

ipcMain.handle('auth:register', async (evt, payload) => {
  try {
    const cfg = loadConfig()
    const base = (cfg.userServerUrl || '').replace(/\/$/, '')
    const url = `${base}/api/register`
    const res = await axios.post(url, { ...payload, computer_name: getComputerName(), ip: await getExternalIP() }, { timeout: 10000 })
    const data = res && res.data || {}
    if (!data || !data.success) return { ok:false, error: (data && data.message) || '注册失败' }
    const user = { username: data.user && data.user.username || payload.username, avatar: data.user && data.user.avatar || '', token: data.token, loginTime: new Date().toISOString() }
    saveUser(user)
    return { ok:true, user }
  } catch (e) {
    return { ok:false, error: String(e && e.response && e.response.data && e.response.data.message || e.message || e) }
  }
})

ipcMain.handle('auth:login', async (evt, payload) => {
  try {
    const cfg = loadConfig()
    const base = (cfg.userServerUrl || '').replace(/\/$/, '')
    const url = `${base}/api/login`
    const res = await axios.post(url, { ...payload, computer_name: getComputerName(), ip: await getExternalIP() }, { timeout: 10000 })
    const data = res && res.data || {}
    if (!data || !data.success) return { ok:false, error: (data && data.message) || '登录失败' }
    const user = { username: data.user && data.user.username || payload.username, avatar: data.user && data.user.avatar || '', token: data.token, loginTime: new Date().toISOString() }
    saveUser(user)
    return { ok:true, user }
  } catch (e) {
    return { ok:false, error: String(e && e.response && e.response.data && e.response.data.message || e.message || e) }
  }
})

ipcMain.handle('auth:updateAvatar', async (evt, payload) => {
  try {
    const cfg = loadConfig()
    const base = (cfg.userServerUrl || '').replace(/\/$/, '')
    const url = `${base}/api/user/avatar/update`
    
    // 发送请求，设置较大的超时和包体限制
    const res = await axios.post(url, payload, { timeout: 30000, maxContentLength: Infinity, maxBodyLength: Infinity })
    const data = res && res.data || {}
    
    if (!data || !data.success) {
      return { ok: false, error: (data && data.message) || '更新失败' }
    }
    
    // 更新本地缓存
    const user = loadUser()
    if (user && user.username === payload.username) {
        user.avatar = data.avatar
        saveUser(user)
    }
    
    return { ok: true, avatar: data.avatar }
  } catch (e) {
    return { ok: false, error: String(e.message) }
  }
})

ipcMain.handle('auth:updateSignature', async (evt, payload) => {
  try {
    const cfg = loadConfig()
    const base = (cfg.userServerUrl || '').replace(/\/$/, '')
    const url = `${base}/api/user/signature`
    
    const res = await axios.post(url, payload, { timeout: 10000 })
    const data = res && res.data || {}
    
    if (!data || !data.success) {
      return { ok: false, error: (data && data.message) || '更新失败' }
    }
    
    // Update local cache
    const user = loadUser()
    if (user && user.username === payload.username) {
        user.signature = data.signature
        saveUser(user)
    }
    
    return { ok: true, signature: data.signature }
  } catch (e) {
    const msg = e.response && e.response.data && e.response.data.message ? e.response.data.message : e.message
    return { ok: false, error: String(msg) }
  }
})

ipcMain.handle('user:onlineReport', async (evt, payload) => {
  try {
    const user = loadUser()
    if (!user || !user.token) return { ok:false, error:'未登录' }
    const cfg = loadConfig()
    const base = (cfg.userServerUrl || '').replace(/\/$/, '')
    const url = `${base}/api/user/online/report`
    const res = await axios.post(url, { token: user.token, virtual_ip: payload.virtual_ip }, { timeout: 5000 })
    return { ok: true, data: res.data }
  } catch (e) { return { ok:false, error: String(e) } }
})

ipcMain.handle('user:onlineList', async (evt) => {
  try {
    const cfg = loadConfig()
    const base = (cfg.userServerUrl || '').replace(/\/$/, '')
    const url = `${base}/api/user/online/list`
    const res = await axios.get(url, { timeout: 5000 })
    return { ok: true, list: res.data }
  } catch (e) { return { ok:false, error: String(e) } }
})

ipcMain.handle('auth:logout', async () => { try { clearUser(); return { ok:true } } catch { return { ok:false } } })
ipcMain.handle('app:quit', async () => {
  try {
    app.isQuitting = true
    app.quit()
    return { ok: true }
  } catch (error) {
    log(`app:quit failed: ${error}`)
    return { ok: false, error: String(error && error.message || error) }
  }
})

// 启动器重启功能
ipcMain.handle('launcher:restart', async () => {
  try {
    // 显示重启确认对话框
    const { dialog } = require('electron')
    const result = await dialog.showMessageBox(win, {
      type: 'info',
      title: '重新启动启动器',
      message: '启动器即将重新启动以应用更新',
      detail: '点击确定将重新启动启动器',
      buttons: ['确定', '取消'],
      defaultId: 0
    })

    if (result.response === 0) {
      // 重新启动应用
      prepareForLauncherReplacement('manual-relaunch')
      app.relaunch()
      app.quit()
      return { ok: true }
    } else {
      return { ok: false, message: '用户取消' }
    }
  } catch (error) {
    log(`重启启动器失败: ${error}`)
    return { ok: false, error: String(error) }
  }
})

// 启动器解压安装功能
ipcMain.handle('launcher:extractAndInstall', async () => {
  try {
    const path = require('path')
    const fs = require('fs')
    const { spawn } = require('child_process')

    // 获取启动器目录
    const launcherDir = path.dirname(process.execPath)
    const tempDir = path.join(launcherDir, 'temp_update')

    log('开始解压安装启动器更新...')

    // 确保临时目录存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // 查找下载的更新包
    const files = fs.readdirSync(tempDir)
    const updateFile = files.find(file => file.endsWith('.zip') || file.endsWith('.exe'))

    if (!updateFile) {
      // 尝试在用户数据目录查找
      const userDataPath = app.getPath('userData')
      const updateDataDir = path.join(userDataPath, 'updates')
      if (fs.existsSync(updateDataDir)) {
        const updateFiles = fs.readdirSync(updateDataDir)
        const foundUpdate = updateFiles.find(file => file.endsWith('.zip') || file.endsWith('.exe'))
        if (foundUpdate) {
          const updateFilePath = path.join(updateDataDir, foundUpdate)
          return await processUpdateFile(updateFilePath, launcherDir)
        }
      }
      throw new Error('未找到更新包文件')
    }

    const updateFilePath = path.join(tempDir, updateFile)
    return await processUpdateFile(updateFilePath, launcherDir)

  } catch (error) {
    log(`解压安装失败: ${error}`)
    return { ok: false, error: String(error) }
  }
})

// 下载并暂存启动器更新包
ipcMain.handle('launcher:downloadAndStage', async (evt) => {
  try {
    const cfg = loadConfig()
    const status = await getUnifiedReleaseStatus(cfg, '')
    const launcherPkg = status.packages.launcher
    if (!launcherPkg || !launcherPkg.packageUrl) {
      return { ok: false, error: '无可用启动器更新包' }
    }
    const runtimeDir = getReleaseRuntimeDir()
    const stagingDir = path.join(runtimeDir, 'staging', `launcher-${status.latestVersion}`)
    const extractDir = path.join(stagingDir, 'extracted')
    const packagePath = path.join(stagingDir, 'EE2X-launcher.zip')
    const logFile = getLastUpdaterLogPath()

    fs.mkdirSync(extractDir, { recursive: true })

    if (evt && evt.sender) {
      evt.sender.send('update:stage', { stage: 'download', message: '正在下载启动器更新...' })
    }

    const expectedSize = Number(launcherPkg.packageSize || 0)
    await downloadReleasePackage(launcherPkg.packageUrl, packagePath, evt, logFile, expectedSize)

    const hash = await computeFileSha256(packagePath)
    if (launcherPkg.packageSha256 && hash !== launcherPkg.packageSha256) {
      appendUpdaterLog(logFile, `[error] 启动器更新包 SHA256 校验失败: 预期 ${launcherPkg.packageSha256}, 实际 ${hash}`)
      return { ok: false, error: '下载包 SHA256 校验失败' }
    }

    if (evt && evt.sender) {
      evt.sender.send('update:stage', { stage: 'extract', message: '正在解压启动器更新...' })
    }
    await extractReleasePackage(packagePath, extractDir, logFile)
    appendUpdaterLog(logFile, `[info] 启动器更新 v${status.latestVersion} 已下载并暂存到 ${stagingDir}`)

    return {
      ok: true,
      stagingDir,
      extractDir,
      version: status.latestVersion,
      logPath: logFile
    }
  } catch (error) {
    log(`[LauncherUpdate] downloadAndStage 失败: ${error}`)
    return { ok: false, error: String(error && error.message || error) }
  }
})

// 触发外部启动器更新进程
ipcMain.handle('launcher:triggerExternalUpdate', async (evt, payload) => {
  try {
    const launcherExe = findLauncherExecutablePath()
    const launcherDir = getAppRoot()
    const cfg = loadConfig()
    const runtimeDir = getReleaseRuntimeDir()
    const logFile = getLastUpdaterLogPath()
    const resultFile = getLastUpdaterResultPath()
    const version = String((payload && payload.version) || '').trim()
    const extractDir = String((payload && payload.extractDir) || '').trim()
    const { spawn } = require('child_process')

    const patcherCliPath = path.join(runtimeDir, 'ee2x-patcher-cli.exe')
    if (fs.existsSync(patcherCliPath)) {
      const serverBase = String((cfg && cfg.updateServerBase) || '').trim() || 'http://115.231.35.105:3010'
      const channel = String((cfg && cfg.updateChannel) || 'stable').trim() || 'stable'
      const child = spawn(patcherCliPath, [
        '--root', path.dirname(launcherDir),
        '--launcher-dir', launcherDir,
        '--server-base', serverBase,
        '--channel', channel,
        '--scope', 'launcher',
        '--launcher-exe', launcherExe,
        '--result-file', resultFile,
        '--log-file', logFile,
        '--force',
        '--headless'
      ], { detached: true, stdio: 'ignore', windowsHide: true })
      child.unref()
      appendUpdaterLog(logFile, `[info] 已启动 ee2x-patcher-cli.exe PID=${child.pid} scope=launcher`)
    } else if (extractDir) {
      const psScript = generateLauncherUpdatePsScript({
        launcherDir, launcherExe, extractDir, version, runtimeDir, logFile
      })
      const psPath = path.join(runtimeDir, 'staging', `launcher-${version || 'update'}`, 'apply-launcher-update.ps1')
      fs.writeFileSync(psPath, psScript, { encoding: 'utf8' })
      const child = spawn('powershell', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden',
        '-File', psPath
      ], { detached: true, stdio: 'ignore', windowsHide: true })
      child.unref()
      appendUpdaterLog(logFile, `[info] 已启动 PowerShell 启动器更新脚本 PID=${child.pid}`)
    } else {
      return { ok: false, error: '无 patcher-cli 且无 extractDir，无法执行启动器更新' }
    }

    prepareForLauncherReplacement('launcher-update')
    setTimeout(() => app.exit(0), 300)
    return { ok: true, phase: 'exiting' }
  } catch (error) {
    log(`[LauncherUpdate] triggerExternalUpdate 失败: ${error}`)
    return { ok: false, error: String(error && error.message || error) }
  }
})

// 生成启动器更新 PowerShell 后备脚本
function generateLauncherUpdatePsScript({ launcherDir, launcherExe, extractDir, version, runtimeDir, logFile }) {
  const extractSource = path.join(extractDir, '地球帝国二代远航版启动器')
  const backupDir = path.join(runtimeDir, 'backups', `launcher-${version || 'manual'}`)
  const releaseStatePath = path.join(runtimeDir, 'release-state.json')

  return `
# EE2X 启动器更新脚本 - 由启动器自动生成
$ErrorActionPreference = 'Stop'
$extractSource = '${extractSource.replace(/'/g, "''")}'
$launcherDir = '${launcherDir.replace(/'/g, "''")}'
$backupDir = '${backupDir.replace(/'/g, "''")}'
$launcherExe = '${launcherExe.replace(/'/g, "''")}'
$version = '${(version || '').replace(/'/g, "''")}'
$statePath = '${releaseStatePath.replace(/'/g, "''")}'
$logFile = '${(logFile || '').replace(/'/g, "''")}'

function Write-Log($msg) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [PS] $msg"
  if ($logFile) { Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue }
  Write-Host $line
}

Write-Log "启动器更新脚本开始，来源: $extractSource"

# 1. 等待旧进程退出
$deadline = (Get-Date).AddSeconds(15)
while ((Get-Date) -lt $deadline) {
  $running = Get-Process -Name '地球帝国二代远航版启动器' -ErrorAction SilentlyContinue
  if (-not $running) { Write-Log "旧启动器进程已退出"; break }
  Start-Sleep -Milliseconds 500
}

# 2. 强制清理残留
taskkill /F /IM '地球帝国二代远航版启动器.exe' /T 2>$null
Start-Sleep -Seconds 2

if (-not (Test-Path $extractSource)) {
  Write-Log "错误: 解压目录不存在 $extractSource"
  if (Test-Path $launcherExe) { Start-Process $launcherExe }
  throw "解压目录不存在"
}

# 3. 受保护目录（跳过不覆盖）
$protectedPrefixes = @('Config', 'Logs', 'data\\userdata', 'data\\game-csv', 'data\\Settlement-img', 'update\\runtime')

# 4. 复制文件（原子替换）
Get-ChildItem -Recurse -File $extractSource | ForEach-Object {
  $relPath = $_.FullName.Substring($extractSource.Length + 1)
  $isProtected = $false
  foreach ($pfx in $protectedPrefixes) {
    if ($relPath.StartsWith($pfx)) { $isProtected = $true; break }
  }
  if ($isProtected) { return }

  $target = Join-Path $launcherDir $relPath
  $backup = Join-Path $backupDir $relPath
  $targetDir = Split-Path $target -Parent
  if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }
  $backupParent = Split-Path $backup -Parent
  if (-not (Test-Path $backupParent)) { New-Item -ItemType Directory -Force -Path $backupParent | Out-Null }

  if (Test-Path $target) {
    Copy-Item $target $backup -Force -ErrorAction SilentlyContinue
    # 先删除旧文件，避免 rename 覆盖冲突（如 .vbs/.dll 被系统锁定）
    try { Remove-Item $target -Force -ErrorAction Stop } catch {
      Write-Log "删除旧文件失败（将尝试直接覆盖）: $relPath — $_"
    }
  }

  Copy-Item $_.FullName $target -Force
  if (-not (Test-Path $target)) { throw "文件复制失败（目标未生成）: $relPath" }
}

Write-Log "文件替换完成"

# 5. 更新 release-state.json
if (Test-Path $statePath -and $version) {
  try {
    $state = Get-Content $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
    if (-not $state.launcher) { $state | Add-Member -MemberType NoteProperty -Name 'launcher' -Value @{} }
    $state.launcher.version = $version
    $state.launcher.appliedAt = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.fffZ')
    $state | ConvertTo-Json -Depth 10 | Set-Content $statePath -Encoding UTF8
    Write-Log "release-state.json 已更新 launcher version=$version"
  } catch {
    Write-Log "更新 release-state.json 失败: $_"
  }
}

# 6. 重启启动器
Write-Log "正在重新启动启动器: $launcherExe"
Start-Process $launcherExe -ArgumentList '--updated'
Write-Log "启动器更新完成"
`.trim()
}

// 处理更新文件
async function processUpdateFile(updateFilePath, launcherDir) {
  log(`找到更新包: ${updateFilePath}`)

  if (updateFilePath.endsWith('.zip')) {
    // ZIP包处理
    const result = await extractZip(updateFilePath, launcherDir)
    return result
  } else if (updateFilePath.endsWith('.exe')) {
    // EXE安装包处理
    const result = await installExe(updateFilePath)
    return result
  } else {
    throw new Error('不支持的更新包格式')
  }
}

// 解压ZIP文件
async function extractZip(zipPath, extractTo) {
  try {
    log(`开始解压ZIP: ${zipPath} -> ${extractTo}`)

    // 创建PowerShell解压脚本
    const { spawn } = require('child_process')
    const path = require('path')

    const psScript = `
      Add-Type -AssemblyName System.IO.Compression.FileSystem
      [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath}', '${extractTo}', $true)
      Write-Output "解压完成"
    `

    return new Promise((resolve, reject) => {
      const ps = spawn('powershell', ['-Command', psScript], {
        stdio: 'pipe',
        shell: true
      })

      let output = ''
      let errorOutput = ''

      ps.stdout.on('data', (data) => {
        output += data.toString()
      })

      ps.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      ps.on('close', (code) => {
        if (code === 0 || output.includes('解压完成')) {
          log('ZIP解压成功')
          resolve({ ok: true, message: '解压成功' })
        } else {
          log(`ZIP解压失败，退出码: ${code}, 错误: ${errorOutput}`)
          reject(new Error(`解压失败: ${errorOutput}`))
        }
      })

      ps.on('error', (error) => {
        log(`PowerShell执行错误: ${error}`)
        reject(new Error(`解压失败: ${error.message}`))
      })
    })

  } catch (error) {
    log(`ZIP解压异常: ${error}`)
    return { ok: false, error: String(error) }
  }
}

// 安装EXE文件
async function installExe(exePath) {
  try {
    log(`开始安装EXE: ${exePath}`)

    const { spawn } = require('child_process')

    // 静默安装参数
    const args = ['/S', '/D=' + path.dirname(exePath)]

    return new Promise((resolve, reject) => {
      const installer = spawn(exePath, args, {
        stdio: 'pipe',
        shell: true,
        detached: true
      })

      installer.on('close', (code) => {
        if (code === 0) {
          log('EXE安装成功')
          resolve({ ok: true, message: '安装成功' })
        } else {
          log(`EXE安装完成，退出码: ${code}`)
          resolve({ ok: true, message: '安装命令已执行' })
        }
      })

      installer.on('error', (error) => {
        log(`EXE执行错误: ${error}`)
        resolve({ ok: true, message: '安装命令已执行' })
      })
    })

  } catch (error) {
    log(`EXE安装异常: ${error}`)
    return { ok: false, error: String(error) }
  }
}

// 用户心跳与运行时长统计
function userServerBase(){
  const cfg = loadConfig()
  return (cfg.userServerUrl || '').replace(/\/$/, '')
}
function authHeaders(){
  const u = loadUser()
  const token = u && u.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

let cachedExternalIP = null
function isPrivateIP(ip){
  try {
    const s = String(ip||'')
    if (!s) return true
    if (s === '127.0.0.1') return true
    if (/^10\./.test(s)) return true
    if (/^192\.168\./.test(s)) return true
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(s)) return true
    if (/^169\.254\./.test(s)) return true
    if (/^100\.(6[4-9]|[7-9]\d|1\d\d)\./.test(s)) return true // 100.64.0.0/10 CGNAT
    return false
  } catch { return true }
}
async function getExternalIP(){
  if (cachedExternalIP) return cachedExternalIP
  const tryUrls = [
    'https://api.ipify.org?format=json',
    'https://ipinfo.io/json',
    'https://ifconfig.me/all.json'
  ]
  for (const u of tryUrls){
    try {
      const r = await axios.get(u, { timeout: 2500 })
      const ip = (r && r.data && (r.data.ip || r.data.IP || r.data.address)) || null
      if (ip && !isPrivateIP(ip)) { cachedExternalIP = ip; return ip }
    } catch {}
  }
  try {
    const ifs = os.networkInterfaces()
    for (const key of Object.keys(ifs||{})){
      for (const it of (ifs[key]||[])){
        if (it && it.family === 'IPv4' && !it.internal && !isPrivateIP(it.address)) { cachedExternalIP = it.address; return it.address }
      }
    }
  } catch {}
  return ''
}
function getComputerName(){ try { return os.hostname() } catch { return '' } }

ipcMain.handle('user:heartbeat', async () => {
  try {
    const base = userServerBase()
    if (!base) return { ok:false, error:'未配置用户服务器' }
    const u = loadUser()
    if (!u || !u.username || !u.token) return { ok:false, error:'未登录' }
    const ip = await getExternalIP()
    const body = { username: u.username, token: u.token, ip }
    let data = {}
    try {
      const res = await axios.post(`${base}/api/user/heartbeat`, body, { timeout: 8000 })
      data = res && res.data || {}
    } catch (e) {
      return { ok:false, error: String(e && e.message || e) }
    }
    if (data.kicked) return { ok:false, kicked:true, message: data.message || '账号已在其他设备登录' }
    if (data.needConfirm) return { ok:false, needConfirm:true, message: data.message || '账号已在其他设备登录' }
    if (data.renewed && data.newToken) {
      // 同IP自动续期，更新本地token
      u.token = data.newToken
      saveUser(u)
      return { ok:true, renewed:true, newToken: data.newToken }
    }
    // 额外向虚拟机服务器发心跳，用于4002排行榜在线状态同步
    axios.post('http://192.168.238.128:3001/api/user/heartbeat',
      { username: u.username, token: u.token, ip },
      { timeout: 5000 }
    ).catch(() => {}) // 静默失败，不影响主流程
    return { ok: !!data.success }
  } catch (e) { return { ok:false, error: String(e && e.message || e) } }
})

ipcMain.handle('user:runtimeReport', async (evt, payload) => {
  try {
    const base = userServerBase()
    if (!base) return { ok:false, error:'未配置用户服务器' }
    const headers = authHeaders()
    if (!headers.Authorization) return { ok:false, error:'未登录' }
    const body = {
      runtime_seconds: Number(payload && payload.runtime_seconds || 0) || 0,
      game_starts: Number(payload && payload.game_starts || 0) || 0
    }
    try {
      const res = await axios.post(`${base}/api/user/runtime`, body, { headers, timeout: 5000 })
      return { ok: res && res.status === 200 }
    } catch (e) {
      const u = loadUser()
      if (u && u.username && u.token) {
        try {
          const alt = { username: u.username, token: u.token, runtime_seconds: body.runtime_seconds, ip: await getExternalIP() }
          const res2 = await axios.post(`${base}/api/user/runtime`, alt, { timeout: 5000 })
          return { ok: res2 && res2.status === 200 }
        } catch {}
      }
      return { ok:false, error: String(e && e.message || e) }
    }
  } catch (e) { return { ok:false, error: String(e && e.message || e) } }
})

ipcMain.handle('user:runtimeSummary', async () => {
  try {
    const base = userServerBase()
    if (!base) return { ok:false, error:'未配置用户服务器' }
    const headers = authHeaders()
    if (!headers.Authorization) return { ok:false, error:'未登录' }
    try {
      const res = await axios.get(`${base}/api/user/runtime/summary`, { headers, timeout: 5000 })
      const data = res && res.data || {}
      return { ok: !!data.success, total_seconds: Number(data.total_seconds||0), total_starts: Number(data.total_starts||0) }
    } catch (e) {
      const u = loadUser()
      if (u && u.username && u.token) {
        try {
          const url = `${base}/api/user/profile?username=${encodeURIComponent(u.username)}&token=${encodeURIComponent(u.token)}`
          const res2 = await axios.get(url, { timeout: 5000 })
          const data2 = res2 && res2.data || {}
          const sec = (data2 && data2.user && typeof data2.user.total_runtime_seconds === 'number') ? data2.user.total_runtime_seconds : 0
          return { ok: true, total_seconds: Number(sec||0), total_starts: 0 }
        } catch {}
      }
      return { ok:false, error: String(e && e.message || e) }
    }
  } catch (e) { return { ok:false, error: String(e && e.message || e) } }
})

// 文件选择API
ipcMain.handle('selectFile', async (evt, type) => {
  try {
    const { dialog } = require('electron')
    const filters = type === 'image'
      ? [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif'] }]
      : [{ name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'wmv', 'mkv'] }]

    const result = await dialog.showOpenDialog(win, {
      title: type === 'image' ? '选择图片' : '选择视频',
      filters,
      properties: ['openFile']
    })

    return result.canceled ? null : result.filePaths[0]
  } catch (error) {
    log(`Select file failed: ${error.message}`)
    return null
  }
})

 

// 窗口大小调节API
ipcMain.handle('setResizable', async (evt, resizable) => {
  try {
    if (win && !win.isDestroyed()) {
      win.setResizable(resizable)
      return { success: true }
    }
    return { success: false }
  } catch {}
})

ipcMain.handle('getWindowSize', async () => {
  try {
    if (win && !win.isDestroyed()) {
      const [width, height] = win.getSize()
      return { width, height }
    }
    return { width: 1280, height: 800 }
  } catch {}
})

ipcMain.handle('saveWindowSize', async () => {
  try {
    if (win && !win.isDestroyed()) {
      const [width, height] = win.getSize()
      const cfg = loadConfig()
      cfg.windowSize = { width, height }
      saveConfig(cfg)
      return { success: true }
    }
    return { success: false }
  } catch {}
})

// 保存背景文件到本地
ipcMain.handle('saveBackgroundFile', async (evt, { filePath, fileType }) => {
  try {
    const fs = require('fs')
    const path = require('path')

    // 根据文件类型选择保存目录
    const bgDir = path.join(getAppRoot(), 'Data', 'bg', fileType === 'video' ? 'video' : 'img')
    if (!fs.existsSync(bgDir)) {
      fs.mkdirSync(bgDir, { recursive: true })
    }

    const fileName = path.basename(filePath)
    const targetPath = path.join(bgDir, fileName)

    // 检查文件是否已存在，如果存在则提示用户
    if (fs.existsSync(targetPath)) {
      return {
        success: false,
        error: '文件已存在，请重命名文件后再上传'
      }
    }

    // 复制文件
    fs.copyFileSync(filePath, targetPath)
    log(`保存背景文件成功: ${fileType} -> ${targetPath}`)

    return {
      success: true,
      localPath: targetPath,
      relativePath: path.relative(getAppRoot(), targetPath),
      fileName: fileName
    }
  } catch (error) {
    log('保存背景文件失败: ' + error.message)
    return { success: false, error: error.message }
  }
})

// 获取历史上传的背景文件
ipcMain.handle('getBackgroundHistory', async () => {
  try {
    const fs = require('fs')
    const path = require('path')

    const history = []

    // 获取图片背景历史
    const imgDir = path.join(getAppRoot(), 'Data', 'bg', 'img')
    if (fs.existsSync(imgDir)) {
      const imgFiles = fs.readdirSync(imgDir).filter(file => {
        const ext = path.extname(file).toLowerCase()
        return ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'].includes(ext)
      })

      imgFiles.forEach(file => {
        const filePath = path.join(imgDir, file)
        const stats = fs.statSync(filePath)
        history.push({
          fileName: file,
          filePath: path.relative(getAppRoot(), filePath),
          fileType: 'image',
          uploadTime: stats.birthtime.toISOString(),
          size: stats.size
        })
      })
    }

    // 获取视频背景历史
    const videoDir = path.join(getAppRoot(), 'Data', 'bg', 'video')
    if (fs.existsSync(videoDir)) {
      const videoFiles = fs.readdirSync(videoDir).filter(file => {
        const ext = path.extname(file).toLowerCase()
        return ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'].includes(ext)
      })

      videoFiles.forEach(file => {
        const filePath = path.join(videoDir, file)
        const stats = fs.statSync(filePath)
        history.push({
          fileName: file,
          filePath: path.relative(getAppRoot(), filePath),
          fileType: 'video',
          uploadTime: stats.birthtime.toISOString(),
          size: stats.size
        })
      })
    }

    // 按上传时间倒序排列
    history.sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime))

    return { success: true, history }
  } catch (error) {
    log('获取背景历史失败: ' + error.message)
    return { success: false, error: error.message }
  }
})

// 设置背景路径并保存到配置
ipcMain.handle('setBackgroundPath', async (evt, { relativePath, fileType }) => {
  try {
    const cfg = loadConfig()
    cfg.bgImagePath = relativePath
    cfg.bgFileType = fileType // 添加背景类型标识
    saveConfig(cfg)
    log(`设置背景路径: ${relativePath} (类型: ${fileType})`)
    return { success: true }
  } catch (error) {
    log('设置背景路径失败: ' + error.message)
    return { success: false, error: error.message }
  }
})

// 获取背景设置信息
ipcMain.handle('getBackgroundInfo', async () => {
  try {
    const cfg = loadConfig()
    return {
      bgImagePath: cfg.bgImagePath || '',
      bgFileType: cfg.bgFileType || 'image'
    }
  } catch (error) {
    log('获取背景信息失败: ' + error.message)
    return { bgImagePath: '', bgFileType: 'image' }
  }
})

// 获取启动器路径
ipcMain.handle('getLauncherPath', async () => {
  try {
    const path = require('path')
    return path.dirname(process.execPath).replace(/\\/g, '/')
  } catch (error) {
    log('获取启动器路径失败: ' + error.message)
    return '.'
  }
})

// 获取当前启动器版本
ipcMain.handle('getCurrentVersion', async () => {
  try {
    const bootstrap = ensureReleaseStateBootstrap(loadConfig())
    return bootstrap.localGameVersion || '1.0.0'
  } catch (error) {
    log('获取当前版本失败: ' + error.message)
    return '1.0.0'
  }
})

// Adaptive Monitor Removed
function startAdaptiveMonitor() {
    // Feature disabled by user request
}

function checkProcessRunning(processName) {
    return new Promise(resolve => {
        require('child_process').exec(`tasklist /FI "IMAGENAME eq ${processName}"`, (err, stdout) => {
            resolve(stdout && stdout.includes(processName))
        })
    })
}

function checkPacketLoss(target) {
    return new Promise(resolve => {
        // Ping 10 times to get a good average
        const ps = require('child_process').spawn('ping', ['-n', '10', '-w', '1000', target])
        let output = ''
        ps.stdout.on('data', d => output += d.toString())
        ps.on('close', () => {
            // Extract loss percentage
            const match = output.match(/\((\d+)%/)
            if (match && match[1]) {
                resolve(parseInt(match[1]))
            } else {
                resolve(-1)
            }
        })
    })
}

// ==========================================
// Network Service Management (VNT Integration)
// ==========================================
let networkProcess = null
let isElevatedVnt = false // Flag to track if we launched via UAC
let lastKnownIp = null // Store IP from stdout as fallback

function getDeviceId() {
  const p = path.join(getAppRoot(), 'Config', 'ee2x-device-id')
  const metaPath = path.join(getAppRoot(), 'Config', 'ee2x-device-meta.json')
  const os = require('os')
  const crypto = require('crypto')

  // Calculate current machine fingerprint (simple but effective for portability check)
  // We use hostname and platform as a basic check. 
  // If user renames computer, ID resets (good). 
  // If user moves folder to another PC, hostname likely changes (good).
  const currentFingerprint = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch()
  }

  let id = null
  let needNew = true

  try {
    if (fs.existsSync(p)) {
      id = fs.readFileSync(p, 'utf-8').trim()
      if (id.length > 5) {
        // Check metadata if exists
        if (fs.existsSync(metaPath)) {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
          // If fingerprint matches, we trust this ID
          if (meta.hostname === currentFingerprint.hostname && meta.platform === currentFingerprint.platform) {
            needNew = false
          } else {
            log(`[DeviceID] Fingerprint mismatch (Old: ${meta.hostname}, New: ${currentFingerprint.hostname}). Generating new ID.`)
          }
        } else {
           // No metadata, assume legacy ID. To be safe against cloning, we should probably generate new one OR just write current metadata.
           // But if we generate new one, existing legitimate users might lose identity.
           // Compromise: Keep ID but write metadata now. Next time it will be checked.
           // BUT: The user problem is that they ALREADY copied it. So hostname is different NOW.
           // So if we just write metadata now, we lock in the *copied* ID on the new machine.
           // This doesn't fix the conflict if both machines run now.
           // However, if we FORCE new ID when metadata is missing, everyone resets once. That's acceptable for a beta.
           // Better: If no metadata, we accept it ONCE and write metadata.
           // Wait, if I copy the folder, I copy the 'ee2x-device-id' but NOT 'ee2x-device-meta.json' (if I created it just now).
           // But user has 'ee2x-device-id' from previous version.
           // Let's assume for now: If metadata missing, we write it. If metadata exists and differs, we reset ID.
           // To fix the CURRENT user's issue (who has cloned folders), they won't have metadata yet.
           // So both will write their hostname to metadata.
           // Machine A writes "HostA". Machine B writes "HostB".
           // They still share the same ID. This is bad.
           
           // Revised Strategy:
           // We append the hostname hash to the ID? No, ID must be stable.
           // We can't detect a "clone" without history.
           // BUT, we can use a "salt" file that is machine specific? No.
           
           // Let's use the Computer Name as part of the check logic.
           // If we suspect this is a first run on this machine (no metadata), 
           // and we have an ID, maybe we should regenerate it to be safe?
           // Or, we just check if the ID file creation time is very recent? No.
           
           // Let's just FORCE a check: 
           // We will store the hostname INSIDE the device ID file? No, format is fixed.
           
           // Implementation: 
           // 1. Read ID.
           // 2. Read Meta.
           // 3. If Meta missing: Generate NEW ID and Write Meta. (This forces reset for everyone once, solving the clone issue immediately).
           //    - Side effect: All valid users lose their IP binding once. This is acceptable to fix the collision bug.
           // 4. If Meta mismatch: Generate NEW ID and Write Meta.
           
           log(`[DeviceID] Metadata missing. Generating new ID to prevent cloning conflicts.`)
        }
      }
    }
  } catch (e) { log(`[DeviceID] Error checking ID: ${e.message}`) }
  
  if (!needNew && id) return id

  // Generate new ID
  id = crypto.randomBytes(8).toString('hex')
  try {
    fse.ensureDirSync(path.dirname(p))
    fs.writeFileSync(p, id)
    fs.writeFileSync(metaPath, JSON.stringify(currentFingerprint))
    log(`[DeviceID] Generated new Device ID: ${id} for ${currentFingerprint.hostname}`)
  } catch {}
  return id
}

function getVntPath() {
  const root = getAppRoot()
  let paths = [
    path.join(root, '..', 'dist', 'vnt-cli.exe'),
    path.join(root, 'dist', 'vnt-cli.exe'),
    path.join(root, 'vnt-cli.exe'),
    path.join(root, 'Core', 'dist', 'vnt-cli.exe')
  ]
  for(let p of paths) {
    if(fs.existsSync(p)) return p
  }
  return null
}

function getCommandPortPath() {
  const vntPath = getVntPath()
  if(!vntPath) return null
  return path.join(path.dirname(vntPath), 'env', 'command-port')
}

function getCommandPort() {
  try {
    const p = getCommandPortPath()
    if(p && fs.existsSync(p)) {
      return parseInt(fs.readFileSync(p, 'utf-8').trim())
    }
  } catch {}
  return null
}

function stopNetworkService() {
  // Try to stop gracefully using the CLI command (which might send a logout packet)
  try {
    const vntPath = getVntPath()
    if (vntPath) {
       require('child_process').spawnSync(vntPath, ['--stop'], { windowsHide: true })
    }
  } catch {}

  // Try to kill child process if we have a handle
  if (networkProcess) {
    try { networkProcess.kill() } catch {}
    networkProcess = null
  }
  // Force kill any vnt-cli.exe (especially if elevated)
  try {
    require('child_process').execSync('taskkill /F /IM vnt-cli.exe')
  } catch {}
  isElevatedVnt = false
}

let networkMonitorInterval = null

ipcMain.handle('network:start', async () => {
  return startNetworkService()
})

async function startNetworkService() {
  // Check if already running by querying UDP
  const status = await checkUdpStatus()
  if (status.running) return { ok: true, msg: 'Already running' }

  stopNetworkService() // Cleanup previous attempts
  
  const vntPath = getVntPath()
  if (!vntPath) return { ok: false, error: '未找到组网组件 (vnt-cli.exe)' }

  const cfg = loadConfig()
  const token = "game-net"
  // 优先使用配置中的 networkServer，默认使用 81.71.49.16:1666
  let server = cfg.networkServer || "81.71.49.16:1666"
  
  // Try to use logged-in username, fallback to computer name
  const user = loadUser()
  let name = (user && user.username) ? user.username : (getComputerName() || 'Unknown')
  // Basic sanitization
  name = name.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '').substring(0, 32)
  if (!name) name = 'Player' + Math.floor(Math.random()*10000)

  // Generate or retrieve a persistent Device ID
  const deviceId = getDeviceId()

  // 尝试自动添加防火墙规则 (尽最大努力，失败则忽略)
  try {
    const launcherPath = process.execPath
    
    // Add rules for VNT
    try { require('child_process').execSync('netsh advfirewall firewall delete rule name="EE2X_VNT_Allow"', { stdio: 'ignore' }) } catch {}
    try { require('child_process').execSync('netsh advfirewall firewall delete rule name="EE2X_ICMP_Allow"', { stdio: 'ignore' }) } catch {}

    require('child_process').execSync('netsh advfirewall firewall add rule name="EE2X_VNT_Allow" dir=in action=allow program="' + vntPath + '" enable=yes profile=any protocol=any', { stdio: 'ignore' })
    require('child_process').execSync('netsh advfirewall firewall add rule name="EE2X_VNT_Allow" dir=out action=allow program="' + vntPath + '" enable=yes profile=any protocol=any', { stdio: 'ignore' })
    
    // 显式放行 ICMP (Ping)
    require('child_process').execSync('netsh advfirewall firewall add rule name="EE2X_ICMP_Allow" dir=in action=allow protocol=icmpv4:8,any profile=any', { stdio: 'ignore' })

    // Add rules for Launcher itself
    try { require('child_process').execSync('netsh advfirewall firewall delete rule name="EE2X_Launcher_Allow"', { stdio: 'ignore' }) } catch {}
    require('child_process').execSync('netsh advfirewall firewall add rule name="EE2X_Launcher_Allow" dir=in action=allow program="' + launcherPath + '" enable=yes profile=any protocol=any', { stdio: 'ignore' })
    require('child_process').execSync('netsh advfirewall firewall add rule name="EE2X_Launcher_Allow" dir=out action=allow program="' + launcherPath + '" enable=yes profile=any protocol=any', { stdio: 'ignore' })

    log('[防火墙] 已尝试添加 VNT 和 启动器 放行规则')
  } catch (e) {
    log('[防火墙] 添加规则失败 (可能需要管理员权限): ' + e.message)
    // If failed, we might need to elevate ourselves later or prompt user
  }

  // 定义内部启动函数，支持不同模式
  const attemptStart = async (mode) => {
      log(`[Network] Attempting to start in ${mode} mode...`)
      const useTap = (mode === 'tap')
      const tapStrategy = cfg.tapStrategy || 'auto'
      let tapName = ''

      if (useTap) {
        // Check for TAP adapter and install if missing
        try {
          // Use PowerShell to check for TAP adapter reliably
          const tapCheck = require('child_process').spawnSync('powershell', [
              '-Command', "Get-NetAdapter -InterfaceDescription 'TAP-Windows Adapter V9'"
          ], { encoding: 'utf8' })
          
          const isTapInstalled = tapCheck.stdout && tapCheck.stdout.includes('TAP-Windows Adapter V9')
          
          if (!isTapInstalled) {
            log('[TAP Driver] Not detected. Attempting installation...')
            const tapInstaller = path.join(getAppRoot(), 'dist', 'tap-windows-9.24.7', 'tap-windows-9.24.7-I601-Win10.exe')
            
            if (require('fs').existsSync(tapInstaller)) {
                log('[TAP Driver] Running installer: ' + tapInstaller)
                // Run the installer silently with admin privileges
                await new Promise(r => {
                  const ps = require('child_process').spawn('powershell', [
                      'Start-Process', 
                      '-FilePath', `"${tapInstaller}"`, 
                      '-ArgumentList', '"/S"', // Silent install
                      '-Verb', 'RunAs', 
                      '-Wait', 
                      '-WindowStyle', 'Hidden'
                  ])
                  ps.on('close', (code) => {
                      log(`[TAP Driver] Installer exited with code ${code}`)
                      r()
                  })
                })
                // Wait for system to refresh
                await new Promise(r => setTimeout(r, 2000))
            } else {
                log('[TAP Driver] Installer not found at: ' + tapInstaller)
            }
          } else {
            log('[TAP Driver] Detected installed.')
          }
        } catch (e) {
          log('[TAP Driver] Check/Install failed: ' + e)
        }

        // Determine the TAP adapter name dynamically (Only if we are going to bind it)
        if (tapStrategy === 'bind') {
           tapName = '本地连接' // Default
           try {
             // Try to find the actual name of the TAP adapter using PowerShell
             // We force UTF8 encoding to avoid Mojibake (garbage characters) on Chinese Windows
             const tapNameCheck = require('child_process').spawnSync('powershell', [
               '-Command', 
               "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-NetAdapter -InterfaceDescription 'TAP-Windows Adapter V9' | Select-Object -ExpandProperty Name"
             ], { encoding: 'utf8' })
             if (tapNameCheck.stdout) {
               const found = tapNameCheck.stdout.trim().split('\r\n')[0]
               if (found && found.length > 0) {
                  tapName = found
                  log(`[TAP Driver] Found adapter name for binding: ${tapName}`)
               }
             }
           } catch(e) { log(`[TAP Driver] Failed to get name: ${e}`) }
        } else {
           log('[TAP Driver] Using auto-detect strategy (no name binding).')
        }
      } else {
        log('[Network] TUN Mode selected. Skipping TAP driver check.')
      }

      // Generate VNT config file (Unified for both TAP and TUN)
      const tapConfigPath = path.join(getAppRoot(), 'Config', 'vnt-tap.yaml')
      try {
        fse.ensureDirSync(path.dirname(tapConfigPath))
        // Create a complete config
        // Only include 'nic' field if useTap is true AND strategy is 'bind'
        const tapConfigContent = `
tap: ${useTap}
token: ${token}
server_address: ${server}
name: ${name}
device_id: ${deviceId}
${(useTap && tapStrategy === 'bind') ? `nic: ${tapName}` : ''}
use_channel: relay
`.trim()
        require('fs').writeFileSync(tapConfigPath, tapConfigContent)
      } catch (e) {
        log('Failed to write VNT config: ' + e)
      }

      // Use -f to load the config. 
      const args = ["-f", tapConfigPath]
      const cwd = path.dirname(vntPath)

      log(`Starting network service (${useTap ? 'TAP' : 'TUN'} Mode): ${vntPath} ${args.join(' ')}`)

      return new Promise(async (resolve) => {
        // TAP mode usually requires Admin privileges. TUN mode might not, but safer to try standard first.
        // We try normal spawn first, but it will likely fail with "Please run it with administrator..." if TAP.
        // So we should capture that output and immediately try elevated launch.
        
        try {
          const { spawn } = require('child_process')
          networkProcess = spawn(vntPath, args, {
            cwd,
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe']
          })

          let output = ''
          let errorOut = ''
          let needsElevation = false
          
          networkProcess.stdout.on('data', (data) => {
            const str = data.toString()
            output += str
            // Check for permission error
            if (str.includes('administrator') || str.includes('root privileges')) {
               needsElevation = true
            }
            
            const match = output.match(/register ip=([0-9.]+)/) || output.match(/virtual ip:? ([0-9.]+)/i)
            if (match && match[1]) {
               lastKnownIp = match[1]
               if (win && !win.isDestroyed()) win.webContents.send('network:ip', match[1])
               resolve({ ok: true })
            }
          })
          networkProcess.stderr.on('data', (data) => {
            errorOut += data.toString()
            log(`VNT Err: ${data}`)
          })

          let hasExited = false
          networkProcess.on('close', async (code) => {
            hasExited = true
            log(`VNT normal spawn exited: ${code}. Output: ${output}`)
            networkProcess = null
            
            // If it exited quickly, and we suspect permission issues or config issues
            // Code 0 with "administrator" warning also means failure
            if (code !== 0 || needsElevation || output.includes('administrator')) {
                log('Attempting elevated launch due to failure/permission...')
                const elevated = await launchElevatedVnt(vntPath, args, cwd)
                if (elevated) {
                   // 提权命令发送成功，开始轮询 UDP 状态
                   let attempts = 0
                   const check = setInterval(async () => {
                     attempts++
                     const st = await checkUdpStatus()
                     if (st.running) {
                       clearInterval(check)
                       if (st.info && st.info.virtual_ip) {
                          lastKnownIp = st.info.virtual_ip
                          if (win && !win.isDestroyed()) win.webContents.send('network:ip', st.info.virtual_ip)
                       }
                       isElevatedVnt = true
                       resolve({ ok: true })
                     } else if (attempts > 15) { // 30s timeout
                       clearInterval(check)
                       resolve({ ok: false, error: 'Elevated launch timeout (UDP not ready)' })
                     }
                   }, 2000)
                } else {
                   resolve({ ok: false, error: `Process exited with code ${code}. Elevation rejected.` })
                }
            } else {
                // Exited with 0 but no IP? It shouldn't exit if it's running successfully.
                // VNT cli usually blocks. If it exits, it's stopped.
                resolve({ ok: false, error: `VNT exited unexpectedly with code ${code}` })
            }
          })

          // If it doesn't exit immediately, assume success? 
          setTimeout(() => {
            if (!hasExited) {
               // Still running
               resolve({ ok: true })
            }
          }, 3000)

        } catch (e) {
          resolve({ ok: false, error: String(e) })
        }
      })
  }

  // Determine initial mode
  // Default to TAP as per new version design, but allow fallback to TUN via config
  const initialMode = cfg.networkMode || 'tap'
  
  // First Attempt
  let result = await attemptStart(initialMode)
  
  // Fallback Logic: If TAP failed, try TUN
  if (!result.ok && initialMode === 'tap') {
      log('[Network] TAP mode start failed. Falling back to TUN mode...')
      stopNetworkService() // Ensure cleanup
      
      // Small delay to allow cleanup
      await new Promise(r => setTimeout(r, 1000))
      
      // Attempt fallback
      result = await attemptStart('tun')
      
      if (result.ok) {
          log('[Network] Fallback to TUN mode successful.')
      } else {
          log('[Network] Fallback to TUN mode also failed.')
      }
  }

  return result
}

async function launchElevatedVnt(exePath, args, cwd) {
  try {
    const { spawn } = require('child_process')
    const fs = require('fs')
    const path = require('path')
    
    // Create a temporary script file to avoid quoting hell in command line
    const tmpDir = path.join(getAppRoot(), 'Logs')
    fse.ensureDirSync(tmpDir)
    const scriptPath = path.join(tmpDir, `vnt_start_${Date.now()}.ps1`)
    
    // Escape args for PS script content
    const psArgs = args.map(a => `'${a}'`).join(',')
    
    // Redirect output to log files for debugging crashes
    const logOut = path.join(getAppRoot(), 'Logs', 'vnt_elevated.log')
    const logErr = path.join(getAppRoot(), 'Logs', 'vnt_elevated_err.log')

    const scriptContent = `
      Start-Process '${exePath}' -ArgumentList ${psArgs} -WindowStyle Hidden -WorkingDirectory '${cwd}' -RedirectStandardOutput "${logOut}" -RedirectStandardError "${logErr}"
    `
    
    fs.writeFileSync(scriptPath, scriptContent)
    
    log(`Elevating script: ${scriptPath}`)
    
    return new Promise((resolve) => {
      // Run the script elevated
      const ps = spawn('powershell', [
        'Start-Process', 
        'powershell', 
        '-ArgumentList', 
        `'-ExecutionPolicy Bypass -File "${scriptPath}"'`, 
        '-Verb', 
        'RunAs', 
        '-WindowStyle', 
        'Hidden'
      ], { windowsHide: true })
      
      ps.on('close', (code) => {
        // Clean up script after a delay
        setTimeout(() => {
          try { fs.unlinkSync(scriptPath) } catch {}
        }, 5000)
        resolve(code === 0)
      })
      ps.on('error', (e) => {
        log(`Elevation error: ${e}`)
        resolve(false)
      })
    })
  } catch (e) { 
    log(`Elevation exception: ${e}`)
    return false 
  }
}

async function checkUdpStatus() {
  // 1. 优先尝试通过 UDP 获取真实状态
  try {
    const infoRaw = await sendUdpCommand('info')
    
    if (infoRaw) {
      // UDP 成功，解析数据
      const listRaw = await sendUdpCommand('list')
      const chartRaw = await sendUdpCommand('chart_a')
      
      let peers = parseYaml(listRaw) || []
      if (Array.isArray(peers)) peers = peers.map(p => normalizeKeys(p))
      
      const chart = normalizeKeys(parseYaml(chartRaw) || {})
      const info = normalizeKeys(parseYaml(infoRaw) || {})
      
      // 补全 IP
      if ((!info.virtual_ip || info.virtual_ip === '0.0.0.0') && lastKnownIp) {
        info.virtual_ip = lastKnownIp
      }
      
      // Determine Network Mode (TAP/TUN)
      let netMode = 'TUN'
      try {
        const tapConfigPath = path.join(getAppRoot(), 'Config', 'vnt-tap.yaml')
        if (require('fs').existsSync(tapConfigPath)) {
           const content = require('fs').readFileSync(tapConfigPath, 'utf-8')
           if (content.includes('tap: true')) {
             netMode = 'TAP'
           }
        }
      } catch {}
      info.net_mode = netMode

      // 强制在线状态
      if (info.virtual_ip && info.virtual_ip !== '0.0.0.0') {
          info.status = 'Connected'
          info.connection_status = 'Connected'
      }
      
      log(`[UDP] Check success. IP: ${info.virtual_ip}`)
      return {
        running: true,
        peers: Array.isArray(peers) ? peers : [],
        speed: { up: parseFloat(chart.up_total || 0), down: parseFloat(chart.down_total || 0) },
        info
      }
    }
  } catch (e) {
    log(`[UDP] Check failed: ${e}`)
  }
  
  // 2. UDP 失败时的兜底逻辑 (Blind Mode)
  // 只要我们捕获到了 IP (说明 VNT 进程曾经成功启动并输出了 IP)，我们就盲目认为它还活着
  // 这对于 TAP 提权模式特别重要，因为提权后 UDP 往往不通
  if (lastKnownIp) {
      // 增加进程存活检测：如果进程都没了，那肯定是挂了，不能假装还活着
      const isAlive = await checkProcessRunning('vnt-cli.exe')
      if (!isAlive) {
         log('[UDP] Blind Mode check failed: vnt-cli.exe not running. Resetting lastKnownIp.')
         lastKnownIp = null
         return { running: false }
      }

      // log('[UDP] Fallback to blind mode (using lastKnownIp)')
      return {
         running: true,
         peers: [], // 无法获取 P2P 列表
         speed: { up: 0, down: 0 }, // 无法获取速度
         info: { 
           virtual_ip: lastKnownIp, 
           status: 'Connected', 
           connection_status: 'Connected',
           device_name: 'Local (Blind Mode)',
           net_mode: 'TAP' // Blind mode usually implies TAP elevation issues
         }
      }
  }

  return { running: false }
}

ipcMain.handle('network:stop', async () => {
  stopNetworkService()
  return { ok: true }
})

const dgram = require('dgram')

function sendUdpCommand(cmd) {
  return new Promise((resolve, reject) => {
    const port = getCommandPort()
    if (!port) return resolve(null)

    const client = dgram.createSocket('udp4')
    const msg = Buffer.from(cmd)
    
    let resolved = false
    client.on('message', (msg) => {
      if (!resolved) {
        resolved = true
        try { client.close() } catch {}
        resolve(msg.toString())
      }
    })

    client.send(msg, port, '127.0.0.1', (err) => {
      if (err) {
        try { client.close() } catch {}
        resolve(null)
      }
    })

    setTimeout(() => {
      if (!resolved) {
        resolved = true
        try { client.close() } catch {}
        resolve(null)
      }
    }, 2000) // Increased timeout for stability
  })
}

function stripAnsi(str) {
  return str ? str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '') : str
}

function normalizeKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const newObj = {}
  for (const key in obj) {
    // Robust key normalization: lowercase, replace spaces/dashes with underscores, remove special chars
    const newKey = key.toLowerCase().replace(/[\s\-]+/g, '_').replace(/[^\w_]/g, '')
    newObj[newKey] = obj[key]
    // Keep original key too just in case
    newObj[key] = obj[key]
  }
  return newObj
}

function parseYaml(str) {
  if (!str) return null
  str = stripAnsi(str)
  if (str.trim().startsWith('-')) {
    const items = []
    const lines = str.split('\n')
    let current = null
    for (const line of lines) {
      const trim = line.trim()
      if (trim.startsWith('- ')) {
        if (current) items.push(current)
        current = {}
        const content = trim.substring(2)
        const p = content.indexOf(':')
        if (p > 0) {
          const k = content.substring(0, p).trim()
          const v = content.substring(p + 1).trim().replace(/^['"]|['"]$/g, '')
          current[k] = v
        }
      } else if (trim.includes(':')) {
        const p = trim.indexOf(':')
        if (p > 0) {
          const k = trim.substring(0, p).trim()
          const v = trim.substring(p + 1).trim().replace(/^['"]|['"]$/g, '')
          if (current) current[k] = v
        }
      }
    }
    if (current) items.push(current)
    return items
  } else {
    const obj = {}
    const lines = str.split('\n')
    for (const line of lines) {
      const trim = line.trim()
      const p = trim.indexOf(':')
      if (p > 0) {
        const k = trim.substring(0, p).trim()
        const v = trim.substring(p + 1).trim().replace(/^['"]|['"]$/g, '')
        obj[k] = v
      }
    }
    return obj
  }
}

ipcMain.handle('network:status', async () => {
  return checkUdpStatus()
})

app.on('will-quit', () => {
  stopNetworkService()
})

app.on('window-all-closed', () => {
  stopNetworkService()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 启动时应用保存的窗口大小
app.on('ready', () => {
  const cfg = loadConfig()
  if (cfg.windowSize && win && !win.isDestroyed()) {
    win.setSize(cfg.windowSize.width, cfg.windowSize)
  }
})

ipcMain.handle('network:test', async (evt, addr) => {
  try {
    const s = String(addr || '').trim()
    if (!s) return { ok: false, error: '地址为空' }
    
    // Parse IP from IP:Port or just IP
    // Remove protocol if present
    let clean = s.replace(/^udp:\/\//, '').replace(/^tcp:\/\//, '').replace(/^http:\/\//, '').replace(/^https:\/\//, '')
    const parts = clean.split(':')
    const host = parts[0]
    const port = parts[1] ? parseInt(parts[1]) : null
    
    // Strict validation
    const isLocalhost = host.toLowerCase() === 'localhost'
    const isIPv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(host)
    const isDomain = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(host)
    
    if (!isLocalhost && !isIPv4 && !isDomain) {
       return { ok: false, error: '地址格式错误' }
    }
    
    if (isIPv4) {
      const segments = host.split('.').map(Number)
      if (segments.some(n => n < 0 || n > 255)) {
        return { ok: false, error: '无效 IP 地址' }
      }
    }

    if (port !== null) {
       if (isNaN(port) || port < 1 || port > 65535) {
          return { ok: false, error: '端口无效' }
       }
    }
    
    log(`Testing connectivity to ${host} ...`)
    
    return new Promise((resolve) => {
      // Use ping command (Windows)
      // -n 1: count 1
      // -w 2000: timeout 2000ms
      const { spawn } = require('child_process')
      const p = spawn('ping', ['-n', '1', '-w', '2000', host], { windowsHide: true })
      
      p.on('close', (code) => {
        if (code === 0) {
          resolve({ ok: true, msg: '组网服务器在线' })
        } else {
          resolve({ ok: false, error: '无法连接组网服务器' })
        }
      })
      
      p.on('error', (err) => {
         resolve({ ok: false, error: String(err) })
      })
    })
  } catch (e) {
    return { ok: false, error: String(e) }
  }
})

ipcMain.handle('user:changePassword', async (evt, payload) => {
  try {
    const base = userServerBase()
    if (!base) return { ok:false, error:'未配置用户服务器' }
    const u = loadUser()
    if (!u || !u.token) return { ok:false, error:'未登录' }
    const { oldPassword, newPassword } = payload || {}
    const res = await axios.post(`${base}/api/user/change-password`, {
      username: u.username,
      token: u.token,
      oldPassword,
      newPassword
    }, { timeout: 8000 })
    const data = res && res.data || {}
    if (data.success) {
      // 密码修改成功后清除本地登录状态，需要重新登录
      clearUser()
    }
    return { ok: !!data.success, message: data.message || '' }
  } catch (e) {
    const msg = e && e.response && e.response.data && e.response.data.message || String(e && e.message || e)
    return { ok:false, error: msg }
  }
})

ipcMain.handle('user:changeUsername', async (evt, payload) => {
  try {
    const base = userServerBase()
    if (!base) return { ok:false, error:'未配置用户服务器' }
    const u = loadUser()
    if (!u || !u.token) return { ok:false, error:'未登录' }
    const { newUsername } = payload || {}
    const res = await axios.post(`${base}/api/user/change-username`, {
      username: u.username,
      token: u.token,
      newUsername
    }, { timeout: 8000 })
    const data = res && res.data || {}
    if (data.success && data.newUsername) {
      // 更新本地用户名
      const user = loadUser()
      if (user) { user.username = data.newUsername; saveUser(user) }
    }
    return { ok: !!data.success, message: data.message || '', newUsername: data.newUsername }
  } catch (e) {
    const msg = e && e.response && e.response.data && e.response.data.message || String(e && e.message || e)
    return { ok:false, error: msg }
  }
})

ipcMain.handle('network:checkOnline', async () => {
  try {
    const base = userServerBase()
    if (!base) return { online: false }
    await axios.get(`${base}/api/tiers`, { timeout: 8000 })
    return { online: true }
  } catch {
    return { online: false }
  }
})

// 获取用户安全问题
ipcMain.handle('user:getSecurityQuestion', async (evt, username) => {
  try {
    const base = userServerBase()
    if (!base) return { ok: false, error: '未配置用户服务器' }
    const res = await axios.get(`${base}/api/user/security-question?username=${encodeURIComponent(username)}`, { timeout: 8000 })
    const data = res && res.data || {}
    return { ok: !!data.success, question: data.question, message: data.message }
  } catch (e) {
    const msg = e && e.response && e.response.data && e.response.data.message || String(e && e.message || e)
    return { ok: false, error: msg }
  }
})

// 用户自助重置密码
ipcMain.handle('user:resetPassword', async (evt, payload) => {
  try {
    const base = userServerBase()
    if (!base) return { ok: false, error: '未配置用户服务器' }
    const { username, securityAnswer, newPassword } = payload || {}
    const res = await axios.post(`${base}/api/user/reset-password`, {
      username,
      securityAnswer,
      newPassword
    }, { timeout: 8000 })
    const data = res && res.data || {}
    return { ok: !!data.success, message: data.message }
  } catch (e) {
    const msg = e && e.response && e.response.data && e.response.data.message || String(e && e.message || e)
    return { ok: false, error: msg }
  }
})

// 设置安全问题
ipcMain.handle('user:setSecurityQuestion', async (evt, payload) => {
  try {
    const base = userServerBase()
    if (!base) return { ok: false, error: '未配置用户服务器' }
    const u = loadUser()
    if (!u || !u.token) return { ok: false, error: '未登录' }
    const { question, answer } = payload || {}
    const res = await axios.post(`${base}/api/user/set-security-question`, {
      username: u.username,
      token: u.token,
      question,
      answer
    }, { timeout: 8000 })
    const data = res && res.data || {}
    return { ok: !!data.success, message: data.message }
  } catch (e) {
    const msg = e && e.response && e.response.data && e.response.data.message || String(e && e.message || e)
    return { ok: false, error: msg }
  }
})

// 确认异地登录
ipcMain.handle('user:confirmLogin', async (evt, payload) => {
  try {
    const base = userServerBase()
    if (!base) return { ok: false, error: '未配置用户服务器' }
    const u = loadUser()
    if (!u || !u.token) return { ok: false, error: '未登录' }
    const res = await axios.post(`${base}/api/user/confirm-login`, {
      username: u.username,
      token: u.token,
      ip: await getExternalIP()
    }, { timeout: 8000 })
    const data = res && res.data || {}
    // 更新本地token
    if (data.success && data.newToken) {
      const user = loadUser()
      if (user) {
        user.token = data.newToken
        saveUser(user)
      }
    }
    return { ok: !!data.success, message: data.message, newToken: data.newToken }
  } catch (e) {
    const msg = e && e.response && e.response.data && e.response.data.message || String(e && e.message || e)
    return { ok: false, error: msg }
  }
})
