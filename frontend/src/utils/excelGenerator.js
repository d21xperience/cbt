// src/utils/excelGenerator.js
import * as XLSX from 'xlsx'

/**
 * Generate file Excel template soal yang valid
 * @returns {Blob} File Excel yang bisa dibuka di Excel/Google Sheets
 */
export const generateExcelTemplate = () => {
  // Data contoh soal
  const sampleData = [
    {
      question_type: 'PG',
      question_text: 'Berapakah hasil dari 15 x 8 + 20?',
      opt_a: '100',
      opt_b: '120',
      opt_c: '140',
      opt_d: '160',
      correct_option: 'B',
      score: 10,
      media_url: '',
      rubric: ''
    },
    {
      question_type: 'PG',
      question_text: 'Ibukota Indonesia adalah...',
      opt_a: 'Jakarta',
      opt_b: 'Surabaya',
      opt_c: 'Bandung',
      opt_d: 'Medan',
      correct_option: 'A',
      score: 10,
      media_url: '',
      rubric: ''
    },
    {
      question_type: 'ESSAY',
      question_text: 'Jelaskan proses fotosintesis secara singkat!',
      opt_a: '',
      opt_b: '',
      opt_c: '',
      opt_d: '',
      correct_option: '',
      score: 20,
      media_url: '',
      rubric: 'Jawaban harus menyebutkan: cahaya matahari, klorofil, CO2, H2O, glukosa, O2'
    }
  ]

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(sampleData)

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // question_type
    { wch: 50 }, // question_text
    { wch: 20 }, // opt_a
    { wch: 20 }, // opt_b
    { wch: 20 }, // opt_c
    { wch: 20 }, // opt_d
    { wch: 15 }, // correct_option
    { wch: 8 },  // score
    { wch: 30 }, // media_url
    { wch: 50 }  // rubric
  ]

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Soal Ujian')

  // Add instruction sheet
  const instructionData = [
    ['PANDUAN PENGISIAN TEMPLATE SOAL'],
    [''],
    ['Kolom yang WAJIB diisi:'],
    ['- question_type: PG atau ESSAY'],
    ['- question_text: Teks soal (support LaTeX: $...$ untuk inline, $$...$$ untuk display)'],
    ['- score: Bobot nilai (angka)'],
    [''],
    ['Kolom untuk PG (Pilihan Ganda):'],
    ['- opt_a, opt_b, opt_c, opt_d: Pilihan jawaban'],
    ['- correct_option: Jawaban benar (A/B/C/D)'],
    [''],
    ['Kolom untuk ESSAY:'],
    ['- rubric: Rubrik penilaian (opsional)'],
    [''],
    ['Kolom opsional:'],
    ['- media_url: URL gambar/audio (opsional)'],
    [''],
    ['CONTOH PENGGUNAAN LATEX:'],
    ['- Inline: $15 \\times 8 + 20$'],
    ['- Display: $$x^2 - 5x + 6 = 0$$'],
    [''],
    ['CONTOH SOAL:'],
    ['Lihat sheet "Soal Ujian" untuk contoh']
  ]

  const wsInstruction = XLSX.utils.aoa_to_sheet(instructionData)
  wsInstruction['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsInstruction, 'Panduan')

  // Generate Excel file
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

  // Create Blob
  return new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}

/**
 * Parse file Excel/CSV dan return array of questions
 * @param {File} file - File yang akan di-parse
 * @returns {Promise<Array>} Array of question objects
 */
export const parseQuestionFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })

        // Ambil sheet pertama
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        // Transform ke format question
        const questions = jsonData.map((row, idx) => {
          const question = {
            _rowNumber: idx + 1,
            question_type: row.question_type || 'PG',
            question_text: row.question_text || '',
            options: {},
            correct_option: row.correct_option || null,
            score: parseInt(row.score) || 10,
            media_url: row.media_url || null,
            rubric: row.rubric || null
          }

          // Parse options untuk PG
          if (question.question_type === 'PG') {
            question.options = {
              A: row.opt_a || '',
              B: row.opt_b || '',
              C: row.opt_c || '',
              D: row.opt_d || ''
            }
          }

          // Validasi
          if (!question.question_text) {
            question._error = 'Teks soal kosong'
          }

          if (question.question_type === 'PG') {
            if (!question.options.A || !question.options.B || !question.options.C || !question.options.D) {
              question._error = 'Semua opsi PG wajib diisi'
            }
            if (!question.correct_option || !['A', 'B', 'C', 'D'].includes(question.correct_option)) {
              question._error = 'Jawaban benar tidak valid'
            }
          }

          return question
        })

        resolve(questions)
      } catch (error) {
        reject(new Error('Gagal memproses file: ' + error.message))
      }
    }

    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsArrayBuffer(file)
  })
}
