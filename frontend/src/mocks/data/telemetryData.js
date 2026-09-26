// src/mocks/data/telemetryData.js
// Mock log telemetri — VER-011 pending.
// Schema mengikuti draft VER-011:
//   { id, school_name, status, component, message, client_ip, timestamp }
//   status ∈ { SUCCESS, WARNING, CRITICAL }

export const mockTelemetryLogs = [
  {
    id: 1,
    school_name: 'SMK Pasundan Jatinangor',
    status: 'SUCCESS',
    component: 'tunnel',
    message: 'Cloudflare tunnel stabil — 0 drop dalam 1 jam terakhir',
    client_ip: '103.20.45.12',
    timestamp: '2026-09-21 10:15',
  },
  {
    id: 2,
    school_name: 'SMKN Kawali',
    status: 'WARNING',
    component: 'sync',
    message: 'Sync Dapodik tertunda 30 detik dari jadwal',
    client_ip: '103.20.45.13',
    timestamp: '2026-09-21 10:10',
  },
  {
    id: 3,
    school_name: 'MTs. Maarif Jatinangor',
    status: 'CRITICAL',
    component: 'database',
    message: 'DB connection timeout — retry 3x gagal',
    client_ip: '103.20.45.14',
    timestamp: '2026-09-21 10:05',
  },
  {
    id: 4,
    school_name: 'SMK Pasundan Jatinangor',
    status: 'SUCCESS',
    component: 'heartbeat',
    message: 'Heartbeat OK — latency 45ms',
    client_ip: '103.20.45.12',
    timestamp: '2026-09-21 10:00',
  },
  {
    id: 5,
    school_name: 'SMKN Kawali',
    status: 'SUCCESS',
    component: 'tunnel',
    message: 'Tunnel reconnected setelah maintenance',
    client_ip: '103.20.45.13',
    timestamp: '2026-09-21 09:55',
  },
]
