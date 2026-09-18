// ============================================
// CBT Load Test — Production ujian.pw
// ============================================
import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'
// ============================================
// Config — GANTI dengan nilai Anda
// ============================================
const BASE = 'https://ujian.pw/api/v1/cbt'
const EXAM_ID = 'loadtest-exam'
const PASSWORD = 'LOADTST'
const PROCTOR_TOKEN = '<PASTE-TOKEN-DARI-STEP-2c>'      // ← dari Step 2c
const LOAD_TEST_TOKEN = '<PASTE-LOAD-TEST-TOKEN-DARI-STEP-1c>'  // ← untuk bypass rate limit
const HEADERS_LOADTEST = {
  'Content-Type': 'application/json',
  'X-Load-Test-Token': LOAD_TEST_TOKEN,
}
// Metrics custom
const loginErrors = new Rate('login_errors')
const examErrors = new Rate('exam_errors')
const autosaveLatency = new Trend('autosave_latency_ms')
const totalLogins = new Counter('total_logins')
// ============================================
// Options — Fase bertahap
// ============================================
export const options = {
  scenarios: {
    // Smoke: 100 VU
    smoke: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 100 },
        { duration: '1m',  target: 100 },
        { duration: '20s', target: 0 },
      ],
      tags: { phase: 'smoke' },
      exec: 'examFlow',
    },
    // Stress: 500 VU (mulai setelah smoke)
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '2m',
      stages: [
        { duration: '30s', target: 500 },
        { duration: '2m',  target: 500 },
        { duration: '30s', target: 0 },
      ],
      tags: { phase: 'stress' },
      exec: 'examFlow',
    },
    // Peak: 1000 VU
    peak: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '6m',
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '2m',  target: 1000 },
        { duration: '30s', target: 0 },
      ],
      tags: { phase: 'peak' },
      exec: 'examFlow',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    'http_req_duration{phase:smoke}':  ['p(95)<800'],
    'http_req_duration{phase:stress}': ['p(95)<1200'],
    'http_req_duration{phase:peak}':   ['p(95)<2000'],
    login_errors: ['rate<0.05'],
  },
}
// ============================================
// Main flow
// ============================================
export function examFlow() {
  const vu = __VU
  const nisn = `99${String(vu).padStart(6, '0')}`
  let jwtA = null
  let jwtB = null
  // ---------- 1. LOGIN ----------
  group('01_login', () => {
    const res = http.post(`${BASE}/auth/exam/login`, JSON.stringify({
      username: nisn,
      password: PASSWORD,
    }), {
      headers: HEADERS_LOADTEST,
      tags: { step: 'login' },
    })
    const ok = check(res, {
      'login 200': (r) => r.status === 200,
      'login has token': (r) => {
        try { return !!JSON.parse(r.body).token } catch { return false }
      },
    })
    loginErrors.add(!ok)
    if (ok) {
      jwtA = JSON.parse(res.body).token
      totalLogins.add(1)
    }
  })
  if (!jwtA) { sleep(2); return }
  sleep(Math.random() * 2 + 1)
  // ---------- 2. DASHBOARD ----------
  group('02_dashboard', () => {
    const res = http.get(`${BASE}/exam/dashboard`, {
      headers: { ...HEADERS_LOADTEST, 'Authorization': `Bearer ${jwtA}` },
      tags: { step: 'dashboard' },
    })
    check(res, { 'dashboard 200': (r) => r.status === 200 })
  })
  sleep(1)
  // ---------- 3. VERIFY TOKEN ----------
  group('03_verify_token', () => {
    const res = http.post(`${BASE}/exam/${EXAM_ID}/verify-token`, JSON.stringify({
      token: PROCTOR_TOKEN,
    }), {
      headers: { ...HEADERS_LOADTEST, 'Authorization': `Bearer ${jwtA}` },
      tags: { step: 'verify' },
    })
    const ok = check(res, { 'verify 200': (r) => r.status === 200 })
    if (ok) jwtB = JSON.parse(res.body).token
  })
  if (!jwtB) { sleep(1); return }
  sleep(1)
  // ---------- 4. START EXAM ----------
  group('04_start_exam', () => {
    const res = http.post(`${BASE}/exam/start`, null, {
      headers: { ...HEADERS_LOADTEST, 'Authorization': `Bearer ${jwtB}` },
      tags: { step: 'start' },
    })
    check(res, { 'start 200': (r) => r.status === 200 })
  })
  sleep(2)
  // ---------- 5. AUTOSAVE LOOP (5x) ----------
  const qIds = ['lq1', 'lq2', 'lq3', 'lq4', 'lq5']
  const ansVals = ['A', 'B', 'C', 'D', 'A']
  for (let i = 0; i < 5; i++) {
    group('05_autosave', () => {
      const t0 = Date.now()
      const res = http.post(`${BASE}/exam/answers/batch`, JSON.stringify({
        idempotency_key: `${vu}-${i}-${Date.now()}`,
        answers: [{ question_id: qIds[i], answer: ansVals[i] }],
      }), {
        headers: { ...HEADERS_LOADTEST, 'Authorization': `Bearer ${jwtB}` },
        tags: { step: 'autosave' },
      })
      const ok = check(res, { 'autosave 200': (r) => r.status === 200 })
      examErrors.add(!ok)
      autosaveLatency.add(Date.now() - t0)
    })
    sleep(3)
  }
  // ---------- 6. SUBMIT ----------
  group('06_submit', () => {
    const res = http.post(`${BASE}/exam/submit`, null, {
      headers: { ...HEADERS_LOADTEST, 'Authorization': `Bearer ${jwtB}` },
      tags: { step: 'submit' },
    })
    check(res, { 'submit 200': (r) => r.status === 200 })
  })
  sleep(1)
}
