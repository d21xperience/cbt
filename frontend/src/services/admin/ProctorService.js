// src/services/admin/ProctorService.js
// DEPRECATED — alias ke SessionService (C2a Compat Layer).
// Akan dihapus saat full migrate.

import { SessionService } from './SessionService'

export const ProctorService = {
  listSessions(opts) {
    return SessionService.listSessions(opts)
  },
  getCurrentToken(sessionId) {
    return SessionService.getCurrentToken(sessionId)
  },
  rotateToken(sessionId) {
    return SessionService.rotateToken(sessionId)
  },
}
