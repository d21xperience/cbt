// import { useQuasar } from 'quasar'
// import { ref } from 'vue'

// export function useExamCardManagement() {
//   const $q = useQuasar()
//   // Data
//   const allCards = ref([])
//   const siswaList = ref([])
//   const kelasList = ref([])
//   const examList = ref([])

//   // Mass printing
//   const massFilterKelas = ref(null)
//   const massSelectedStudents = ref([])
//   const massCardsToPrint = ref([])
//   const printDialog = ref(false)
//   const printMassDialog = ref(false)
//   const singleCardData = ref(null)

//   // Single card creation
//   const selectedStudent = ref(null)
//   const selectedExam = ref(null)
//   const cardType = ref('PERMANENT')
//   const expiryDate = ref('')
//   const reason = ref('')
//   const cardTypeOptions = [
//     { label: 'Kartu Tetap', value: 'PERMANENT' },
//     { label: 'Kartu Sementara (Tunggakan)', value: 'TEMPORARY' },
//   ]

//   // Helper const s
//   const generateSerial = async () => {
//     const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
//     let segments = []
//     for (let i = 0; i < 4; i++) {
//       let segment = ''
//       for (let j = 0; j < 4; j++) segment += chars.charAt(Math.floor(Math.random() * chars.length))
//       segments.push(segment)
//     }
//     return segments.join('-')
//   }
//   const generateUsername = (student) => {
//     return student.username || student.nama.toLowerCase().replace(/ /g, '.')
//   }
//   const generatePassword = async () => {
//     return Math.random().toString(36).substring(2, 10)
//   }
//   const saveCards = async () => {
//     localStorage.setItem('exam_cards', JSON.stringify(allCards.value))
//   }
//   const loadCards = async () => {
//     const cards = localStorage.getItem('exam_cards')
//     if (cards) allCards.value = JSON.parse(cards)
//   }
//   const loadStudents = async () => {
//     const data = localStorage.getItem('appData')
//     if (data) {
//       const parsed = JSON.parse(data)
//       siswaList.value = parsed.users?.siswa || []
//       kelasList.value = parsed.classes || []
//     } else {
//       siswaList.value = [
//         {
//           id: 1,
//           nama: 'Ahmad Faizal',
//           kelas_id: 1,
//           kelas_nama: '10 IPA 1',
//           username: 'ahmad.faizal',
//         },
//         {
//           id: 2,
//           nama: 'Siti Nurhaliza',
//           kelas_id: 1,
//           kelas_nama: '10 IPA 1',
//           username: 'siti.nurhaliza',
//         },
//       ]
//       kelasList.value = [{ id: 1, nama: '10 IPA 1' }]
//     }
//   }
//   const loadExams = async () => {
//     const exams = localStorage.getItem('exam_data')
//     if (exams) examList.value = JSON.parse(exams)
//     else examList.value = []
//   }
//   const getExamName = (examId) => {
//     const exam = examList.value.find((e) => e.id === examId)
//     return exam ? exam.nama : '-'
//   }
//   const formatDate = (dateStr) => {
//     if (!dateStr) return '-'
//     return new Date(dateStr).toLocaleDateString('id-ID')
//   }

//   // Create single card
//   const createSingleCard = async () => {
//     if (!selectedStudent.value) {
//       $q.notify({ type: 'negative', message: 'Pilih siswa' })
//       return
//     }
//     if (cardType.value === 'TEMPORARY' && !expiryDate.value) {
//       $q.notify({ type: 'negative', message: 'Isi tanggal kedaluwarsa' })
//       return
//     }
//     const newCard = {
//       id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
//       card_number: `CRD-${new Date().getFullYear()}-${String(allCards.value.length + 1).padStart(4, '0')}`,
//       student_id: selectedStudent.value.id,
//       student_name: selectedStudent.value.nama,
//       exam_id: selectedExam.value ? selectedExam.value.id : null,
//       username: generateUsername(selectedStudent.value),
//       password: generatePassword(),
//       serial_key: generateSerial(),
//       qr_data: `SERIAL:${generateSerial()}`,
//       card_type: cardType.value,
//       expiry_date: cardType.value === 'TEMPORARY' ? expiryDate.value : null,
//       reason: cardType.value === 'TEMPORARY' ? reason.value : null,
//       printed_at: new Date().toISOString(),
//       printed_by: 'Admin',
//       status: 'ACTIVE',
//       created_at: new Date().toISOString(),
//     }
//     allCards.value.push(newCard)
//     saveCards()
//     $q.notify({ type: 'positive', message: 'Kartu berhasil dibuat' })
//     selectedStudent.value = null
//     selectedExam.value = null
//     cardType.value = 'PERMANENT'
//     expiryDate.value = ''
//     reason.value = ''
//     tab.value = 'list'
//   }

//   // Print single card
//   const printSingleCard = (card) => {
//     singleCardData.value = card
//     printDialog.value = true
//   }
//   const printSingle = async () => {
//     const content = document.getElementById('print-area-single').innerHTML
//     const win = window.open('', '_blank')
//     win.document.write(
//       `<html><head><title>Cetak Kartu</title></head><body>${content}</body></html>`,
//     )
//     win.document.close()
//     win.print()
//   }

//   // Mass printing
//   const printMassCards = async () => {
//     let selectedIds = massSelectedStudents.value.map((s) => s.id)
//     if (massFilterKelas.value && selectedIds.length === 0) {
//       // jika tidak ada siswa dipilih secara individual, ambil semua siswa di kelas tersebut
//       const siswaDiKelas = siswaList.value.filter((s) => s.kelas_id === massFilterKelas.value.id)
//       selectedIds = siswaDiKelas.map((s) => s.id)
//     }
//     if (selectedIds.length === 0) {
//       $q.notify({ type: 'warning', message: 'Tidak ada siswa terpilih' })
//       return
//     }
//     // Cari kartu yang sudah ada untuk siswa-siswa tersebut, jika belum ada, buatkan
//     const cardsToPrint = []
//     for (const sid of selectedIds) {
//       let card = allCards.value.find((c) => c.student_id === sid && c.status === 'ACTIVE')
//       if (!card) {
//         // Buat kartu baru otomatis (dengan tipe PERMANENT default, bisa disesuaikan)
//         const student = siswaList.value.find((s) => s.id === sid)
//         if (student) {
//           const newCard = {
//             id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
//             card_number: `CRD-${new Date().getFullYear()}-${String(allCards.value.length + 1).padStart(4, '0')}`,
//             student_id: student.id,
//             student_name: student.nama,
//             exam_id: null,
//             username: generateUsername(student),
//             password: generatePassword(),
//             serial_key: generateSerial(),
//             qr_data: `SERIAL:${generateSerial()}`,
//             card_type: 'PERMANENT',
//             expiry_date: null,
//             reason: null,
//             printed_at: new Date().toISOString(),
//             printed_by: 'Admin (Massal)',
//             status: 'ACTIVE',
//             created_at: new Date().toISOString(),
//           }
//           allCards.value.push(newCard)
//           saveCards()
//           card = newCard
//         }
//       }
//       if (card) cardsToPrint.push(card)
//     }
//     if (cardsToPrint.length === 0) {
//       $q.notify({ type: 'error', message: 'Tidak ada kartu yang dapat dicetak' })
//       return
//     }
//     massCardsToPrint.value = cardsToPrint
//     printMassDialog.value = true
//   }
//   const printAllActiveCards = async () => {
//     const activeCards = allCards.value.filter((c) => c.status === 'ACTIVE')
//     if (activeCards.length === 0) {
//       $q.notify({ type: 'warning', message: 'Tidak ada kartu aktif' })
//       return
//     }
//     massCardsToPrint.value = activeCards
//     printMassDialog.value = true
//   }
//   const printMass = async () => {
//     const content = document.getElementById('print-area-mass').innerHTML
//     const win = window.open('', '_blank')
//     win.document.write(
//       `<html><head><title>Cetak Kartu Massal</title><style>.card-print-item { display: inline-block; width: 48%; vertical-align: top; }</style></head><body>${content}</body></html>`,
//     )
//     win.document.close()
//     win.print()
//   }

//   // Revoke
//   const revokeCard = (cardId) => {
//     $q.dialog({
//       title: 'Konfirmasi',
//       message: 'Cabut kartu ini?',
//       cancel: true,
//     }).onOk(() => {
//       const idx = allCards.value.findIndex((c) => c.id === cardId)
//       if (idx !== -1) {
//         allCards.value[idx].status = 'REVOKED'
//         saveCards()
//         $q.notify({ type: 'positive', message: 'Kartu dicabut' })
//       }
//     })
//   }
//   return {
//     loadCards,
//     loadStudents,
//     loadExams,
//     getExamName,
//     formatDate,
//     createSingleCard,
//     printSingleCard,
//     printSingle,
//     printMassCards,
//     printAllActiveCards,
//     printMass,
//     revokeCard,

//     // data
//     allCards,
//     siswaList,
//     kelasList,
//     examList,
//     massFilterKelas,
//     massSelectedStudents,
//     massCardsToPrint,
//     printDialog,
//     printMassDialog,
//     singleCardData,
//   }
// }
