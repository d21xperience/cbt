#!/bin/bash
BASE=http://localhost:8082/api/v1/cbt

# Helper: pretty-print JSON via node
pp() {
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.stringify(JSON.parse(d),null,2))}catch(e){console.log(d)}})"
}

# Helper: extract JSON field via node
jget() {
  local KEY=$1
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).$KEY)}catch(e){console.log('')}})"
}

echo "================================"
echo "TEST 1: Admin Login"
echo "================================"
ADMIN_RESP=$(curl -s -X POST $BASE/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Test123!Test","tenant_id":"default"}')
echo "$ADMIN_RESP" | pp
TOKEN_ADMIN=$(echo "$ADMIN_RESP" | jget token)
echo "Admin token (60 chars): ${TOKEN_ADMIN:0:60}..."

echo ""
echo "================================"
echo "TEST 2: Peserta Login"
echo "================================"
PESERTA_RESP=$(curl -s -X POST $BASE/auth/exam/login \
  -H "Content-Type: application/json" \
  -d '{"nisn":"12345678","pembelajaran_id":"test-exam"}')
echo "$PESERTA_RESP" | pp
TOKEN_PESERTA=$(echo "$PESERTA_RESP" | jget token)
echo "Peserta token (60 chars): ${TOKEN_PESERTA:0:60}..."

echo ""
echo "================================"
echo "TEST 3: GET /exam/active"
echo "================================"
curl -s $BASE/exam/active -H "Authorization: Bearer $TOKEN_PESERTA" | pp

echo ""
echo "================================"
echo "TEST 4: GET /exam/timer"
echo "================================"
curl -s $BASE/exam/timer -H "Authorization: Bearer $TOKEN_PESERTA" | pp

echo ""
echo "================================"
echo "TEST 5: POST /exam/start"
echo "================================"
curl -s -X POST $BASE/exam/start -H "Authorization: Bearer $TOKEN_PESERTA" | pp

echo ""
echo "================================"
echo "TEST 6: POST /exam/answers/batch"
echo "================================"
curl -s -X POST $BASE/exam/answers/batch \
  -H "Authorization: Bearer $TOKEN_PESERTA" \
  -H "Content-Type: application/json" \
  -d '{"idempotency_key":"t1","answers":[{"question_id":"q1","answer":"A"},{"question_id":"q2","answer":"B"},{"question_id":"q3","answer":"jawaban esai"}]}' | pp

echo ""
echo "================================"
echo "TEST 7: POST /exam/submit"
echo "================================"
curl -s -X POST $BASE/exam/submit -H "Authorization: Bearer $TOKEN_PESERTA" | pp

echo ""
echo "================================"
echo "TEST 8: DB check exam_results"
echo "================================"
sqlite3 cbt.db "SELECT participant_id, total_questions, correct_answers, final_score, status FROM exam_results WHERE participant_id='part-1';"

echo ""
echo "================================"
echo "TEST 9: No token → 401"
echo "================================"
curl -s -X POST $BASE/exam/start | pp

echo ""
echo "================================"
echo "TEST 10: Spoofing attempt (harus ke part-1)"
echo "================================"
curl -s -X POST $BASE/exam/answer \
  -H "Authorization: Bearer $TOKEN_PESERTA" \
  -H "Content-Type: application/json" \
  -d '{"participant_id":"SISWA-LAIN","question_id":"q1","answer":"X"}' | pp
echo "Redis check:"
redis-cli -p 6380 HGET "exam:answers:test-exam:part-1" q1

echo ""
echo "================================"
echo "DONE"
echo "================================"
