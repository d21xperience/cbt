// src/mocks/handlers/questionHandlers.js
// eslint-disable-next-line no-unused-vars
import { mockTemplateCSV, mockParsedQuestions, mockSubmitResponse } from '../data/questionsData'
import { generateExcelTemplate } from '@/utils/excelGenerator'

const DELAY = 300

export const questionHandlers = (mock) => {
  // Download Template (CSV / XLSX)
  mock.onGet('/admin/questions/template').reply((config) => {
    const format = config.params?.format || 'csv'
    console.log(`📥 [MOCK] Template ${format} downloaded`)
    let blob
    if (format === 'xlsx') {
      blob = generateExcelTemplate()
    } else {
      const csvContent =
        'question_type,question_text,opt_a,opt_b,opt_c,opt_d,correct_option,score,media_url,rubric\n' +
        'PG,"Berapakah hasil dari 15 x 8 + 20?",100,120,140,160,B,10,,\n' +
        'PG,"Ibukota Indonesia adalah...",Jakarta,Surabaya,Bandung,Medan,A,10,,\n' +
        'ESSAY,"Jelaskan proses fotosintesis secara singkat!",,,,,,20,,"Jawaban harus menyebutkan: cahaya matahari, klorofil, CO2, H2O, glukosa, O2"'
      blob = new Blob([csvContent], { type: 'text/csv' })
    }
    return [200, blob, { delay: DELAY }]
  })

  // Parse File (Upload)
  mock.onPost('/admin/questions/parse').reply(() => {
    console.log(`📄 [MOCK] File parsed: ${mockParsedQuestions.length} questions`)
    return [200, { questions: mockParsedQuestions, errors: [] }, { delay: 1500 }]
  })

  // Submit Questions (Paste)
  mock.onPost('/admin/questions/paste').reply((config) => {
    const body = JSON.parse(config.data)
    const count = body.questions?.length || 0
    console.log(`📝 [MOCK] Questions submitted: ${count} items`)
    return [
      200,
      { ...mockSubmitResponse, imported_count: count, exam_id: body.exam_id },
      { delay: DELAY },
    ]
  })
}
