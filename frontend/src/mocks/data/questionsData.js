// src/mocks/questionsData.js

// Template CSV sebagai string (untuk simulasi download)
export const mockTemplateCSV = `question_type,question_text,opt_a,opt_b,opt_c,opt_d,correct_option,score,media_url,rubric
PG,"Berapakah hasil dari 15 x 8 + 20?",100,120,140,160,B,10,,
PG,"Ibukota Indonesia adalah...",Jakarta,Surabaya,Bandung,Medan,A,10,,
ESSAY,"Jelaskan proses fotosintesis secara singkat!",,,,,,20,,"Jawaban harus menyebutkan: cahaya matahari, klorofil, CO2, H2O, glukosa, O2"
PG,"Siapa presiden pertama Indonesia?",Soekarno,Soeharto,Habibie,Gus Dur,A,10,,`

// Mock hasil parsing file
export const mockParsedQuestions = [
  {
    _rowNumber: 1,
    question_type: 'PG',
    question_text: 'Berapakah hasil dari 15 × 8 + 20?',
    options: { A: '100', B: '120', C: '140', D: '160' },
    correct_option: 'B',
    score: 10,
    media_url: null,
    rubric: null,
  },
  {
    _rowNumber: 2,
    question_type: 'PG',
    question_text: 'Ibukota Indonesia adalah...',
    options: { A: 'Jakarta', B: 'Surabaya', C: 'Bandung', D: 'Medan' },
    correct_option: 'A',
    score: 10,
    media_url: null,
    rubric: null,
  },
  {
    _rowNumber: 3,
    question_type: 'ESSAY',
    question_text: 'Jelaskan proses fotosintesis secara singkat!',
    options: {},
    correct_option: null,
    score: 20,
    media_url: null,
    rubric: 'Jawaban harus menyebutkan: cahaya matahari, klorofil, CO2, H2O, glukosa, O2',
  },
  {
    _rowNumber: 4,
    question_type: 'PG',
    question_text: 'Siapa presiden pertama Indonesia?',
    options: { A: 'Soekarno', B: 'Soeharto', C: 'Habibie', D: 'Gus Dur' },
    correct_option: 'A',
    score: 10,
    media_url: null,
    rubric: null,
  },
]

// Mock response submit
export const mockSubmitResponse = {
  message: 'Soal berhasil diimport',
  imported_count: 4,
  exam_id: 'exam-mtk-1',
}
