// ============================================
// CBT Load Test — 1000 User Exam Flow
// ============================================
import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ============================================
// Config
// ============================================
const BASE = __ENV.BASE_URL || "http://localhost:8082/api/v1/cbt";
const EXAM_ID = "loadtest-exam";
const PASSWORD = "LOADTST";
const LOAD_TEST_PREFIX = "99"; // NISN load test mulai dengan 99

// Custom metrics
const loginErrors = new Rate("login_errors");
const examErrors = new Rate("exam_errors");
const autosaveLatency = new Trend("autosave_latency_ms");
const totalLogins = new Counter("total_logins");

// ============================================
// Options — Fase bertahap untuk VPS 2C/2GB
// ============================================
export const options = {
  scenarios: {
    // Skenario 1: Smoke test 100 VU (2 menit)
    smoke: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 100 },
        { duration: "1m", target: 100 },
        { duration: "20s", target: 0 },
      ],
      tags: { phase: "smoke" },
      exec: "examFlow",
    },
    // Skenario 2: Stress test 500 VU (3 menit)
    stress: {
      executor: "ramping-vus",
      startVUs: 0,
      startTime: "2m", // mulai setelah smoke
      stages: [
        { duration: "30s", target: 500 },
        { duration: "2m", target: 500 },
        { duration: "30s", target: 0 },
      ],
      tags: { phase: "stress" },
      exec: "examFlow",
    },
    // Skenario 3: Peak test 1000 VU (3 menit)
    peak: {
      executor: "ramping-vus",
      startVUs: 0,
      startTime: "6m", // mulai setelah stress
      stages: [
        { duration: "30s", target: 1000 },
        { duration: "2m", target: 1000 },
        { duration: "30s", target: 0 },
      ],
      tags: { phase: "peak" },
      exec: "examFlow",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"], // < 2% error total
    "http_req_duration{phase:smoke}": ["p(95)<500"], // smoke p95 < 500ms
    "http_req_duration{phase:stress}": ["p(95)<800"],
    "http_req_duration{phase:peak}": ["p(95)<1500"], // peak lebih longgar
    login_errors: ["rate<0.05"],
  },
};

// ============================================
// Setup — jalankan sekali sebelum test
// ============================================
export function setup() {
  console.log(`[SETUP] Base URL: ${BASE}`);

  // 1. Admin login
  const adminRes = http.post(
    `${BASE}/auth/admin/login`,
    JSON.stringify({
      username: "admin",
      password: "Test123!Test",
      tenant_id: "default",
    }),
    { headers: { "Content-Type": "application/json" } },
  );

  if (adminRes.status !== 200) {
    throw new Error(`Admin login failed: ${adminRes.status} ${adminRes.body}`);
  }
  const adminToken = JSON.parse(adminRes.body).token;

  // 2. Get session
  const sessRes = http.get(
    `${BASE}/admin/sessions?exam_id=${EXAM_ID}&active_only=true`,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    },
  );
  const sessions = JSON.parse(sessRes.body).data || [];
  if (sessions.length === 0) {
    throw new Error(
      "No active session for loadtest-exam — run migration first",
    );
  }
  const sessionId = sessions[0].id;

  // 3. Rotate token — satu token untuk semua VU
  const rotateRes = http.post(
    `${BASE}/admin/sessions/${sessionId}/token/rotate`,
    null,
    {
      headers: { Authorization: `Bearer ${adminToken}` },
    },
  );
  const proctorToken = JSON.parse(rotateRes.body).token;

  console.log(`[SETUP] Session: ${sessionId}, Proctor Token: ${proctorToken}`);

  return { proctorToken, sessionId };
}

// ============================================
// Main flow — dijalankan setiap VU
// ============================================
export function examFlow(data) {
  const vu = __VU;
  const nisn = `${LOAD_TEST_PREFIX}${String(vu).padStart(6, "0")}`;

  let jwtA = null;
  let jwtB = null;

  // ================================
  // 1. LOGIN
  // ================================
  group("01_login", () => {
    const res = http.post(
      `${BASE}/auth/exam/login`,
      JSON.stringify({
        username: nisn,
        password: PASSWORD,
      }),
      {
        headers: { "Content-Type": "application/json" },
        tags: { step: "login" },
      },
    );

    const ok = check(res, {
      "login 200": (r) => r.status === 200,
      "login has token": (r) => {
        try {
          return !!JSON.parse(r.body).token;
        } catch {
          return false;
        }
      },
    });
    loginErrors.add(!ok);

    if (ok) {
      jwtA = JSON.parse(res.body).token;
      totalLogins.add(1);
    }
  });

  if (!jwtA) {
    sleep(2);
    return; // skip VU ini
  }

  sleep(Math.random() * 2 + 1); // 1-3s

  // ================================
  // 2. DASHBOARD
  // ================================
  group("02_dashboard", () => {
    const res = http.get(`${BASE}/exam/dashboard`, {
      headers: { Authorization: `Bearer ${jwtA}` },
      tags: { step: "dashboard" },
    });
    check(res, { "dashboard 200": (r) => r.status === 200 });
  });

  sleep(1);

  // ================================
  // 3. VERIFY TOKEN (pakai token proctor yang di-generate di setup)
  // ================================
  group("03_verify_token", () => {
    const res = http.post(
      `${BASE}/exam/${EXAM_ID}/verify-token`,
      JSON.stringify({
        token: data.proctorToken,
      }),
      {
        headers: {
          Authorization: `Bearer ${jwtA}`,
          "Content-Type": "application/json",
        },
        tags: { step: "verify" },
      },
    );

    const ok = check(res, { "verify 200": (r) => r.status === 200 });
    if (ok) {
      jwtB = JSON.parse(res.body).token;
    }
  });

  if (!jwtB) {
    sleep(1);
    return;
  }

  sleep(1);

  // ================================
  // 4. START EXAM
  // ================================
  group("04_start_exam", () => {
    const res = http.post(`${BASE}/exam/start`, null, {
      headers: { Authorization: `Bearer ${jwtB}` },
      tags: { step: "start" },
    });
    check(res, { "start 200": (r) => r.status === 200 });
  });

  sleep(2);

  // ================================
  // 5. AUTOSAVE LOOP (5 batch)
  // ================================
  const questionIds = ["lq1", "lq2", "lq3", "lq4", "lq5"];
  const answerValues = ["A", "B", "C", "D", "A"];

  for (let i = 0; i < 5; i++) {
    group("05_autosave", () => {
      const t0 = Date.now();
      const res = http.post(
        `${BASE}/exam/answers/batch`,
        JSON.stringify({
          idempotency_key: `${vu}-${i}-${Date.now()}`,
          answers: [{ question_id: questionIds[i], answer: answerValues[i] }],
        }),
        {
          headers: {
            Authorization: `Bearer ${jwtB}`,
            "Content-Type": "application/json",
          },
          tags: { step: "autosave" },
        },
      );

      const ok = check(res, { "autosave 200": (r) => r.status === 200 });
      examErrors.add(!ok);
      autosaveLatency.add(Date.now() - t0);
    });

    sleep(3); // 3s antar autosave (dipersingkat dari 15s)
  }

  // ================================
  // 6. SUBMIT
  // ================================
  group("06_submit", () => {
    const res = http.post(`${BASE}/exam/submit`, null, {
      headers: { Authorization: `Bearer ${jwtB}` },
      tags: { step: "submit" },
    });
    check(res, { "submit 200": (r) => r.status === 200 });
  });

  sleep(1);
}
