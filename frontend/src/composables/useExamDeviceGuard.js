// src/composables/useExamDeviceGuard.js
// Device guard untuk ujian:
//   - Screen Orientation Lock (portrait) — coba saat mount + retry saat fullscreen
//   - Wake Lock (screen tetap nyala) — acquire saat mount + re-acquire saat visible
//   - Auto cleanup saat unmount
// Graceful fallback kalau API tidak didukung (iOS Safari, desktop).

import { ref, onMounted, onUnmounted } from 'vue'

const isDev = import.meta.env.DEV
const log = (...args) => {
  if (isDev) console.log('[DeviceGuard]', ...args)
}

export function useExamDeviceGuard(options = {}) {
  const { lockOrientation = true, keepAwake = true } = options

  const wakeLockActive = ref(false)
  const orientationLocked = ref(false)

  let wakeLockRef = null

  // ── WAKE LOCK
  const acquireWakeLock = async () => {
    if (!keepAwake) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      log('wakeLock: not supported (graceful skip)')
      return
    }
    if (wakeLockRef) return

    try {
      wakeLockRef = await navigator.wakeLock.request('screen')
      wakeLockActive.value = true
      log('wakeLock: acquired ✅')
      wakeLockRef.addEventListener('release', () => {
        wakeLockActive.value = false
        wakeLockRef = null
        log('wakeLock: released (browser/tab hidden)')
      })
    } catch (err) {
      log('wakeLock: request failed —', err?.message || err)
      wakeLockRef = null
    }
  }

  const releaseWakeLock = async () => {
    if (!wakeLockRef) return
    try {
      await wakeLockRef.release()
    } catch {
      // ignore
    }
    wakeLockRef = null
    wakeLockActive.value = false
  }

  // ── ORIENTATION LOCK
  const tryLockOrientation = async () => {
    if (!lockOrientation) return
    if (typeof screen === 'undefined' || !screen.orientation?.lock) {
      log('orientation: not supported (graceful skip)')
      return
    }
    try {
      await screen.orientation.lock('portrait')
      orientationLocked.value = true
      log('orientation: locked portrait ✅')
    } catch (err) {
      // Chrome throw "not supported in this context" kalau bukan fullscreen/PWA.
      // Akan retry otomatis saat masuk fullscreen (lihat handleFullscreenChange).
      log('orientation: lock failed —', err?.message || err)
      orientationLocked.value = false
    }
  }

  const unlockOrientation = () => {
    if (typeof screen === 'undefined' || !screen.orientation?.unlock) return
    try {
      screen.orientation.unlock()
      orientationLocked.value = false
    } catch {
      // ignore
    }
  }

  // ── VISIBILITY: re-acquire wake lock saat kembali visible
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      acquireWakeLock()
    }
  }

  // ── FULLSCREEN: retry orientation lock saat masuk fullscreen
  const handleFullscreenChange = () => {
    if (document.fullscreenElement && !orientationLocked.value) {
      tryLockOrientation()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    acquireWakeLock()
    tryLockOrientation()
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibility)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    releaseWakeLock()
    unlockOrientation()
  })

  return {
    wakeLockActive,
    orientationLocked,
    acquireWakeLock,
    releaseWakeLock,
  }
}
