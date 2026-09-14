<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Manajemen Kartu Ujian</div>

    <q-tabs v-model="tab" dense class="q-mb-md" align="left">
      <q-tab name="list" label="Daftar Kartu" />
      <q-tab name="create" label="Buat Kartu Baru" />
      <q-tab name="mass" label="Cetak Massal" />
      <q-tab name="report" label="Laporan Kartu" />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>
      <!-- ================= TAB 1: DAFTAR KARTU ================= -->
      <q-tab-panel name="list" class="q-pa-none">
        <div class="row q-col-gutter-md q-mb-md">
          <div class="col-12 col-md-3">
            <q-input dense outlined label="Cari (Nama, No. Kartu)" v-model="searchQuery" debounce="300" />
          </div>
          <div class="col-12 col-md-2">
            <q-select dense outlined label="Tipe Kartu" v-model="filterType"
              :options="['SEMUA', 'PERMANENT', 'TEMPORARY']" clearable />
          </div>
          <div class="col-12 col-md-2">
            <q-select dense outlined label="Status" v-model="filterStatus"
              :options="['SEMUA', 'ACTIVE', 'EXPIRED', 'REVOKED']" clearable />
          </div>
        </div>
        <q-table :rows="filteredCards" :columns="columns" row-key="id" flat bordered dense :loading="loading">
          <template v-slot:body-cell-card_type="props">
            <q-td :props="props">
              <q-badge :color="props.row.card_type === 'PERMANENT' ? 'positive' : 'warning'"
                :label="props.row.card_type" />
            </q-td>
          </template>
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge
                :color="props.row.status === 'ACTIVE' ? 'primary' : (props.row.status === 'EXPIRED' ? 'negative' : 'grey')"
                :label="props.row.status" />
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat round dense icon="print" color="primary" @click="printSingleCard(props.row)" class="q-mr-sm">
                <q-tooltip>Cetak Kartu</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="block" color="negative" @click="revokeCard(props.row.id)">
                <q-tooltip>Cabut Kartu</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
      </q-tab-panel>

      <!-- ================= TAB 2: BUAT KARTU BARU (SATU SISWA) ================= -->
      <q-tab-panel name="create" class="q-pa-none">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Buat Kartu untuk Satu Siswa</div>
          </q-card-section>
          <q-card-section>
            <q-form class="q-gutter-md">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <q-select v-model="selectedStudent" :options="siswaOptions" label="Pilih Siswa" option-value="id"
                    option-label="nama_dan_kelas" outlined dense />
                </div>
                <div class="col-12 col-md-6">
                  <q-select v-model="selectedExam" :options="examOptions" label="Pilih Ujian (Opsional)"
                    option-value="id" option-label="nama" outlined dense clearable />
                </div>
                <div class="col-12 col-md-6">
                  <q-select v-model="cardType" :options="cardTypeOptions" label="Tipe Kartu" outlined dense />
                </div>
                <div class="col-12 col-md-6" v-if="cardType === 'TEMPORARY'">
                  <q-input v-model="expiryDate" label="Tanggal Kedaluwarsa" type="date" outlined dense />
                  <q-input v-model="reason" label="Alasan (Tunggakan)" outlined dense />
                </div>
              </div>
              <q-btn label="Buat Kartu" color="primary" @click="createSingleCard" />
            </q-form>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- ================= TAB 3: CETAK MASSAL ================= -->
      <q-tab-panel name="mass" class="q-pa-none">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Cetak Kartu Massal</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-select v-model="massFilterKelas" :options="kelasOptions" label="Filter Kelas (Opsional)"
                  option-value="id" option-label="nama" outlined dense clearable />
              </div>
              <div class="col-12 col-md-4">
                <q-select v-model="massSelectedStudents" :options="massSiswaOptions" label="Pilih Siswa Tertentu"
                  multiple outlined dense use-chips option-value="id" option-label="nama_dan_kelas" />
              </div>
              <div class="col-12 col-md-4">
                <q-btn color="primary" label="Cetak Kartu untuk Siswa Terpilih" @click="printMassCards" />
              </div>
            </div>
            <div class="q-mt-md">
              <q-btn color="secondary" label="Cetak Semua Kartu Aktif" @click="printAllActiveCards" />
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- ================= TAB 4: LAPORAN ================= -->
      <q-tab-panel name="report" class="q-pa-none">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Statistik Kartu</div>
            <div class="row q-col-gutter-md q-mt-md">
              <div class="col-12 col-md-3">
                <q-card class="bg-primary text-white">
                  <q-card-section>Total Kartu</q-card-section>
                  <q-card-section class="text-h4">{{ allCards.length }}</q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-3">
                <q-card class="bg-positive text-white">
                  <q-card-section>Aktif</q-card-section>
                  <q-card-section class="text-h4">{{allCards.filter(c => c.status === 'ACTIVE').length
                    }}</q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-3">
                <q-card class="bg-warning text-black">
                  <q-card-section>Sementara</q-card-section>
                  <q-card-section class="text-h4">{{allCards.filter(c => c.card_type === 'TEMPORARY').length
                    }}</q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-md-3">
                <q-card class="bg-negative text-white">
                  <q-card-section>Kedaluwarsa/Dicabut</q-card-section>
                  <q-card-section class="text-h4">{{allCards.filter(c => c.status !== 'ACTIVE').length
                    }}</q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <!-- Dialog Preview Cetak (untuk satu kartu) -->
    <q-dialog v-model="printDialog" persistent>
      <q-card style="min-width: 400px;">
        <q-card-section class="text-center">
          <div class="text-h6">Preview Kartu Ujian</div>
        </q-card-section>
        <q-card-section class="text-center" id="print-area-single">
          <div class="card-preview"
            style="border: 2px solid #ccc; padding: 20px; border-radius: 10px; width: 350px; margin: auto;">
            <div><strong>No. Kartu:</strong> {{ singleCardData?.card_number }}</div>
            <div><strong>Siswa:</strong> {{ singleCardData?.student_name }}</div>
            <div><strong>Username:</strong> {{ singleCardData?.username }}</div>
            <div><strong>Password:</strong> {{ singleCardData?.password }}</div>
            <div><strong>Serial Key:</strong> {{ singleCardData?.serial_key }}</div>
            <div v-if="singleCardData?.exam_id"><strong>Ujian:</strong> {{ getExamName(singleCardData.exam_id) }}</div>
            <div v-if="singleCardData?.card_type === 'TEMPORARY'"><strong>Berlaku s/d:</strong> {{
              formatDate(singleCardData.expiry_date) }}</div>
            <div v-if="singleCardData?.reason"><strong>Alasan:</strong> {{ singleCardData.reason }}</div>
            <div class="q-mt-md">
              <qrcode-vue :value="singleCardData?.qr_data" :size="120" level="H" />
            </div>
            <div class="text-caption q-mt-sm">Scan QR Code untuk login</div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Tutup" color="negative" v-close-popup />
          <q-btn flat label="Cetak" color="primary" @click="printSingle" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog Cetak Massal (multiple cards per halaman) -->
    <q-dialog v-model="printMassDialog" full-width>
      <q-card>
        <q-card-section>
          <div class="text-h6">Cetak Kartu Massal</div>
          <div class="q-mt-md" id="print-area-mass">
            <div v-for="(card) in massCardsToPrint" :key="card.id" class="card-print-item" :style="massPrintStyle">
              <div style="border: 1px solid #aaa; padding: 10px; margin: 5px; border-radius: 8px;">
                <div><strong>No. Kartu:</strong> {{ card.card_number }}</div>
                <div><strong>Siswa:</strong> {{ card.student_name }}</div>
                <div><strong>Username:</strong> {{ card.username }}</div>
                <div><strong>Password:</strong> {{ card.password }}</div>
                <div><strong>Serial Key:</strong> {{ card.serial_key }}</div>
                <div v-if="card.exam_id"><strong>Ujian:</strong> {{ getExamName(card.exam_id) }}</div>
                <div v-if="card.card_type === 'TEMPORARY'"><strong>Berlaku s/d:</strong> {{ formatDate(card.expiry_date)
                  }}
                </div>
                <div class="q-mt-sm">
                  <qrcode-vue :value="card.qr_data" :size="80" level="H" />
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Tutup" color="negative" v-close-popup />
          <q-btn flat label="Cetak" color="primary" @click="printMass" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import QrcodeVue from 'qrcode'

const $q = useQuasar()

// Data
const allCards = ref([])
const siswaList = ref([])
const kelasList = ref([])
const examList = ref([])

// UI state
const tab = ref('list')
const searchQuery = ref('')
const filterType = ref(null)
const filterStatus = ref(null)
const loading = ref(false)

// Single card creation
const selectedStudent = ref(null)
const selectedExam = ref(null)
const cardType = ref('PERMANENT')
const expiryDate = ref('')
const reason = ref('')
const cardTypeOptions = [
  { label: 'Kartu Tetap', value: 'PERMANENT' },
  { label: 'Kartu Sementara (Tunggakan)', value: 'TEMPORARY' }
]

// Mass printing
const massFilterKelas = ref(null)
const massSelectedStudents = ref([])
const massCardsToPrint = ref([])
const printDialog = ref(false)
const printMassDialog = ref(false)
const singleCardData = ref(null)

// Columns
const columns = [
  { name: 'card_number', label: 'No. Kartu', field: 'card_number', align: 'left' },
  { name: 'student_name', label: 'Siswa', field: 'student_name', align: 'left' },
  { name: 'card_type', label: 'Tipe', field: 'card_type', align: 'center' },
  { name: 'status', label: 'Status', field: 'status', align: 'center' },
  { name: 'actions', label: 'Aksi', field: 'actions', align: 'center' }
]

// Computed
const filteredCards = computed(() => {
  let result = allCards.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(c => c.student_name.toLowerCase().includes(q) || c.card_number.toLowerCase().includes(q))
  }
  if (filterType.value && filterType.value !== 'SEMUA') result = result.filter(c => c.card_type === filterType.value)
  if (filterStatus.value && filterStatus.value !== 'SEMUA') result = result.filter(c => c.status === filterStatus.value)
  return result
})

const siswaOptions = computed(() => siswaList.value.map(s => ({ id: s.id, nama_dan_kelas: `${s.nama} (${s.kelas_nama})`, ...s })))
const examOptions = computed(() => examList.value)
const kelasOptions = computed(() => kelasList.value)

const massSiswaOptions = computed(() => {
  let filtered = siswaList.value
  if (massFilterKelas.value) {
    filtered = filtered.filter(s => s.kelas_id === massFilterKelas.value.id)
  }
  return filtered.map(s => ({ id: s.id, nama_dan_kelas: `${s.nama} (${s.kelas_nama})`, ...s }))
})

const massPrintStyle = computed(() => {
  // Untuk cetak massal, kita atur agar per baris ada 2 kartu (display: inline-block, width: 48%)
  return { display: 'inline-block', width: '48%', verticalAlign: 'top' }
})

// Helper functions
function generateSerial() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'
  let segments = []
  for (let i = 0; i < 4; i++) {
    let segment = ''
    for (let j = 0; j < 4; j++) segment += chars.charAt(Math.floor(Math.random() * chars.length))
    segments.push(segment)
  }
  return segments.join('-')
}
function generateUsername(student) {
  return student.username || student.nama.toLowerCase().replace(/ /g, '.')
}
function generatePassword() {
  return Math.random().toString(36).substring(2, 10)
}
function saveCards() { localStorage.setItem('exam_cards', JSON.stringify(allCards.value)) }
function loadCards() {
  const cards = localStorage.getItem('exam_cards')
  if (cards) allCards.value = JSON.parse(cards)
}
function loadStudents() {
  const data = localStorage.getItem('appData')
  if (data) {
    const parsed = JSON.parse(data)
    siswaList.value = parsed.users?.siswa || []
    kelasList.value = parsed.classes || []
  } else {
    siswaList.value = [
      { id: 1, nama: 'Ahmad Faizal', kelas_id: 1, kelas_nama: '10 IPA 1', username: 'ahmad.faizal' },
      { id: 2, nama: 'Siti Nurhaliza', kelas_id: 1, kelas_nama: '10 IPA 1', username: 'siti.nurhaliza' }
    ]
    kelasList.value = [{ id: 1, nama: '10 IPA 1' }]
  }
}
function loadExams() {
  const exams = localStorage.getItem('exam_data')
  if (exams) examList.value = JSON.parse(exams)
  else examList.value = []
}
function getExamName(examId) {
  const exam = examList.value.find(e => e.id === examId)
  return exam ? exam.nama : '-'
}
function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID')
}

// Create single card
function createSingleCard() {
  if (!selectedStudent.value) {
    $q.notify({ type: 'negative', message: 'Pilih siswa' })
    return
  }
  if (cardType.value === 'TEMPORARY' && !expiryDate.value) {
    $q.notify({ type: 'negative', message: 'Isi tanggal kedaluwarsa' })
    return
  }
  const newCard = {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    card_number: `CRD-${new Date().getFullYear()}-${String(allCards.value.length + 1).padStart(4, '0')}`,
    student_id: selectedStudent.value.id,
    student_name: selectedStudent.value.nama,
    exam_id: selectedExam.value ? selectedExam.value.id : null,
    username: generateUsername(selectedStudent.value),
    password: generatePassword(),
    serial_key: generateSerial(),
    qr_data: `SERIAL:${generateSerial()}`,
    card_type: cardType.value,
    expiry_date: cardType.value === 'TEMPORARY' ? expiryDate.value : null,
    reason: cardType.value === 'TEMPORARY' ? reason.value : null,
    printed_at: new Date().toISOString(),
    printed_by: 'Admin',
    status: 'ACTIVE',
    created_at: new Date().toISOString()
  }
  allCards.value.push(newCard)
  saveCards()
  $q.notify({ type: 'positive', message: 'Kartu berhasil dibuat' })
  selectedStudent.value = null
  selectedExam.value = null
  cardType.value = 'PERMANENT'
  expiryDate.value = ''
  reason.value = ''
  tab.value = 'list'
}

// Print single card
function printSingleCard(card) {
  singleCardData.value = card
  printDialog.value = true
}
function printSingle() {
  const content = document.getElementById('print-area-single').innerHTML
  const win = window.open('', '_blank')
  win.document.write(`<html><head><title>Cetak Kartu</title></head><body>${content}</body></html>`)
  win.document.close()
  win.print()
}

// Mass printing
async function printMassCards() {
  let selectedIds = massSelectedStudents.value.map(s => s.id)
  if (massFilterKelas.value && selectedIds.length === 0) {
    // jika tidak ada siswa dipilih secara individual, ambil semua siswa di kelas tersebut
    const siswaDiKelas = siswaList.value.filter(s => s.kelas_id === massFilterKelas.value.id)
    selectedIds = siswaDiKelas.map(s => s.id)
  }
  if (selectedIds.length === 0) {
    $q.notify({ type: 'warning', message: 'Tidak ada siswa terpilih' })
    return
  }
  // Cari kartu yang sudah ada untuk siswa-siswa tersebut, jika belum ada, buatkan
  const cardsToPrint = []
  for (const sid of selectedIds) {
    let card = allCards.value.find(c => c.student_id === sid && c.status === 'ACTIVE')
    if (!card) {
      // Buat kartu baru otomatis (dengan tipe PERMANENT default, bisa disesuaikan)
      const student = siswaList.value.find(s => s.id === sid)
      if (student) {
        const newCard = {
          id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
          card_number: `CRD-${new Date().getFullYear()}-${String(allCards.value.length + 1).padStart(4, '0')}`,
          student_id: student.id,
          student_name: student.nama,
          exam_id: null,
          username: generateUsername(student),
          password: generatePassword(),
          serial_key: generateSerial(),
          qr_data: `SERIAL:${generateSerial()}`,
          card_type: 'PERMANENT',
          expiry_date: null,
          reason: null,
          printed_at: new Date().toISOString(),
          printed_by: 'Admin (Massal)',
          status: 'ACTIVE',
          created_at: new Date().toISOString()
        }
        allCards.value.push(newCard)
        saveCards()
        card = newCard
      }
    }
    if (card) cardsToPrint.push(card)
  }
  if (cardsToPrint.length === 0) {
    $q.notify({ type: 'error', message: 'Tidak ada kartu yang dapat dicetak' })
    return
  }
  massCardsToPrint.value = cardsToPrint
  printMassDialog.value = true
}
function printAllActiveCards() {
  const activeCards = allCards.value.filter(c => c.status === 'ACTIVE')
  if (activeCards.length === 0) {
    $q.notify({ type: 'warning', message: 'Tidak ada kartu aktif' })
    return
  }
  massCardsToPrint.value = activeCards
  printMassDialog.value = true
}
function printMass() {
  const content = document.getElementById('print-area-mass').innerHTML
  const win = window.open('', '_blank')
  win.document.write(`<html><head><title>Cetak Kartu Massal</title><style>.card-print-item { display: inline-block; width: 48%; vertical-align: top; }</style></head><body>${content}</body></html>`)
  win.document.close()
  win.print()
}

// Revoke
function revokeCard(cardId) {
  $q.dialog({
    title: 'Konfirmasi',
    message: 'Cabut kartu ini?',
    cancel: true
  }).onOk(() => {
    const idx = allCards.value.findIndex(c => c.id === cardId)
    if (idx !== -1) {
      allCards.value[idx].status = 'REVOKED'
      saveCards()
      $q.notify({ type: 'positive', message: 'Kartu dicabut' })
    }
  })
}

onMounted(() => {
  loadCards()
  loadStudents()
  loadExams()
})
</script>

<style scoped>
.card-print-item {
  break-inside: avoid;
  page-break-inside: avoid;
}
</style>
