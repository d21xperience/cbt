// src/services/super/TelemetryService.js
// Adapter HTTP untuk log telemetri super admin.
//
// VER-011 PENDING: path final belum dikonfirmasi. Provisional:
//   GET /super/telemetry/logs
//
// Schema (per VER-011 draft):
//   Array<{ id, school_name, status, component, message, client_ip, timestamp }>
//   status ∈ { SUCCESS, WARNING, CRITICAL }

import { api } from '@/boot/axios'

export const TelemetryService = {
  getLogs() {
    return api.get('/super/telemetry/logs')
  },
}
