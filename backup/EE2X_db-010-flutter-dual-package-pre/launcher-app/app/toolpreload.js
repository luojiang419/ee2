const { ipcRenderer } = require('electron')

function injectShotStyles(){
  try {
    if (document.getElementById('ee2xShotStyles')) return
    const style = document.createElement('style')
    style.id = 'ee2xShotStyles'
    style.textContent = `@keyframes ee2xShotFlash{0%{opacity:0}10%{opacity:.85}100%{opacity:0}} .ee2xShotAnim{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;animation:ee2xShotFlash .5s ease-in-out;z-index:100000}`
    document.head.appendChild(style)
  } catch {}
}

function createShotButton(){
  const btn = document.createElement('button')
  btn.textContent = '📸'
  btn.id = 'ee2xShotBtn'
  btn.style.position = 'fixed'
  btn.style.right = '24px'
  btn.style.bottom = '12px'
  btn.style.zIndex = '99999'
  btn.style.width = '44px'
  btn.style.height = '44px'
  btn.style.borderRadius = '50%'
  btn.style.display = 'flex'
  btn.style.alignItems = 'center'
  btn.style.justifyContent = 'center'
  btn.style.fontSize = '16px'
  btn.style.background = '#1f2937'
  btn.style.border = '1px solid #232b3f'
  btn.style.boxShadow = '0 2px 8px rgba(0,0,0,.35)'
  btn.style.color = '#e6eaf2'
  btn.style.cursor = 'pointer'
  btn.addEventListener('click', async (e) => {
    try { e.preventDefault(); e.stopImmediatePropagation() } catch {}
    try {
      const ov = document.createElement('div')
      ov.className = 'ee2xShotAnim'
      document.body.appendChild(ov)
      ov.addEventListener('animationend', () => { try { ov.remove() } catch {} }, { once: true })
      await ipcRenderer.invoke('win:captureToClipboard')
    } catch {}
  })
  document.body.appendChild(btn)
}

window.addEventListener('DOMContentLoaded', () => {
  try { injectShotStyles(); createShotButton() } catch {}
})
