// Global ESC key handler to close any open modals or settings
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // 如果结算详情视图在显示，先返回列表
        const detailView = document.getElementById('battleDetailView')
        const mainView = document.getElementById('battleMainView')
        if (detailView && detailView.style.display !== 'none') {
            detailView.style.display = 'none'
            if (mainView) mainView.style.display = ''
            return
        }
        // Find all visible modals
        const visibleModals = document.querySelectorAll('.modal:not(.hidden)');
        if (visibleModals.length > 0) {
            const topModal = visibleModals[visibleModals.length - 1];
            if (topModal && topModal.dataset && topModal.dataset.lockClose === 'true') {
                return
            }
            topModal.classList.add('hidden');
        } else {
             const dropdown = document.getElementById('userDropdown');
             if (dropdown && dropdown.classList.contains('show')) {
                 dropdown.classList.remove('show');
             }
        }
    }
});

// Force hide scrollbars globally via JS injection
const hideScrollbarStyle = `
  *::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    background: transparent !important;
  }
  * {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
`;

const style = document.createElement('style');
style.textContent = hideScrollbarStyle;
document.head.appendChild(style);

// Re-inject on load just in case
window.addEventListener('DOMContentLoaded', () => {
    const styleLoad = document.createElement('style');
    styleLoad.textContent = hideScrollbarStyle;
    document.head.appendChild(styleLoad);
});

// 全局配置变量
let cfg = {
  serverUrl:'http://115.231.35.105:3010',
  gameDir:'',
  gameExePath:'',
  gameExe:'EE2X.exe',
  networkServer: '122.10.116.142:29872'
}

// 新的更新管理器实例
let updateManager = null

  // Friend & Chat Logic
  let friendsList = []
  let chatHistory = {} // { username: [{from, content, time, isMe}] }
  let currentChatTarget = null
  let totalUnread = 0
  let friendRequests = []
  let currentIp = ''

  // Load friends
  async function loadFriends() {
    try {
      const res = await window.ee2x.friendsList()
      friendsList = Array.isArray(res) ? res : []
      renderFriendList()
    } catch {}
  }

  // Render Friend List in Panel
  function renderFriendList() {
    // Disabled
  }

  // Open Chat
  window.openChat = async (name, ip, isOnlineStr) => {
    // Disabled
  }

  function renderChatMessages() {
    // Disabled
  }

  // Send Message
  async function sendMessage(content, type = 'text', fileName = null, fileSize = null) {
    // Disabled
  }

  // Handle Image Upload
  // document.getElementById('sendImageBtn').addEventListener('click', () => {
  //   document.getElementById('chatImageInput').click()
  // })

  // document.getElementById('chatImageInput').addEventListener('change', async (e) => {
  //   // Disabled
  // })

  // Handle File Upload
  // document.getElementById('sendFileBtn').addEventListener('click', () => {
  //   document.getElementById('chatFileInput').click()
  // })

  // document.getElementById('chatFileInput').addEventListener('change', async (e) => {
  //   // Disabled
  // })

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function renderChatMessages() {
    // Disabled
  }

  // document.getElementById('sendChatBtn').addEventListener('click', () => sendMessage())
  // document.getElementById('chatInput').addEventListener('keydown', (e) => {
  //   if (e.key === 'Enter') sendMessage()
  // })

  // Chat History Management
  function loadChatHistory() {
    // Disabled
  }
  
  function saveChatHistory() {
    // Disabled
  }

  // Add Friend Logic
  window.addFriend = async (name, avatar, ip) => {
    // Disabled
  }

  // Open Chat from List
  window.startChat = (name, ip) => {
    // Disabled
  }

  // Friend Request Handlers
  window.acceptFriendRequest = async (index) => {
    // Disabled
  }

  window.rejectFriendRequest = (index) => {
    // Disabled
  }

  function updateUnreadBadge() {
    // Disabled
  }

  // Init
  // loadFriends()

  // Tab Logic in Chat Panel
  // const chatTabs = document.querySelectorAll('.chat-tab')
  // chatTabs.forEach(t => {
  //   t.addEventListener('click', () => {
  //     chatTabs.forEach(x => { x.classList.remove('active'); x.style.color='#aaa' })
  //     t.classList.add('active'); t.style.color='#fff'
  //     const view = t.dataset.view
  //     if (view === 'friends') {
  //       document.getElementById('friendListContainer').classList.remove('hidden')
  //       document.getElementById('chatListContainer').classList.add('hidden')
  //       renderFriendList()
  //     } else {
  //       document.getElementById('friendListContainer').classList.add('hidden')
  //       document.getElementById('chatListContainer').classList.remove('hidden')
  //       // renderChatList() // TODO
  //     }
  //   })
  // })

async function init(){
  try { const loaded = await window.ee2x.cfgGet(); if (loaded) cfg = loaded } catch {}

  // 离线模式状态（仅当次运行有效）
  let isOfflineMode = false

  let detected = null
  try { detected = await window.ee2x.detect() } catch {}
  const gameDirEl = document.getElementById('gameDir')
  function dirOf(p){ if(!p) return ''; const i = p.lastIndexOf('\\'); return i>=0 ? p.slice(0,i) : p }
  if (detected) {
    cfg.gameExePath = detected
    try { if (window.ee2x && window.ee2x.cfgSet) await window.ee2x.cfgSet(cfg) } catch {}
  }
  if (!cfg.gameExePath) {
    // defer to settings dialog to choose folder & exe
  }
  cfg.gameDir = cfg.gameExePath ? dirOf(cfg.gameExePath) : (cfg.gameDir || '')
  try { if (window.ee2x && window.ee2x.cfgSet) await window.ee2x.cfgSet(cfg) } catch {}
  gameDirEl.textContent = cfg.gameDir || '未检测到，需手动选择'

  // 自动加载背景 - 确保在DOM加载完成后执行
  setTimeout(async () => {
    await applyBackground()
  }, 100)
  
  // Load friends and chat history
  // loadFriends()
  // loadChatHistory()

  // 启动后立即强制做版本检查，未同步前禁止启动游戏
  void initializeReleaseFlow()

  // 更新版本显示
  async function updateBottomVersion() {
    const versionBadge = document.getElementById('versionBadge')
    if (versionBadge) {
      try {
        const ver = await window.ee2x.getCurrentVersion()
        versionBadge.textContent = `游戏版本 V${ver}`
      } catch {
        versionBadge.textContent = '游戏版本 V--'
      }
    }
  }
  updateBottomVersion()

  // Network Logic
  const netBtn = document.getElementById('networkBtn')
  const netModal = document.getElementById('networkModal')
  const netCloseBtn = document.getElementById('netCloseBtn')
  const netStopBtn = document.getElementById('netStopBtn')
  const netLocalIp = document.getElementById('netLocalIp')
  const netStatus = document.getElementById('netStatus')
  const netSpeed = document.getElementById('netSpeed')
  const netPeerCount = document.getElementById('netPeerCount')
  const netPeerList = document.getElementById('netPeerList')
  const netMode = document.getElementById('netMode')

  let netPollTimer = null
  let isNetRunning = false

  function updateNetBtn() {
    if (!netBtn) return
    if (isNetRunning) {
      netBtn.textContent = '对战平台在线'
      netBtn.style.background = 'rgba(34, 197, 94, 0.2)'
      netBtn.style.borderColor = 'rgba(34, 197, 94, 0.4)'
      netBtn.style.color = '#4ade80'
    } else {
      netBtn.textContent = '对战平台离线'
      netBtn.style.background = 'rgba(59, 130, 246, 0.2)'
      netBtn.style.borderColor = 'rgba(59, 130, 246, 0.4)'
      netBtn.style.color = '#e6eaf2' // Reset to default text color
    }
  }

  async function performNetworkStart(silent = false) {
    if (isNetRunning) return
    netBtn.textContent = '连接中...'
    netBtn.disabled = true
    try {
      const res = await window.ee2x.networkStart()
      if (res.ok) {
        isNetRunning = true
        netBtn.textContent = '已接入对战平台'
        setTimeout(() => updateNetBtn(), 1500)
        // Refresh online players immediately
        if (typeof renderOnlinePlayers === 'function') renderOnlinePlayers()
      } else {
        if (!silent) alert('启动失败: ' + (res.error || '未知错误'))
        updateNetBtn()
      }
    } catch (e) {
      if (!silent) alert('启动出错: ' + e.message)
      updateNetBtn()
    } finally {
      netBtn.disabled = false
    }
  }

  if (netBtn) {
    netBtn.addEventListener('click', async () => {
      if (isNetRunning) {
        // Open Modal
        if (netModal) {
          netModal.classList.remove('hidden')
          netModal.style.display = 'flex'
        }
        pollNetStatus()
        // if (!netPollTimer) netPollTimer = setInterval(pollNetStatus, 2000)
      } else {
        // 检查是否处于异地登录离线模式
        if (isOfflineMode) {
          // 离线模式下点击对战平台，重新触发确认弹窗
          showConfirmLoginModal('点击"确认是本人"以恢复联机功能')
          return
        }
        // 检查是否已登录
        const u = await window.ee2x.userGet()
        if (!u || !u.token) {
          let isOnline = false
          try { const or = await window.ee2x.checkOnline(); isOnline = !!(or && or.online) } catch {}
          if (!isOnline) {
            alert('当前无网络连接，联机功能不可用。')
          } else {
            alert('请先登录账号才能使用联机对战平台。')
            try { authModal.classList.remove('hidden'); if (closeAuth) closeAuth.style.display = 'none' } catch {}
          }
          return
        }
        await performNetworkStart(false)
      }
    })
  }
  // Poll Logic
  let lastReportTime = 0
  let lastReportedIp = null
  
  async function pollNetStatus() {
    // 即使没开界面，只要网络在运行，我们也需要更新底部的网速
    if (!isNetRunning) return
    
    try {
      const st = await window.ee2x.networkStatus()
      
      // 更新底部网速显示
      const footerSpeed = document.getElementById('footerNetSpeed')
      if (footerSpeed) {
        if (st.running) {
           const up = (st.speed.up / 1024).toFixed(1)
           const down = (st.speed.down / 1024).toFixed(1)
           footerSpeed.textContent = `↑ ${up} KB/s  ↓ ${down} KB/s`
           footerSpeed.style.display = 'inline-block'
        } else {
           footerSpeed.style.display = 'none'
        }
      }

      // 如果模态框没打开，且不需要汇报心跳，可以跳过后续繁重的DOM更新
      const modalOpen = netModal && !netModal.classList.contains('hidden') && netModal.style.display !== 'none'
      const shouldReport = (st.info && st.info.virtual_ip)
      
      if (!modalOpen && !shouldReport) return

      // 获取后端在线列表
      let onlineUsers = []
      try {
        const res = await window.ee2x.getOnlineUsers()
        if (res.ok && Array.isArray(res.list)) {
           onlineUsers = res.list
        }
      } catch(e) {}

      if (st.running) {
        if (netStatus) {
            netStatus.textContent = '对战平台在线'
            netStatus.style.color = '#4ade80'
        }
        if (netMode) {
            netMode.textContent = (st.info && st.info.net_mode) ? st.info.net_mode : 'TUN'
        }
        const up = (st.speed.up / 1024).toFixed(1)
        const down = (st.speed.down / 1024).toFixed(1)
        if (netSpeed) netSpeed.textContent = `↑ ${up} KB/s  ↓ ${down} KB/s`
        
        const peers = st.peers || []
        // 优先使用后端列表计数
        const totalCount = onlineUsers.length > 0 ? onlineUsers.length : (peers.length + 1)
        if (netPeerCount) netPeerCount.textContent = totalCount

        if (st.info && st.info.virtual_ip) {
          currentIp = st.info.virtual_ip
          if (netLocalIp) netLocalIp.textContent = currentIp
          
          // Enhanced Report Logic
          const now = Date.now()
          const ipChanged = (currentIp !== lastReportedIp)
          
          if (ipChanged || (now - lastReportTime > 10000)) {
            window.ee2x.userOnlineReport({ virtual_ip: currentIp }).then((res) => {
               if (res && res.success) {
                   lastReportTime = now
                   lastReportedIp = currentIp
               }
            }).catch(() => {})
          }
        }
        
        if (netPeerList && modalOpen) {
          // Get local name (same logic as main.js roughly, or just use UI name)
          const localName = (document.getElementById('userName').textContent || '本机') + ' (本机)'
          const localIp = currentIp || '获取中...'
          
          // 优先使用后端列表渲染
          let displayList = []
          if (onlineUsers.length > 0) {
             // 过滤出其他人
             displayList = onlineUsers.filter(u => u.virtual_ip !== currentIp)
          } else {
             // 降级使用 peers
             displayList = peers.map(p => ({ username: p.name || 'Unknown', virtual_ip: p.virtual_ip }))
          }
          
          // 渲染列表...
          const selfRow = `
            <div style="padding: 4px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; font-size: 13px; background: rgba(34, 197, 94, 0.1);">
              <span style="color: #4ade80; font-weight: bold;">${localName}</span>
              <span style="color: #4ade80; font-family: monospace; font-weight: bold;">${localIp}</span>
            </div>`
            
          const peerRows = displayList.map(p => `
            <div style="padding: 4px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; font-size: 13px;">
              <span style="color: #e2e8f0;">${p.username || p.name || 'Unknown'}</span>
              <span style="color: #94a3b8; font-family: monospace;">${p.virtual_ip}</span>
            </div>
          `).join('')
          
          netPeerList.innerHTML = selfRow + peerRows
        }
      } else {
        if (netStatus) {
            netStatus.textContent = '对战平台离线'
            netStatus.style.color = '#ef4444'
        }
      }
    } catch (e) { console.error('Poll status error', e) }
  }



  if (netCloseBtn) {
    netCloseBtn.addEventListener('click', () => {
      if (netModal) {
        netModal.classList.add('hidden')
        netModal.style.display = 'none'
      }
      // if (netPollTimer) {
      //   clearInterval(netPollTimer)
      //   netPollTimer = null
      // }
    })
  }

  if (netStopBtn) {
    netStopBtn.addEventListener('click', async () => {
      if (confirm('确定要断开连接吗？')) {
        try {
          await window.ee2x.networkStop()
          isNetRunning = false
          updateNetBtn()
          if (netModal) {
            netModal.classList.add('hidden')
            netModal.style.display = 'none'
          }
          // if (netPollTimer) {
          //   clearInterval(netPollTimer)
          //   netPollTimer = null
          // }
        } catch (e) { alert('断开失败: ' + e.message) }
      }
    })
  }

  // Listen for initial IP if needed
  window.ee2x.onNetworkIP((ip) => {
    currentIp = ip
    if (netLocalIp) netLocalIp.textContent = ip
    if (!isNetRunning) {
       isNetRunning = true
       updateNetBtn()
    }
  })

  if (!netPollTimer) netPollTimer = setInterval(pollNetStatus, 2000)

  try {
    const lp = await window.ee2x.getLauncherPath()
    const clean = lp.replace(/^\\+/, '/').replace(/\+/g, '/')
    const iconUrl = 'file:///' + clean + '/EE2X.ico'
    const el = document.getElementById('titleIcon')
    if (el) el.src = iconUrl
  } catch {}

  const startBtn = document.getElementById('startBtn')
  const updateBtn = document.getElementById('updateBtn')
  let currentUpdateNotes = ""
  let totalPct = 0
  function setUpdateProgress(){ }
  function setTotalDownloadProgress(percent, detail = ''){
    const pct = Math.max(0, Math.min(100, Math.floor(percent || 0)))
    totalPct = pct
    const totalPctEl = document.getElementById('dlTotalPct')
    const totalBarEl = document.getElementById('dlTotalBar')
    if (totalPctEl) totalPctEl.textContent = detail ? `${pct}% · ${detail}` : `${pct}%`
    if (totalBarEl) totalBarEl.style.width = `${pct}%`
  }
  function useBroadcastAsProgress(){
    const wrap = document.getElementById('broadcastList')
    const title = document.querySelector('.section-title')
    if (title) title.textContent = '下载进度'
    try {
      const header = document.querySelector('.section-header')
      let tools = document.getElementById('dlHeaderTools')
      if (!tools && header){
        tools = document.createElement('div'); tools.id = 'dlHeaderTools'; tools.className = 'header-tools'
        const cancelBtn = document.createElement('button'); cancelBtn.className = 'pause-btn'; cancelBtn.id = 'dlCancelBtn'; cancelBtn.textContent = '取消更新'
        cancelBtn.onclick = async () => { try { await window.ee2x.updateCancel(); cancelBtn.textContent = '已取消'; cancelBtn.disabled = true } catch {} }
        tools.appendChild(cancelBtn)
        header.appendChild(tools)
      }
    } catch {}
    wrap.innerHTML = ''
    let fixed = document.getElementById('dlFixed')
    if (!fixed){
      fixed = document.createElement('div'); fixed.id = 'dlFixed'; fixed.className = 'fixed-progress'
      fixed.innerHTML = `
        <div class="prog-row">
          <span class="prog-name">总进度</span>
          <div class="prog-box"><div id="dlTotalBar" class="prog-bar" style="background:#22c55e"></div></div>
          <span id="dlTotalPct" class="prog-pct">0%</span>
        </div>
        <div class="prog-row" style="margin-top:6px">
          <span id="dlFileName" class="prog-name">准备下载...</span>
          <div class="prog-box"><div id="dlFileBar" class="prog-bar"></div></div>
          <span id="dlFilePct" class="prog-pct">0%</span>
        </div>`
      wrap.appendChild(fixed)
    }
    let notesHeader = document.getElementById('dlNotesHeader')
    if (!notesHeader){ notesHeader = document.createElement('div'); notesHeader.id = 'dlNotesHeader'; notesHeader.className = 'item'; notesHeader.style.marginTop = '10px'; notesHeader.style.borderTop = '1px solid #253045'; notesHeader.textContent = '更新内容'; wrap.appendChild(notesHeader) }
    let notes = document.getElementById('dlNotes')
    if (!notes){ notes = document.createElement('div'); notes.id = 'dlNotes'; wrap.appendChild(notes) }
    if (currentUpdateNotes && currentUpdateNotes.trim().length){
      notes.innerHTML = ''
      const p = document.createElement('div')
      p.className = 'item'
      p.style.whiteSpace = 'pre-wrap'
      p.textContent = currentUpdateNotes
      notes.appendChild(p)
    }
    return fixed
  }
  function restoreBroadcastHeader(){
    const title = document.querySelector('.section-title')
    if (title) title.textContent = '战绩播报'
    try { const tools = document.getElementById('dlHeaderTools'); if (tools) tools.remove() } catch {}
    try { document.getElementById('broadcastList').innerHTML = '' } catch {}
  }
  function openDetailModal(ver, notes){
    try {
      const dm = document.getElementById('detailModal')
      const dc = document.getElementById('detailContent')
      dc.innerHTML = ''
      const h = document.createElement('div')
      h.className = 'item'
      h.innerHTML = `<div><strong>版本：</strong>${ver||'未知'}</div><div style="margin-top:6px"><strong>更新内容：</strong></div><div>${notes||''}</div>`
      dc.appendChild(h)
      dm.classList.remove('hidden')
    } catch {}
  }
  function showUpdateInfoRight(ver, notes){
    const wrap = document.getElementById('broadcastList')
    const title = document.querySelector('.section-title')
    if (title) title.textContent = '更新详情'
    wrap.innerHTML = ''
    const box = document.createElement('div')
    box.className = 'item'
    box.innerHTML = `<div><strong>版本：</strong>${ver||'未知'}</div><div style="margin-top:6px"><strong>更新内容：</strong></div><div>${notes||''}</div>`
    wrap.appendChild(box)
  }
  function upsertProgressItem(fixedEl, fileName, percent){
    const pct = Math.max(0, Math.min(100, Math.floor(percent||0)))
    const nameEl = document.getElementById('dlFileName')
    const filePctEl = document.getElementById('dlFilePct')
    const fileBarEl = document.getElementById('dlFileBar')
    const baseName = String(fileName||'').split(/[/\\]/).pop()
    if (nameEl) nameEl.textContent = baseName
    if (filePctEl) filePctEl.textContent = `${pct}%`
    if (fileBarEl) fileBarEl.style.width = `${pct}%`
  }
  function formatBytesCompact(bytes){
    const value = Number(bytes || 0)
    if (!Number.isFinite(value) || value <= 0) return '0 B'
    if (value < 1024) return `${Math.floor(value)} B`
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  
  function setUpdateNotes(notes){
    try {
      currentUpdateNotes = String(notes||'')
      const notesEl = document.getElementById('dlNotes')
      if (notesEl){
        notesEl.innerHTML = ''
        const p = document.createElement('div')
        p.className = 'item'
        p.style.whiteSpace = 'pre-wrap'
        p.textContent = currentUpdateNotes
        notesEl.appendChild(p)
      }
    } catch {}
  }
  function addCompleted(fileName){
    const done = document.getElementById('dlDone'); if (!done) return
    const id = `done_${btoa(unescape(encodeURIComponent(fileName))).replace(/=*$/,'')}`
    if (document.getElementById(id)) return
    const el = document.createElement('div')
    el.className = 'item'
    el.id = id
    el.innerHTML = `<div style="display:flex;align-items:center;gap:8px"><span class="nm" style="flex:1;overflow:hidden;text-overflow:ellipsis">${fileName}</span><span>完成</span></div><div style="height:1px;background:#253045;margin:6px 0"></div>`
    done.appendChild(el)
  }
  try {
    if (window.ee2x && window.ee2x.onUpdateProgress) {
      window.ee2x.onUpdateProgress((payload) => {
        const fixed = useBroadcastAsProgress()
        const strategy = payload && payload.strategy === 'multipart' ? `多线程下载 ×${payload.concurrency || 4}` : '单线程下载'
        const speed = payload && payload.speedBytesPerSec ? `${formatBytesCompact(payload.speedBytesPerSec)}/s` : ''
        const totalBytes = payload && payload.totalBytes ? `${formatBytesCompact(payload.downloadedBytes || 0)} / ${formatBytesCompact(payload.totalBytes || 0)}` : ''
        const detail = [strategy, speed, totalBytes].filter(Boolean).join(' · ')
        setTotalDownloadProgress(payload && payload.percent || 0, detail)
        upsertProgressItem(fixed, strategy, payload && payload.percent || 0)
        updateReleaseModalState({
          kind: 'downloading',
          stageTitle: '正在下载更新包',
          stageDetail: '请保持启动器开启，下载完成后会自动校验并应用更新。',
          progressPercent: payload && payload.percent || 0,
          strategyText: strategy,
          speedText: speed,
          volumeText: totalBytes,
          currentFileText: '正在下载游戏更新包',
          canRetry: false,
          canClose: false,
          lockClose: true,
        })
      })
    }
    if (window.ee2x && window.ee2x.onUpdateStage) {
      window.ee2x.onUpdateStage((payload) => {
        useBroadcastAsProgress()
        if (payload && payload.stage === 'download_start') {
          updateReleaseModalState({
            kind: 'downloading',
            stageTitle: '正在下载更新包',
            stageDetail: '已连接服务器，开始获取更新数据。',
            strategyText: payload.strategy === 'multipart' ? `多线程下载 ×${payload.concurrency || 4}` : '单线程下载',
            speedText: '',
            volumeText: payload.totalBytes ? formatBytesCompact(payload.totalBytes) : '',
            currentFileText: '准备下载游戏更新包',
            canRetry: false,
            canClose: false,
            lockClose: true,
          })
          return
        }
        if (payload && payload.stage === 'apply_file') {
          upsertProgressItem(null, `应用 ${payload.file || ''}`, payload.percent || 0)
          setTotalDownloadProgress(payload.percent || 0, '正在应用更新')
          updateReleaseModalState({
            kind: 'applying',
            stageTitle: '正在应用更新',
            stageDetail: '文件已下载完成，正在校验并写入游戏目录。',
            progressPercent: payload.percent || 0,
            currentFileText: payload.file ? `应用 ${payload.file}` : '正在应用文件',
            strategyText: '正在写入',
            speedText: '',
            volumeText: '',
          })
          return
        }
        if (payload && payload.stage === 'download_fallback') {
          upsertProgressItem(null, '回退到单线程下载', totalPct)
          updateReleaseModalState({
            kind: 'downloading',
            stageTitle: '下载重试中',
            stageDetail: `多线程下载不可用，已自动回退到单线程。${payload.reason ? `原因：${payload.reason}` : ''}`,
            strategyText: '单线程下载',
            speedText: '',
            volumeText: '',
            currentFileText: '正在重新下载更新包',
          })
          return
        }
        if (payload && payload.stage === 'verify') {
          updateReleaseModalState({
            kind: 'applying',
            stageTitle: '正在校验更新包',
            stageDetail: '下载完成，正在验证完整性。',
            strategyText: '校验中',
            speedText: '',
            volumeText: '',
            currentFileText: '验证下载包哈希',
          })
          return
        }
        if (payload && payload.stage === 'extract') {
          updateReleaseModalState({
            kind: 'applying',
            stageTitle: '正在解压更新包',
            stageDetail: '完整性校验通过，正在解压并准备应用。',
            strategyText: '解压中',
            speedText: '',
            volumeText: '',
            currentFileText: '解压游戏更新包',
          })
          return
        }
        if (payload && payload.stage === 'done') {
          updateReleaseModalState({
            kind: 'completed',
            stageTitle: '更新完成',
            stageDetail: String(payload.message || '更新已完成。'),
            progressPercent: 100,
            strategyText: '同步完成',
            speedText: '',
            volumeText: '',
            currentFileText: '你现在可以启动游戏了',
            errorText: '',
            canRetry: false,
            canClose: true,
            primaryActionLabel: '立即更新',
            lockClose: false,
          })
          return
        }
        if (payload && payload.message) {
          const nameEl = document.getElementById('dlFileName')
          if (nameEl) nameEl.textContent = String(payload.message || '')
        }
      })
    }
  } catch {}
  startBtn.textContent = '启动游戏'
  startBtn.onclick = async () => {
    const r = await window.ee2x.start()
    if (!r.ok) alert(r.error || '启动失败')
    else { try { await window.ee2x.userRuntimeReport({ game_starts: 1 }) } catch {} }
  }
  try {
    const loginBtn = document.getElementById('loginBtn')
    const authModal = document.getElementById('authModal')
    const closeAuth = document.getElementById('closeAuth')
    const doRegister = document.getElementById('doRegister')
    const doLogin = document.getElementById('doLogin')
    const nicknameInput = document.getElementById('auth_nickname')
    const pwdInput = document.getElementById('auth_password')
    const avatarInput = document.getElementById('auth_avatar')
    const avatarPrev = document.getElementById('auth_avatar_preview')
    const errEl = document.getElementById('auth_error')

    const userInfo = document.getElementById('userInfo')
    const userAvatar = document.getElementById('userAvatar')
    const userName = document.getElementById('userName')
    const userDropdown = document.getElementById('userDropdown')
    const openProfile = document.getElementById('openProfile')
    const logoutBtn = document.getElementById('logoutBtn')
    const profileModal = document.getElementById('profileModal')
    const closeProfile = document.getElementById('closeProfile')
    const profileAvatar = document.getElementById('profileAvatar')
    const profileName = document.getElementById('profileName')
    const profileLogout = document.getElementById('profileLogout')
    const profileTotalRuntime = document.getElementById('profileTotalRuntime')
    const changeAvatarBtn = document.getElementById('changeAvatarBtn')
    const profileAvatarInput = document.getElementById('profileAvatarInput')
    const profileSignature = document.getElementById('profileSignature')
    const profileSignatureInput = document.getElementById('profileSignatureInput')
    const profileEditBtn = document.getElementById('profileEditBtn')

    // profileEditBtn 现在打开"修改个人资料"弹窗
    if (profileEditBtn) {
      profileEditBtn.addEventListener('click', () => {
        try {
          profileModal.classList.add('hidden')
          openEditProfileModal()
        } catch {}
      })
    }

    // ===== 修改个人资料弹窗逻辑 =====
    const editProfileModal = document.getElementById('editProfileModal')
    const closeEditProfile = document.getElementById('closeEditProfile')

    function openEditProfileModal(defaultTab) {
      if (!editProfileModal) return
      editProfileModal.classList.remove('hidden')
      // 同步头像和签名到编辑弹窗
      const editAvatar = document.getElementById('editProfileAvatar')
      if (editAvatar && profileAvatar) editAvatar.src = profileAvatar.src
      const editSig = document.getElementById('editSignatureInput')
      if (editSig && profileSignature) editSig.value = profileSignature.textContent === '这个人很懒，什么都没有留下' ? '' : (profileSignature.textContent || '')
      // 切换到指定Tab
      switchEditTab(defaultTab || 'basic')
    }

    function switchEditTab(tabName) {
      document.querySelectorAll('.edit-tab-btn').forEach(btn => {
        const active = btn.dataset.tab === tabName
        btn.style.borderBottomColor = active ? '#3b82f6' : 'transparent'
        btn.style.color = active ? '#93c5fd' : '#94a3b8'
      })
      document.querySelectorAll('.edit-tab-content').forEach(el => {
        el.style.display = 'none'
      })
      const target = document.getElementById('editTab-' + tabName)
      if (target) target.style.display = 'block'
    }

    // Tab 切换
    document.querySelectorAll('.edit-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchEditTab(btn.dataset.tab))
    })

    if (closeEditProfile) {
      closeEditProfile.addEventListener('click', () => {
        if (editProfileModal) editProfileModal.classList.add('hidden')
      })
    }

    // --- 基本资料 Tab ---
    const editChangeAvatarBtn = document.getElementById('editChangeAvatarBtn')
    const editAvatarInput = document.getElementById('editAvatarInput')
    const editBasicSaveBtn = document.getElementById('editBasicSaveBtn')
    const editBasicMsg = document.getElementById('editBasicMsg')

    function showEditMsg(el, msg, isOk) {
      if (!el) return
      el.textContent = msg
      el.style.color = isOk ? '#4ade80' : '#f87171'
      el.style.display = msg ? 'block' : 'none'
    }

    if (editChangeAvatarBtn) {
      editChangeAvatarBtn.addEventListener('click', () => { if (editAvatarInput) editAvatarInput.click() })
    }
    if (editAvatarInput) {
      editAvatarInput.addEventListener('change', async () => {
        const file = editAvatarInput.files[0]
        if (!file) return
        if (file.size > 2 * 1024 * 1024) { showEditMsg(editBasicMsg, '图片大小不能超过 2MB', false); return }
        try {
          const base64 = await fileToDataUrl(file)
          const user = await window.ee2x.userGet()
          const res = await window.ee2x.authUpdateAvatar({ username: user.username, token: user.token, avatar: base64 })
          if (res.ok) {
            await refreshUserUI()
            const newSrc = (cfg.userServerUrl||'').replace(/\/$/, '') + res.avatar
            const editAv = document.getElementById('editProfileAvatar')
            if (editAv) editAv.src = newSrc
            showEditMsg(editBasicMsg, '头像更换成功', true)
          } else {
            showEditMsg(editBasicMsg, res.error || '更换失败', false)
          }
        } catch(e) { showEditMsg(editBasicMsg, '更换出错: ' + e.message, false) }
      })
    }
    if (editBasicSaveBtn) {
      editBasicSaveBtn.addEventListener('click', async () => {
        const sigInput = document.getElementById('editSignatureInput')
        const newSig = sigInput ? sigInput.value.trim() : ''
        const user = await window.ee2x.userGet()
        if (!user || !user.username) { showEditMsg(editBasicMsg, '未登录', false); return }
        editBasicSaveBtn.disabled = true; editBasicSaveBtn.textContent = '保存中...'
        try {
          const res = await window.ee2x.authUpdateSignature({ username: user.username, token: user.token, signature: newSig })
          if (res.ok) {
            if (profileSignature) profileSignature.textContent = newSig || '这个人很懒，什么都没有留下'
            showEditMsg(editBasicMsg, '保存成功', true)
          } else {
            showEditMsg(editBasicMsg, res.error || '保存失败', false)
          }
        } catch(e) { showEditMsg(editBasicMsg, '保存出错: ' + e.message, false) }
        finally { editBasicSaveBtn.disabled = false; editBasicSaveBtn.textContent = '保存资料' }
      })
    }

    // --- 修改账号名 Tab ---
    const editUsernameSaveBtn = document.getElementById('editUsernameSaveBtn')
    const editUsernameMsg = document.getElementById('editUsernameMsg')
    if (editUsernameSaveBtn) {
      editUsernameSaveBtn.addEventListener('click', async () => {
        const newName = (document.getElementById('editNewUsername') || {}).value || ''
        const trimmed = newName.trim()
        if (!trimmed || trimmed.length < 2) { showEditMsg(editUsernameMsg, '账号名至少2个字符', false); return }
        editUsernameSaveBtn.disabled = true; editUsernameSaveBtn.textContent = '修改中...'
        try {
          const res = await window.ee2x.changeUsername({ newUsername: trimmed })
          if (res && res.ok) {
            showEditMsg(editUsernameMsg, '修改成功！即将重新登录...', true)
            setTimeout(async () => {
              if (editProfileModal) editProfileModal.classList.add('hidden')
              try { await window.ee2x.networkStop(); isNetRunning = false; updateNetBtn() } catch {}
              stopSessionTimers()
              await refreshUserUI()
              authModal.classList.remove('hidden')
              if (closeAuth) closeAuth.style.display = 'none'
              setError('账号名已修改，请重新登录')
            }, 1500)
          } else {
            showEditMsg(editUsernameMsg, (res && (res.error || res.message)) || '修改失败', false)
          }
        } catch(e) { showEditMsg(editUsernameMsg, '网络错误: ' + e.message, false) }
        finally { editUsernameSaveBtn.disabled = false; editUsernameSaveBtn.textContent = '确认修改' }
      })
    }

    // --- 修改密码 Tab ---
    const editPwdSaveBtn = document.getElementById('editPwdSaveBtn')
    const editPwdMsg = document.getElementById('editPwdMsg')
    if (editPwdSaveBtn) {
      editPwdSaveBtn.addEventListener('click', async () => {
        const old = (document.getElementById('editPwdOld') || {}).value || ''
        const nw = (document.getElementById('editPwdNew') || {}).value || ''
        const cf = (document.getElementById('editPwdConfirm') || {}).value || ''
        if (!old) { showEditMsg(editPwdMsg, '请输入当前密码', false); return }
        if (!nw || nw.length < 4) { showEditMsg(editPwdMsg, '新密码长度至少4位', false); return }
        if (nw !== cf) { showEditMsg(editPwdMsg, '两次输入的新密码不一致', false); return }
        editPwdSaveBtn.disabled = true; editPwdSaveBtn.textContent = '修改中...'
        try {
          const res = await window.ee2x.changePassword({ oldPassword: old, newPassword: nw })
          if (res && res.ok) {
            showEditMsg(editPwdMsg, '密码修改成功！请重新登录', true)
            setTimeout(async () => {
              if (editProfileModal) editProfileModal.classList.add('hidden')
              try { await window.ee2x.networkStop(); isNetRunning = false; updateNetBtn() } catch {}
              stopSessionTimers()
              await refreshUserUI()
              authModal.classList.remove('hidden')
              if (closeAuth) closeAuth.style.display = 'none'
              setError('密码已修改，请重新登录')
            }, 1500)
          } else {
            showEditMsg(editPwdMsg, (res && (res.error || res.message)) || '修改失败', false)
          }
        } catch(e) { showEditMsg(editPwdMsg, '网络错误，请重试', false) }
        finally { editPwdSaveBtn.disabled = false; editPwdSaveBtn.textContent = '确认修改' }
      })
    }

    // --- 安全问题 Tab ---
    const editSecuritySelect = document.getElementById('editSecuritySelect')
    const editSecurityCustom = document.getElementById('editSecurityCustom')
    const editSecuritySaveBtn = document.getElementById('editSecuritySaveBtn')
    const editSecurityMsg = document.getElementById('editSecurityMsg')
    if (editSecuritySelect) {
      editSecuritySelect.addEventListener('change', () => {
        if (editSecurityCustom) editSecurityCustom.style.display = editSecuritySelect.value === 'custom' ? 'block' : 'none'
      })
    }
    if (editSecuritySaveBtn) {
      editSecuritySaveBtn.addEventListener('click', async () => {
        const q = editSecuritySelect && editSecuritySelect.value === 'custom'
          ? (editSecurityCustom ? editSecurityCustom.value.trim() : '')
          : (editSecuritySelect ? editSecuritySelect.value : '')
        const a = (document.getElementById('editSecurityAnswer') || {}).value || ''
        if (!q) { showEditMsg(editSecurityMsg, '请选择或输入安全问题', false); return }
        if (!a.trim()) { showEditMsg(editSecurityMsg, '请输入答案', false); return }
        editSecuritySaveBtn.disabled = true; editSecuritySaveBtn.textContent = '保存中...'
        try {
          const res = await window.ee2x.setSecurityQuestion({ question: q, answer: a.trim() })
          if (res && res.ok) {
            showEditMsg(editSecurityMsg, '安全问题设置成功', true)
          } else {
            showEditMsg(editSecurityMsg, (res && (res.error || res.message)) || '设置失败', false)
          }
        } catch(e) { showEditMsg(editSecurityMsg, '网络错误: ' + e.message, false) }
        finally { editSecuritySaveBtn.disabled = false; editSecuritySaveBtn.textContent = '保存设置' }
      })
    }

    // ===== 全局密码眼睛按钮 =====
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.pwd-eye-btn')
      if (!btn) return
      const targetId = btn.dataset.target
      const input = document.getElementById(targetId)
      if (!input) return
      if (input.type === 'password') {
        input.type = 'text'
        btn.style.opacity = '1'
        btn.style.color = '#93c5fd'
      } else {
        input.type = 'password'
        btn.style.opacity = '0.6'
        btn.style.color = '#94a3b8'
      }
    })

    let heartbeatTimer = null
    let runtimeTimer = null
    let loginStartedAt = null
    let reportedSec = 0
    const fmtHHMMSS = (sec) => { const h = Math.floor(sec/3600); const m = Math.floor((sec%3600)/60); const s = Math.floor(sec%60); const pad = (n)=>String(n).padStart(2,'0'); return `${pad(h)}:${pad(m)}:${pad(s)}` }
    async function startSessionTimers(){
      try {
        loginStartedAt = Date.now()
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
        if (runtimeTimer) { clearInterval(runtimeTimer); runtimeTimer = null }
        try { await window.ee2x.userHeartbeat() } catch {}
        try { await window.ee2x.userRuntimeReport({ runtime_seconds: 1 }); reportedSec += 1 } catch {}
        heartbeatTimer = setInterval(async () => {
          try {
            const hbRes = await window.ee2x.userHeartbeat()
            if (hbRes && hbRes.kicked) {
              // 真正的被踢出（如token过期等），直接登出
              stopSessionTimers()
              try { await window.ee2x.authLogout() } catch {}
              loginBtn.style.display = ''
              userInfo.style.display = 'none'
              alert('⚠️ ' + (hbRes.message || '您的账号已在其他设备登录，当前设备已下线，请重新登录。'))
              try { profileModal.classList.add('hidden') } catch {}
            } else if (hbRes && hbRes.needConfirm) {
              // 需要确认登录，显示弹窗（运行中检测到异地登录）
              stopSessionTimers()
              try { await window.ee2x.networkStop(); isNetRunning = false; updateNetBtn() } catch {}
              showConfirmLoginModal('检测到账号在其他设备登录，请选择本设备的使用方式')
            }
          } catch {}
        }, 30000)
        runtimeTimer = setInterval(async () => { try { await window.ee2x.userRuntimeReport({ runtime_seconds: 30 }); reportedSec += 30 } catch {} }, 30000)
        window.addEventListener('beforeunload', async () => {
          try {
            if (loginStartedAt){ const sec = Math.max(0, Math.floor((Date.now() - loginStartedAt)/1000)); const rem = Math.max(0, sec - reportedSec); if (rem>0){ await window.ee2x.userRuntimeReport({ runtime_seconds: rem }) } }
          } catch {}
        }, { once:true })
      } catch {}
    }
    function stopSessionTimers(){ try { if (heartbeatTimer) clearInterval(heartbeatTimer); if (runtimeTimer) clearInterval(runtimeTimer); heartbeatTimer = null; runtimeTimer = null; loginStartedAt = null; reportedSec = 0 } catch {} }

    function toggleDropdown(){ try { userDropdown.classList.toggle('show') } catch {} }
    function hideDropdown(){ try { userDropdown.classList.remove('show') } catch {} }

    function setError(msg){ try { errEl.style.display = msg ? 'block' : 'none'; errEl.textContent = msg || '' } catch {} }
    function validate(){
      const nm = nicknameInput.value.trim()
      const pw = pwdInput.value.trim()
      if (!nm) return '请填写游戏昵称'
      if (!pw || pw.length < 4) return '密码长度至少4位'
      return ''
    }
    function fileToDataUrl(file){
      return new Promise((resolve) => {
        if (!file) return resolve('')
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => resolve('')
        reader.readAsDataURL(file)
      })
    }
    async function refreshUserUI(){
      try {
        const u = await window.ee2x.userGet()
        if (u && u.token) {
          loginBtn.style.display = 'none'
          userInfo.style.display = 'flex'
          userName.textContent = u.username || ''
          if (u.avatar) userAvatar.src = /^https?:/.test(u.avatar) ? u.avatar : (u.avatar.startsWith('data:') ? u.avatar : (cfg.userServerUrl ? (cfg.userServerUrl.replace(/\/$/, '') + u.avatar) : u.avatar))
          else userAvatar.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.username || 'player')
          profileName.textContent = u.username || ''
          if(profileSignature) profileSignature.textContent = u.signature || '这个人很懒，什么都没有留下'
          if(profileSignatureInput) profileSignatureInput.value = u.signature || ''
          profileAvatar.src = userAvatar.src
          try { await startSessionTimers() } catch {}
          try {
            const r = await window.ee2x.testUserServer(cfg.userServerUrl || '')
            if (!r || !r.ok) { const ad = await window.ee2x.cfgAutoDetectServers(); if (ad && ad.ok) { cfg = await window.ee2x.reloadConfig() } }
          } catch {}
          return true
        } else {
          userInfo.style.display = 'none'
          loginBtn.style.display = 'block'
          stopSessionTimers()
          return false
        }
      } catch { return false }
    }

    // 启动时检查登录状态：有token则先验证是否被异地登录
    async function checkLoginOnStart() {
      const u = await window.ee2x.userGet().catch(() => null)
      if (!u || !u.token) return false  // 未登录，需要弹登录窗

      // 直接发心跳验证token（不再先检测网络，避免checkOnline超时导致误判离线）
      try {
        const hb = await window.ee2x.userHeartbeat()
        if (hb && hb.renewed && hb.newToken) {
          // 同IP自动续期，更新本地token后正常登录
          const updatedUser = { ...u, token: hb.newToken }
          await window.ee2x.userSet(updatedUser).catch(() => {})
          return await refreshUserUI()
        }
        if (hb && hb.needConfirm) {
          // token已被顶替（不同IP），弹出选择弹窗
          loginBtn.style.display = 'none'
          userInfo.style.display = 'flex'
          userName.textContent = (u.username || '') + ' (待验证)'
          if (u.avatar) userAvatar.src = /^https?:/.test(u.avatar) ? u.avatar : (u.avatar.startsWith('data:') ? u.avatar : (cfg.userServerUrl ? (cfg.userServerUrl.replace(/\/$/, '') + u.avatar) : u.avatar))
          else userAvatar.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.username || 'player')
          profileName.textContent = u.username || ''
          if(profileSignature) profileSignature.textContent = u.signature || '这个人很懒，什么都没有留下'
          profileAvatar.src = userAvatar.src
          showConfirmLoginModal('您的账号已在其他设备登录，请选择本设备的使用方式')
          return 'needConfirm'
        }
        if (hb && hb.kicked) {
          await window.ee2x.userClear().catch(() => {})
          return false
        }
        if (hb && hb.ok) {
          // token正常
          return await refreshUserUI()
        }
      } catch {}

      // 心跳失败（网络不通等），但有token，保持登录状态并尝试自动连接
      const ok = await refreshUserUI()
      return ok ? true : 'offline'
    }
    loginBtn.addEventListener('click', () => { try { setError(''); authModal.classList.remove('hidden') } catch {} })
    closeAuth.addEventListener('click', () => { try { authModal.classList.add('hidden') } catch {} })
    avatarInput.addEventListener('change', () => { try { const f = avatarInput.files && avatarInput.files[0]; if (f) { const url = URL.createObjectURL(f); avatarPrev.src = url } } catch {} })
    userAvatar.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown() })
    document.addEventListener('click', hideDropdown)
    // Profile Tabs
    const tabBtnMatches = document.getElementById('tabBtnMatches')
    const tabBtnTiers = document.getElementById('tabBtnTiers')
    const profileTabMatches = document.getElementById('profileTabMatches')
    const profileTabTiers = document.getElementById('profileTabTiers')
    
    if(tabBtnMatches && tabBtnTiers){
        tabBtnMatches.addEventListener('click', ()=>{
            tabBtnMatches.classList.add('active'); tabBtnTiers.classList.remove('active');
            profileTabMatches.style.display='block'; profileTabTiers.style.display='none';
        })
        tabBtnTiers.addEventListener('click', ()=>{
            tabBtnTiers.classList.add('active'); tabBtnMatches.classList.remove('active');
            profileTabTiers.style.display='block'; profileTabMatches.style.display='none';
        })
    }

    openProfile.addEventListener('click', async () => {
      try {
        profileModal.classList.remove('hidden')
        hideDropdown()
        if (loginStartedAt){ const sec = Math.max(0, Math.floor((Date.now() - loginStartedAt)/1000)); const rem = Math.max(0, sec - reportedSec); if (rem>0){ try { await window.ee2x.userRuntimeReport({ runtime_seconds: rem }); reportedSec += rem } catch {} } }
        const sum = await window.ee2x.userRuntimeSummary()
        const serverSec = (sum && sum.ok) ? Number(sum.total_seconds||0) : null
        const displaySec = (serverSec!=null) ? serverSec : Math.max(0, reportedSec)
        if (profileTotalRuntime) profileTotalRuntime.textContent = fmtHHMMSS(displaySec)
        
        // Fetch Rank Stats
        const rankStatsEl = document.getElementById('profileRankStats')
        const extDataEl = document.getElementById('profileExtendedData')
        const matchListEl = document.getElementById('profileMatchList')
        const tierListEl = document.getElementById('profileTierList')
        
        if (rankStatsEl) rankStatsEl.style.display = 'none'
        if (extDataEl) extDataEl.style.display = 'none'
        
        try {
           // Use Ranking Server (Port 3001) - Optimized Endpoint
           const myName = document.getElementById('profileName').textContent
           const rankApiUrl = `http://115.231.35.105:3001/api/admin/player-rank-details/${encodeURIComponent(myName)}`
           
           const res = await fetch(rankApiUrl)
           if (res.ok) {
              const json = await res.json()
              if (json.success && json.data) {
                  const { player, matches } = json.data
                  
                  const tierEl = document.getElementById('profileTier')
                  if (tierEl) {
                      tierEl.textContent = player.rank_tier || '定级中'
                      tierEl.style.color = '#fbbf24'
                  }
                  
                  const rankEl = document.getElementById('profileRank')
                  if (rankEl) rankEl.textContent = `${player.rank_tier || '定级中'}${player.rankInTier ? player.rankInTier : ''}`
                  
                  const ptsEl = document.getElementById('profilePoints')
                  if (ptsEl) ptsEl.textContent = player.power || 0
                  
                  const wlEl = document.getElementById('profileWinLoss')
                  if (wlEl) wlEl.textContent = `${player.totalWins} / ${player.totalLosses}`
                  
                  if (rankStatsEl) rankStatsEl.style.display = 'block'
                  
                  const myMatches = matches.map(m => {
                      // Match structure from history: { teams: { team1:[], team2:[] }, winner: 'team1'/'team2' }
                      // Determine if win
                      let myTeam = 'team1'
                      if (m.teams && m.teams.team2) {
                          if (m.teams.team2.some(x => x.name === myName || String(x.id) === String(player.id))) {
                              myTeam = 'team2'
                          }
                      }
                      const isWin = (m.winner === myTeam)
                      return { ...m, isWin, myTeam, date: m.startedAt || m.date }
                  })
                 
                 // Render Match History
                  if (matchListEl) {
                      myMatches.sort((a,b) => new Date(b.date||0) - new Date(a.date||0))
                      if (myMatches.length === 0) {
                          matchListEl.innerHTML = '<div style="color:#94a3b8;font-size:12px;text-align:center">暂无对局记录</div>'
                      } else {
                          matchListEl.innerHTML = myMatches.slice(0, 20).map(m => {
                              const timeStr = m.date
                              const dateStr = timeStr ? new Date(timeStr).toLocaleString() : '未知时间'
                              
                              const isWin = m.isWin
                              const resultText = isWin ? '胜利' : '落败'
                              const resultColor = isWin ? '#4ade80' : '#f87171'
                              
                              const team1 = (m.teams && m.teams.team1) ? m.teams.team1 : []
                              const team2 = (m.teams && m.teams.team2) ? m.teams.team2 : []
                              
                              const team1Names = team1.map(x => x.name).join(' ')
                              const team2Names = team2.map(x => x.name).join(' ')
                              
                              // Check if Solo (1v1)
                              const isSolo = (team1.length <= 1 && team2.length <= 1)
                              
                              let html = ''
                              if (isSolo) {
                                  // I am in myTeam. Opponent is the other team.
                                  const oppNames = (m.myTeam === 'team1') ? team2Names : team1Names
                                  html = `
                                    <span style="color:#e2e8f0;font-weight:bold">单挑</span> 
                                    <span style="color:#4ade80">我</span> 
                                    <span style="color:#94a3b8">--VS--</span> 
                                    <span style="color:#f87171">${oppNames || '无'}</span> 
                                    <span style="color:${resultColor};font-weight:bold">${resultText}</span>
                                  `
                              } else {
                                  // Match
                                  const myNames = (m.myTeam === 'team1') ? team1Names : team2Names
                                  const oppNames = (m.myTeam === 'team1') ? team2Names : team1Names
                                  
                                  html = `
                                    <span style="color:#e2e8f0;font-weight:bold">匹配赛</span> 
                                    <span style="color:#4ade80">己方| ${myNames}</span> 
                                    <span style="color:#94a3b8">--VS--</span> 
                                    <span style="color:#f87171">${oppNames} |敌方</span> 
                                    <span style="color:${resultColor};font-weight:bold">${resultText}</span>
                                  `
                              }
                              
                              return `
                                 <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; font-size:12px; margin-bottom:4px">
                                     <div style="margin-bottom:4px">${html}</div>
                                     <div style="text-align:right; color:#64748b; font-size:10px">${dateStr}</div>
                                 </div>
                              `
                          }).join('')
                      }
                  }
                 
                 // Render Tier History (from history.tierChanges)
                  if (tierListEl) {
                      // Note: 3001 tierChanges format might be different or empty if not implemented fully.
                      // historyData.tierChanges exists in server.js 3001
                      
                      // Filter by username or ID? 3001 tierChanges usually stores what?
                      // server.js 3001 doesn't seem to populate tierChanges automatically on rank update?
                      // Let's assume it does or check logic. 
                      // Actually 3001 server.js had /api/admin/history/rank-change endpoint.
                      
                      // We need to match by ID or Name. 3001 usually uses ID.
                      const myTiers = (tierChanges||[]).filter(tc => String(tc.playerId) === String(pid) || tc.playerName === myName)
                      myTiers.sort((a,b) => new Date(b.changeDate||0) - new Date(a.changeDate||0))
                      
                      if (myTiers.length === 0) {
                          tierListEl.innerHTML = '<div style="color:#94a3b8;font-size:12px;text-align:center">暂无段位变动</div>'
                      } else {
                          tierListEl.innerHTML = myTiers.slice(0, 20).map(tc => {
                              const dateStr = tc.changeDate ? new Date(tc.changeDate).toLocaleString() : '未知时间'
                              
                              // Determine promotion/demotion
                              // tc might have oldTier, newTier (IDs or Names?)
                              // In 3001, let's assume it stores Names or IDs.
                              
                              const oldTierName = tc.oldTierName || tc.oldTier
                              const newTierName = tc.newTierName || tc.newTier
                              
                              const oldTierObj = tiers.find(t => t.name === oldTierName || t.id === tc.oldTier)
                              const newTierObj = tiers.find(t => t.name === newTierName || t.id === tc.newTier)
                              
                              const oldOrder = oldTierObj ? (oldTierObj.sortOrder||0) : 99999
                              const newOrder = newTierObj ? (newTierObj.sortOrder||0) : 99999
                              
                              let actionText = '变更为'
                              let arrowHtml = ''
                              let actionColor = '#94a3b8'
                              
                              if (newOrder < oldOrder) {
                                  actionText = '晋级为'
                                  arrowHtml = '<span style="color:#fbbf24;font-weight:bold;margin-left:4px">↑</span>'
                                  actionColor = '#fbbf24'
                              } else if (newOrder > oldOrder) {
                                  actionText = '降级为'
                                  arrowHtml = '<span style="color:#ef4444;font-weight:bold;margin-left:4px">↓</span>'
                                  actionColor = '#ef4444' // Red for demotion
                              }
                              
                              // Filter out '拖拽调整' from reason
                              let reasonHtml = ''
                              if (tc.reason && !tc.reason.includes('拖拽调整')) {
                                  reasonHtml = `<div style="color:#94a3b8; font-style:italic; margin-top:2px">${tc.reason}</div>`
                              }
                              
                              return `
                                 <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:4px; font-size:12px">
                                     <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
                                         <span style="color:#e2e8f0">
                                            ${tc.oldTierName || tc.oldTier} 
                                            <span style="color:${actionColor};margin:0 4px">${actionText}</span>
                                            ${tc.newTierName || tc.newTier}
                                            ${arrowHtml}
                                         </span>
                                         <span style="color:#64748b; font-size:10px">${dateStr}</span>
                                     </div>
                                     ${reasonHtml}
                                 </div>
                              `
                          }).join('')
                      }
                  }
                 
                 if (extDataEl) extDataEl.style.display = 'block'
              }
           }
        } catch (e) {
           console.error('Fetch rank error', e)
        }

      } catch {}
    })
    closeProfile.addEventListener('click', () => { try { profileModal.classList.add('hidden') } catch {} })

    profileLogout.addEventListener('click', async () => {
      try {
        await window.ee2x.networkStop()
        isNetRunning = false
        updateNetBtn()
        await window.ee2x.authLogout()
        profileModal.classList.add('hidden')
        stopSessionTimers()
        await refreshUserUI()
        authModal.classList.remove('hidden')
        if (closeAuth) closeAuth.style.display = 'none'
        setError('请登录后再使用')
      } catch {}
    })
    logoutBtn.addEventListener('click', async () => {
      try {
        await window.ee2x.networkStop()
        isNetRunning = false
        updateNetBtn()
        await window.ee2x.authLogout()
        stopSessionTimers()
        await refreshUserUI()
        hideDropdown()
        authModal.classList.remove('hidden')
        if (closeAuth) closeAuth.style.display = 'none'
        setError('请登录后再使用')
      } catch {}
    })

    doRegister.addEventListener('click', async () => {
      try {
        const msg = validate(); if (msg) { setError(msg); return }
        setError('')
        const avatarFile = avatarInput.files && avatarInput.files[0]
        const avatar = await fileToDataUrl(avatarFile)
        const payload = { username: nicknameInput.value.trim(), password: pwdInput.value.trim(), avatar }
        const r = await window.ee2x.authRegister(payload)
        if (!r || !r.ok) { setError(r && r.error ? r.error : '注册失败'); return }
        authModal.classList.add('hidden')
        if (closeAuth) closeAuth.style.display = ''
        await refreshUserUI()
        // 自动连接虚拟组网
        performNetworkStart(true)
      } catch (e) { setError(String(e && e.message || e || '注册失败')) }
    })
    doLogin.addEventListener('click', async () => {
      try {
        const msg = validate(); if (msg) { setError(msg); return }
        setError('')
        const payload = { username: nicknameInput.value.trim(), password: pwdInput.value.trim() }
        const r = await window.ee2x.authLogin(payload)
        if (!r || !r.ok) { setError(r && r.error ? r.error : '登录失败'); return }
        authModal.classList.add('hidden')
        if (closeAuth) closeAuth.style.display = ''
        await refreshUserUI()
        // 自动连接虚拟组网
        performNetworkStart(true)
        try { await window.ee2x.userHeartbeat() } catch {}
    } catch (e) { setError(String(e && e.message || e || '登录失败')) }
    })

    // 忘记密码功能
    const forgotPasswordLink = document.getElementById('forgotPasswordLink')
    const forgotPwdModal = document.getElementById('forgotPwdModal')
    const closeForgotPwd = document.getElementById('closeForgotPwd')
    const forgotPwdBack = document.getElementById('forgotPwdBack')
    const forgotPwdNext = document.getElementById('forgotPwdNext')
    const forgotPwdBack2 = document.getElementById('forgotPwdBack2')
    const forgotPwdSubmit = document.getElementById('forgotPwdSubmit')
    const forgotPwdStep1 = document.getElementById('forgotPwdStep1')
    const forgotPwdStep2 = document.getElementById('forgotPwdStep2')
    const forgotPwdUsername = document.getElementById('forgotPwdUsername')
    const forgotPwdAnswer = document.getElementById('forgotPwdAnswer')
    const forgotPwdNew = document.getElementById('forgotPwdNew')
    const forgotPwdConfirm = document.getElementById('forgotPwdConfirm')
    const forgotPwdQuestionLabel = document.getElementById('forgotPwdQuestionLabel')
    const forgotPwdError = document.getElementById('forgotPwdError')
    const forgotPwdStep2Error = document.getElementById('forgotPwdStep2Error')

    let forgotPwdCurrentQuestion = ''
    let forgotPwdCurrentUsername = ''
    let isFirstTimeReset = false

    function showForgotPwdError(el, msg) {
      if (!el) return
      el.textContent = msg
      el.style.display = msg ? 'block' : 'none'
    }

    function resetForgotPwd() {
      if (forgotPwdUsername) forgotPwdUsername.value = ''
      if (forgotPwdAnswer) forgotPwdAnswer.value = ''
      if (forgotPwdNew) forgotPwdNew.value = ''
      if (forgotPwdConfirm) forgotPwdConfirm.value = ''
      showForgotPwdError(forgotPwdError, '')
      showForgotPwdError(forgotPwdStep2Error, '')
      if (forgotPwdStep1) forgotPwdStep1.style.display = 'block'
      if (forgotPwdStep2) forgotPwdStep2.style.display = 'none'
      // 恢复UI元素默认显示状态
      const firstResetTip = document.getElementById('firstResetTip')
      if (firstResetTip) firstResetTip.style.display = 'none'
      if (forgotPwdQuestionLabel) forgotPwdQuestionLabel.style.display = 'block'
      if (forgotPwdAnswer) forgotPwdAnswer.style.display = 'block'
      forgotPwdCurrentQuestion = ''
      forgotPwdCurrentUsername = ''
      isFirstTimeReset = false
    }

    if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault()
        if (forgotPwdModal) {
          resetForgotPwd()
          forgotPwdModal.classList.remove('hidden')
        }
      })
    }

    if (closeForgotPwd) {
      closeForgotPwd.addEventListener('click', () => {
        if (forgotPwdModal) forgotPwdModal.classList.add('hidden')
      })
    }

    if (forgotPwdBack) {
      forgotPwdBack.addEventListener('click', () => {
        if (forgotPwdModal) forgotPwdModal.classList.add('hidden')
        if (authModal) authModal.classList.remove('hidden')
      })
    }

    if (forgotPwdBack2) {
      forgotPwdBack2.addEventListener('click', () => {
        if (forgotPwdStep1) forgotPwdStep1.style.display = 'block'
        if (forgotPwdStep2) forgotPwdStep2.style.display = 'none'
        showForgotPwdError(forgotPwdStep2Error, '')
      })
    }

    if (forgotPwdNext) {
      forgotPwdNext.addEventListener('click', async () => {
        const username = forgotPwdUsername ? forgotPwdUsername.value.trim() : ''
        if (!username) { showForgotPwdError(forgotPwdError, '请输入昵称'); return }

        forgotPwdNext.disabled = true
        forgotPwdNext.textContent = '查询中...'
        try {
          const res = await window.ee2x.getSecurityQuestion(username)
          if (res && res.ok) {
            // 保存用户名供后续使用
            forgotPwdCurrentUsername = username

            // 如果是首次重置，直接显示设置新密码面板（跳过安全问题）
            if (res.isFirstReset) {
              isFirstTimeReset = true
              // 隐藏安全问题输入框
              if (forgotPwdQuestionLabel) forgotPwdQuestionLabel.style.display = 'none'
              if (forgotPwdAnswer) forgotPwdAnswer.style.display = 'none'
              // 显示首次重置提示
              const firstResetTip = document.getElementById('firstResetTip')
              if (firstResetTip) firstResetTip.style.display = 'block'
            } else {
              isFirstTimeReset = false
              // 显示安全问题
              if (forgotPwdQuestionLabel) {
                forgotPwdQuestionLabel.style.display = 'block'
                forgotPwdQuestionLabel.textContent = res.question
              }
              if (forgotPwdAnswer) forgotPwdAnswer.style.display = 'block'
              // 隐藏首次重置提示
              const firstResetTip = document.getElementById('firstResetTip')
              if (firstResetTip) firstResetTip.style.display = 'none'
            }

            if (forgotPwdStep1) forgotPwdStep1.style.display = 'none'
            if (forgotPwdStep2) forgotPwdStep2.style.display = 'block'
            showForgotPwdError(forgotPwdError, '')
          } else {
            showForgotPwdError(forgotPwdError, res && res.error ? res.error : '未找到该用户')
          }
        } catch (e) {
          showForgotPwdError(forgotPwdError, '网络错误，请重试')
        } finally {
          forgotPwdNext.disabled = false
          forgotPwdNext.textContent = '下一步'
        }
      })
    }

    if (forgotPwdSubmit) {
      forgotPwdSubmit.addEventListener('click', async () => {
        const username = forgotPwdUsername ? forgotPwdUsername.value.trim() : ''
        const answer = forgotPwdAnswer ? forgotPwdAnswer.value.trim() : ''
        const newPwd = forgotPwdNew ? forgotPwdNew.value : ''
        const confirmPwd = forgotPwdConfirm ? forgotPwdConfirm.value : ''

        // 非首次重置才需要验证安全问题答案
        if (!isFirstTimeReset && !answer) { showForgotPwdError(forgotPwdStep2Error, '请输入答案'); return }
        if (!newPwd || newPwd.length < 4) { showForgotPwdError(forgotPwdStep2Error, '新密码长度至少4位'); return }
        if (newPwd !== confirmPwd) { showForgotPwdError(forgotPwdStep2Error, '两次输入的密码不一致'); return }

        forgotPwdSubmit.disabled = true
        forgotPwdSubmit.textContent = '重置中...'
        try {
          // 首次重置不需要securityAnswer
          const payload = isFirstTimeReset
            ? { username, newPassword: newPwd }
            : { username, securityAnswer: answer, newPassword: newPwd }
          const res = await window.ee2x.resetPassword(payload)
          if (res && res.ok) {
            // 首次重置成功后提示设置安全问题
            if (res.isFirstReset) {
              alert('密码重置成功！请使用新密码登录。\\n\\n提示：首次重置密码后，建议您登录后在"个人信息"中设置安全问题，以便下次忘记密码时可以自助找回。')
            } else {
              alert('密码重置成功！请使用新密码登录')
            }
            if (forgotPwdModal) forgotPwdModal.classList.add('hidden')
            if (authModal) authModal.classList.remove('hidden')
            // 自动填充用户名和新密码
            const nicknameInput = document.getElementById('auth_nickname')
            const pwdInput = document.getElementById('auth_password')
            if (nicknameInput) nicknameInput.value = username
            if (pwdInput) pwdInput.value = newPwd
          } else {
            showForgotPwdError(forgotPwdStep2Error, res && res.error ? res.error : '重置失败')
          }
        } catch (e) {
          showForgotPwdError(forgotPwdStep2Error, '网络错误，请重试')
        } finally {
          forgotPwdSubmit.disabled = false
          forgotPwdSubmit.textContent = '重置密码'
        }
      })
    }

    // ========== 异地登录确认弹窗 ==========
    const confirmLoginModal = document.getElementById('confirmLoginModal')
    const confirmLoginBtn = document.getElementById('confirmLoginBtn')
    const offlineModeBtn = document.getElementById('offlineModeBtn')
    const confirmLoginError = document.getElementById('confirmLoginError')

    function showConfirmLoginModal(subMsg) {
      if (confirmLoginModal) {
        confirmLoginModal.classList.remove('hidden')
        const sub = document.getElementById('confirmLoginSubMsg')
        if (sub) sub.textContent = subMsg || '请选择本设备的使用方式'
        if (confirmLoginError) { confirmLoginError.style.display = 'none'; confirmLoginError.textContent = '' }
      }
    }

    function hideConfirmLoginModal() {
      if (confirmLoginModal) confirmLoginModal.classList.add('hidden')
      if (confirmLoginError) { confirmLoginError.style.display = 'none'; confirmLoginError.textContent = '' }
    }

    // 进入离线模式
    async function enterOfflineMode() {
      isOfflineMode = true
      hideConfirmLoginModal()
      // 停止心跳，断开VNT
      stopSessionTimers()
      try { await window.ee2x.networkStop(); isNetRunning = false; updateNetBtn() } catch {}
      // 保留用户信息显示，但标记为离线
      const u = await window.ee2x.userGet().catch(() => null)
      if (u && u.username) {
        loginBtn.style.display = 'none'
        userInfo.style.display = 'flex'
        userName.textContent = u.username + ' (离线)'
      }
      // 对战平台按钮改为离线提示
      if (netBtn) {
        netBtn.textContent = '离线模式'
        netBtn.style.background = 'rgba(100,100,100,0.2)'
        netBtn.style.borderColor = 'rgba(100,100,100,0.3)'
        netBtn.style.color = '#94a3b8'
      }
      // 底部离线提示条
      let bar = document.getElementById('offlineTipBar')
      if (!bar) {
        bar = document.createElement('div')
        bar.id = 'offlineTipBar'
        bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:rgba(30,30,30,0.9);color:#94a3b8;text-align:center;font-size:12px;padding:6px;z-index:999;border-top:1px solid rgba(255,255,255,0.1)'
        document.body.appendChild(bar)
      }
      bar.textContent = '当前处于离线模式 — 游戏可正常启动，点击"对战平台"按钮可重新验证身份以恢复联机'
    }

    if (confirmLoginBtn) {
      confirmLoginBtn.addEventListener('click', async () => {
        confirmLoginBtn.disabled = true
        confirmLoginBtn.textContent = '确认中...'
        try {
          const res = await window.ee2x.confirmLogin()
          if (res && res.ok) {
            isOfflineMode = false
            hideConfirmLoginModal()
            // 清除离线提示条
            const bar = document.getElementById('offlineTipBar')
            if (bar) bar.remove()
            // 恢复用户名显示
            const u = await window.ee2x.userGet().catch(() => null)
            if (u && u.username) userName.textContent = u.username
            // 重启心跳并连接VNT
            await startSessionTimers()
            await performNetworkStart(true)
            if (netBtn) { netBtn.textContent = '对战平台离线'; updateNetBtn() }
          } else {
            if (confirmLoginError) {
              confirmLoginError.textContent = (res && res.error) || '确认失败，请重试'
              confirmLoginError.style.display = 'block'
            }
          }
        } catch (e) {
          if (confirmLoginError) {
            confirmLoginError.textContent = '网络错误，请重试'
            confirmLoginError.style.display = 'block'
          }
        } finally {
          confirmLoginBtn.disabled = false
          confirmLoginBtn.textContent = '✅ 确认是本人'
        }
      })
    }

    if (offlineModeBtn) {
      offlineModeBtn.addEventListener('click', async () => {
        await enterOfflineMode()
      })
    }

    const loggedIn = await checkLoginOnStart()
    if (loggedIn === true) {
      // token正常，自动连接虚拟组网
      performNetworkStart(true)
    } else if (loggedIn === 'needConfirm') {
      // 已弹出选择弹窗，等待用户操作，不自动连VNT
    } else if (loggedIn === 'offline') {
      // 已登录但网络不通，保持用户信息显示，不弹登录窗
      // 显示离线提示，定时检测网络恢复后自动连接
      if (netBtn) {
        netBtn.textContent = '离线模式'
        netBtn.style.background = 'rgba(100,100,100,0.2)'
        netBtn.style.borderColor = 'rgba(100,100,100,0.3)'
        netBtn.style.color = '#94a3b8'
      }
      const offlineTip = document.createElement('div')
      offlineTip.id = 'offlineTipBar'
      offlineTip.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:rgba(30,30,30,0.85);color:#94a3b8;text-align:center;font-size:12px;padding:6px;z-index:999;border-top:1px solid rgba(255,255,255,0.1)'
      offlineTip.textContent = '当前网络不可用，游戏可正常启动，联机功能将在网络恢复后自动连接'
      document.body.appendChild(offlineTip)
      const onlineChecker = setInterval(async () => {
        try {
          const r2 = await window.ee2x.checkOnline()
          if (r2 && r2.online) {
            clearInterval(onlineChecker)
            const bar = document.getElementById('offlineTipBar')
            if (bar) bar.remove()
            if (netBtn) { netBtn.disabled = false; netBtn.title = ''; updateNetBtn() }
            // 网络恢复，自动连接虚拟组网
            performNetworkStart(true)
            startSessionTimers()
          }
        } catch {}
      }, 10000)
    } else {
      // 未登录（无token），强制弹出登录弹窗
      authModal.classList.remove('hidden')
      if (closeAuth) closeAuth.style.display = 'none'
      setError('请登录后再使用')
    }
  } catch {}
  document.getElementById('officialSiteBtn').addEventListener('click', async () => {
    const u = 'https://ee2x.xyz/'
    try { await window.ee2x.openPageWindow(u, '官网入口') }
    catch { try { await window.ee2x.openExternal(u) } catch { try { window.open(u, '_blank') } catch {} } }
  })
  document.getElementById('rankBtn').addEventListener('click', async () => {
    try { await window.ee2x.openPageWindow('http://115.231.35.105:4002', '战力排行榜') }
    catch { try { await window.ee2x.openExternal('http://115.231.35.105:4002') } catch { try { window.open('http://115.231.35.105:4002', '_blank') } catch {} } }
  })
  document.getElementById('matchBtn').addEventListener('click', async () => {
    try { await window.ee2x.openPageWindow('http://115.231.35.105:4002/matchmaking', '组队匹配') }
    catch { try { await window.ee2x.openExternal('http://115.231.35.105:4002/matchmaking') } catch { try { window.open('http://115.231.35.105:4002/matchmaking', '_blank') } catch {} } }
  })
  

  let updatePendingVersion = null
  let releaseFlowStarted = false
  let releaseStatusCache = null
  let releaseWaitTimer = null
  let releaseUpdateInProgress = false
  let releaseManualForcePending = false
  let releaseAutoStartVersion = ''
  let releaseUpdateCountdownTimer = null
  let releaseUpdateModalState = {
    kind: 'idle',
    latestVersion: '',
    localGameVersion: '',
    stageTitle: '',
    stageDetail: '',
    progressPercent: 0,
    strategyText: '',
    speedText: '',
    volumeText: '',
    currentFileText: '',
    releaseNotes: '',
    errorText: '',
    canClose: false,
    canRetry: false,
    primaryActionLabel: '立即更新',
    countdownSeconds: 0,
    countdownDeadlineMs: 0,
    countdownActive: false,
    lockClose: true,
    forceSync: false,
  }
  const GAME_UPDATE_PENDING_MESSAGE = '检测到服务器新版本，退出当前游戏后将自动完成同步。'

  // 初始化新的更新管理器
  async function initUpdateManager() {
    return
  }

  function removeReleaseModal(id) {
    try {
      const modal = document.getElementById(id)
      if (modal) modal.remove()
    } catch {}
  }

  function stopReleaseUpdateCountdown() {
    if (releaseUpdateCountdownTimer) {
      clearInterval(releaseUpdateCountdownTimer)
      releaseUpdateCountdownTimer = null
    }
  }

  function enterLauncherFromUpdateModal() {
    stopReleaseUpdateCountdown()
    resetReleaseUpdateModalState(releaseStatusCache)
    renderReleaseUpdateModal()
    if (releaseStatusCache) {
      updatePrimaryUpdateButton(releaseStatusCache)
    }
    setStartButtonBlocked(false, '启动游戏')
  }

  function startReleaseUpdateCountdown(seconds = 10) {
    stopReleaseUpdateCountdown()
    const totalSeconds = Math.max(0, Math.floor(seconds || 0))
    const deadline = Date.now() + totalSeconds * 1000
    updateReleaseModalState({
      countdownSeconds: totalSeconds,
      countdownDeadlineMs: deadline,
      countdownActive: true,
    })
    releaseUpdateCountdownTimer = setInterval(() => {
      const remainingMs = Math.max(0, deadline - Date.now())
      const remainingSeconds = Math.ceil(remainingMs / 1000)
      if (remainingSeconds <= 0) {
        stopReleaseUpdateCountdown()
        enterLauncherFromUpdateModal()
        return
      }
      updateReleaseModalState({
        countdownSeconds: remainingSeconds,
        countdownDeadlineMs: deadline,
        countdownActive: true,
      })
    }, 250)
  }

  function ensureReleaseUpdateModalStyle() {
    if (document.getElementById('releaseUpdateModalStyle')) return
    const style = document.createElement('style')
    style.id = 'releaseUpdateModalStyle'
    style.textContent = `
      .release-update-modal .modal-content {
        max-width: 760px;
        border: 1px solid rgba(255,255,255,0.1);
        background: linear-gradient(180deg, rgba(18,24,38,0.98), rgba(11,16,28,0.98));
        box-shadow: 0 28px 80px rgba(0,0,0,0.45);
      }
      .release-update-body {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .release-update-card {
        padding: 14px 16px;
        border-radius: 14px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .release-update-head-tools {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .release-update-countdown-ring {
        width: 40px;
        height: 40px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background: rgba(15,23,42,0.86);
        border: 1px solid rgba(255,255,255,0.08);
        color: #f8fafc;
        font-size: 12px;
        font-weight: 700;
        overflow: hidden;
      }
      .release-update-countdown-ring::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: conic-gradient(#22c55e var(--progress, 0deg), rgba(255,255,255,0.08) var(--progress, 0deg));
      }
      .release-update-countdown-ring::after {
        content: '';
        position: absolute;
        inset: 4px;
        border-radius: inherit;
        background: rgba(11,16,28,0.96);
      }
      .release-update-countdown-ring > span {
        position: relative;
        z-index: 1;
      }
      .release-update-hero {
        display: flex;
        gap: 14px;
        align-items: center;
      }
      .release-update-spinner {
        width: 42px;
        height: 42px;
        border-radius: 999px;
        border: 3px solid rgba(255,255,255,0.14);
        border-top-color: #60a5fa;
        animation: releaseSpin 0.9s linear infinite;
        flex: 0 0 auto;
      }
      .release-update-spinner.is-complete {
        animation: none;
        border-color: rgba(34,197,94,0.32);
        border-top-color: rgba(34,197,94,0.92);
      }
      .release-update-spinner.is-failed {
        animation: none;
        border-color: rgba(248,113,113,0.24);
        border-top-color: rgba(248,113,113,0.92);
      }
      .release-update-title {
        font-size: 18px;
        font-weight: 700;
        color: #f8fafc;
      }
      .release-update-subtitle {
        margin-top: 4px;
        color: #cbd5e1;
        line-height: 1.55;
        font-size: 13px;
      }
      .release-update-metrics {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .release-update-metric {
        padding: 12px;
        border-radius: 12px;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
      }
      .release-update-metric-label {
        color: #94a3b8;
        font-size: 12px;
        margin-bottom: 6px;
      }
      .release-update-metric-value {
        color: #f8fafc;
        font-size: 14px;
        font-weight: 600;
      }
      .release-update-progress {
        position: relative;
        height: 16px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(15,23,42,0.86);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .release-update-progress-bar {
        height: 100%;
        width: 0%;
        min-width: 0;
        background: linear-gradient(90deg, #2563eb 0%, #3b82f6 40%, #93c5fd 100%);
        position: relative;
        transition: width 160ms linear;
      }
      .release-update-progress-bar::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          90deg,
          rgba(255,255,255,0) 0%,
          rgba(255,255,255,0.25) 35%,
          rgba(255,255,255,0) 70%
        );
        transform: translateX(-100%);
        animation: releaseProgressSweep 1.2s linear infinite;
      }
      .release-update-progress-bar.is-complete {
        background: linear-gradient(90deg, #16a34a 0%, #22c55e 100%);
      }
      .release-update-progress-bar.is-failed {
        background: linear-gradient(90deg, #dc2626 0%, #f87171 100%);
      }
      .release-update-progress-bar.is-paused::after,
      .release-update-progress-bar.is-complete::after,
      .release-update-progress-bar.is-failed::after {
        animation: none;
      }
      .release-update-progress-meta {
        margin-top: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        color: #cbd5e1;
        font-size: 13px;
      }
      .release-update-notes {
        white-space: pre-wrap;
        color: #cbd5e1;
        line-height: 1.6;
        font-size: 13px;
        max-height: 180px;
        overflow: auto;
      }
      .release-update-error {
        color: #fecaca;
        white-space: pre-wrap;
        line-height: 1.6;
        font-size: 13px;
      }
      @keyframes releaseSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes releaseProgressSweep {
        from { transform: translateX(-100%); }
        to { transform: translateX(180%); }
      }
    `
    document.head.appendChild(style)
  }

  function updateReleaseModalState(patch = {}) {
    releaseUpdateModalState = {
      ...releaseUpdateModalState,
      ...patch,
    }
    renderReleaseUpdateModal()
  }

  function resetReleaseUpdateModalState(status = null) {
    releaseUpdateModalState = {
      kind: 'idle',
      latestVersion: status && status.latestVersion ? String(status.latestVersion) : '',
      localGameVersion: status && status.localGameVersion ? String(status.localGameVersion) : '',
      stageTitle: '',
      stageDetail: '',
      progressPercent: 0,
      strategyText: '',
      speedText: '',
      volumeText: '',
      currentFileText: '',
      releaseNotes: status && status.releaseNotes ? String(status.releaseNotes) : '',
      errorText: '',
      canClose: false,
      canRetry: false,
      primaryActionLabel: '立即更新',
      countdownSeconds: 0,
      countdownDeadlineMs: 0,
      countdownActive: false,
      lockClose: true,
      forceSync: false,
    }
  }

  function renderReleaseUpdateModal() {
    if (releaseUpdateModalState.kind === 'idle') {
      removeReleaseModal('releaseUpdateModal')
      return
    }
    ensureReleaseUpdateModalStyle()
    let modal = document.getElementById('releaseUpdateModal')
    if (!modal) {
      modal = document.createElement('div')
      modal.id = 'releaseUpdateModal'
      modal.className = 'modal release-update-modal'
      document.body.appendChild(modal)
    }
    modal.dataset.lockClose = releaseUpdateModalState.lockClose ? 'true' : 'false'
    const completed = releaseUpdateModalState.kind === 'completed'
    const failed = releaseUpdateModalState.kind === 'failed'
    const waiting = releaseUpdateModalState.kind === 'waiting_game_exit'
    const countdownActive = completed && releaseUpdateModalState.countdownActive
    const countdownTotal = 10
    const countdownSeconds = Math.max(0, Math.floor(releaseUpdateModalState.countdownSeconds || 0))
    const countdownProgress = countdownActive
      ? Math.max(0, Math.min(360, Math.round((countdownSeconds / countdownTotal) * 360)))
      : 0
    const progressBarClass = completed
      ? 'release-update-progress-bar is-complete'
      : failed
        ? 'release-update-progress-bar is-failed is-paused'
        : waiting
          ? 'release-update-progress-bar is-paused'
          : 'release-update-progress-bar'
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-head">
          <h3>强制同步服务器版本</h3>
          <div class="release-update-head-tools">
            ${countdownActive ? `<div class="release-update-countdown-ring" style="--progress:${countdownProgress}deg"><span>${countdownSeconds}</span></div>` : ''}
            ${completed ? '' : `<button id="releaseUpdateModalClose" ${releaseUpdateModalState.canClose ? '' : 'style="display:none"'}>关闭</button>`}
          </div>
        </div>
        <div class="item release-update-body">
          <div class="release-update-card release-update-hero">
            <div class="release-update-spinner ${completed ? 'is-complete' : failed ? 'is-failed' : ''}"></div>
            <div style="min-width:0">
              <div class="release-update-title">${releaseUpdateModalState.stageTitle || '准备更新'}</div>
              <div class="release-update-subtitle">${releaseUpdateModalState.stageDetail || '启动器正在准备同步服务器版本。'}</div>
            </div>
          </div>
          <div class="release-update-metrics">
            <div class="release-update-metric">
              <div class="release-update-metric-label">当前版本</div>
              <div class="release-update-metric-value">V${releaseUpdateModalState.localGameVersion || '--'}</div>
            </div>
            <div class="release-update-metric">
              <div class="release-update-metric-label">目标版本</div>
              <div class="release-update-metric-value">V${releaseUpdateModalState.latestVersion || '--'}</div>
            </div>
          </div>
          <div class="release-update-card">
            <div class="release-update-progress">
              <div id="releaseUpdateModalBar" class="${progressBarClass}" style="width:${Math.max(0, Math.min(100, releaseUpdateModalState.progressPercent || 0))}%"></div>
            </div>
            <div class="release-update-progress-meta">
              <span>${Math.max(0, Math.min(100, Math.floor(releaseUpdateModalState.progressPercent || 0)))}%</span>
              <span>${releaseUpdateModalState.strategyText || '等待启动'}</span>
              <span>${releaseUpdateModalState.speedText || ''}</span>
            </div>
            <div class="release-update-progress-meta" style="margin-top:8px">
              <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${releaseUpdateModalState.currentFileText || '等待任务开始...'}</span>
              <span>${releaseUpdateModalState.volumeText || ''}</span>
            </div>
          </div>
          <div class="release-update-card">
            <div class="release-update-metric-label">更新内容</div>
            <div class="release-update-notes">${releaseUpdateModalState.releaseNotes || '本次发布未填写说明。'}</div>
          </div>
          ${releaseUpdateModalState.errorText ? `
          <div class="release-update-card">
            <div class="release-update-metric-label">错误信息</div>
            <div class="release-update-error">${releaseUpdateModalState.errorText}</div>
          </div>
          ` : ''}
          <div class="row" style="justify-content:flex-end;margin-top:4px">
            <button id="releaseUpdateQuitBtn" ${completed ? 'style="display:none"' : 'style="background:rgba(239,68,68,0.18);border-color:rgba(239,68,68,0.45)"'}>退出启动器</button>
            <button id="releaseUpdateRetryBtn" ${releaseUpdateModalState.canRetry ? '' : 'style="display:none"'}>${releaseUpdateModalState.primaryActionLabel || '立即更新'}</button>
            <button id="releaseUpdateDoneBtn" ${releaseUpdateModalState.canClose ? '' : 'style="display:none"'}>${completed ? '进入启动器' : '关闭'}</button>
          </div>
        </div>
      </div>
    `
    const closeBtn = document.getElementById('releaseUpdateModalClose')
    if (closeBtn) closeBtn.onclick = () => {
      if (!releaseUpdateModalState.canClose) return
      enterLauncherFromUpdateModal()
    }
    const doneBtn = document.getElementById('releaseUpdateDoneBtn')
    if (doneBtn) doneBtn.onclick = () => {
      if (!releaseUpdateModalState.canClose) return
      enterLauncherFromUpdateModal()
    }
    const quitBtn = document.getElementById('releaseUpdateQuitBtn')
    if (quitBtn) quitBtn.onclick = async () => {
      try { await window.ee2x.quitApp() } catch { try { window.close() } catch {} }
    }
    const retryBtn = document.getElementById('releaseUpdateRetryBtn')
    if (retryBtn) retryBtn.onclick = async () => {
      if (!releaseUpdateModalState.canRetry) return
      await runReleaseUpdater('game', { force: !!releaseUpdateModalState.forceSync })
    }
  }

  function setStartButtonBlocked(blocked, text = '启动游戏') {
    if (!startBtn) return
    startBtn.disabled = !!blocked
    startBtn.textContent = text
  }

  function stopReleaseWaitLoop() {
    if (releaseWaitTimer) {
      clearInterval(releaseWaitTimer)
      releaseWaitTimer = null
    }
  }

  function startReleaseWaitLoop() {
    if (releaseWaitTimer) return
    releaseWaitTimer = setInterval(async () => {
      if (releaseUpdateInProgress) return
      try {
        const status = await checkUpdateAndRender(true, 'wait')
        if (releaseManualForcePending && status && !status.gameRunning) {
          releaseManualForcePending = false
          void runReleaseUpdater('game', { force: true }).catch(() => {})
          return
        }
        if (!status || (!status.gameNeedsUpdate && !releaseManualForcePending) || !status.gameRunning) {
          stopReleaseWaitLoop()
        }
      } catch {}
    }, 3000)
  }

  function updatePrimaryUpdateButton(status) {
    if (!updateBtn) return
    const currentVersion = String((status && status.localGameVersion) || '--').trim() || '--'
    updateBtn.textContent = releaseUpdateInProgress ? `正在同步 V${currentVersion}` : `强制同步 V${currentVersion}`
    updateBtn.classList.toggle('blink', !!(status && status.gameNeedsUpdate && !releaseUpdateInProgress))
    updateBtn.disabled = !!releaseUpdateInProgress
    updateBtn.title = releaseUpdateInProgress
      ? '正在同步服务器版本'
      : '点击后强制同步到服务器版本'
    updateBtn.onclick = releaseUpdateInProgress ? null : () => { void handlePrimaryUpdateButtonClick() }
  }

  function showManualForceSyncConfirmModal(status = null) {
    ensureReleaseUpdateModalStyle()
    removeReleaseModal('manualForceSyncConfirmModal')
    const currentVersion = String((status && status.localGameVersion) || '--').trim() || '--'
    const targetVersionRaw = String((status && (status.latestVersion || status.pendingVersion)) || '').trim()
    const targetVersion = targetVersionRaw ? `V${targetVersionRaw}` : '服务器当前版本'
    const releaseNotes = String((status && status.releaseNotes) || '').trim()
    const needsUpdate = !!(status && status.gameNeedsUpdate)
    const introText = targetVersionRaw
      ? (needsUpdate
          ? '检测到本地版本与服务器版本存在差异。确认后将立即进入强制更新页并同步到服务器版本。'
          : '将重新下载并覆盖服务器当前版本，用于修复漏更、跳过版本号或本地状态异常等情况。')
      : '当前未成功取回服务器版本号，仍可尝试直接连接更新服务器执行强制同步。'
    const modal = document.createElement('div')
    modal.id = 'manualForceSyncConfirmModal'
    modal.className = 'modal release-update-modal'
    modal.innerHTML = `
      <div class="modal-content" style="max-width:620px">
        <div class="modal-head">
          <h3>确认强制同步</h3>
          <button id="manualForceSyncCancelTop">关闭</button>
        </div>
        <div class="item release-update-body">
          <div class="release-update-card release-update-hero">
            <div class="release-update-spinner is-failed"></div>
            <div style="min-width:0">
              <div class="release-update-title">将以服务器版本覆盖本地文件</div>
              <div class="release-update-subtitle">${introText}</div>
            </div>
          </div>
          <div class="release-update-metrics">
            <div class="release-update-metric">
              <div class="release-update-metric-label">当前版本</div>
              <div class="release-update-metric-value">V${currentVersion}</div>
            </div>
            <div class="release-update-metric">
              <div class="release-update-metric-label">服务器版本</div>
              <div class="release-update-metric-value">${targetVersion}</div>
            </div>
          </div>
          <div class="release-update-card">
            <div class="release-update-metric-label">执行说明</div>
            <div class="release-update-notes">确认后将立即打开“强制同步服务器版本”页面，并重新下载、校验、解压、覆盖本地游戏文件。</div>
          </div>
          ${releaseNotes ? `
          <div class="release-update-card">
            <div class="release-update-metric-label">服务器更新说明</div>
            <div class="release-update-notes">${releaseNotes}</div>
          </div>
          ` : ''}
          <div class="row" style="justify-content:flex-end;margin-top:4px">
            <button id="manualForceSyncCancelBtn">取消</button>
            <button id="manualForceSyncConfirmBtn">确认强制同步</button>
          </div>
        </div>
      </div>
    `
    document.body.appendChild(modal)
    const closeModal = () => removeReleaseModal('manualForceSyncConfirmModal')
    modal.addEventListener('click', (evt) => {
      if (evt.target === modal) closeModal()
    })
    const cancelTopBtn = document.getElementById('manualForceSyncCancelTop')
    if (cancelTopBtn) cancelTopBtn.onclick = closeModal
    const cancelBtn = document.getElementById('manualForceSyncCancelBtn')
    if (cancelBtn) cancelBtn.onclick = closeModal
    const confirmBtn = document.getElementById('manualForceSyncConfirmBtn')
    if (confirmBtn) confirmBtn.onclick = async () => {
      confirmBtn.disabled = true
      confirmBtn.textContent = '正在进入更新页...'
      closeModal()
      try {
        await runReleaseUpdater('game', { force: true })
      } catch {}
    }
  }

  async function handlePrimaryUpdateButtonClick() {
    let status = releaseStatusCache && releaseStatusCache.ok ? releaseStatusCache : null
    try {
      const freshStatus = await window.ee2x.releaseStatus()
      if (freshStatus && freshStatus.ok) {
        status = freshStatus
        releaseStatusCache = freshStatus
        currentUpdateNotes = freshStatus.releaseNotes || ''
        updatePendingVersion = freshStatus.pendingVersion || freshStatus.latestVersion || null
        setUpdateNotes(currentUpdateNotes)
        updatePrimaryUpdateButton(freshStatus)
      }
    } catch (error) {
      console.error('manual force sync precheck failed', error)
    }
    showManualForceSyncConfirmModal(status)
  }

  function showGamePendingExitModal(status) {
    updateReleaseModalState({
      kind: 'waiting_game_exit',
      latestVersion: status && status.latestVersion ? String(status.latestVersion) : '',
      localGameVersion: status && status.localGameVersion ? String(status.localGameVersion) : '',
      stageTitle: '检测到新版本，等待当前游戏退出',
      stageDetail: GAME_UPDATE_PENDING_MESSAGE,
      releaseNotes: status && status.releaseNotes ? String(status.releaseNotes) : '',
      currentFileText: '游戏退出后将自动开始同步',
      strategyText: '等待退出',
      speedText: '',
      volumeText: '',
      progressPercent: Math.max(releaseUpdateModalState.progressPercent || 0, 1),
      errorText: '',
      canRetry: false,
      canClose: false,
      primaryActionLabel: '立即更新',
      lockClose: true,
    })
  }

  function showReleaseChangelog(status) {
    if (!status || !status.latestVersion || !String(status.releaseNotes || '').trim()) return
    if (document.getElementById('releaseChangelogModal')) return
    const modal = document.createElement('div')
    modal.id = 'releaseChangelogModal'
    modal.className = 'modal'
    modal.innerHTML = `
      <div class="modal-content" style="max-width:680px">
        <div class="modal-head">
          <h3>更新日志</h3>
          <button id="closeReleaseChangelog">关闭</button>
        </div>
        <div class="item" style="white-space:pre-wrap;line-height:1.7">
          <div><strong>版本：</strong>${status.latestVersion}</div>
          <div style="margin-top:10px"><strong>内容：</strong></div>
          <div style="margin-top:8px">${status.releaseNotes || ''}</div>
        </div>
      </div>
    `
    document.body.appendChild(modal)
    const markShown = async () => {
      try { await window.ee2x.markChangelogShown(status.latestVersion) } catch {}
      removeReleaseModal('releaseChangelogModal')
    }
    const closeBtn = document.getElementById('closeReleaseChangelog')
    if (closeBtn) closeBtn.onclick = markShown
  }

  function showGameForceUpdateModal(status) {
    if (!status || !status.latestVersion) return
    updateReleaseModalState({
      kind: 'needs_update',
      latestVersion: String(status.latestVersion || ''),
      localGameVersion: String(status.localGameVersion || ''),
      stageTitle: '检测到强制游戏更新',
      stageDetail: '必须先同步到服务器版本后才能启动游戏。',
      progressPercent: 0,
      strategyText: '等待开始',
      speedText: '',
      volumeText: '',
      currentFileText: '点击“立即更新”开始同步',
      releaseNotes: String(status.releaseNotes || ''),
      errorText: '',
      canRetry: true,
      canClose: false,
      primaryActionLabel: '立即更新',
      lockClose: true,
    })
  }

  async function runReleaseUpdater(scope = 'game', options = {}) {
    if (releaseUpdateInProgress) {
      return { ok: false, inProgress: true, error: '更新正在进行中，请稍候。' }
    }
    const forceSync = !!(options && options.force)
    releaseUpdateInProgress = true
    releaseManualForcePending = false
    updatePrimaryUpdateButton(releaseStatusCache)
    setStartButtonBlocked(true, '正在同步版本')
    updateReleaseModalState({
      kind: 'downloading',
      latestVersion: String((releaseStatusCache && releaseStatusCache.latestVersion) || ''),
      localGameVersion: String((releaseStatusCache && releaseStatusCache.localGameVersion) || ''),
      stageTitle: '正在同步服务器版本',
      stageDetail: '启动器正在连接服务器并准备下载更新包。',
      progressPercent: 0,
      strategyText: '准备下载',
      speedText: '',
      volumeText: '',
      currentFileText: '正在初始化下载任务',
      releaseNotes: String((releaseStatusCache && releaseStatusCache.releaseNotes) || ''),
      errorText: '',
      canRetry: false,
      canClose: false,
      primaryActionLabel: '立即更新',
      lockClose: true,
      forceSync,
    })
    try {
      const result = await window.ee2x.runUpdater(scope, { force: forceSync })
      if (!result.ok) {
        if (result.code === 'game-running' || result.blocked) {
          releaseManualForcePending = forceSync
          showGamePendingExitModal(releaseStatusCache || { latestVersion: result.version || '' })
          startReleaseWaitLoop()
          updatePrimaryUpdateButton({ ...(releaseStatusCache || {}), gameNeedsUpdate: true, gameRunning: true }, false)
          return result
        }
        releaseManualForcePending = false
        updateReleaseModalState({
          kind: 'failed',
          stageTitle: '更新失败',
          stageDetail: '更新未完成，请检查错误信息后重试。',
          errorText: String(result.error || '同步失败'),
          canRetry: true,
          canClose: false,
          primaryActionLabel: '重试更新',
          countdownSeconds: 0,
          countdownDeadlineMs: 0,
          countdownActive: false,
          lockClose: true,
          forceSync,
        })
        throw new Error(result.error || '同步失败')
      }
      releaseManualForcePending = false
      await checkUpdateAndRender(true, 'after-update')
      if (result.skipped) {
        updateReleaseModalState({
          kind: 'completed',
          stageTitle: '当前已经是最新版本',
          stageDetail: '本地版本与服务器版本已经一致，10 秒后自动进入启动器。',
          progressPercent: 100,
          strategyText: '更新已完成',
          speedText: '',
          volumeText: '',
          currentFileText: '你现在可以开始使用启动器',
          errorText: '',
          canRetry: false,
          canClose: true,
          primaryActionLabel: '进入启动器',
          countdownSeconds: 10,
          countdownDeadlineMs: 0,
          countdownActive: false,
          lockClose: false,
          forceSync,
        })
        startReleaseUpdateCountdown(10)
      } else {
        updateReleaseModalState({
          kind: 'completed',
          stageTitle: '更新完成',
          stageDetail: `已同步到服务器版本 V${String(result.version || (releaseStatusCache && releaseStatusCache.latestVersion) || '')}，10 秒后自动进入启动器。`,
          progressPercent: 100,
          strategyText: '更新已完成',
          speedText: '',
          volumeText: '',
          currentFileText: '你现在可以开始使用启动器',
          errorText: '',
          canRetry: false,
          canClose: true,
          primaryActionLabel: '进入启动器',
          countdownSeconds: 10,
          countdownDeadlineMs: 0,
          countdownActive: false,
          lockClose: false,
          forceSync,
        })
        startReleaseUpdateCountdown(10)
      }
      return result
    } catch (error) {
      releaseManualForcePending = false
      if (releaseUpdateModalState.kind !== 'failed' && releaseUpdateModalState.kind !== 'waiting_game_exit') {
        updateReleaseModalState({
          kind: 'failed',
          stageTitle: '更新失败',
          stageDetail: '更新未完成，请检查错误信息后重试。',
          errorText: String(error && error.message || error),
          canRetry: true,
          canClose: false,
          primaryActionLabel: '重试更新',
          countdownSeconds: 0,
          countdownDeadlineMs: 0,
          countdownActive: false,
          lockClose: true,
          forceSync,
        })
      }
      throw error
    } finally {
      releaseUpdateInProgress = false
      if (releaseStatusCache) {
        updatePrimaryUpdateButton(releaseStatusCache)
      }
    }
  }

  async function initializeReleaseFlow(force = false) {
    releaseFlowStarted = true
    setStartButtonBlocked(true, '检查服务器版本...')
    await checkUpdateAndRender(force, 'init')
  }

  async function checkUpdateAndRender(force = false, source = 'manual'){
    let status = null
    try {
      status = await window.ee2x.releaseStatus()
    } catch (e) {
      console.error('releaseStatus failed', e)
    }
    if (!status || !status.ok) {
      updatePendingVersion = null
      releaseStatusCache = null
      updatePrimaryUpdateButton(null)
      setStartButtonBlocked(true, '版本检查失败')
      return null
    }

    releaseStatusCache = status
    currentUpdateNotes = status.releaseNotes || ''
    updatePendingVersion = status.pendingVersion || status.latestVersion || null
    setUpdateNotes(currentUpdateNotes)
    updatePrimaryUpdateButton(status)

    if (status.gameNeedsUpdate) {
      if (status.gameRunning) {
        showGamePendingExitModal(status)
        setStartButtonBlocked(true, '等待游戏退出后同步')
        startReleaseWaitLoop()
      } else {
        stopReleaseWaitLoop()
        setStartButtonBlocked(true, '请先同步服务器版本')
        showGameForceUpdateModal(status)
        if (!releaseUpdateInProgress && releaseAutoStartVersion !== String(status.latestVersion || '')) {
          releaseAutoStartVersion = String(status.latestVersion || '')
          setTimeout(() => {
            if (!releaseUpdateInProgress) {
              void runReleaseUpdater('game').catch(() => {})
            }
          }, 450)
        }
      }
      return status
    }

    stopReleaseWaitLoop()
    releaseAutoStartVersion = ''
    updatePrimaryUpdateButton(status)
    setStartButtonBlocked(false, '启动游戏')
    if (status.shouldShowChangelog) {
      showReleaseChangelog(status)
    }
    return status
  }

  
  
  let __broadcastBusy = false
  let broadcastItems = []
  let broadcastPlayers = []
  let broadcastTiers = []
  let currentBroadcastLimit = 10
  
  // Imports for Caching
  let fs = null
  let path = null
  let http = null
  try {
      fs = require('fs')
      path = require('path')
      http = require('http')
  } catch (e) { console.warn('Node modules not found, caching disabled') }

  const AVATAR_CACHE_DIR = 'e:\\EE2X-system\\地球帝国二代远航版启动器\\data\\userdata\\img'
  
  // Ensure cache dir exists
  if (fs) {
      try {
          if (!fs.existsSync(AVATAR_CACHE_DIR)) {
              fs.mkdirSync(AVATAR_CACHE_DIR, { recursive: true })
          }
      } catch (e) { console.error('Failed to create avatar cache dir', e) }
  }

  // Inject CSS for Broadcast
  const broadcastStyleId = 'broadcast-styles';
    const oldStyle = document.getElementById(broadcastStyleId);
    if (oldStyle) oldStyle.remove();
    
    const style = document.createElement('style');
    style.id = broadcastStyleId;
    style.textContent = `
        .broadcast-card {
          background-color: rgba(30, 41, 59, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 8px;
          margin-bottom: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-family: "Microsoft YaHei", sans-serif;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s;
        }
        .bc-load-more {
            display: block;
            width: 100%;
            padding: 12px;
            text-align: center;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            color: #94a3b8;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 8px;
        }
        .bc-load-more:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }
        .broadcast-card:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }
        .broadcast-header {
          padding: 8px 12px;
          background-color: rgba(15, 23, 42, 0.6);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #cbd5e1;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .broadcast-time { display: flex; flex-direction: column; gap: 2px; font-size: 10px; color: #94a3b8; }
        .broadcast-result { font-weight: bold; font-size: 14px; text-align: center; text-shadow: 0 0 10px rgba(0,0,0,0.5); }
        .res-text-red { color: #fca5a5; }
        .res-text-blue { color: #93c5fd; }
        .res-text-draw { color: #cbd5e1; }
        .broadcast-duration { text-align: right; min-width: 60px; font-variant-numeric: tabular-nums; }
        
        .broadcast-teams { display: flex; flex-direction: row; }
        .team-panel {
          flex: 1;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
        }
        .team-panel.red { 
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05)); 
            border-right: 1px solid rgba(255, 255, 255, 0.05); 
        }
        .team-panel.blue { 
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.05)); 
        }
        
        .team-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .team-label { font-size: 12px; font-weight: 800; letter-spacing: 1px; }
        .label-red { color: #fca5a5; }
        .label-blue { color: #93c5fd; }
        
        .result-badge {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 10px;
          color: #fff;
          font-weight: bold;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .badge-win-red { background: linear-gradient(to right, #ef4444, #b91c1c); }
        .badge-win-blue { background: linear-gradient(to right, #3b82f6, #1d4ed8); }
        .badge-loss { background-color: rgba(100, 116, 139, 0.5); }
        
        .broadcast-player-list { 
            display: flex; 
            flex-direction: column;
            gap: 12px;
            width: 100%;
        }
        
        .tier-group {
            display: flex;
            flex-direction: column;
            width: 100%;
            position: relative;
        }
        
        /* Optional: Add separator between groups except the last one */
        .tier-group:not(:last-child)::after {
            content: '';
            display: block;
            height: 1px;
            background: linear-gradient(to right, transparent, rgba(255,255,255,0.1), transparent);
            margin-top: 8px;
            width: 80%;
            align-self: center;
        }

        .tier-players-container {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: center;
        }
        
        .player-card {
          background-color: transparent;
          border: none;
          border-radius: 6px;
          padding: 2px;
          display: flex;
          flex-direction: column !important; /* Force Vertical Layout */
          align-items: center;
          justify-content: flex-start;
          width: 70px;
          min-height: auto;
          position: relative;
          transition: transform 0.2s;
        }
        
        .avatar-wrapper { 
            position: relative; 
            margin-bottom: 2px; /* Reduced margin */
            display: flex;
            justify-content: center;
            align-items: center;
        } 
        .player-avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.1); background-color: #1e293b; transition: border-color 0.2s; display: block; }
        
        .tier-pill {
          position: absolute;
          top: -2px; /* Top positioning */
          right: -6px; /* Right positioning */
          left: auto; /* Reset left */
          bottom: auto; /* Reset bottom */
          transform: scale(0.85); /* Slightly scaled down */
          background-color: #fbbf24;
          color: #000;
          font-size: 9px;
          font-weight: bold;
          padding: 1px 6px;
          border-radius: 10px;
          white-space: nowrap;
          box-shadow: 0 1px 2px rgba(0,0,0,0.5);
          z-index: 2;
          border: 1px solid rgba(255,255,255,0.2);
        }
        
        .player-name {
          font-size: 10px;
          color: #e2e8f0;
          text-align: center;
          white-space: normal;
          overflow: visible;
          width: 100%;
          font-weight: 500;
          line-height: 1.1;
          margin-top: 0;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
          display: block;
          overflow-wrap: anywhere;
        }
    
`;
    document.head.appendChild(style);

  // Caching Helper
  async function getCachedAvatar(filename, remoteUrl) {
      if (!fs || !filename) return remoteUrl
      
      const localPath = path.join(AVATAR_CACHE_DIR, filename)
      
      if (fs.existsSync(localPath)) {
          const stats = fs.statSync(localPath)
          if (stats.size > 0) {
              return `file://${localPath.replace(/\\/g, '/')}`
          }
      }
      
      downloadAvatar(remoteUrl, localPath)
      return remoteUrl 
  }

  function downloadAvatar(url, dest) {
      if (!http) return
      http.get(url, (res) => {
          if (res.statusCode === 200) {
              const file = fs.createWriteStream(dest)
              res.pipe(file)
              file.on('finish', () => {
                  file.close()
              })
          }
      }).on('error', (err) => {
          // ignore
      })
  }

  async function renderBroadcastDOM() {
      const wrap = document.getElementById('broadcastList')
      if (!wrap) return
      
      const displayMatches = broadcastItems.slice(0, currentBroadcastLimit)
      
      const tiers = broadcastTiers
      const players = broadcastPlayers

      const renderedMatches = await Promise.all(displayMatches.map(async (m) => {
          // 适配新数据结构
          // m.date, m.duration, m.winner='team1'/'team2', m.teams.team1/team2
          
          const start = m.date ? new Date(m.date) : (m.startedAt ? new Date(m.startedAt) : null)
          const durationSec = m.duration || 0
          
          const fmtDate = (d) => d ? `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}` : '--'
          
          let durationStr = '0:00'
          if (durationSec > 0) {
              const mm = Math.floor(durationSec / 60).toString().padStart(1,'0')
              const ss = (durationSec % 60).toString().padStart(2,'0')
              durationStr = `${mm}:${ss}`
          } else if (start && m.endedAt) {
              // Fallback for old structure
              const end = new Date(m.endedAt)
              const diff = Math.max(0, Math.floor((end - start)/1000))
              const mm = Math.floor(diff / 60).toString().padStart(1,'0')
              const ss = (diff % 60).toString().padStart(2,'0')
              durationStr = `${mm}:${ss}`
          }
          
          // Winner mapping: team1 -> red, team2 -> blue
          // Or old structure: red -> red, blue -> blue
          let winner = 'draw'
          if (m.winner === 'team1') winner = 'red'
          else if (m.winner === 'team2') winner = 'blue'
          else if (m.winner === 'red' || m.winner === 'blue') winner = m.winner
          
          const getPlayerData = async (id) => {
              // ID from match might be string, user.id is number
              const p = players.find(x => String(x.id) === String(id))
              if (!p) return { name: '未知', avatar: '', tier: 'Unranked', tierColor: '#94a3b8', power: -1, tierId: 'Unranked' }
              
              const tierObj = tiers.find(t => t.id === p.currentTier)
              let tierName = tierObj ? tierObj.name : (p.currentTier==='waiting'?'候场区':(p.currentTier||'定级中'))
              if (tierName === 'waiting') tierName = '候场区'
              const tierColor = tierObj ? (tierObj.colorCode || '#fbbf24') : '#94a3b8'
              
              return { name: p.name, tier: tierName, tierColor, power: p.power || 0, tierId: p.currentTier || 'Unranked' }
          }
          
          // Get IDs
          let redIds = []
          let blueIds = []
          
          if (m.teams && m.teams.team1) {
              // New structure
              redIds = m.teams.team1.map(p => p.id)
              blueIds = m.teams.team2 ? m.teams.team2.map(p => p.id) : []
          } else {
              // Old structure fallback
              redIds = m.redIds || []
              blueIds = m.blueIds || []
          }
          
          let redPlayers = await Promise.all(redIds.map(getPlayerData))
          let bluePlayers = await Promise.all(blueIds.map(getPlayerData))
          
          const totalPlayers = redPlayers.length + bluePlayers.length
          // Determine match type label
          const matchLabel = totalPlayers === 2 ? '单挑赛' : '匹配赛'
          
          const renderPlayerTags = (list) => {
              return list.map(p => `
                  <span class="bc-player-tag">
                      <span class="bc-player-tier" style="background-color:${p.tierColor}">${p.tier}</span>
                      ${p.name}
                  </span>
              `).join('')
          }

          return `
            <div class="broadcast-card">
              <div class="bc-header">
                <div class="bc-tag">${matchLabel} ${totalPlayers}人</div>
                <div class="bc-time">${fmtDate(start)}</div>
                <div class="bc-duration">🕒 ${durationStr}</div>
              </div>
              <div class="bc-body">
                <!-- Red Team -->
                <div class="bc-team bc-red ${winner==='red'?'win':'loss'}">
                 <div class="bc-team-status">
                   <span class="bc-label">红方</span>
                   <span class="bc-result">${winner==='red'?'<span style="color:#ef4444">🏆 胜利</span>':'失败'}</span>
                 </div>
                 <div class="bc-players">
                    ${renderPlayerTags(redPlayers)}
                  </div>
                </div>
                
                <div class="bc-vs">VS</div>
                
                <!-- Blue Team -->
                <div class="bc-team bc-blue ${winner==='blue'?'win':'loss'}">
                  <div class="bc-team-status">
                    <span class="bc-result">${winner==='blue'?'<span style="color:#22c55e">🏆 胜利</span>':'失败'}</span>
                    <span class="bc-label">蓝方</span>
                  </div>
                  <div class="bc-players">
                    ${renderPlayerTags(bluePlayers)}
                  </div>
                </div>
              </div>
            </div>
          `
      }))
      
      wrap.innerHTML = renderedMatches.join('')

      // Add Load More Button
      if (broadcastItems.length > currentBroadcastLimit) {
          const btn = document.createElement('div')
          btn.className = 'bc-load-more'
          btn.textContent = `显示更多 (剩余 ${broadcastItems.length - currentBroadcastLimit} 条)`
          btn.onclick = () => {
              currentBroadcastLimit += 10
              renderBroadcastDOM() // Re-render with new limit
          }
          wrap.appendChild(btn)
      } else if (broadcastItems.length === 0) {
           wrap.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px">暂无战绩播报</div>'
      }
  }

  async function renderBroadcast(){
    if (__broadcastBusy) return
    __broadcastBusy = true
    const wrap = document.getElementById('broadcastList')
    
    // Allow scroll for more items
    wrap.style.overflowY = 'auto'
    wrap.style.maxHeight = '100%' 
    
    try {
      if (!wrap.innerHTML.trim()) {
          wrap.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px">正在加载战绩...</div>'
      }

      // Use Ranking Server (Port 3001) - History
      const baseUrl = 'http://115.231.35.105:3001'
      const avatarBaseUrl = 'http://115.231.35.105:3001'
      console.log('Fetching broadcast from:', baseUrl)

      const [historyRes, usersRes, tiersRes] = await Promise.all([
          fetch(`${baseUrl}/api/admin/history`),
          fetch(`${baseUrl}/api/admin/users`),
          fetch(`${baseUrl}/api/admin/tiers`)
      ])
      
      if (historyRes.ok && usersRes.ok && tiersRes.ok) {
        const historyData = await historyRes.json()
        const usersData = await usersRes.json()
        const tiersData = await tiersRes.json()
        
        const rawUsers = usersData.users || []
        broadcastTiers = Array.isArray(tiersData) ? tiersData : []
        const matches = historyData.matches || []
        
        broadcastPlayers = rawUsers.map(u => ({
            id: u.id,
            name: u.username,
            avatarUrl: u.avatar,
            currentTier: u.rank_tier,
            power: u.combat_power
        }))
        
        if (matches.length > 0) {
           matches.sort((a,b) => {
               const tA = new Date(a.date||a.endedAt||a.startedAt||a.createdAt||0).getTime()
               const tB = new Date(b.date||b.endedAt||b.startedAt||b.createdAt||0).getTime()
               return tB - tA
           })
           
           broadcastItems = matches
           // Reset limit
           currentBroadcastLimit = 10
           
           await renderBroadcastDOM()
        } else {
            broadcastItems = []
            wrap.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px">暂无战绩播报</div>'
        }
      } else {
          wrap.innerHTML = '<div style="text-align:center;color:#ef4444;padding:20px">获取战绩失败</div>'
      }
    } catch (e) {
      console.error('Fetch broadcast error:', e)
      wrap.innerHTML = '<div style="text-align:center;color:#ef4444;padding:20px">连接服务器失败</div>'
    } finally {
      __broadcastBusy = false
    }
  }

  function setupBroadcastScroll() {}


  const modal = document.getElementById('settingsModal')
  const openSettings = () => {
    document.getElementById('set_gameDir').value = cfg.gameDir || ''
    document.getElementById('set_gameExePath').value = cfg.gameExePath || ''
    const battleApiUrl = document.getElementById('set_battleApiUrl')
    if (battleApiUrl) battleApiUrl.value = cfg.battleApiUrl || 'http://192.168.0.211:1234/v1/responses'
    const battleApiKey = document.getElementById('set_battleApiKey')
    if (battleApiKey) battleApiKey.value = cfg.battleApiKey || ''
    const battleApiModel = document.getElementById('set_battleApiModel')
    if (battleApiModel) battleApiModel.value = cfg.battleApiModel || 'zai-org/glm-4.6v-flash'
    try {
      console.log('打开设置，当前配置:', cfg)

      // 标准化背景路径
      let bgImagePath = cfg.bgImagePath || ''
      if (bgImagePath) {
        bgImagePath = bgImagePath.replace(/\\/g, '/')
      }

      // 如果没有明确设置背景类型，但有背景路径，则根据文件扩展名推断
      let bgType = cfg.bgType || 'none'
      if (bgType === 'none' && bgImagePath && bgImagePath.trim()) {
        const ext = bgImagePath.toLowerCase().split('.').pop()
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
          bgType = 'image'
        } else if (['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm'].includes(ext)) {
          bgType = 'video'
        }
        cfg.bgType = bgType // 更新配置
      }

      // 设置背景类型下拉框
      document.getElementById('set_bgType').value = bgType

      // 根据背景类型设置相应的值
      if (bgType === 'image') {
        document.getElementById('set_bgImage').value = bgImagePath || ''
        document.getElementById('set_bgVideo').value = ''
      } else if (bgType === 'video') {
        document.getElementById('set_bgVideo').value = bgImagePath || ''
        document.getElementById('set_bgImage').value = ''
      } else {
        document.getElementById('set_bgImage').value = ''
        document.getElementById('set_bgVideo').value = ''
      }

      document.getElementById('bgVideoVolume').value = cfg.bgVideoVolume || 0
      document.getElementById('volumeValue').textContent = (cfg.bgVideoVolume || 0) + '%'
      try {
        const blurInput = document.getElementById('bgBlur')
        const blurText = document.getElementById('blurValue')
        const blurVal = cfg.bgBlur || 0
        if (blurInput) blurInput.value = blurVal
        if (blurText) blurText.textContent = blurVal + 'px'
      } catch {}
      updateBackgroundSettingsUI()

      console.log('设置界面加载完成，背景类型:', bgType, '背景路径:', bgImagePath)
    } catch (error) {
      console.error('打开设置时出错:', error)
    }

    try {
      
    } catch {}
    const serverInput = document.getElementById('set_serverUrl')
    serverInput.value = cfg.serverUrl || ''
    serverInput.removeAttribute('readonly')
    serverInput.removeAttribute('disabled')
    serverInput.addEventListener('input', () => {
      cfg.serverUrl = serverInput.value
      cfg.updateServerHttp = serverInput.value
    })

      try {
      const userServerInput = document.getElementById('set_userServerUrl')
      if (userServerInput) {
        userServerInput.value = cfg.userServerUrl || ''
        userServerInput.addEventListener('input', () => { cfg.userServerUrl = userServerInput.value })
      }
    } catch {}

    try {
      const netServerInput = document.getElementById('set_networkServer')
      if (netServerInput) {
        netServerInput.value = cfg.networkServer || '122.10.116.142:29872'
        netServerInput.addEventListener('input', () => { cfg.networkServer = netServerInput.value })
      }
      
      try {
        const netModeSel = document.getElementById('set_networkMode')
        const tapStrategyRow = document.getElementById('tapStrategyRow')
        const tapStrategySel = document.getElementById('set_tapStrategy')
        
        const updateTapUI = () => {
          if (tapStrategyRow) {
             tapStrategyRow.style.display = (netModeSel && netModeSel.value === 'tap') ? 'block' : 'none'
          }
        }

        if (netModeSel) {
          netModeSel.value = cfg.networkMode || 'tap'
          netModeSel.addEventListener('change', updateTapUI)
        }
        
        if (tapStrategySel) {
          tapStrategySel.value = cfg.tapStrategy || 'auto'
        }
        
        updateTapUI()
      } catch {}

      const testNetBtn = document.getElementById('testNetworkServer')
      const testNetStatus = document.getElementById('testNetworkStatus')
      if (testNetBtn) {
        testNetBtn.onclick = async () => {
           const val = netServerInput ? netServerInput.value : ''
           if (testNetStatus) {
             testNetStatus.textContent = '正在检测...'
             testNetStatus.style.color = '#fbbf24' // warning color
           }
           try {
             const r = await window.ee2x.networkTest(val)
             if (testNetStatus) {
               testNetStatus.textContent = r.ok ? (r.msg || '组网服务器在线') : (r.error || '连接失败')
               testNetStatus.style.color = r.ok ? '#22c55e' : '#ef4444'
               if (r.ok) {
                 // 3秒后恢复空或者保留提示
               }
             }
           } catch (e) {
             if (testNetStatus) {
               testNetStatus.textContent = '测试出错'
               testNetStatus.style.color = '#ef4444'
             }
           }
        }
      }
    } catch {}

    // 添加背景输入框的实时预览功能
    const bgImageInput = document.getElementById('set_bgImage')
    const bgVideoInput = document.getElementById('set_bgVideo')

    // 图片输入框变化时实时预览
    if (bgImageInput) {
      bgImageInput.addEventListener('input', async () => {
        const imagePath = bgImageInput.value.trim()
        if (imagePath) {
          document.getElementById('set_bgType').value = 'image'
          updateBackgroundSettingsUI()
          await applySelectedBackground('image', imagePath)
        }
      })
    }

    // 视频输入框变化时实时预览
    if (bgVideoInput) {
      bgVideoInput.addEventListener('input', async () => {
        const videoPath = bgVideoInput.value.trim()
        if (videoPath) {
          document.getElementById('set_bgType').value = 'video'
          updateBackgroundSettingsUI()
          await applySelectedBackground('video', videoPath)
        }
      })
    }
    try {
      const resSel = document.getElementById('set_resolution')
      if (resSel) {
        resSel.value = cfg.preferredResolution || '1280x800'
        resSel.addEventListener('change', async () => {
          cfg.preferredResolution = resSel.value
          try { await window.ee2x.applyResolution(resSel.value) } catch {}
        })
      }
      
      const broadcastSel = document.getElementById('set_broadcastMode')
      if (broadcastSel) {
        broadcastSel.value = cfg.broadcastMode || 'manual'
      }
      const closeActionSel = document.getElementById('set_closeAction')
      if (closeActionSel) {
        closeActionSel.value = cfg.closeAction || 'ask'
      }
      const battleApiUrl = document.getElementById('set_battleApiUrl')
      if (battleApiUrl) {
        battleApiUrl.value = cfg.battleApiUrl || 'http://192.168.0.211:1234/v1/responses'
        battleApiUrl.addEventListener('input', () => { cfg.battleApiUrl = battleApiUrl.value })
      }
      const battleApiKey = document.getElementById('set_battleApiKey')
      if (battleApiKey) {
        battleApiKey.value = cfg.battleApiKey || ''
        battleApiKey.addEventListener('input', () => { cfg.battleApiKey = battleApiKey.value })
      }
      const battleApiModel = document.getElementById('set_battleApiModel')
      if (battleApiModel) {
        battleApiModel.value = cfg.battleApiModel || 'zai-org/glm-4.6v-flash'
        battleApiModel.addEventListener('input', () => { cfg.battleApiModel = battleApiModel.value })
      }
      const testBattleApiBtn = document.getElementById('testBattleApiBtn')
      const testBattleApiStatus = document.getElementById('testBattleApiStatus')
      if (testBattleApiBtn) {
        testBattleApiBtn.onclick = async () => {
          if (testBattleApiStatus) {
            testBattleApiStatus.textContent = '测试中...'
            testBattleApiStatus.style.color = '#fbbf24'
          }
          try {
            const r = await window.ee2x.battleTestApi()
            if (testBattleApiStatus) {
              if (r && r.ok) {
                testBattleApiStatus.textContent = `成功：HTTP ${r.status}${r.text ? ' / ' + r.text : ''}`
                testBattleApiStatus.style.color = '#4ade80'
              } else {
                testBattleApiStatus.textContent = `失败：${(r && r.error) || '未知错误'}`
                testBattleApiStatus.style.color = '#ef4444'
              }
            }
          } catch (e) {
            if (testBattleApiStatus) {
              testBattleApiStatus.textContent = `失败：${e.message || e}`
              testBattleApiStatus.style.color = '#ef4444'
            }
          }
        }
      }
      const battleHotkeySel = document.getElementById('set_battleHotkey')
      if (battleHotkeySel) {
        battleHotkeySel.value = cfg.battleHotkey || ''
      }
    } catch {}
    modal.classList.remove('hidden')
  }
  const closeSettings = () => { modal.classList.add('hidden') }
  document.getElementById('settingsBtn').addEventListener('click', openSettings)
  document.getElementById('closeSettings').addEventListener('click', closeSettings)
  try {
    const tbtn = document.getElementById('themeBtn')
    const applyAndPersistTheme = async (name) => {
      try { cfg.theme = name; await window.ee2x.cfgSet(cfg) } catch {}
      try { applyTheme() } catch {}
    }
    if (tbtn) {
      tbtn.addEventListener('click', async () => {
        const current = cfg && cfg.theme ? String(cfg.theme) : 'dark'
        const next = current === 'light' ? 'dark' : 'light'
        await applyAndPersistTheme(next)
      })
    }
  } catch {}
  try {
    const battleBtn = document.getElementById('battleBtn')
    const battleModal = document.getElementById('battleModal')
    const closeBattle = document.getElementById('closeBattle')
    const battleRecentCard = document.getElementById('battleRecentCard')
    const battleRefreshBtn = document.getElementById('battleRefreshBtn')
    const battleToggleHistoryBtn = document.getElementById('battleToggleHistoryBtn')
    const battleHistoryWrap = document.getElementById('battleHistoryWrap')
    const battleMainView = document.getElementById('battleMainView')
    const battleDetailView = document.getElementById('battleDetailView')
    const battleDetailBackBtn = document.getElementById('battleDetailBackBtn')
    const battleDetailTitle = document.getElementById('battleDetailTitle')
    const battleDetailContent = document.getElementById('battleDetailContent')

    // 显示主视图（最近结算+历史列表）
    function showBattleMainView() {
      if (battleMainView) battleMainView.style.display = ''
      if (battleDetailView) battleDetailView.style.display = 'none'
    }

    // 显示历史详情表格
    function showBattleDetail(item) {
      if (!battleDetailView || !battleDetailContent) return
      if (battleMainView) battleMainView.style.display = 'none'
      battleDetailView.style.display = ''

      // 标题：时间 + 时长
      if (battleDetailTitle) {
        battleDetailTitle.textContent = `${item.time || ''}${item.duration ? '  时长：' + item.duration : ''}`
      }

      // 渲染表格（复用最近结算的逻辑）
      const rows = Array.isArray(item.rows) ? item.rows : []
      if (rows.length === 0) {
        battleDetailContent.innerHTML = '<div class="no-broadcast">暂无玩家数据</div>'
        return
      }
      const winners = rows.filter(x => x.result === '获胜')
      const losers  = rows.filter(x => x.result === '落败')
      const others  = rows.filter(x => x.result !== '获胜' && x.result !== '落败')
      const byTotal = (a, b) => (parseFloat(b.total) || 0) - (parseFloat(a.total) || 0)
      const sorted  = [...winners.sort(byTotal), ...losers.sort(byTotal), ...others.sort(byTotal)]
      const tableRows = sorted.map((x, idx) => {
        const isWin = x.result === '获胜'
        const resultColor = isWin ? '#4ade80' : (x.result === '落败' ? '#f87171' : '#94a3b8')
        const teamColor   = x.team === '红方' ? '#f87171' : (x.team === '蓝方' ? '#60a5fa' : '#94a3b8')
        return `<tr>
          <td>${idx + 1}</td>
          <td>${x.name || ''}</td>
          <td style="color:${teamColor}">${x.team || ''}</td>
          <td style="color:${resultColor}">${x.result || ''}</td>
          <td>${x.game || ''}</td>
          <td>${x.empire || ''}</td>
          <td>${x.economy || ''}</td>
          <td>${x.military || ''}</td>
          <td>${x.total || ''}</td>
        </tr>`
      }).join('')
      battleDetailContent.innerHTML = `
        <div class="battle-glass-panel">
          <table class="battle-table">
            <thead>
              <tr>
                <th>#</th><th>玩家名称</th><th>队伍</th><th>结果</th>
                <th>游戏分数</th><th>帝国分数</th><th>经济分数</th><th>军事分数</th><th>总分数</th>
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
        <div style="margin-top:8px;color:#94a3b8;font-size:12px">CSV：${item.csvPath || ''}</div>`
    }

    const renderBattleUI = async () => {
      showBattleMainView()
      try {
        const recent = await window.ee2x.battleGetRecent()
        const r = recent && recent.rows ? recent : null
        if (battleRecentCard) {
          if (r) {
            const rows = Array.isArray(r.rows) ? r.rows : []
            const duration = r.duration || '--'
            const winners = rows.filter(x => x.result === '获胜')
            const losers  = rows.filter(x => x.result === '落败')
            const others  = rows.filter(x => x.result !== '获胜' && x.result !== '落败')
            const byTotal = (a, b) => (parseFloat(b.total) || 0) - (parseFloat(a.total) || 0)
            const sortedRows = [...winners.sort(byTotal), ...losers.sort(byTotal), ...others.sort(byTotal)]
            const tableRows = sortedRows.map((x, idx) => {
              const isWin = x.result === '获胜'
              const resultColor = isWin ? '#4ade80' : (x.result === '落败' ? '#f87171' : '#94a3b8')
              const teamColor = x.team === '红方' ? '#f87171' : (x.team === '蓝方' ? '#60a5fa' : '#94a3b8')
              return `<tr>
                <td>${idx + 1}</td>
                <td>${x.name || ''}</td>
                <td style="color:${teamColor}">${x.team || ''}</td>
                <td style="color:${resultColor}">${x.result || ''}</td>
                <td>${x.game || ''}</td>
                <td>${x.empire || ''}</td>
                <td>${x.economy || ''}</td>
                <td>${x.military || ''}</td>
                <td>${x.total || ''}</td>
              </tr>`
            }).join('')
            battleRecentCard.innerHTML = `
              <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px">
                <strong style="font-size:18px">最近一次结算</strong>
                <span style="color:#cbd5e1;font-size:13px">${r.time || ''}</span>
              </div>
              <div style="display:flex;gap:12px;align-items:center;margin-bottom:10px;color:#e5e7eb;font-size:18px;font-weight:700">
                <span>总游戏时间：${duration}</span>
              </div>
              <div class="battle-glass-panel">
                <table class="battle-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>玩家名称</th>
                      <th>队伍</th>
                      <th>结果</th>
                      <th>游戏分数</th>
                      <th>帝国分数</th>
                      <th>经济分数</th>
                      <th>军事分数</th>
                      <th>总分数</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tableRows || '<tr><td colspan="9" style="text-align:center;color:#94a3b8">暂无玩家数据</td></tr>'}
                  </tbody>
                </table>
              </div>
              <div style="margin-top:8px;color:#94a3b8;font-size:12px">CSV：${r.csvPath || ''}</div>`
          } else {
            battleRecentCard.innerHTML = '<div class="no-broadcast">暂无结算记录</div>'
          }
        }
      } catch {}
      try {
        const history = await window.ee2x.battleGetHistory()
        if (battleHistoryWrap) {
          battleHistoryWrap.innerHTML = (Array.isArray(history) ? history : []).map((item, i) => `
            <div class="item battle-history-item" style="margin-bottom:8px" data-idx="${i}">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
                <div>
                  <strong>${item.time || ''}</strong>
                  <span style="margin-left:10px;color:#94a3b8;font-size:12px">${item.duration ? '时长：' + item.duration : ''}</span>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0">
                  <button class="battle-view-detail" data-idx="${i}" style="padding:4px 12px">查看详情</button>
                  <button class="battle-delete-record" data-path="${item.csvPath || ''}" data-idx="${i}" style="padding:4px 10px;background:rgba(239,68,68,0.15);border-color:rgba(239,68,68,0.4);color:#f87171">删除</button>
                </div>
              </div>
              <div style="font-size:11px;color:#64748b;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item.csvPath || ''}</div>
            </div>`).join('') || '<div class="no-broadcast">暂无历史记录</div>'

          // 查看详情
          battleHistoryWrap.querySelectorAll('.battle-view-detail').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              e.stopPropagation()
              const idx = parseInt(btn.getAttribute('data-idx'))
              try {
                const history = await window.ee2x.battleGetHistory()
                const item = history[idx]
                if (!item) return
                if (!item.rows || item.rows.length === 0) {
                  const full = await window.ee2x.battleGetRecentByPath(item.csvPath)
                  showBattleDetail(full || item)
                } else {
                  showBattleDetail(item)
                }
              } catch {}
            })
          })

          // 删除记录
          battleHistoryWrap.querySelectorAll('.battle-delete-record').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              e.stopPropagation()
              const csvPath = btn.getAttribute('data-path') || ''
              if (!csvPath) return
              if (!confirm('确定删除这条结算记录及对应的CSV文件吗？')) return
              try {
                const res = await window.ee2x.battleDeleteRecord(csvPath)
                if (res && res.ok) {
                  // 刷新列表
                  await renderBattleUI()
                } else {
                  alert('删除失败：' + (res && res.error || '未知错误'))
                }
              } catch (e) { alert('删除出错：' + e.message) }
            })
          })
        }
      } catch {}
    }

    // 返回列表按钮
    if (battleDetailBackBtn) battleDetailBackBtn.addEventListener('click', showBattleMainView)

    if (battleBtn) battleBtn.addEventListener('click', async () => { try { await renderBattleUI(); battleModal.classList.remove('hidden') } catch {} })
    if (closeBattle) closeBattle.addEventListener('click', () => { try { battleModal.classList.add('hidden'); showBattleMainView() } catch {} })
    if (battleRefreshBtn) battleRefreshBtn.addEventListener('click', renderBattleUI)
    if (battleToggleHistoryBtn) battleToggleHistoryBtn.addEventListener('click', () => {
      if (!battleHistoryWrap) return
      const isHidden = battleHistoryWrap.style.display === 'none'
      battleHistoryWrap.style.display = isHidden ? 'block' : 'none'
      battleToggleHistoryBtn.textContent = isHidden ? '隐藏列表' : '查看列表'
    })

    // 监听截图闪白事件（主进程通知）
    try {
      window.ee2x.onBattleFlash(() => {
        const overlay = document.createElement('div')
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#fff;z-index:999999;pointer-events:none;opacity:1;transition:opacity 0.4s ease-out;'
        document.body.appendChild(overlay)
        // 短暂显示后淡出移除
        requestAnimationFrame(() => {
          setTimeout(() => {
            overlay.style.opacity = '0'
            setTimeout(() => { try { document.body.removeChild(overlay) } catch {} }, 400)
          }, 150)
        })
      })
    } catch {}
  } catch {}

  document.getElementById('browseDir').addEventListener('click', async () => {
    try { const d = await window.ee2x.chooseDir(); if (d) document.getElementById('set_gameDir').value = d } catch {}
  })

  try {
    const dm = document.getElementById('detailModal')
    const dcBtn = document.getElementById('detailClose')
    if (dcBtn) dcBtn.addEventListener('click', () => { try { dm.classList.add('hidden') } catch {} })
    document.addEventListener('keydown', (e) => { try { if (e.key === 'Escape') dm.classList.add('hidden') } catch {} })
  } catch {}
  document.getElementById('browseExe').addEventListener('click', async () => {
    try { const p = await window.ee2x.chooseExe(); if (p) document.getElementById('set_gameExePath').value = p } catch {}
  })
  document.getElementById('browseBgImage').addEventListener('click', async () => {
    try {
      const result = await window.ee2x.selectFile('image');
      if (result) {
        // 自动保存背景文件到本地img目录
        const saveResult = await window.ee2x.saveBackgroundFile(result, 'image')

        if (saveResult.success) {
          // 使用相对路径
          const relativePath = saveResult.relativePath.replace(/\\/g, '/')
          document.getElementById('set_bgImage').value = relativePath

          // 自动设置背景类型为图片
          document.getElementById('set_bgType').value = 'image'
          updateBackgroundSettingsUI()

          // 立即应用到背景展示
          await applySelectedBackground('image', relativePath)

          console.log('背景图片已保存到:', saveResult.localPath)
          console.log('使用相对路径:', relativePath)
        } else {
          // 如果保存失败，显示错误信息
          alert(saveResult.error || '背景图片保存失败')
          console.warn('背景图片保存失败:', saveResult.error)
        }
      }
    } catch (error) {
      console.error('选择背景图片时出错:', error)
    }
  })
  document.getElementById('saveSettings').addEventListener('click', async () => {
    cfg.gameDir = document.getElementById('set_gameDir').value.trim()
    cfg.gameExePath = document.getElementById('set_gameExePath').value.trim()
    const bgType = document.getElementById('set_bgType').value

    console.log('保存设置，背景类型:', bgType)

    // 保存背景设置
    if (bgType === 'image') {
      const bgImagePath = (document.getElementById('set_bgImage').value||'').trim()
      if (bgImagePath) {
        // 确保使用正斜杠格式
        const normalizedPath = bgImagePath.replace(/\\/g, '/')
        cfg.bgImagePath = normalizedPath
        cfg.bgType = 'image'
        cfg.bgFileType = 'image'

        // 调用API保存设置
        try {
          await window.ee2x.setBackgroundPath(normalizedPath, 'image')
          console.log('背景图片设置已保存:', normalizedPath)
        } catch (error) {
          console.error('保存背景图片设置失败:', error)
        }
      } else {
        cfg.bgImagePath = ''
        cfg.bgType = 'none'
        cfg.bgFileType = 'none'
      }
    } else if (bgType === 'video') {
      const bgVideoPath = (document.getElementById('set_bgVideo').value||'').trim()
      if (bgVideoPath) {
        // 确保使用正斜杠格式
        const normalizedPath = bgVideoPath.replace(/\\/g, '/')
        cfg.bgImagePath = normalizedPath
        cfg.bgType = 'video'
        cfg.bgFileType = 'video'

        // 调用API保存设置
        try {
          await window.ee2x.setBackgroundPath(normalizedPath, 'video')
          console.log('背景视频设置已保存:', normalizedPath)
        } catch (error) {
          console.error('保存背景视频设置失败:', error)
        }
      } else {
        cfg.bgImagePath = ''
        cfg.bgType = 'none'
        cfg.bgFileType = 'none'
      }
    } else {
      cfg.bgImagePath = ''
      cfg.bgType = 'none'
      cfg.bgFileType = 'none'
    }

    // 兼容性设置
    cfg.bgVideoPath = (document.getElementById('set_bgVideo').value||'').trim()
    cfg.bgVideoVolume = parseInt(document.getElementById('bgVideoVolume').value)
    try { cfg.bgBlur = parseInt(document.getElementById('bgBlur').value) || 0 } catch { cfg.bgBlur = 0 }
    cfg.serverUrl = document.getElementById('set_serverUrl').value.trim()
    cfg.updateServerHttp = cfg.serverUrl
      try { cfg.userServerUrl = document.getElementById('set_userServerUrl').value.trim() } catch {}
      try { cfg.networkServer = document.getElementById('set_networkServer').value.trim() } catch {}
      try { cfg.networkMode = document.getElementById('set_networkMode').value } catch {}
      try { cfg.tapStrategy = document.getElementById('set_tapStrategy').value } catch {}
    try { const rs = document.getElementById('set_resolution'); if (rs) cfg.preferredResolution = rs.value } catch {}
    try { cfg.battleApiUrl = document.getElementById('set_battleApiUrl').value.trim() } catch {}
    try { cfg.battleApiKey = document.getElementById('set_battleApiKey').value.trim() } catch {}
    try { cfg.battleApiModel = document.getElementById('set_battleApiModel').value.trim() } catch {}
    try { const bh = document.getElementById('set_battleHotkey'); if (bh) cfg.battleHotkey = bh.value.trim() } catch {}
    try { if (window.ee2x && window.ee2x.battleSaveHotkey && cfg.battleHotkey) await window.ee2x.battleSaveHotkey(cfg.battleHotkey) } catch {}
    try {
        const bm = document.getElementById('set_broadcastMode');
        if (bm) {
           cfg.broadcastMode = bm.value 
           updateBroadcastMode() // Apply change immediately
        }
      } catch {}
      try { cfg.closeAction = document.getElementById('set_closeAction').value } catch {}

      // 保存配置
      try {
      await window.ee2x.cfgSet(cfg)
      console.log('配置已保存:', cfg)
    } catch (error) {
      console.error('保存配置失败:', error)
    }

    // 立即应用背景
    try {
      await applyBackground()
      console.log('背景已应用')
    } catch (error) {
      console.error('应用背景失败:', error)
    }

    gameDirEl.textContent = cfg.gameDir || '未设置'
    closeSettings()
    await initializeReleaseFlow(true)
  })

  // Tab Switching Logic
  const tabBtns = document.querySelectorAll('.tab-btn')
  const tabContents = document.querySelectorAll('.tab-content')

  // Broadcast Mode Logic
  let broadcastTimer = null
  const refreshBroadcastBtn = document.getElementById('refreshBroadcastBtn')

  function updateBroadcastMode() {
    const mode = cfg.broadcastMode || 'manual'
    console.log('当前战绩播报模式:', mode)
    
    if (broadcastTimer) {
      clearInterval(broadcastTimer)
      broadcastTimer = null
    }

    if (mode === 'auto') {
      // 自动模式：60秒刷新一次
      renderBroadcast()
      broadcastTimer = setInterval(renderBroadcast, 60000)
    } else {
      // 手动模式：只在初始化时刷新一次，之后不自动刷新
      if (broadcastItems.length === 0) {
        renderBroadcast()
      }
    }
  }

  if (refreshBroadcastBtn) {
    refreshBroadcastBtn.addEventListener('click', () => {
      // Add spin animation
      const icon = refreshBroadcastBtn.querySelector('svg')
      if (icon) {
        icon.style.transition = 'transform 0.5s'
        icon.style.transform = 'rotate(360deg)'
        setTimeout(() => { icon.style.transform = 'rotate(0deg)' }, 500)
      }
      renderBroadcast()
    })
  }
  
  // Tab Switching Logic update for Broadcast Button
  function switchTab(tabName) {
    tabBtns.forEach(btn => {
      if (btn.dataset.tab === tabName) btn.classList.add('active')
      else btn.classList.remove('active')
    })
    tabContents.forEach(content => {
      if (content.id === `tab-${tabName}`) content.classList.add('active')
      else content.classList.remove('active')
    })
    
    // Show/Hide Refresh Button for Broadcast Tab
    if (refreshBroadcastBtn) {
      refreshBroadcastBtn.style.display = tabName === 'broadcast' ? 'block' : 'none'
    }

    if (tabName === 'online') renderOnlinePlayers()
    if (tabName === 'broadcast') {
       // 如果是手动模式，且列表为空，或者用户刚刚切换过来，可以尝试加载一次
       // 但为了严格控制流量，这里只在列表为空时加载
       if (broadcastItems.length === 0) renderBroadcast()
    }
    if (tabName === 'changelog') renderChangelog()
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab
      switchTab(tabName)
    })
  })

  // View Toggle Logic
  const toggleViewBtn = document.getElementById('toggleViewBtn')
  const refreshOnlineBtn = document.getElementById('refreshOnlineBtn')
  let isGridView = false // Default to List View

  if (refreshOnlineBtn) {
    refreshOnlineBtn.addEventListener('click', () => {
      const btn = refreshOnlineBtn
      // Add spin animation
      const icon = btn.querySelector('svg')
      if (icon) icon.style.transition = 'transform 0.5s';
      if (icon) icon.style.transform = 'rotate(360deg)';
      setTimeout(() => { if (icon) icon.style.transform = 'rotate(0deg)' }, 500)
      
      renderOnlinePlayers()
    })
  }

  if (toggleViewBtn) {
    // Initial Icon (Grid Icon because current is List)
    toggleViewBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 1h6v6H1zm8 0h6v6H9zm0 8h6v6H9zM1 9h6v6H1z"/></svg>`
    
    toggleViewBtn.addEventListener('click', () => {
      isGridView = !isGridView
      const wrap = document.getElementById('onlinePlayerList')
      if (wrap) {
        wrap.className = isGridView ? 'player-grid' : 'player-list'
      }
      // Update Icon (Show List Icon if Grid, Grid Icon if List)
      toggleViewBtn.innerHTML = isGridView 
        ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2h14v2H1zm0 4h14v2H1zm0 4h14v2H1zm0 4h14v2H1z"/></svg>` 
        : `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 1h6v6H1zm8 0h6v6H9zm0 8h6v6H9zM1 9h6v6H1z"/></svg>`
    })
  }

  // Online Players Logic
  async function renderOnlinePlayers() {
    const wrap = document.getElementById('onlinePlayerList')
    if (!wrap) return
    
    const onlineStyleId = 'online-player-styles';
    if (!document.getElementById(onlineStyleId)) {
        const style = document.createElement('style');
        style.id = onlineStyleId;
        style.textContent = `
        .player-list {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 4px;
        }
        .player-list-header {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            padding: 8px 12px;
            margin-bottom: 0;
            font-size: 12px;
            font-weight: bold;
            color: #94a3b8;
            align-items: center;
            text-align: center;
        }
        .player-list-header > div:first-child { text-align: left; padding-left: 48px; }

        .online-player-card {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr;
            align-items: center;
            background-color: rgba(30, 41, 59, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 6px;
            padding: 8px 12px;
            transition: all 0.2s;
            backdrop-filter: blur(4px);
            gap: 4px;
        }
        .online-player-card:hover {
            background-color: rgba(51, 65, 85, 0.8);
            border-color: rgba(255, 255, 255, 0.1);
        }
        .online-player-card.is-me {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .op-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #334155;
            background-color: #1e293b;
        }
        .op-col-player { display: flex; align-items: center; gap: 10px; overflow: hidden; }
        .op-name {
            font-size: 13px;
            font-weight: bold;
            color: #e2e8f0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .op-badge-me {
            background-color: #10b981;
            color: #fff;
            font-size: 10px;
            padding: 1px 4px;
            border-radius: 3px;
            font-weight: bold;
            margin-left: 6px;
        }
        .op-col-center { display: flex; justify-content: center; align-items: center; font-size: 13px; }
        `;
        document.head.appendChild(style);
    }
    
    if (wrap.className !== 'player-list') {
       wrap.className = 'player-list'
    }
    
    if (!isNetRunning) {
      wrap.innerHTML = '<div class="no-broadcast">请先连接对战平台</div>'
      return
    }

    try {
      let backendList = []
      try {
        const res = await window.ee2x.getOnlineUsers()
        if (res.ok && Array.isArray(res.list)) {
           backendList = res.list
        }
      } catch(e) { console.error('Backend list error', e) }

      const st = await window.ee2x.networkStatus()
      const myIp = currentIp || (st.info && st.info.virtual_ip)
      const myName = document.getElementById('userName').textContent || '本机'
      const myAvatar = document.getElementById('userAvatar').src || ''
      
      const peers = st.peers || []
      const peersByName = new Map()
      peers.forEach(p => {
         if (p.name) peersByName.set(p.name.toLowerCase().trim(), p.virtual_ip)
      })

      // Use Promise.all to handle async caching for all users
      const finalList = await Promise.all(backendList.map(async u => {
        let avatarUrl = u.avatar

        if (avatarUrl && !avatarUrl.startsWith('data:')) {
           const base = (cfg.userServerUrl || cfg.serverUrl || 'http://localhost:3001').replace(/\/$/, '')
           let cleanName = avatarUrl
           if (cleanName.startsWith('/avatars/')) cleanName = cleanName.substring(9)
           else if (cleanName.startsWith('avatars/')) cleanName = cleanName.substring(8)
           else if (cleanName.startsWith('http')) {
               // If it's full URL, try to extract filename?
               // Or just use it. But for caching we need filename.
               // Let's assume u.avatar is relative path from backend.
               // If it is http, we can't easily guess filename unless we parse.
               // If it is http, we might skip caching or try to hash it.
               // But usually it is /avatars/xxx.
           }

           if (!avatarUrl.startsWith('http')) {
               const remoteUrl = `${base}/avatars/${cleanName}`
               avatarUrl = await getCachedAvatar(cleanName, remoteUrl)
           }
        }
        if (!avatarUrl) avatarUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.username)

        let displayIp = u.virtual_ip

        if (!displayIp && u.username) {
           const foundIp = peersByName.get(u.username.toLowerCase().trim())
           if (foundIp) {
              displayIp = foundIp
           }
        }

        // Fetch correct wins/losses from player-rank-details API
        let wins = u.rank_wins || 0
        let losses = u.rank_losses || 0
        try {
          const rankApiUrl = `http://115.231.35.105:3001/api/admin/player-rank-details/${encodeURIComponent(u.username)}`
          const rankRes = await fetch(rankApiUrl)
          if (rankRes.ok) {
            const rankJson = await rankRes.json()
            if (rankJson.success && rankJson.data && rankJson.data.player) {
              wins = rankJson.data.player.totalWins || 0
              losses = rankJson.data.player.totalLosses || 0
            }
          }
        } catch (e) {
          console.error('Failed to fetch rank details for', u.username, e)
        }

        return {
          name: u.username,
          avatar: avatarUrl,
          ip: displayIp || '未知IP',
          isBackend: true,
          lastLogin: u.last_login,
          rankTier: u.rank_tier,
          rankIndex: u.rank_index,
          power: u.combat_power,
          wins: wins,
          losses: losses
        }
      }))

      const filteredList = finalList.filter(u => u.ip !== myIp)

      filteredList.sort((a, b) => {
        return a.name.localeCompare(b.name)
      })
      
      let html = `
        <div class="player-list-header">
            <div>玩家</div>
            <div>战力值</div>
            <div>段位等级</div>
            <div>胜/负 (胜率)</div>
        </div>
        <div style="height:1px; background:rgba(255,255,255,0.1); margin-bottom:8px;"></div>
      `
      if (myIp) {
         // Need to fetch my own stats? Currently not in backendList maybe?
         // Actually backendList contains everyone if logged in.
         // Let's find me in finalList
         const meInList = finalList.find(u => u.name === myName)
         if (meInList) {
             html += createPlayerCard(myName, myAvatar, myIp, true, '', false, meInList)
         } else {
             // Fallback if not found
             html += createPlayerCard(myName, myAvatar, myIp, true, '', false, { rankTier: 'Unranked', power: 0, wins: 0, losses: 0 })
         }
      }
      
      filteredList.forEach(u => {
        const isFriend = friendsList.some(f => f.name === u.name)
        html += createPlayerCard(u.name, u.avatar, u.ip, false, '', isFriend, u)
      })

      const totalCount = (myIp ? 1 : 0) + filteredList.length
      const tabBtn = document.querySelector('.tab-btn[data-tab="online"]')
      if (tabBtn) {
        tabBtn.textContent = `在线玩家 (${totalCount})`
      }

      if (html === '') {
         html = '<div class="no-broadcast">暂无其他在线玩家</div>'
      }
      
      wrap.innerHTML = html
    } catch (e) {
      console.error(e)
      wrap.textContent = '获取列表失败'
    }
  }
  window.renderOnlinePlayers = renderOnlinePlayers

  function createPlayerCard(name, avatar, ip, isMe, duration, isFriend, stats) {
    // 处理rankTier，将'Unranked'或空值转换为'定级中'
    let tier = (stats && stats.rankTier && stats.rankTier !== 'Unranked') ? stats.rankTier : '定级中'
    const rankIdx = (stats && stats.rankIndex) ? stats.rankIndex : ''
    // 处理power，将0或未设置显示为'-'
    let power = (stats && (stats.power !== undefined) && stats.power !== 0 && stats.power !== '-') ? stats.power : '-'
    const wins = (stats && (stats.wins !== undefined)) ? stats.wins : 0
    const losses = (stats && (stats.losses !== undefined)) ? stats.losses : 0
    
    // Calculate Win Rate
    const total = wins + losses
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0
    
    // Tier Color Logic
    let tierColor = '#94a3b8' // Default gray
    if (tier.includes('S')) tierColor = '#ef4444' // Red
    else if (tier.includes('A')) tierColor = '#fbbf24' // Gold
    else if (tier.includes('B')) tierColor = '#3b82f6' // Blue
    else if (tier.includes('C')) tierColor = '#22c55e' // Green
    
    return `
      <div class="online-player-card ${isMe ? 'is-me' : ''}">
        <div class="op-col-player">
            <img src="${avatar}" class="op-avatar" loading="lazy" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=error'">
            <div class="op-name" title="${name}">${name}</div>
            ${isMe ? '<span class="op-badge-me">ME</span>' : ''}
        </div>
        
        <div class="op-col-center" style="font-family:monospace; font-weight:bold; color:#fbbf24">
            ${power}
        </div>
        
        <div class="op-col-center">
            <span style="color:${tierColor}; font-weight:bold">${tier}</span>
        </div>
        
        <div class="op-col-center" style="font-family:monospace">
            <span style="color:#4ade80">${wins}</span>
            <span style="color:#64748b; margin:0 4px">/</span>
            <span style="color:#f87171">${losses}</span>
            <span style="color:#94a3b8; margin-left:6px; font-size:11px">(${winRate}%)</span>
        </div>
      </div>
    `
  }

  // Changelog Logic
  let changelogLoaded = false
  function normalizeChangelogEntry(item) {
    if (!item) return null
    return {
      version: item.version || '',
      date: item.created_at || item.date || new Date().toISOString(),
      content: item.changelog || item.notes || item.content || ''
    }
  }

  function loadSavedChangelogHistory() {
    try {
      const saved = localStorage.getItem('ee2x_changelog_history')
      const list = saved ? JSON.parse(saved) : []
      return Array.isArray(list) ? list : []
    } catch {
      return []
    }
  }

  function saveChangelogHistory(history) {
    try {
      localStorage.setItem('ee2x_changelog_history', JSON.stringify(history))
    } catch {}
  }

  function mergeChangelogHistory(existing, incoming) {
    const map = new Map()
    for (const item of [...(incoming || []), ...(existing || [])]) {
      const normalized = normalizeChangelogEntry(item)
      if (!normalized || !normalized.version) continue
      if (!map.has(normalized.version)) map.set(normalized.version, normalized)
    }
    const history = Array.from(map.values())
    history.sort((a, b) => {
      const vA = String(a.version || '').split('.').map(Number)
      const vB = String(b.version || '').split('.').map(Number)
      if (vA.length > 0 && vB.length > 0 && !vA.some(isNaN) && !vB.some(isNaN)) {
        const len = Math.max(vA.length, vB.length)
        for (let i = 0; i < len; i++) {
          const valA = vA[i] || 0
          const valB = vB[i] || 0
          if (valA !== valB) return valB - valA
        }
      }
      if (a.date && b.date) return new Date(b.date) - new Date(a.date)
      return 0
    })
    return history
  }

  async function syncChangelogEntryForVersion(version, fallbackNotes = '') {
    if (!version) return null
    let entry = null
    try {
      const mres = await window.ee2x.update2Manifest()
      if (mres && mres.ok && mres.manifest && String(mres.manifest.version || '') === String(version || '')) {
        entry = normalizeChangelogEntry({
          version: mres.manifest.version,
          changelog: mres.manifest.notes,
          created_at: mres.manifest.created_at
        })
      }
    } catch {}
    if (!entry && fallbackNotes) {
      entry = normalizeChangelogEntry({ version, changelog: fallbackNotes, date: new Date().toISOString() })
    }
    if (!entry || !entry.version) return null
    const merged = mergeChangelogHistory(loadSavedChangelogHistory(), [entry])
    saveChangelogHistory(merged)
    return entry
  }

  async function renderChangelog() {
    if (changelogLoaded) return
    const wrap = document.getElementById('changelogList')
    if (!wrap) return
    wrap.innerHTML = '<div class="no-broadcast">加载中...</div>'
    
    try {
      let notes = ''
      let version = ''

      if (!notes && updateManager && updateManager.updateInfo) {
         notes = updateManager.updateInfo.notes
         version = updateManager.updateInfo.version
      }
      if (!notes) {
         const mres = await window.ee2x.update2Manifest()
         if (mres && mres.ok && mres.manifest) {
           notes = mres.manifest.notes
           version = mres.manifest.version
         }
      }
      
      if (notes) {
        wrap.innerHTML = `
          <div class="item">
            <div style="font-weight:bold;margin-bottom:8px">最新版本: ${version}</div>
            <div style="white-space:pre-wrap;color:#c6d2f4;font-size:13px;line-height:1.5">${notes}</div>
          </div>
        `
        changelogLoaded = true
      } else {
        wrap.innerHTML = '<div class="no-broadcast">暂无更新日志</div>'
      }
    } catch (e) {
      wrap.textContent = '加载失败'
    }
  }

  // Update online players periodically
  setInterval(() => {
    if (isNetRunning) {
      renderOnlinePlayers()
    }
  }, 60000) // Refresh every 1 minute

  // Initial load
  if (isNetRunning) renderOnlinePlayers()

  

  
  document.getElementById('testServer').addEventListener('click', async () => {
    const url = document.getElementById('set_serverUrl').value.trim()
    const statusEl = document.getElementById('testStatus')
    statusEl.textContent = '测试中...'
    try {
      const r = await window.ee2x.testServer(url)
      statusEl.textContent = r.ok ? '连接正常' : '连接失败'
      statusEl.style.color = r.ok ? '#22c55e' : '#ef4444'
    } catch {
      statusEl.textContent = '连接异常'
      statusEl.style.color = '#ef4444'
    }
  })

  
  try {
    const btn = document.getElementById('testUserServer')
    const statusEl = document.getElementById('testUserStatus')
    if (btn) btn.addEventListener('click', async () => {
      const url = (document.getElementById('set_userServerUrl')?.value || '').trim()
      statusEl.textContent = '测试中...'
      try {
        const r = await window.ee2x.testUserServer(url)
        statusEl.textContent = r && r.ok ? '连接正常' : '连接失败'
        statusEl.style.color = r && r.ok ? '#22c55e' : '#ef4444'
      } catch {
        statusEl.textContent = '连接异常'
        statusEl.style.color = '#ef4444'
      }
    })
  } catch {}
  

  
  
  const serverEditModal = document.getElementById('serverEditModal')
  document.getElementById('editServer').addEventListener('click', () => {
    const input = document.getElementById('edit_serverUrl')
    input.value = cfg.serverUrl || ''
    serverEditModal.classList.remove('hidden')
    input.focus()
  })
  document.getElementById('closeServerUrl').addEventListener('click', () => {
    serverEditModal.classList.add('hidden')
  })
  document.getElementById('saveServerUrl').addEventListener('click', async () => {
    const v = document.getElementById('edit_serverUrl').value.trim()
    if (v) {
      cfg.serverUrl = v
      document.getElementById('set_serverUrl').value = v
      try { await window.ee2x.cfgSet(cfg) } catch {}
    }
    serverEditModal.classList.add('hidden')
  })

  // 打开游戏目录按钮事件
  document.getElementById('openGameDir').addEventListener('click', async () => {
    try {
      const result = await window.ee2x.openGameDirectory()
      if (!result.success) {
        alert(result.error || '打开游戏目录失败')
      }
    } catch (error) {
      alert('打开游戏目录失败')
    }
  })

  // 取消启动时强制选择游戏路径弹窗

  try {
    const cfg2 = await window.ee2x.cfgGet()
    const wsUrl = (cfg2 && cfg2.updateServerWs)
      ? cfg2.updateServerWs
      : 'ws://115.231.35.105:3010/api/update/v1/channels/stable/ws'
    const ws = new WebSocket(wsUrl)
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg && msg.type === 'update_available') {
          void checkUpdateAndRender(true, 'ws')
        }
      } catch {}
    }
  } catch {}

  await checkUpdateAndRender(true, 'init')
  // await renderBroadcast() // Removed initial render here, handled by updateBroadcastMode
  try { setupBroadcastScroll() } catch {}
  // Poll broadcast logic moved to updateBroadcastMode
  // setInterval(renderBroadcast, 60000)
  updateBroadcastMode() 
  
  try { await applyBackground() } catch {}
  try { applyTheme() } catch {}

  try {
    const badge = document.getElementById('runtimeBadge')
    const startedAt = Date.now()
    function fmt(sec){ const h = Math.floor(sec/3600); const m = Math.floor((sec%3600)/60); const s = sec%60; const pad = (n)=>String(n).padStart(2,'0'); return `${pad(h)}:${pad(m)}:${pad(s)}` }
    setInterval(() => { try { const sec = Math.floor((Date.now()-startedAt)/1000); badge.textContent = `运行时间 ${fmt(sec)}` } catch {} }, 1000)
  } catch {}

  async function renderResults(){
    try {
      const r = await window.ee2x.results('https://ee2x.lj2.xyz:3443')
      const wrap = document.getElementById('resultsList')
      wrap.innerHTML = ''
      if (!r || !r.ok) { wrap.textContent = '暂时无胜负数据'; return }
      if (r.summary) {
        const sum = document.createElement('div')
        sum.className = 'item'
        sum.textContent = `总场次:${r.summary.total} 红方胜:${r.summary.redWins} 蓝方胜:${r.summary.blueWins}`
        wrap.appendChild(sum)
      }
      const items = r.items || []
      for (const it of items){
        const div = document.createElement('div')
        div.className = 'item'
        div.textContent = (it && it.text) || String(it)
        wrap.appendChild(div)
      }
    } catch {
      const wrap = document.getElementById('resultsList')
      wrap.textContent = '无法读取胜负数据'
    }
  }

  // 右侧栏不显示当前胜负总览
  // first-run desktop shortcut prompt
  try {
    const exists = await window.ee2x.shortcutExistsDesktop()
    if (!exists && !cfg.askedDesktop) {
      const sm = document.getElementById('shortcutModal')
      sm.classList.remove('hidden')
      document.getElementById('createShortcutNow').onclick = async () => {
        try { const ok = await window.ee2x.createShortcut(); alert(ok ? '已创建桌面快捷方式' : '创建失败') } catch {}
        cfg.askedDesktop = true
        await window.ee2x.cfgSet(cfg)
        sm.classList.add('hidden')
      }
      document.getElementById('createShortcutLater').onclick = async () => {
        cfg.askedDesktop = true
        await window.ee2x.cfgSet(cfg)
        sm.classList.add('hidden')
      }
    }
  } catch {}

  // 主窗口截图到剪贴板
  document.getElementById('shotMainBtn').addEventListener('click', async () => {
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { const ok = await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { await window.ee2x.openExternal('about:blank') } catch {}
    try { const ok = await window.ee2x.openExternal('about:blank') } catch {}
  })
  // 截图按钮：捕获阶段拦截原事件并执行截图
  try {
    const btn = document.getElementById('shotMainBtn')
    if (btn) {
        btn.addEventListener('click', async (e) => {
          try { e.preventDefault(); e.stopImmediatePropagation() } catch {}
          try {
            const ov = document.createElement('div')
            ov.className = 'shot-anim'
            document.body.appendChild(ov)
            ov.addEventListener('animationend', () => { try { ov.remove() } catch {} }, { once:true })
            await window.ee2x.captureToClipboard()
          } catch { alert('截图失败') }
        }, true)
    }
  } catch {}

  // Doc Fab (Changelog)
  const docBtn = document.getElementById('docBtn')
  if (docBtn) {
    docBtn.addEventListener('click', () => {
        const modal = document.getElementById('detailModal')
        if (modal) modal.classList.remove('hidden')
        
        const detailContent = document.getElementById('detailContent')
        if (detailContent) {
            renderChangelogToElement(detailContent)
        }
    })
  }
  
  // Re-use render logic for standalone modal
  async function renderChangelogToElement(container) {
       container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px">正在加载更新日志...</div>'
       try {
           let history = loadSavedChangelogHistory()
           
           // Fallback: check current update info if no history
           if (history.length === 0) {
               let notes = ''
               let version = ''
               if (typeof updateManager !== 'undefined' && updateManager && updateManager.updateInfo) {
                    notes = updateManager.updateInfo.notes
                    version = updateManager.updateInfo.version
               }
               if (!notes) {
                    try {
                        const mres = await window.ee2x.update2Manifest()
                        if (mres && mres.ok && mres.manifest) {
                            notes = mres.manifest.notes
                            version = mres.manifest.version
                        }
                    } catch(e) {}
               }
               if (notes) {
                   history.push({ version: version || '未知', date: new Date().toISOString(), content: notes })
               }
           }

           // Save back to local storage
           history = mergeChangelogHistory([], history)
           saveChangelogHistory(history)

           // Render
           let html = ''
           if (history.length > 0) {
               history.forEach(item => {
                   const date = item.date ? new Date(item.date).toLocaleDateString() : ''
                   let content = item.content || item.notes || ''
                   content = content.replace(/\n/g, '<br>')
                   content = content.replace(/### (.*)/g, '<h3>$1</h3>')
                   content = content.replace(/- (.*)/g, '<li>$1</li>')
                   
                   html += `
                       <div class="item" style="background:rgba(15,20,36,0.3);padding:12px;margin-bottom:12px;border-radius:8px;border:1px solid rgba(42,52,80,0.5)">
                           <div style="display:flex;justify-content:space-between;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:4px">
                               <span style="font-weight:bold;color:#e6eaf2;font-size:15px">${item.version}</span>
                               <span style="color:#94a3b8;font-size:12px">${date}</span>
                           </div>
                           <div class="notes" style="color:#c6d2f4;font-size:14px;line-height:1.6">${content}</div>
                       </div>
                   `
               })
           }

           if (html) {
               container.innerHTML = html
           } else {
               container.innerHTML = '<div class="no-broadcast">暂无更新日志</div>'
           }
       } catch (e) {
           container.innerHTML = '<div class="no-broadcast">加载出错: ' + e.message + '</div>'
       }
  }
}


// 背景管理功能
async function applyBackground() {
  try {
    console.log('开始应用背景，当前配置:', cfg)

    // 如果没有配置背景类型，但有背景路径，则根据文件扩展名推断类型
    let bgType = cfg.bgType || 'none'
    const bgImagePath = cfg.bgImagePath || ''

    console.log('背景类型:', bgType, '背景路径:', bgImagePath)

    if (bgType === 'none' && bgImagePath && bgImagePath.trim()) {
      // 根据文件扩展名自动推断背景类型
      const ext = bgImagePath.toLowerCase().split('.').pop()
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
        bgType = 'image'
        cfg.bgType = 'image'
      } else if (['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm'].includes(ext)) {
        bgType = 'video'
        cfg.bgType = 'video'
      }
      console.log('推断的背景类型:', bgType)
    }

    const bgImageEl = document.getElementById('backgroundImage')
    const bgVideoEl = document.getElementById('backgroundVideo')

    // 隐藏所有背景元素
    bgImageEl.style.display = 'none'
    bgVideoEl.style.display = 'none'

    // 标准化路径格式，确保使用正斜杠
    const normalizedPath = bgImagePath.replace(/\\/g, '/')

    // 获取启动器路��
    const launcherPath = await window.ee2x?.getLauncherPath?.() || '.'
    console.log('启动器路径:', launcherPath)

    // 根据背景类型和文件路径加载背景
    if (bgType === 'image' && bgImagePath && bgImagePath.trim()) {
      const position = cfg.bgImagePosition || { x: 0, y: 0, scale: 1 }

      // 构建完整的文件路径（与applySelectedBackground逻辑保持一致）
      let fullPath
      if (normalizedPath.startsWith('Data/bg/') || normalizedPath.startsWith('data/bg/')) {
        // 背景文件在启动器所在目录的父目录下的Data/bg中
        const lastSlashIndex = launcherPath.lastIndexOf('/')
        const parentPath = lastSlashIndex > 0 ? launcherPath.substring(0, lastSlashIndex) : launcherPath
        fullPath = parentPath + '/' + normalizedPath
      } else if (normalizedPath.includes(':') || normalizedPath.startsWith('/')) {
        // 绝对路径
        fullPath = normalizedPath
      } else {
        // 相对路径，基于启动器目录的父目录
        const lastSlashIndex = launcherPath.lastIndexOf('/')
        const parentPath = lastSlashIndex > 0 ? launcherPath.substring(0, lastSlashIndex) : launcherPath
        fullPath = parentPath + '/' + normalizedPath
      }

      // 确保路径格式正确
      fullPath = fullPath.replace(/\\/g, '/')
      if (!fullPath.startsWith('file:///') && !fullPath.startsWith('http')) {
        fullPath = 'file:///' + fullPath
      }

      console.log('加载背景图片:', fullPath)

      bgImageEl.onload = () => {
        console.log('背景图片加载成功')
        bgImageEl.style.display = 'block'
        try { const b = cfg.bgBlur || 0; document.documentElement.style.setProperty('--bg-blur', b + 'px'); bgImageEl.style.filter = 'blur(' + b + 'px)' } catch {}
      }

      bgImageEl.onerror = () => {
        console.error('背景图片加载失败:', fullPath)
      }

      bgImageEl.src = fullPath
      bgImageEl.style.transform = `translate(${position.x}px, ${position.y}px) scale(${position.scale})`
      bgImageEl.style.objectFit = 'cover'

    } else if (bgType === 'video' && bgImagePath && bgImagePath.trim()) {
      // 构建完整的文件路径（与applySelectedBackground逻辑保持一致）
      let fullPath
      if (normalizedPath.startsWith('Data/bg/') || normalizedPath.startsWith('data/bg/')) {
        // 背景文件在启动器所在目录的父目录下的Data/bg中
        const lastSlashIndex = launcherPath.lastIndexOf('/')
        const parentPath = lastSlashIndex > 0 ? launcherPath.substring(0, lastSlashIndex) : launcherPath
        fullPath = parentPath + '/' + normalizedPath
      } else if (normalizedPath.includes(':') || normalizedPath.startsWith('/')) {
        // 绝对路径
        fullPath = normalizedPath
      } else {
        // 相对路径，基于启动器目录的父目录
        const lastSlashIndex = launcherPath.lastIndexOf('/')
        const parentPath = lastSlashIndex > 0 ? launcherPath.substring(0, lastSlashIndex) : launcherPath
        fullPath = parentPath + '/' + normalizedPath
      }

      // 确保路径格式正确
      fullPath = fullPath.replace(/\\/g, '/')
      if (!fullPath.startsWith('file:///') && !fullPath.startsWith('http')) {
        fullPath = 'file:///' + fullPath
      }

      console.log('加载背景视频:', fullPath)

      bgVideoEl.onloadeddata = () => {
        console.log('背景视频加载成功')
        bgVideoEl.style.display = 'block'
        try { const b = cfg.bgBlur || 0; document.documentElement.style.setProperty('--bg-blur', b + 'px'); bgVideoEl.style.filter = 'blur(' + b + 'px)' } catch {}
        bgVideoEl.play().catch(err => console.warn('视频自动播放失败:', err))
      }

      bgVideoEl.onerror = () => {
        console.error('背景视频加载失败:', fullPath)
      }

      bgVideoEl.src = fullPath
      bgVideoEl.volume = (cfg.bgVideoVolume || 0) / 100
      bgVideoEl.muted = true // 静音播放背景视频
      bgVideoEl.loop = true // 循环播放
    } else {
      console.log('无有效背景设置，使用默认背景')
    }
  } catch (error) {
    console.error('应用背景失败:', error)
  }
}

// 立即应用选择的背景到启动器背景展示
async function applySelectedBackground(type, relativePath) {
  try {
    // 更新全局配置
    cfg.bgImagePath = relativePath
    cfg.bgType = type

    const bgImageEl = document.getElementById('backgroundImage')
    const bgVideoEl = document.getElementById('backgroundVideo')

    // 隐藏所有背景元素
    bgImageEl.style.display = 'none'
    bgVideoEl.style.display = 'none'

    if (!relativePath || relativePath.trim() === '') {
      console.log('背景路径为空，隐藏背景')
      return
    }

    // 获取启动器路径
    const launcherPath = await window.ee2x?.getLauncherPath?.() || '.'
    const normalizedPath = relativePath.replace(/\\/g, '/')

    console.log('启动器路径:', launcherPath)
    console.log('相对路径:', normalizedPath)

    let fullPath
    if (normalizedPath.startsWith('Data/bg/') || normalizedPath.startsWith('data/bg/')) {
      // 背景文件在启动器所在目录的父目录下的Data/bg中
      // 因为launcherPath是启动器所在目录(通常为Core)，需要加上父目录
      const lastSlashIndex = launcherPath.lastIndexOf('/')
      const parentPath = lastSlashIndex > 0 ? launcherPath.substring(0, lastSlashIndex) : launcherPath
      fullPath = parentPath + '/' + normalizedPath
    } else if (normalizedPath.includes(':') || normalizedPath.startsWith('/')) {
      // 绝对路径
      fullPath = normalizedPath
    } else {
      // 相对路径，基于启动器目录的父目录
      const lastSlashIndex = launcherPath.lastIndexOf('/')
      const parentPath = lastSlashIndex > 0 ? launcherPath.substring(0, lastSlashIndex) : launcherPath
      fullPath = parentPath + '/' + normalizedPath
    }

    // 确保路径格式正确
    fullPath = fullPath.replace(/\\/g, '/')
    if (!fullPath.startsWith('file:///') && !fullPath.startsWith('http')) {
      fullPath = 'file:///' + fullPath
    }

    console.log('构建的完整路径:', fullPath)

    console.log(`立即应用${type}背景:`, fullPath)

    if (type === 'image') {
      bgImageEl.onload = () => {
        console.log('图片背景应用成功')
        bgImageEl.style.display = 'block'
        try { const b = cfg.bgBlur || 0; document.documentElement.style.setProperty('--bg-blur', b + 'px'); bgImageEl.style.filter = 'blur(' + b + 'px)' } catch {}
      }
      bgImageEl.onerror = () => {
        console.error('图片背景应用失败:', fullPath)
        // 显示错误提示或保持隐藏
        bgImageEl.style.display = 'none'
      }
      bgImageEl.src = fullPath
      bgImageEl.style.objectFit = 'cover'

    } else if (type === 'video') {
      bgVideoEl.onloadeddata = () => {
        console.log('视频背景应用成功')
        bgVideoEl.style.display = 'block'
        try { const b = cfg.bgBlur || 0; document.documentElement.style.setProperty('--bg-blur', b + 'px'); bgVideoEl.style.filter = 'blur(' + b + 'px)' } catch {}
        bgVideoEl.play().catch(err => console.warn('视频自动播放失败:', err))
      }
      bgVideoEl.onerror = () => {
        console.error('视频背景应用失败:', fullPath)
        bgVideoEl.style.display = 'none'
      }
      bgVideoEl.src = fullPath
      bgVideoEl.volume = 0
      bgVideoEl.muted = true
      bgVideoEl.loop = true
    }
  } catch (error) {
    console.error('应用选择的背景失败:', error)
  }
}


function updateBackgroundSettingsUI() {
  const bgType = document.getElementById('set_bgType').value
  const bgImageRow = document.getElementById('bgImageRow')
  const bgVideoRow = document.getElementById('bgVideoRow')
  const bgBlurRow = document.getElementById('bgBlurRow')

  bgImageRow.style.display = bgType === 'image' ? 'block' : 'none'
  bgVideoRow.style.display = bgType === 'video' ? 'block' : 'none'
  try { if (bgBlurRow) bgBlurRow.style.display = (bgType === 'image' || bgType === 'video') ? 'block' : 'none' } catch {}
}

document.getElementById('set_bgType').addEventListener('change', async () => {
  updateBackgroundSettingsUI()

  // 根据选择的类型立即应用对应的背景
  const bgType = document.getElementById('set_bgType').value
  if (bgType === 'image') {
    const imagePath = document.getElementById('set_bgImage').value
    if (imagePath) {
      await applySelectedBackground('image', imagePath)
    } else {
      // 如果没有图片，隐藏所有背景
      document.getElementById('backgroundImage').style.display = 'none'
      document.getElementById('backgroundVideo').style.display = 'none'
    }
  } else if (bgType === 'video') {
    const videoPath = document.getElementById('set_bgVideo').value
    if (videoPath) {
      await applySelectedBackground('video', videoPath)
    } else {
      // 如果没有视频，隐藏所有背景
      document.getElementById('backgroundImage').style.display = 'none'
      document.getElementById('backgroundVideo').style.display = 'none'
    }
  } else {
    // 选择"无背景"，隐藏所有背景
    document.getElementById('backgroundImage').style.display = 'none'
    document.getElementById('backgroundVideo').style.display = 'none'
  }
})

document.getElementById('browseBgVideo').addEventListener('click', async () => {
  try {
    const result = await window.ee2x.selectFile('video')
    if (result) {
      // 自动保存背景视频到本地video目录
      const saveResult = await window.ee2x.saveBackgroundFile(result, 'video')

      if (saveResult.success) {
        // 使用相对路径
        const relativePath = saveResult.relativePath.replace(/\\/g, '/')
        document.getElementById('set_bgVideo').value = relativePath

        // 自动设置背景类型为视频
        document.getElementById('set_bgType').value = 'video'
        updateBackgroundSettingsUI()

        // 立即应用到背景展示
        await applySelectedBackground('video', relativePath)

        console.log('背景视频已保存到:', saveResult.localPath)
        console.log('使用相对路径:', relativePath)
      } else {
        // 如果保存失败，显示错误信息
        alert(saveResult.error || '背景视频保存失败')
        console.warn('背景视频保存失败:', saveResult.error)
      }
    }
  } catch (error) {
    console.error('选择背景视频时出错:', error)
  }
})


document.getElementById('bgVideoVolume').addEventListener('input', (e) => {
  document.getElementById('volumeValue').textContent = e.target.value + '%'
  const bgVideoEl = document.getElementById('backgroundVideo')
  if (bgVideoEl.style.display !== 'none') {
    bgVideoEl.volume = e.target.value / 100
  }
})

document.getElementById('bgBlur')?.addEventListener('input', (e) => {
  try {
    const val = parseInt(e.target.value, 10) || 0
    const txt = document.getElementById('blurValue')
    if (txt) txt.textContent = val + 'px'
    cfg.bgBlur = val
    document.documentElement.style.setProperty('--bg-blur', val + 'px')
    const img = document.getElementById('backgroundImage')
    const vid = document.getElementById('backgroundVideo')
    if (img) img.style.filter = 'blur(' + val + 'px)'
    if (vid) vid.style.filter = 'blur(' + val + 'px)'
  } catch {}
})

// 窗口大小调节功能
let isResizable = false
document.getElementById('resizeWindowBtn')?.addEventListener('click', async () => {
  const btn = document.getElementById('resizeWindowBtn')
  isResizable = !isResizable

  if (isResizable) {
    btn.textContent = '关闭窗口调节'
    btn.style.background = '#ef4444'
    try {
      await window.ee2x.setResizable(true)
      updateCurrentWindowSize()
      // 定期更新窗口大小显示
      window.sizeUpdateInterval = setInterval(updateCurrentWindowSize, 500)
    } catch {}
  } else {
    btn.textContent = '开启窗口调节'
    btn.style.background = '#3b82f6'
    try {
      await window.ee2x.setResizable(false)
      if (window.sizeUpdateInterval) {
        clearInterval(window.sizeUpdateInterval)
      }
    } catch {}
  }
})

document.getElementById('saveWindowSizeBtn')?.addEventListener('click', async () => {
  try {
    await window.ee2x.saveWindowSize()
    alert('窗口大小已保存，下次启动将使用此大小')
  } catch (error) {
    alert('保存失败: ' + error.message)
  }
})

async function updateCurrentWindowSize() {
  try {
    const size = await window.ee2x.getWindowSize()
    document.getElementById('currentWindowSize').textContent = `${size.width}×${size.height}`
  } catch {}
}

// 背景图片预览拖拽功能
let bgPreviewData = {
  isDragging: false,
  startX: 0,
  startY: 0,
  imageX: 0,
  imageY: 0,
  scale: 1
}

function initBgPreview(imagePath) {
  const container = document.getElementById('bgPreviewContainer')
  const image = document.getElementById('bgPreviewImage')
  const cropArea = document.getElementById('bgPreviewCropArea')

  container.style.display = 'block'
  image.src = 'file:///' + imagePath.replace(/\\/g, '/')

  image.onload = () => {
    bgPreviewData.scale = Math.max(
      cropArea.offsetWidth / image.naturalWidth,
      cropArea.offsetHeight / image.naturalHeight
    )
    updateBgPreviewPosition()
  }

  // 添加拖拽事件
  image.addEventListener('mousedown', startBgDrag)
  document.addEventListener('mousemove', handleBgDrag)
  document.addEventListener('mouseup', endBgDrag)

  // 添加重置和保存按钮事件
  }

function startBgDrag(e) {
  bgPreviewData.isDragging = true
  bgPreviewData.startX = e.clientX
  bgPreviewData.startY = e.clientY
  document.getElementById('bgPreviewOverlay').classList.add('active')
  e.preventDefault()
}

function handleBgDrag(e) {
  if (!bgPreviewData.isDragging) return

  const deltaX = e.clientX - bgPreviewData.startX
  const deltaY = e.clientY - bgPreviewData.startY

  bgPreviewData.imageX += deltaX
  bgPreviewData.imageY += deltaY

  bgPreviewData.startX = e.clientX
  bgPreviewData.startY = e.clientY

  updateBgPreviewPosition()
}

function endBgDrag() {
  bgPreviewData.isDragging = false
  document.getElementById('bgPreviewOverlay')?.classList.remove('active')
}

function updateBgPreviewPosition() {
  const image = document.getElementById('bgPreviewImage')
  if (image) {
    image.style.transform = `translate(${bgPreviewData.imageX}px, ${bgPreviewData.imageY}px) scale(${bgPreviewData.scale})`
    image.style.width = `${image.naturalWidth}px`
    image.style.height = `${image.naturalHeight}px`
  }
}

function resetBgPreview() {
  bgPreviewData.imageX = 0
  bgPreviewData.imageY = 0
  updateBgPreviewPosition()
}

function saveBgPreviewPosition() {
  const imagePath = document.getElementById('set_bgImage').value
  if (imagePath) {
    const position = {
      x: bgPreviewData.imageX,
      y: bgPreviewData.imageY,
      scale: bgPreviewData.scale
    }
    // 保存背景位置到配置
    if (cfg) {
      cfg.bgImagePosition = position
    }
    alert('背景预览位置已保存')
  }
}

 

 

// 修改背景预览按钮功能
document.getElementById('previewBgImage')?.addEventListener('click', () => {
  const imagePath = document.getElementById('set_bgImage').value
  if (imagePath) {
    initBgPreview(imagePath)
  }
})

init()
function applyTheme(){
  try {
    const name = cfg && cfg.theme ? String(cfg.theme) : 'dark'
    const body = document.body
    const themeBtn = document.getElementById('themeBtn')
    body.classList.remove('theme-dark','theme-light','theme-ee2x','theme-aoe','theme-warcraft','theme-army','theme-airforce')
    if (name === 'light') {
      body.classList.add('theme-light')
      if (themeBtn) {
        themeBtn.textContent = '☀️'
        themeBtn.title = '切换到暗黑主题'
      }
    } else {
      body.classList.add('theme-dark')
      if (themeBtn) {
        themeBtn.textContent = '🌙'
        themeBtn.title = '切换到浅色主题'
      }
    }
  } catch {}
}

// 启动器更新管理器
class LauncherUpdateManager {
  constructor() {
    this.currentLauncherVersion = '1.0.0' // 默认版本，将从package.json动态获取
    this.updateInfo = null
    this.isUpdating = false
    this.ignoredVersions = this.loadIgnoredVersions() // 加载已忽略的版本列表
    this.disabledReason = '启动器自更新已停用，当前仅保留游戏内容强制同步。'
    this.initVersion()
  }

  // 加载已忽略的版本列表
  loadIgnoredVersions() {
    try {
      const saved = localStorage.getItem('ee2x_launcher_ignored_versions')
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('加载已忽略版本失败:', error)
      return []
    }
  }

  // 保存已忽略的版本列表
  saveIgnoredVersions() {
    try {
      localStorage.setItem('ee2x_launcher_ignored_versions', JSON.stringify(this.ignoredVersions))
    } catch (error) {
      console.error('保存已忽略版本失败:', error)
    }
  }

  // 检查版本是否已被忽略
  isVersionIgnored(version) {
    return this.ignoredVersions.includes(version)
  }

  // 忽略指定版本
  ignoreVersion(version) {
    if (!this.isVersionIgnored(version)) {
      this.ignoredVersions.push(version)
      this.saveIgnoredVersions()
      console.log(`[更新管理] 已忽略版本: ${version}`)
    }
  }

  // 从忽略列表中移除版本
  removeFromIgnoredVersions(version) {
    const index = this.ignoredVersions.indexOf(version)
    if (index > -1) {
      this.ignoredVersions.splice(index, 1)
      this.saveIgnoredVersions()
    }
  }

  // 初始化版本号
  async initVersion() {
    try {
      const version = await window.ee2x.getCurrentVersion()
      this.currentLauncherVersion = version
      console.log(`当前启动器版本: ${this.currentLauncherVersion}`)
    } catch (error) {
      console.error('获取当前版本失败:', error)
      this.currentLauncherVersion = '1.0.0' // 使用默认版本
    }
  }

  // 检查启动器更新
  async checkForUpdates() {
    const statusEl = document.getElementById('launcherUpdateStatus')
    if (statusEl) {
      statusEl.textContent = '已停用'
      statusEl.style.color = '#94a3b8'
    }
    this.updateInfo = null
    return false
  }
  
  // 版本比较
  isVersionNewer(remote, local) {
    const parseVersion = (version) => {
      // 分离数字部分和文本部分
      const parts = version.split('.')
      const numbers = []
      const suffix = []

      for (const part of parts) {
        const match = part.match(/^(\d+)(.*)$/)
        if (match) {
          numbers.push(parseInt(match[1], 10))
          if (match[2]) suffix.push(match[2])
        }
      }

      return { numbers, suffix: suffix.join('.') }
    }

    const remoteVer = parseVersion(remote)
    const localVer = parseVersion(local)

    console.log(`[版本比较] 远程版本: ${remote} ->`, remoteVer)
    console.log(`[版本比较] 本地版本: ${local} ->`, localVer)

    // 比较数字部分
    const maxLength = Math.max(remoteVer.numbers.length, localVer.numbers.length)
    for (let i = 0; i < maxLength; i++) {
      const remoteNum = remoteVer.numbers[i] || 0
      const localNum = localVer.numbers[i] || 0

      if (remoteNum > localNum) {
        console.log(`[版本比较] 远程版本在位置${i}更大: ${remoteNum} > ${localNum}`)
        return true
      }
      if (remoteNum < localNum) {
        console.log(`[版本比较] 本地版本在位置${i}更大: ${localNum} > ${remoteNum}`)
        return false
      }
    }

    // 如果数字部分相同，有后缀的版本更新
    if (remoteVer.suffix && !localVer.suffix) {
      console.log(`[版本比较] 远程版本有后缀而本地版本没有`)
      return true
    }
    if (!remoteVer.suffix && localVer.suffix) {
      console.log(`[版本比较] 本地版本有后缀而远程版本没有`)
      return false
    }
    if (remoteVer.suffix && localVer.suffix) {
      const result = remoteVer.suffix > localVer.suffix
      console.log(`[版本比较] 后缀比较: "${remoteVer.suffix}" > "${localVer.suffix}" = ${result}`)
      return result
    }

    console.log(`[版本比较] 版本相同`)
    return false
  }

  // 显示更新信息
  showUpdateInfo() {
    const updateInfoEl = document.getElementById('launcherUpdateInfo')
    const newVersionEl = document.getElementById('launcherNewVersion')
    const changelogEl = document.getElementById('launcherUpdateChangelog')
    const badgeEl = document.getElementById('launcherUpdateBadge')

    updateInfoEl.style.display = 'block'
    newVersionEl.textContent = `发现新版本 v${this.updateInfo.version}`
    changelogEl.textContent = this.updateInfo.notes

    if (this.updateInfo.forceUpdate) {
      badgeEl.textContent = '强制更新'
      badgeEl.className = 'badge bg-danger'
    } else {
      badgeEl.textContent = '推荐更新'
      badgeEl.className = 'badge bg-warning'
    }
  }

  // 下载更新
  async downloadUpdate() {
    alert(this.disabledReason)
  }

  // 显示安装提示
  showInstallPrompt() {
    const message = this.updateInfo.forceUpdate
      ? '启动器更新已下载完成！这是一个强制更新，请保存当前工作并重新启动启动器。'
      : '启动器更新已下载完成！建议您重新启动启动器以应用更新。'

    if (confirm(message + '\n\n是否现在重新启动启动器？')) {
      // 重新启动应用
      if (window.ee2x && window.ee2x.restartLauncher) {
        window.ee2x.restartLauncher()
      } else {
        // 备用方案：使用location.reload
        location.reload()
      }
    }
  }

  // 显示强制更新通知
  showForceUpdateNotification() {
    // 在主界面显示强制更新提示
    const notification = document.createElement('div')
    notification.className = 'alert alert-danger alert-dismissible fade show position-fixed'
    notification.style.cssText = 'top: 10px; right: 10px; z-index: 9999; max-width: 400px;'
    notification.innerHTML = `
      <h6><i class="bi bi-exclamation-triangle"></i> 强制更新</h6>
      <p class="mb-2">发现启动器强制更新 v${this.updateInfo.version}，为了您的使用安全和体验，请立即更新。</p>
      <button class="btn btn-danger btn-sm" onclick="launcherUpdateManager.downloadUpdate()">立即更新</button>
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `

    document.body.appendChild(notification)

    // 自动消失时间（如果是强制更新，不自动消失）
    if (!this.updateInfo.forceUpdate) {
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove()
        }
      }, 10000)
    }
  }

  // 忽略更新
  ignoreUpdate() {
    const updateInfoEl = document.getElementById('launcherUpdateInfo')
    if (updateInfoEl) {
      updateInfoEl.style.display = 'none'
    }

    // 关闭可能存在的更新弹窗
    const modals = document.querySelectorAll('.modal')
    modals.forEach(modal => {
      if (modal.textContent.includes('发现启动器更新') || modal.textContent.includes('发现新版本')) {
        modal.remove()
      }
    })

    const statusEl = document.getElementById('launcherUpdateStatus')
    if (statusEl) {
      statusEl.textContent = '已停用'
      statusEl.style.color = '#6c757d'
    }

    this.updateInfo = null
  }

  // 显示更新弹窗
  showUpdateDialog() {
    // 创建模态弹窗
    const modal = document.createElement('div')
    modal.className = 'modal show'
    modal.style.cssText = `
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    `

    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered" style="max-width: 500px;">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="bi bi-download"></i> 发现启动器更新
            </h5>
            ${!this.updateInfo.forceUpdate ? '<button type="button" class="btn-close btn-close-white" onclick="this.closest(\'.modal\').remove()"></button>' : ''}
          </div>
          <div class="modal-body">
            <div class="alert alert-info d-flex align-items-center">
              <i class="bi bi-info-circle me-2"></i>
              <div>
                <strong>新版本: v${this.updateInfo.version}</strong><br>
                <small>当前版本: v${this.currentLauncherVersion}</small>
              </div>
            </div>

            <div class="mb-3">
              <h6>更新内容:</h6>
              <p class="text-muted mb-0">${this.updateInfo.notes}</p>
            </div>

            ${this.updateInfo.forceUpdate ? `
              <div class="alert alert-warning d-flex align-items-center">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <div>这是一个强制更新，为了您的使用安全和体验，请立即更新。</div>
              </div>
            ` : ''}

            <div class="progress mb-3" id="updateProgress" style="display: none; height: 8px;">
              <div class="progress-bar progress-bar-striped progress-bar-animated" id="updateProgressBar" style="width: 0%"></div>
            </div>

            <div class="text-center" id="updateStatusText" style="display: none; font-size: 0.9rem; color: #666;">
              准备下载...
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" id="confirmUpdateBtn" onclick="launcherUpdateManager.startAutoUpdate()">
              <i class="bi bi-download"></i> 立即更新
            </button>
            ${!this.updateInfo.forceUpdate ? `
              <button type="button" class="btn btn-secondary" onclick="this.closest(\'.modal\').remove()">稍后更新</button>
              <button type="button" class="btn btn-outline-secondary" onclick="launcherUpdateManager.ignoreUpdate(); this.closest(\'.modal\').remove()">
                <i class="bi bi-x-circle"></i> 忽略此版本
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // 点击模态背景关闭（非强制更新时）
    if (!this.updateInfo.forceUpdate) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove()
        }
      })
    }
  }

  // 开始自动更新流程
  async startAutoUpdate() {
    alert(this.disabledReason)
  }

  // 自动下载并安装更新
  async autoDownloadAndInstall() {
    const progressBar = document.getElementById('updateProgressBar')
    const progress = document.getElementById('updateProgress')
    const statusText = document.getElementById('updateStatusText')

    progress.style.display = 'block'
    statusText.style.display = 'block'

    // 第一步：下载更新
    statusText.textContent = '正在下载更新包...'
    this.updateDownloadProgress(0)

    try {
      // 调用下载API
      const result = await window.ee2x.update2Download(this.updateInfo.downloadUrl)

      if (!result.ok) {
        throw new Error(result.error || '下载失败')
      }

      // 模拟下载进度
      await this.simulateDownloadProgress()

      // 第二步：解压安装
      statusText.textContent = '正在解压安装...'
      this.updateDownloadProgress(80)

      const installResult = await this.extractAndInstall()

      if (!installResult.success) {
        throw new Error(installResult.error || '安装失败')
      }

      // 第三步：完成更新
      this.updateDownloadProgress(100)
      statusText.textContent = '更新完成！'

      // 如果更新成功，从忽略列表中移除当前版本
      if (this.updateInfo && this.updateInfo.version) {
        this.removeFromIgnoredVersions(this.updateInfo.version)
        console.log(`[更新管理] 版本 ${this.updateInfo.version} 更新成功，已从忽略列表中移除`)
        try {
          const entry = await syncChangelogEntryForVersion(this.updateInfo.version, this.updateInfo.notes || '')
          if (entry) {
            this.updateInfo.notes = entry.content || this.updateInfo.notes || ''
            currentUpdateNotes = this.updateInfo.notes
            try { showUpdateInfoRight(this.updateInfo.version, this.updateInfo.notes) } catch {}
          }
        } catch (e) {
          console.error('同步更新日志失败:', e)
        }
      }

      // 显示重启提示
      setTimeout(() => {
        this.showRestartPrompt()
      }, 1000)

    } catch (error) {
      throw error
    }
  }

  // 模拟下载进度
  simulateDownloadProgress() {
    return new Promise((resolve) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 15
        if (progress >= 70) {
          progress = 70
          clearInterval(interval)
          resolve()
        }
        this.updateDownloadProgress(progress)
      }, 200)
    })
  }

  // 更新下载进度
  updateDownloadProgress(percent) {
    const progressBar = document.getElementById('updateProgressBar')
    if (progressBar) {
      progressBar.style.width = percent + '%'
    }
  }

  // 解压并安装更新
  async extractAndInstall() {
    try {
      // 调用主进程的解压安装功能
      const result = await window.ee2x.extractAndInstallLauncher()
      return result
    } catch (error) {
      console.error('解压安装失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 显示重启提示
  showRestartPrompt() {
    const modal = document.querySelector('.modal')
    if (modal) {
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header bg-success text-white">
              <h5 class="modal-title">
                <i class="bi bi-check-circle"></i> 更新完成
              </h5>
            </div>
            <div class="modal-body text-center">
              <div class="mb-3">
                <i class="bi bi-check-circle text-success" style="font-size: 3rem;"></i>
              </div>
              <h5>启动器已成功更新到 v${this.updateInfo.version}</h5>
              <p class="text-muted">需要重新启动启动器以应用更新</p>
            </div>
            <div class="modal-footer justify-content-center">
              <button type="button" class="btn btn-success btn-lg" onclick="launcherUpdateManager.restartLauncher()">
                <i class="bi bi-arrow-clockwise"></i> 立即重启
              </button>
            </div>
          </div>
        </div>
      `

      // 自动重启倒计时
      let countdown = 10
      const countdownEl = document.createElement('div')
      countdownEl.className = 'text-center mt-2 text-muted'
      countdownEl.innerHTML = `<small>将在 ${countdown} 秒后自动重启...</small>`
      modal.querySelector('.modal-body').appendChild(countdownEl)

      const countdownInterval = setInterval(() => {
        countdown--
        if (countdown > 0) {
          countdownEl.innerHTML = `<small>将在 ${countdown} 秒后自动重启...</small>`
        } else {
          clearInterval(countdownInterval)
          this.restartLauncher()
        }
      }, 1000)
    }
  }

  // 重启启动器
  async restartLauncher() {
    try {
      const result = await window.ee2x.restartLauncher()
      if (result && !result.ok) {
        console.error('重启失败:', result.error)
      }
    } catch (error) {
      console.error('重启启动器失败:', error)
      // 备用方案：直接刷新页面
      location.reload()
    }
  }

  // 初始化自动更新
  async initAutoUpdate() {
    const statusEl = document.getElementById('launcherUpdateStatus')
    if (statusEl) {
      statusEl.textContent = '已停用'
      statusEl.style.color = '#94a3b8'
    }
  }
}

// 创建全局启动器更新管理器实例
const launcherUpdateManager = new LauncherUpdateManager()

// 绑定启动器更新事件
document.addEventListener('DOMContentLoaded', function() {
  // 检查更新按钮
  const checkBtn = document.getElementById('checkLauncherUpdate')
  if (checkBtn) {
    checkBtn.addEventListener('click', async () => {
      await launcherUpdateManager.checkForUpdates()
    })
  }

  // 下载更新按钮
  const downloadBtn = document.getElementById('downloadLauncherUpdate')
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      launcherUpdateManager.downloadUpdate()
    })
  }

  // 忽略更新按钮
  const ignoreBtn = document.getElementById('ignoreLauncherUpdate')
  if (ignoreBtn) {
    ignoreBtn.addEventListener('click', () => {
      launcherUpdateManager.ignoreUpdate()
    })
  }

  // 自动更新开关
  const autoUpdateCheckbox = document.getElementById('launcherAutoUpdate')
  if (autoUpdateCheckbox) {
    autoUpdateCheckbox.addEventListener('change', function() {
      // 保存设置到配置
      if (cfg) {
        cfg.launcherAutoUpdate = this.checked
        if (window.ee2x && window.ee2x.cfgSet) {
          window.ee2x.cfgSet(cfg)
        }
      }

      // 如果启用，立即检查一次更新
      if (this.checked) {
        launcherUpdateManager.initAutoUpdate()
      }
    })
  }
})

// 背景历史选择功能
const bgHistoryModal = document.getElementById('bgHistoryModal')
const bgHistoryList = document.getElementById('bgHistoryList')
const bgHistoryTitle = document.getElementById('bgHistoryTitle')
let currentBgFileType = 'image' // 当前选择的背景文件类型

// 打开背景历史选择窗口
async function openBgHistoryModal(fileType) {
  currentBgFileType = fileType
  bgHistoryTitle.textContent = fileType === 'image' ? '选择历史图片' : '选择历史视频'

  try {
    const result = await window.ee2x.getBackgroundHistory()
    if (result.success) {
      const filteredHistory = result.history.filter(item => item.fileType === fileType)

      if (filteredHistory.length === 0) {
        bgHistoryList.innerHTML = `<div style="padding: 20px; text-align: center; color: #999;">暂无${fileType === 'image' ? '图片' : '视频'}背景</div>`
      } else {
        bgHistoryList.innerHTML = ''
        filteredHistory.forEach(item => {
          const div = document.createElement('div')
          div.className = 'item'

          const uploadTime = new Date(item.uploadTime).toLocaleString('zh-CN')
          const fileSize = (item.size / 1024 / 1024).toFixed(2) + ' MB'

          div.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="flex: 1;">
                <div style="font-weight: bold; margin-bottom: 4px;">${item.fileName}</div>
                <div style="font-size: 12px; color: #666;">
                  上传时间: ${uploadTime} | 文件大小: ${fileSize}
                </div>
              </div>
              <button class="select-bg-btn" data-file-path="${item.filePath}" data-file-name="${item.fileName}">
                选择
              </button>
            </div>
          `

          bgHistoryList.appendChild(div)
        })

        // 为选择按钮添加事件监听器
        document.querySelectorAll('.select-bg-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const filePath = e.target.getAttribute('data-file-path')
            const fileName = e.target.getAttribute('data-file-name')

            const normalizedFilePath = filePath.replace(/\\/g, '/')

            // 设置到对应的输入框
            if (fileType === 'image') {
              document.getElementById('set_bgImage').value = normalizedFilePath
              document.getElementById('set_bgType').value = 'image'
            } else {
              document.getElementById('set_bgVideo').value = normalizedFilePath
              document.getElementById('set_bgType').value = 'video'
            }

            // 同时更新全局配置，确保保存时使用正确的值
            cfg.bgImagePath = normalizedFilePath
            cfg.bgType = fileType
            cfg.bgFileType = fileType

            updateBackgroundSettingsUI()

            // 立即应用背景
            await applySelectedBackground(fileType, normalizedFilePath)

            // 立即保存背景设置到配置文件
            try {
              await window.ee2x.setBackgroundPath(normalizedFilePath, fileType)
              console.log('从历史记录选择背景，设置已保存:', normalizedFilePath)
            } catch (error) {
              console.error('保存背景设置失败:', error)
            }

            // 关闭模态框
            bgHistoryModal.classList.add('hidden')
          })
        })
      }

      bgHistoryModal.classList.remove('hidden')
    } else {
      alert('获取背景历史失败: ' + result.error)
    }
  } catch (error) {
    console.error('打开背景历史选择窗口失败:', error)
    alert('打开背景历史选择窗口失败')
  }
}

// 关闭背景历史选择窗口
function closeBgHistoryModal() {
  bgHistoryModal.classList.add('hidden')
}

// 绑定事件监听器
document.getElementById('selectBgImageHistory').addEventListener('click', () => {
  openBgHistoryModal('image')
})

document.getElementById('selectBgVideoHistory').addEventListener('click', () => {
  openBgHistoryModal('video')
})

document.getElementById('closeBgHistory').addEventListener('click', closeBgHistoryModal)
