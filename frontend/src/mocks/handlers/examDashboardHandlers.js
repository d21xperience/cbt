// src/mocks/handlers/examDashboardHandlers.js
import { mockExamDashboard } from '../data/examDashboardData'

const DELAY = 300

export const examDashboardHandlers = (mock) => {
  // GET /exam/dashboard — dashboard peserta (3 section)
  mock.onGet('/exam/dashboard').reply(() => {
    return [200, mockExamDashboard, { delay: DELAY }]
  })
}
