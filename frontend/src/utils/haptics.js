// src/utils/haptics.js
// Haptic feedback helper — safe fallback untuk browser tanpa Vibration API.
// Support: Chrome Android ✅, Firefox Android ✅, Safari iOS ❌, Desktop ⚠️ (jarang).

let enabled = true

const isSupported = () =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

const vibrate = (pattern) => {
  if (!enabled) return false
  const supported = isSupported()
  // Selalu log di DEV — biar bisa verifikasi trigger tanpa perlu HP Android
  if (import.meta.env.DEV) {
    console.log('[haptics] 🔔', {
      pattern,
      supported,
      real: supported && typeof navigator.vibrate === 'function',
    })
  }
  if (!supported) return false
  try {
    return navigator.vibrate(pattern)
  } catch {
    return false
  }
}

// ── Generic intensities
export const hapticLight = () => vibrate(10)
export const hapticMedium = () => vibrate(25)
export const hapticHeavy = () => vibrate(50)

// ── Semantic patterns (ms durations; angka = getar, komentar = jeda implisit)
export const hapticSuccess = () => vibrate([15, 40, 15]) // tap OK
export const hapticError = () => vibrate([80, 40, 80]) // salah
export const hapticWarning = () => vibrate([30, 60, 30, 60, 30]) // warning count
export const hapticViolation = () => vibrate([40, 50, 40]) // proctoring detect

// ── Lock state (beda level 1 vs 2)
export const hapticLockLevel1 = () => vibrate([80, 50, 80])
export const hapticLockLevel2 = () => vibrate([150, 80, 150, 80, 300])
export const hapticUnlock = () => vibrate([20, 40, 20])

// ── Preferensi (hook ke setting user nanti)
export const setHapticsEnabled = (v) => {
  enabled = !!v
}
export const isHapticsEnabled = () => enabled
