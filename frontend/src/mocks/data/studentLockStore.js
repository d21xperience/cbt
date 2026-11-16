// src/mocks/data/studentLockStore.js
// Per-siswa per-sesi lock state store (mock).
// Menggantikan examLockState global di examHandlers.js.

const store = new Map() // key: `${sessionId}::${studentId}`

const key = (sessionId, studentId) => `${sessionId}::${studentId}`

const defaultState = () => ({
  locked: false,
  lockLevel: 0, // 0|1|2
  warnings: 0, // 0-3
  violationCount: 0,
  lockCount: 0,
  lockedAt: null,
  unlockedBy: null,
  unlockedAt: null,
})

export const getLockState = (sessionId, studentId) => {
  const k = key(sessionId, studentId)
  if (!store.has(k)) store.set(k, defaultState())
  return store.get(k)
}

export const updateLockState = (sessionId, studentId, patch) => {
  const cur = getLockState(sessionId, studentId)
  const next = { ...cur, ...patch }
  store.set(key(sessionId, studentId), next)
  return next
}

export const resetLockState = (sessionId, studentId) => {
  store.set(key(sessionId, studentId), defaultState())
}

export const getAllLocksForSession = (sessionId) => {
  const result = {}
  const prefix = `${sessionId}::`
  for (const [k, v] of store.entries()) {
    if (k.startsWith(prefix)) {
      result[k.slice(prefix.length)] = v
    }
  }
  return result
}

export const resetAllLocks = () => {
  store.clear()
}

// Debug helper
if (typeof window !== 'undefined') {
  window.__studentLockStore = store
  window.__resetStudentLocks = resetAllLocks
}
