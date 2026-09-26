// src/mocks/data/examTypesData.js

export const mockExamTypes = [
  { id: 'etype-001', kode: 'UTS',     nama: 'Ujian Tengah Semester',    deskripsi: 'Ujian tengah semester ganjil/genap' },
  { id: 'etype-002', kode: 'UAS',     nama: 'Ujian Akhir Semester',     deskripsi: 'Ujian akhir semester ganjil/genap' },
  { id: 'etype-003', kode: 'UH',      nama: 'Ulangan Harian',           deskripsi: 'Ulangan per pertemuan / bab' },
  { id: 'etype-004', kode: 'SUSULAN', nama: 'Ujian Susulan',            deskripsi: 'Ujian pengganti untuk peserta tidak hadir' },
]

export const mockExamTypesTemplateCSV =
  '\uFEFFkode,nama,deskripsi\n' +
  'UAS,Ujian Akhir Semester,Ujian akhir semester\n' +
  'UTS,Ujian Tengah Semester,Ujian tengah semester\n'
