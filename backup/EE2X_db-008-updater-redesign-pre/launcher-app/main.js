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
function getLocalListPath(){
  return path.join(getAppRoot(), 'List', 'ee2x-user-list.json')
}
function getServerListPath(){
  return path.join(getAppRoot(), 'List', 'ee2x-server-list.json')
}
function getHistoryPath(){
  return path.join(getAppRoot(), 'Logs', 'update-history.json')
}
function resolveGameBase(cfg){
  try {
    const launcherDir = getGameDir()
    const rootDir = getAppRoot()
    const parentDir = path.dirname(rootDir)
    const hasCfg = cfg && cfg.gameDir && String(cfg.gameDir).trim().length>0 && fs.existsSync(cfg.gameDir)
    
    // 调整判断逻辑，适应 Core 目录结构或标准结构
    const preferParent = (path.basename(rootDir) === '地球帝国二代远航版启动器' || path.basename(launcherDir) === '地球帝国二代远航版启动器') && 
                         fs.existsSync(parentDir) && 
                         fs.statSync(parentDir).isDirectory() && 
                         /empire earth ii/i.test(path.basename(parentDir))
                         
    return preferParent ? parentDir : (hasCfg ? cfg.gameDir : rootDir)
  } catch { return getAppRoot() }
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
    serverUrl: 'http://192.168.200.140:7898',
    userServerUrl: 'http://192.168.200.140:8083',
    localVersion: '1.0',
    gameExe: 'EE2X.exe',
    gameExePath: '',
    gameDir: '',
    preferredResolution: '1280x800',
    windowSize: { width: 1280, height: 800 },
    bgImagePosition: { x: 0, y: 0, scale: 1 },
    battleHotkey: '',
    battleApiUrl: 'http://192.168.0.211:1234/v1/responses',
    battleApiKey: '',
    battleApiModel: 'qwen3.5-9b-vlm'
  }
  let cfg = def
  try { cfg = Object.assign(cfg, JSON.parse(fs.readFileSync(getConfigPath(), 'utf-8'))) } catch {}
  try { cfg = Object.assign(cfg, JSON.parse(fs.readFileSync(getSettingsPath(), 'utf-8'))) } catch {}
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

  // 强制路径智能推断逻辑 (Portable Mode Priority)
  // 优先基于启动器当前位置推断游戏目录，覆盖配置文件中的绝对路径
  // 只有当推断失败时，才保留配置文件中的设置
  try {
    const fs = require('fs')
    const path = require('path')
    
    const root = getAppRoot() 
    const parent = path.dirname(root)
    
    // 候选执行文件名列表
    const candidates = [
        'ee2x.exe', 
        'EE2X.exe', 
        'EE2.exe', 
        'Empire Earth II.exe'
    ]
    
    let found = false
    
    // 1. 优先检查父级目录 (推荐结构: Game/Launcher/Core/...)
    // 对应用户描述: Empire Earth II (Game Root) -> 地球帝国二代远航版启动器 (Launcher Root) -> Core -> exe
    for (const exe of candidates) {
        const p = path.join(parent, exe)
        if (fs.existsSync(p)) {
            cfg.gameDir = parent
            cfg.gameExePath = p
            found = true
            break
        }
    }
    
    // 2. 其次检查启动器根目录 (兼容结构)
    if (!found) {
        for (const exe of candidates) {
            const p = path.join(root, exe)
            if (fs.existsSync(p)) {
                cfg.gameDir = root
                cfg.gameExePath = p
                found = true
                break
            }
        }
    }
    
    // 如果推断成功，cfg已被更新为相对路径推导出的绝对路径
    // 如果推断失败，cfg保留原配置文件的值
    
  } catch (e) {
    log(`[Path Detect] Error: ${e}`)
  }

  return cfg
}

function saveConfig(cfg){
  // persist full config
  fs.writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2))
  // persist server addresses to separate settings file for easy editing
  const serverSettings = {
    userServerUrl: cfg.userServerUrl || 'http://122.10.116.142:1888',
    serverUrl: cfg.serverUrl || 'http://122.10.116.142:1888',
    updateServerHttp: cfg.updateServerHttp || cfg.serverUrl || 'http://122.10.116.142:1888',
    preferredResolution: cfg.preferredResolution || '1280x800',
    bgImagePath: cfg.bgImagePath || '',
    gameExe: cfg.gameExe || 'EE2X.exe',
    networkServer: cfg.networkServer || '122.10.116.142:29872',
    networkMode: cfg.networkMode || 'tap',
    tapStrategy: cfg.tapStrategy || 'auto',
    broadcastMode: cfg.broadcastMode || 'manual', // manual or auto
    closeAction: cfg.closeAction || 'ask', // ask, minimize, exit
    battleHotkey: cfg.battleHotkey || '',
    battleApiUrl: cfg.battleApiUrl || 'http://192.168.0.211:1234/v1/responses',
    battleApiKey: cfg.battleApiKey || '',
    battleApiModel: cfg.battleApiModel || 'qwen3.5-9b-vlm'
  }
  try { fs.writeFileSync(getSettingsPath(), JSON.stringify(serverSettings, null, 2)) } catch {}
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
        gameExe: 'EE2X.exe'
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
    const gameDir = cfg.gameDir || getGameDir()

    if (gameDir && require('fs').existsSync(gameDir)) {
      await shell.openPath(gameDir)
      return { success: true }
    } else {
      return { success: false, error: '游戏目录不存在' }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('game:detect', async () => {
  const launcherDir = getGameDir()
  const rootDir = getAppRoot()
  const parentDir = path.dirname(launcherDir)
  const rootParent = path.dirname(rootDir)
  const cfg = loadConfig()
  
  const candidates = [cfg.gameExe, 'EE2X.exe', 'ee2x.exe', 'EE2.exe', 'Empire Earth II.exe'].filter(Boolean)
  
  // 1. 优先搜索标准的 "Empire Earth II" 文件夹
  // 这满足用户需求："当检测到了名为 Empire Earth II 的文件夹就自动设置"
  const standardDirs = []
  
  // 优先检查配置的目录 (如果存在)
  if (cfg.gameDir && fs.existsSync(cfg.gameDir)) {
    standardDirs.push(cfg.gameDir)
    // 同时也检查配置目录下的 Empire Earth II 子目录
    const sub = path.join(cfg.gameDir, 'Empire Earth II')
    if (fs.existsSync(sub) && fs.statSync(sub).isDirectory()) standardDirs.push(sub)
  }
  
  // 检查启动器同级目录
  const child1 = path.join(launcherDir, 'Empire Earth II')
  if (fs.existsSync(child1) && fs.statSync(child1).isDirectory()) standardDirs.push(child1)
  
  // 检查父级目录
  const child2 = path.join(parentDir, 'Empire Earth II')
  if (fs.existsSync(child2) && fs.statSync(child2).isDirectory()) standardDirs.push(child2)
  
  // 检查当前目录是否就是
  if (path.basename(launcherDir) === 'Empire Earth II') standardDirs.push(launcherDir)
  if (path.basename(parentDir) === 'Empire Earth II') standardDirs.push(parentDir)

  // 检查 AppRoot 的父目录 (针对启动器放置在游戏目录内的情况)
  // 例如：.../Empire Earth II/Launcher/Core/exe -> rootParent = .../Empire Earth II
  if (/empire earth ii/i.test(path.basename(rootParent))) standardDirs.push(rootParent)

  // 遍历标准目录寻找可执行文件
  for (const dir of standardDirs) {
    for (const name of candidates) {
      const p = path.join(dir, name)
      if (fs.existsSync(p)) {
        // 找到了标准目录下的游戏，自动设置
        log(`[自动检测] 发现标准游戏目录: ${dir}, 执行文件: ${p}`)
        cfg.gameExePath = p
        cfg.gameDir = dir
        saveConfig(cfg)
        return p
      }
    }
  }

  // 2. 如果没找到标准文件夹，检查配置中的路径是否有效
  if (cfg.gameExePath && fs.existsSync(cfg.gameExePath)) {
    return cfg.gameExePath
  }

  // 3. 检查当前启动器目录是否有游戏文件
  for (const name of candidates) {
    const p = path.join(launcherDir, name)
    if (fs.existsSync(p)) {
      log(`[自动检测] 在启动器目录发现游戏文件: ${p}`)
      cfg.gameExePath = p
      cfg.gameDir = launcherDir
      saveConfig(cfg)
      return p
    }
  }

  // 4. 即使什么都没找到，也不要返回 null
  // 这满足用户需求："即使没有找到...也不要再提示下载游戏"
  // 我们默认设置当前目录为游戏目录，假设游戏就在这里（或者让用户后续自己去选，而不是引导去下载）
  const defaultPath = path.join(launcherDir, cfg.gameExe || 'EE2X.exe')
  log(`[自动检测] 未发现明确游戏文件，默认使用启动器目录: ${defaultPath}`)
  
  // 更新配置，避免前端提示"下载游戏"
  cfg.gameExePath = defaultPath
  cfg.gameDir = launcherDir
  saveConfig(cfg)
  
  return defaultPath
})

ipcMain.handle('game:chooseExe', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters:[{ name:'可执行文件', extensions:['exe'] }] })
  if (r.canceled || r.filePaths.length === 0) return null
  return r.filePaths[0]
})

ipcMain.handle('game:chooseDir', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
  if (r.canceled || r.filePaths.length === 0) return null
  return r.filePaths[0]
})

ipcMain.handle('ui:chooseImage', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters:[{ name:'图片', extensions:['png','jpg','jpeg','gif','webp'] }] })
  if (r.canceled || r.filePaths.length === 0) return null
  return r.filePaths[0]
})

ipcMain.handle('game:start', async () => {
  const cfg = loadConfig()
  let exePath = cfg.gameExePath
  if (!exePath || !fs.existsSync(exePath)) {
    const d = await (async ()=>{
      const base = cfg.gameDir && fs.existsSync(cfg.gameDir) ? cfg.gameDir : getGameDir()
      const p = path.join(base, cfg.gameExe)
      return fs.existsSync(p) ? p : null
    })()
    if (!d) return { ok:false, error: '未找到游戏可执行文件，请在右上角先选择一次' }
    exePath = d
    cfg.gameExePath = exePath
    saveConfig(cfg)
  }
  const cwd = path.dirname(exePath)
  require('child_process').spawn(exePath, [], { cwd, detached: true, stdio: 'ignore' }).unref()
  return { ok:true }
})

ipcMain.handle('server:latest', async (evt, baseUrl) => {
  const cfg = loadConfig()
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
  const url = `${(baseUrl||'').replace(/\/$/, '')}/api/version/latest`
  const res = await axios.get(url)
  const data = res.data || {}
  const remote = Array.isArray(data?.manifest?.files) ? data.manifest.files : []
  try { fse.ensureDirSync(path.dirname(getServerListPath())); fs.writeFileSync(getServerListPath(), JSON.stringify({ files: remote }, null, 2)) } catch {}
  const cfg = loadConfig()
  const base = resolveGameBase(cfg)
  log(`更新检查 - 游戏基础目录: ${base}`)
  log(`更新检查 - 服务器文件数量: ${remote.length}`)

  try { evt.sender.send('update:stage', { stage: 'fetch_remote', remoteCount: remote.length }) } catch {}
  const local = buildLocalManifest(base, evt)
  const lmap = new Map(local.files.map(f => [f.path, f]))
  const downloads = []
  const isLauncherUpdate = (p) => {
    // 用户要求取消所有保护，不再识别启动器文件
    return false;
  }

  // 先删除后下载模式：分析所有需要处理的文件
  log(`[调试] 开始分析远程文件列表...`)
  for (const rf of remote){
    const dest = path.join(base, rf.path)
    const isLauncher = isLauncherUpdate(rf.path)
    const isExcluded = isExcludedPath(dest)

    log(`[调试] 文件: ${rf.path}`)
    log(`[调试] - 目标路径: ${dest}`)
    log(`[调试] - 服务器大小: ${rf.size}`)
    log(`[调试] - 是否启动器文件: ${isLauncher}`)
    log(`[调试] - 是否排除路径: ${isExcluded}`)

    // 检查本地文件状态
    const localFile = lmap.get(rf.path)
    if (localFile) {
      log(`[调试] - 本地文件存在，大小: ${localFile.size}`)
      if (localFile.size !== rf.size) {
        log(`[调试] - 本地文件大小不匹配！需要更新`)
      } else {
        log(`[调试] - 本地文件大小匹配`)
      }
    } else {
      log(`[调试] - 本地文件不存在`)
    }

    if (isLauncher) {
      log(`[调试] 跳过启动器文件: ${rf.path}`);
      continue
    }
    if (isExcluded) {
      log(`[调试] 跳过排除文件: ${dest}`);
      continue
    }

    // 添加到下载列表（强制模式）
    log(`[调试] 加入下载列表: ${rf.path}`)
    downloads.push({ path: rf.path, size: rf.size })
  }

  const totalBytes = downloads.reduce((s,f)=> s + (Number(f.size)||0), 0)
  log(`[调试] 分析完成：`)
  log(`[调试] - 需要下载文件数: ${downloads.length}`)
  log(`[调试] - 总下载大小: ${totalBytes}`)

  try { evt.sender.send('update:stage', { stage: 'compare_done', downloadCount: downloads.length, totalBytes }) } catch {}
  return { ok:true, downloads, version: data.version || null, changelog: data.changelog || '' }
})

ipcMain.handle('launcher:runUpdater', async (evt, latest) => {
  // 运行 update/update.exe 更新工具
  // 这里的 getAppRoot() 返回 "地球帝国二代远航版启动器" 目录

  // 查找更新器路径
  const candidates = [
    path.join(getAppRoot(), 'update', 'ee2x-up.exe'),           // 新标准名称
    path.join(getAppRoot(), 'update', 'update.exe'),            // 兼容旧名称
    path.join(getAppRoot(), 'update', 'update', 'ee2x-up.exe'), // 目录模式
    path.join(getAppRoot(), 'update', 'update', 'update.exe'),  // 目录模式旧名称
  ]

  let p = null
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      p = candidate
      log(`找到更新程序: ${p}`)
      break
    }
  }

  if (!p) {
    log(`未找到更新程序，尝试的路径: ${candidates.join(', ')}`)
    return { ok: false, error: '未找到更新程序 ee2x-up.exe' }
  }

  // 清理旧的临时目录和环境
  try {
    log('清理环境...')

    // 1. 终止残留的更新器进程
    try {
      const { execSync } = require('child_process')
      execSync('taskkill /f /im ee2x-up.exe 2>nul', {
        windowsHide: true,
        stdio: 'ignore',
        timeout: 5000
      })
      execSync('taskkill /f /im update.exe 2>nul', {
        windowsHide: true,
        stdio: 'ignore',
        timeout: 5000
      })
      log('已终止残留的更新器进程')
    } catch (e) {
      // 没有残留进程是正常的
      log('没有发现残留的更新器进程')
    }

    // 2. 清理 PyInstaller 临时目录
    try {
      const { execSync } = require('child_process')
      const tempDir = process.env.TEMP || process.env.TMP
      if (tempDir) {
        execSync(`for /d %i in ("${tempDir}\\_MEI*") do @rd /s /q "%i" 2>nul`, {
          windowsHide: true,
          stdio: 'ignore',
          timeout: 10000,
          shell: true
        })
        log('已清理 PyInstaller 临时目录')
      }
    } catch (e) {
      log('清理临时目录时出错（可能不存在）')
    }

    // 3. 短暂等待，确保资源释放
    await new Promise(r => setTimeout(r, 500))

  } catch (e) {
    log('清理环境时出错: ' + e.message)
  }

  // 读取当前配置，获取服务器地址
  const cfg = loadConfig()
  const serverUrl = cfg.serverUrl || 'http://localhost:3003'
  const args = ['--server', serverUrl]
  log(`启动更新器，服务器地址: ${serverUrl}`)

  return new Promise((resolve) => {
    try {
      // 启动更新程序
      const child = require('child_process').spawn(p, args, {
        cwd: path.dirname(p),
        stdio: 'ignore',  // 使用 ignore，避免阻塞
        detached: true,   // 使用 detached，让更新器独立运行
        windowsHide: false // 显示窗口
      })

      // 更新器启动成功
      child.on('error', (err) => {
        log(`启动更新程序失败: ${err}`)
        resolve({ ok: false, error: String(err) })
      })

      // 立即返回成功，不等待更新器完成
      // 因为更新器会关闭启动器并自己运行
      child.unref()
      log(`更新程序已启动: ${p}`)
      resolve({ ok: true, message: '更新器已启动' })

    } catch (err) {
      log(`启动更新程序异常: ${err}`)
      resolve({ ok: false, error: String(err) })
    }
  })
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
ipcMain.handle('update2:manifest', async () => {
  const cfg = loadConfig()
  const candidates = getUpdateServerCandidates(cfg)
  let lastError = null
  for (const base of candidates) {
    try {
      const res = await axios.get(`${base}/manifest`, { timeout: 5000 })
      const m = res && res.data || {}
      if (m && (m.version || m.download_url || m.notes)) {
        return {
          ok:true,
          manifest: {
            version: m.version||'',
            notes: m.notes||'',
            download_url: m.download_url||'',
            force_update: m.force_update||false,
            file_size: m.file_size||0,
            file_hash: m.file_hash||'',
            created_at: m.created_at||''
          }
        }
      }
    } catch (e) {
      lastError = e
      log(`manifest failed ${base}: ${e}`)
    }
  }
  return { ok:false, error: String(lastError || 'manifest unavailable') }
})

ipcMain.handle('update2:download', async (evt, url) => {
  try {
    if (!url || !/^https?:\/\//.test(String(url))) return { ok:false, error:'无效更新地址' }
    // 创建更新下载目录
    const launcherDir = path.dirname(process.execPath)
    const updateDir = path.join(launcherDir, 'temp_update')
    
    await fse.ensureDir(updateDir)
    const tmp = path.join(updateDir, 'update.zip')
    const res = await axios.get(url, { responseType: 'stream' })
    await fse.ensureDir(path.dirname(tmp))
    const w = fs.createWriteStream(tmp)
    await new Promise((resolve, reject) => { res.data.pipe(w).on('finish', resolve).on('error', reject) })
    // 返回下载路径，不自动执行
    return { ok:true, downloadPath: tmp }
  } catch (e) {
    return { ok:false, error: String(e) }
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
      app.relaunch()
      app.exit()
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
    const vPath = path.join(getAppRoot(), 'update', 'version_history.json')
    if (fs.existsSync(vPath)) {
       const data = JSON.parse(fs.readFileSync(vPath, 'utf8'))
       return data.current_version || '0.1.0'
    }
    const packagePath = path.join(__dirname, 'package.json')
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    return packageData.version || '0.1.0'
  } catch (error) {
    log('获取当前版本失败: ' + error.message)
    return '0.1.0'
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
