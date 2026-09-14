// src/mocks/data/stateStore.js
// import { stringify } from 'postcss'
import { getInitialSessions } from '../data/adminData'
import { mockParticipants as initialParticipants, mockUserData } from '../data/participantsData'

// Inisialisasi state
let workingSessions = getInitialSessions()
let warningCount = 0
let mockParticipants = [...initialParticipants] // clone agar tidak mengubah import asli

// Fungsi untuk reset (bisa dipanggil dari console)
export const resetMockData = () => {
  workingSessions = getInitialSessions()
  warningCount = 0
  mockParticipants = [...initialParticipants]
  console.log('🔄 [MOCK] Data berhasil di-reset ke state awal')
}

// Getter & setter untuk state
export const getSessions = () => JSON.parse(JSON.stringify(workingSessions))
export const setSessions = (newSessions) => {
  workingSessions = newSessions
}
export const addSession = (session) => {
  workingSessions.push(session)
}
export const removeSession = (id) => {
  const index = workingSessions.findIndex((s) => s.id === id)
  if (index !== -1) {
    const deleted = workingSessions.splice(index, 1)[0]
    return deleted
  }
  return null
}

export const getParticipants = () => JSON.parse(JSON.stringify(mockParticipants))
export const setParticipants = (newParticipants) => {
  mockParticipants = newParticipants
}
export const removeParticipant = (id) => {
  const index = mockParticipants.findIndex((p) => p.id === id)
  if (index !== -1) {
    mockParticipants.splice(index, 1)
    return true
  }
  return false
}

export const getWarningCount = () => warningCount
export const incrementWarning = () => ++warningCount
export const resetWarning = () => {
  warningCount = 0
}

// user manajemen
export const getUsers = () => JSON.parse(JSON.stringify(mockUserData))
