// src/mocks/data/passwordOverrides.js
// Persist override exam_password (hasil reset) di localStorage.
// Karena mockStudentsByTenant re-init saat reload, override disimpan terpisah.

const STORAGE_KEY = 'cbt_mock_exam_password_overrides'

const loadAll = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const saveAll = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* quota ignore */
  }
}

export const getOverride = (tenant, studentId) => {
  const all = loadAll()
  return all?.[tenant]?.[studentId] ?? null
}

export const setOverride = (tenant, studentId, password) => {
  const all = loadAll()
  if (!all[tenant]) all[tenant] = {}
  all[tenant][studentId] = password
  saveAll(all)
}

export const clearOverrides = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * Apply overrides ke list students — dipakai di getStudentsByTenant.
 */
export const applyOverrides = (tenant, students) => {
  const all = loadAll()
  const tenantOverrides = all[tenant] || {}
  return students.map((s) => {
    const override = tenantOverrides[s.id]
    return override ? { ...s, exam_password: override } : s
  })
}

if (typeof window !== 'undefined') {
  window.__resetPasswordOverrides = clearOverrides
}
