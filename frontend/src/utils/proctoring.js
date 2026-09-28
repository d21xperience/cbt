// src/utils/proctoring.js
// Utility deteksi kecurangan ujian. Semua event → callback violation.

let proctoringActive = false
let onViolationCallback = null
let eventListeners = []
let lockOverlayActive = false

// Q4: ignore event < 1 detik
const MIN_VIOLATION_DURATION_MS = 1000
// Debounce antar violation biar tidak spam (tab switch + blur sering muncul bareng)
const VIOLATION_DEBOUNCE_MS = 1500
let lastViolationAt = 0

const addListener = (target, event, handler, options) => {
  target.addEventListener(event, handler, options)
  eventListeners.push({ target, event, handler, options })
}

const reportViolation = (eventType, reason) => {
  if (!proctoringActive) return
  if (lockOverlayActive) return // jangan spam saat locked
  const now = Date.now()
  if (now - lastViolationAt < VIOLATION_DEBOUNCE_MS) return
  lastViolationAt = now
  if (onViolationCallback) onViolationCallback(eventType, reason)
}

export const setLockOverlayActive = (val) => {
  lockOverlayActive = !!val
}

export const initProctoring = (onViolation) => {
  if (proctoringActive) return
  proctoringActive = true
  onViolationCallback = onViolation

  console.log('🛡️ Proctoring initialized')
  setupFullscreenListener()
  setupVisibilityListener()
  setupBlurListener()
  setupBeforeUnloadListener()
  setupCopyPasteListener()
  setupRightClickListener()
  setupKeyboardListener()
  setupDragListener()
  setupSwipeBackListener()
}

export const cleanupProctoring = () => {
  if (!proctoringActive) return
  proctoringActive = false
  onViolationCallback = null
  eventListeners.forEach(({ target, event, handler, options }) => {
    target.removeEventListener(event, handler, options)
  })
  eventListeners = []
  console.log('🧹 Proctoring cleaned up')
}

// ── FULLSCREEN
const setupFullscreenListener = () => {
  const handler = () => {
    if (!document.fullscreenElement && proctoringActive) {
      console.warn('⚠️ Fullscreen exited')
      reportViolation('FULLSCREEN_EXIT', 'Keluar dari mode fullscreen')
    }
  }
  addListener(document, 'fullscreenchange', handler)
  addListener(document, 'webkitfullscreenchange', handler)
  addListener(document, 'mozfullscreenchange', handler)
  addListener(document, 'MSFullscreenChange', handler)
}

export const enterFullscreen = async (el = document.documentElement) => {
  try {
    if (el.requestFullscreen) await el.requestFullscreen()
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
    else if (el.msRequestFullscreen) await el.msRequestFullscreen()
    console.log('✅ Fullscreen entered')
    return true
  } catch (error) {
    console.error('❌ Fullscreen failed:', error)
    return false
  }
}

export const exitFullscreen = async () => {
  try {
    if (document.exitFullscreen) await document.exitFullscreen()
    else if (document.webkitExitFullscreen) await document.webkitExitFullscreen()
    else if (document.msExitFullscreen) await document.msExitFullscreen()
  } catch (error) {
    console.error('❌ Exit fullscreen failed:', error)
  }
}

export const isFullscreen = () =>
  !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement)

// ── TAB SWITCH (visibilitychange) — dengan durasi check
const setupVisibilityListener = () => {
  let hiddenAt = null
  const handler = () => {
    if (!proctoringActive) return
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
    } else if (hiddenAt) {
      const duration = Date.now() - hiddenAt
      hiddenAt = null
      if (duration >= MIN_VIOLATION_DURATION_MS) {
        reportViolation(
          'TAB_SWITCH',
          `Pindah tab / minimize selama ${Math.round(duration / 1000)} detik`,
        )
      }
    }
  }
  addListener(document, 'visibilitychange', handler)
}

// ── WINDOW BLUR — dengan durasi check
const setupBlurListener = () => {
  let blurAt = null
  const onBlur = () => {
    if (!proctoringActive) return
    blurAt = Date.now()
  }
  const onFocus = () => {
    if (!proctoringActive) return
    if (!blurAt) return
    const duration = Date.now() - blurAt
    blurAt = null
    // Skip kalau tab juga hidden (sudah di-handle visibilitychange)
    if (document.visibilityState !== 'visible') return
    if (duration >= MIN_VIOLATION_DURATION_MS) {
      reportViolation(
        'WINDOW_BLUR',
        `Jendela kehilangan fokus selama ${Math.round(duration / 1000)} detik`,
      )
    }
  }
  addListener(window, 'blur', onBlur)
  addListener(window, 'focus', onFocus)
}

// ── BEFORE UNLOAD (Q2)
const setupBeforeUnloadListener = () => {
  const handler = (e) => {
    if (!proctoringActive) return
    e.preventDefault()
    e.returnValue = 'Ujian sedang berlangsung. Yakin ingin keluar?'
    return e.returnValue
  }
  addListener(window, 'beforeunload', handler)
}

// ── COPY-PASTE
const setupCopyPasteListener = () => {
  const handler = (e) => {
    if (!proctoringActive) return
    if (['copy', 'cut', 'paste'].includes(e.type)) {
      e.preventDefault()
      reportViolation('COPY_PASTE', `Percobaan ${e.type}`)
    }
  }
  addListener(document, 'copy', handler)
  addListener(document, 'cut', handler)
  addListener(document, 'paste', handler)
}

// ── RIGHT CLICK
const setupRightClickListener = () => {
  const handler = (e) => {
    if (!proctoringActive) return
    e.preventDefault()
  }
  addListener(document, 'contextmenu', handler)
}

// ── KEYBOARD SHORTCUTS
const setupKeyboardListener = () => {
  const handler = (e) => {
    if (!proctoringActive) return

    // DevTools
    const isDevTools =
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
      (e.ctrlKey && ['U', 'u'].includes(e.key))
    if (isDevTools) {
      e.preventDefault()
      reportViolation('DEVTOOLS_ATTEMPT', 'Percobaan membuka DevTools')
      return
    }

    // Copy-paste
    const isCopyPaste =
      (e.ctrlKey || e.metaKey) && ['c', 'C', 'x', 'X', 'v', 'V', 'a', 'A'].includes(e.key)
    if (isCopyPaste) {
      e.preventDefault()
      reportViolation('COPY_PASTE', `Shortcut ${e.ctrlKey ? 'Ctrl' : 'Cmd'}+${e.key}`)
      return
    }

    // PrintScreen
    if (e.key === 'PrintScreen') {
      e.preventDefault()
      reportViolation('PRINT_SCREEN', 'Percobaan screenshot')
    }
  }
  addListener(document, 'keydown', handler)
}

// ── DRAG
const setupDragListener = () => {
  const handler = (e) => {
    if (!proctoringActive) return
    e.preventDefault()
  }
  addListener(document, 'dragstart', handler)
  addListener(document, 'drop', handler)
}

// ── SWIPE BACK (Q3)
const setupSwipeBackListener = () => {
  // Intercept back button
  const onPopState = () => {
    if (!proctoringActive) return
    // Push ulang supaya tidak keluar
    history.pushState(null, '', window.location.href)
    reportViolation('BACK_BUTTON', 'Menekan tombol back browser')
  }
  // Push initial state
  try {
    history.pushState(null, '', window.location.href)
  } catch {
    // ignore
  }
  addListener(window, 'popstate', onPopState)

  // Swipe back gesture dari edge kiri
  let touchStartX = 0
  let touchStartTime = 0
  const onTouchStart = (e) => {
    if (!proctoringActive) return
    touchStartX = e.touches[0]?.clientX || 0
    touchStartTime = Date.now()
  }
  const onTouchEnd = (e) => {
    if (!proctoringActive) return
    const endX = e.changedTouches[0]?.clientX || 0
    const delta = endX - touchStartX
    const duration = Date.now() - touchStartTime
    // Swipe dari edge kiri (< 30px) → kanan (> 80px) dalam < 500ms
    if (touchStartX < 30 && delta > 80 && duration < 500) {
      reportViolation('SWIPE_BACK', 'Gestur swipe-back dari tepi kiri')
    }
  }
  addListener(document, 'touchstart', onTouchStart, { passive: true })
  addListener(document, 'touchend', onTouchEnd, { passive: true })
}
