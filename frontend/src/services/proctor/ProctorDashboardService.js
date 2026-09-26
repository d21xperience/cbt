// src/services/proctor/ProctorDashboardService.js
// Adapter HTTP untuk dashboard proctor.
// Endpoint: GET /proctor/sessions (READY per VER-003)
//
// Response: { status: "ok", data: [{ session_id, exam_title, session_type,
//             start_time, end_time, status, student_count }] }

import { api } from '@/boot/axios'

export const ProctorDashboardService = {
  listSessions() {
    return api.get('/proctor/sessions')
  },
}
