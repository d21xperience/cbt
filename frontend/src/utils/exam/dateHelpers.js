// src/utils/exam/dateHelpers.js
export const formatRelativeExamDate = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfExam = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((startOfExam - startOfToday) / (1000 * 60 * 60 * 24))
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  if (diffDays === 0) return `Hari ini, ${time}`
  if (diffDays === 1) return `Besok, ${time}`
  if (diffDays === -1) return `Kemarin, ${time}`
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} hari lagi, ${time}`
  if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} hari lalu, ${time}`
  const day = d.toLocaleDateString('id-ID', { weekday: 'long' })
  const date = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${day}, ${date}, ${time}`
}

export const getExamAccessState = (exam, now = Date.now()) => {
  if (!exam?.start_time || !exam?.end_time) {
    return { canEnter: false, reason: 'no_schedule' }
  }

  // ── HACK: Jika admin menekan Start, backend mengirim ACTIVE. Abaikan jam manual.
  if (exam.session_status === 'ACTIVE') {
    return { canEnter: true, reason: 'open' }
  }
  if (exam.session_status === 'PAUSED') {
    return { canEnter: false, reason: 'paused' }
  }
  if (exam.session_status === 'CLOSED') {
    return { canEnter: false, reason: 'expired' }
  }

  const start = new Date(exam.start_time).getTime()
  const end = new Date(exam.end_time).getTime()

  if (now < start) return { canEnter: false, reason: 'too_early', start, end }
  if (now > end) return { canEnter: false, reason: 'expired', start, end }
  return { canEnter: true, reason: 'open', start, end }
}

export const getExamStatusLabel = (exam, now = Date.now()) => {
  const { reason } = getExamAccessState(exam, now)
  if (reason === 'open') return { label: 'Berlangsung', color: 'green' }
  if (reason === 'too_early') return { label: 'Akan Datang', color: 'blue' }
  if (reason === 'paused') return { label: 'Dijeda', color: 'orange' }
  if (reason === 'expired') return { label: 'Selesai', color: 'grey' }
  return { label: '-', color: 'grey' }
}
