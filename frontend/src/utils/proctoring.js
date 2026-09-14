// src/utils/proctoring.js
// Utility untuk semua fitur proctoring

let proctoringActive = false
let onViolationCallback = null
let eventListeners = []

/**
 * Inisialisasi proctoring
 * @param {Function} onViolation - Callback saat pelanggaran terdeteksi
 * @param {string} eventType - Tipe event (TAB_SWITCH, FULLSCREEN_EXIT, COPY_PASTE, dll)
 */
export const initProctoring = (onViolation) => {
  if (proctoringActive) return
  proctoringActive = true
  onViolationCallback = onViolation

  console.log('🛡️ Proctoring initialized')

  // Setup semua listener
  setupFullscreenListener()
  setupCopyPasteListener()
  setupRightClickListener()
  setupKeyboardListener()
  setupDragListener()
}

/**
 * Cleanup semua listener proctoring
 */
export const cleanupProctoring = () => {
  if (!proctoringActive) return
  proctoringActive = false
  onViolationCallback = null

  // Remove semua event listener
  eventListeners.forEach(({ target, event, handler, options }) => {
    target.removeEventListener(event, handler, options)
  })
  eventListeners = []

  console.log('🧹 Proctoring cleaned up')
}

/**
 * Helper untuk register event listener (agar mudah di-cleanup)
 */
const addListener = (target, event, handler, options) => {
  target.addEventListener(event, handler, options)
  eventListeners.push({ target, event, handler, options })
}

/**
 * Helper untuk report violation
 */
const reportViolation = (eventType, reason) => {
  if (onViolationCallback) {
    onViolationCallback(eventType, reason)
  }
}

// ========================================
// FULLSCREEN ENFORCEMENT
// ========================================

const setupFullscreenListener = () => {
  // Deteksi exit fullscreen
  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && proctoringActive) {
      console.warn('⚠️ Fullscreen exited')
      reportViolation('FULLSCREEN_EXIT', 'User keluar dari mode fullscreen')
    }
  }

  addListener(document, 'fullscreenchange', handleFullscreenChange)
  addListener(document, 'webkitfullscreenchange', handleFullscreenChange)
  addListener(document, 'mozfullscreenchange', handleFullscreenChange)
  addListener(document, 'MSFullscreenChange', handleFullscreenChange)
}

/**
 * Enter fullscreen mode
 * @param {Element} element - Element yang akan di-fullscreen (default: document.documentElement)
 */
export const enterFullscreen = async (element = document.documentElement) => {
  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen()
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen()
    } else if (element.msRequestFullscreen) {
      await element.msRequestFullscreen()
    }
    console.log('✅ Fullscreen entered')
    return true
  } catch (error) {
    console.error('❌ Fullscreen failed:', error)
    return false
  }
}

/**
 * Exit fullscreen mode
 */
export const exitFullscreen = async () => {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen()
    } else if (document.webkitExitFullscreen) {
      await document.webkitExitFullscreen()
    } else if (document.msExitFullscreen) {
      await document.msExitFullscreen()
    }
    console.log('✅ Fullscreen exited')
  } catch (error) {
    console.error('❌ Exit fullscreen failed:', error)
  }
}

/**
 * Cek apakah sedang fullscreen
 */
export const isFullscreen = () => {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  )
}

// ========================================
// COPY-PASTE PREVENTION
// ========================================

const setupCopyPasteListener = () => {
  const handleCopyPaste = (e) => {
    if (!proctoringActive) return

    const blockedActions = ['copy', 'cut', 'paste']
    if (blockedActions.includes(e.type)) {
      e.preventDefault()
      console.warn(`⚠️ ${e.type} blocked`)
      reportViolation('COPY_PASTE', `User mencoba ${e.type}`)
    }
  }

  addListener(document, 'copy', handleCopyPaste)
  addListener(document, 'cut', handleCopyPaste)
  addListener(document, 'paste', handleCopyPaste)
}

// ========================================
// RIGHT-CLICK BLOCK
// ========================================

const setupRightClickListener = () => {
  const handleContextMenu = (e) => {
    if (!proctoringActive) return
    e.preventDefault()
    console.warn('⚠️ Right-click blocked')
  }

  addListener(document, 'contextmenu', handleContextMenu)
}

// ========================================
// KEYBOARD SHORTCUT BLOCK
// ========================================

const setupKeyboardListener = () => {
  const handleKeyDown = (e) => {
    if (!proctoringActive) return

    // Block DevTools shortcuts
    const isDevTools =
      e.key === 'F12' || // F12
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) || // Ctrl+Shift+I
      (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) || // Ctrl+Shift+J
      (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) || // Ctrl+Shift+C
      (e.ctrlKey && (e.key === 'U' || e.key === 'u')) // Ctrl+U (View Source)

    if (isDevTools) {
      e.preventDefault()
      console.warn('⚠️ DevTools shortcut blocked')
      reportViolation('DEVTOOLS_ATTEMPT', 'User mencoba membuka DevTools')
      return
    }

    // Block copy-paste shortcuts
    const isCopyPaste =
      (e.ctrlKey && (e.key === 'c' || e.key === 'C')) ||
      (e.ctrlKey && (e.key === 'x' || e.key === 'X')) ||
      (e.ctrlKey && (e.key === 'v' || e.key === 'V')) ||
      (e.ctrlKey && (e.key === 'a' || e.key === 'A')) ||
      (e.metaKey && (e.key === 'c' || e.key === 'C')) || // Mac
      (e.metaKey && (e.key === 'x' || e.key === 'X')) ||
      (e.metaKey && (e.key === 'v' || e.key === 'V')) ||
      (e.metaKey && (e.key === 'a' || e.key === 'A'))

    if (isCopyPaste) {
      e.preventDefault()
      console.warn('⚠️ Copy-paste shortcut blocked')
      reportViolation('COPY_PASTE', `User mencoba shortcut ${e.key}`)
      return
    }

    // Block print screen (sebatas mungkin)
    if (e.key === 'PrintScreen') {
      e.preventDefault()
      console.warn('⚠️ PrintScreen blocked')
      reportViolation('PRINT_SCREEN', 'User mencoba screenshot')
      return
    }
  }

  addListener(document, 'keydown', handleKeyDown)
}

// ========================================
// DRAG PREVENTION
// ========================================

const setupDragListener = () => {
  const handleDrag = (e) => {
    if (!proctoringActive) return
    e.preventDefault()
    console.warn('⚠️ Drag blocked')
  }

  addListener(document, 'dragstart', handleDrag)
  addListener(document, 'drop', handleDrag)
}
