<template>
  <q-dialog v-model="isOpen" maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="column full-height">
      <q-card-section class="row items-center q-pb-none bg-primary text-white">
        <div class="text-h6">
          <q-icon name="file_upload" class="q-mr-sm" />
          Import Soal (Paste dari Word/Excel)
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="col q-pa-md scroll">
        <div class="text-caption text-grey-7 q-mb-md">
          Tempel (<strong>Ctrl+V</strong>) tabel soal dari Word di bawah ini. Jika ada soal yang memiliki gambar dari
          Word, Anda bisa langsung klik area gambar di Preview untuk menempel (<strong>Ctrl+V</strong>) atau memilih
          file gambarnya.
        </div>

        <q-input v-model="rawText" type="textarea" outlined rows="7"
          placeholder="Tempel (Ctrl+V) tabel soal dari Word di sini..." class="q-mb-md" @paste="handleWordPaste" />

        <!-- Preview Soal (Mendukung Edit & Paste Gambar per Soal) -->
        <div v-if="questionsList.length > 0">
          <div class="text-subtitle2 q-mb-sm flex items-center">
            <q-icon name="visibility" class="q-mr-xs" />
            Preview Soal Terdeteksi ({{ questionsList.length }} Soal)
          </div>

          <q-card v-for="(q, idx) in questionsList" :key="idx" bordered flat class="q-mb-md bg-grey-1">
            <q-card-section>
              <div class="row items-start justify-between">
                <div class="col">
                  <strong>{{ idx + 1 }}.</strong> {{ q.question_text }}
                </div>
                <q-btn flat round dense icon="delete" color="negative" size="sm"
                  @click="questionsList.splice(idx, 1)" />
              </div>

              <!-- Area Gambar Soal (Muncul jika terdeteksi ada gambar dari Word ATAU user klik tambah gambar) -->
              <div v-if="q.media_url || q.needs_image" class="q-my-sm">
                <!-- Jika gambar sudah berhasil dimuat -->
                <div v-if="q.media_url" class="relative-position inline-block">
                  <img :src="q.media_url" style="max-height: 180px; border-radius: 6px; border: 1px solid #ccc;" />
                  <q-btn round dense size="xs" color="negative" icon="close" class="absolute-top-right q-ma-xs"
                    @click="q.media_url = null; q.needs_image = false" />
                </div>

                <!-- Kotak Peringatan jika Word memblokir gambar lokal (file:///) -->
                <div v-else tabindex="0" @paste.stop="(e) => handleSingleImagePaste(e, idx)"
                  class="q-pa-md bg-amber-1 text-amber-10 rounded-borders cursor-pointer"
                  style="border: 2px dashed #f59e0b; outline: none;">
                  <div class="row items-center justify-between">
                    <div>
                      <q-icon name="image" size="sm" class="q-mr-xs" />
                      <strong>Gambar dari Word terdeteksi!</strong> Klik kotak ini lalu tekan <strong>Ctrl+V</strong>
                      (setelah copy gambarnya dari Word), atau:
                    </div>
                    <q-btn dense outline size="sm" color="amber-10" icon="upload" label="Pilih File"
                      @click="triggerFileInput(idx)" />
                  </div>
                </div>
              </div>

              <!-- Tombol manual jika ingin menambahkan gambar ke soal yang belum bergambar -->
              <div v-else class="q-mt-xs">
                <q-btn flat dense size="xs" color="primary" icon="add_photo_alternate" label="Tambah Gambar"
                  @click="q.needs_image = true" />
              </div>

              <!-- Pilihan Jawaban -->
              <div class="q-mt-sm">
                <div v-for="(opt, oIdx) in q.options" :key="oIdx" class="q-ml-md q-py-xs">
                  <span :class="opt.is_correct ? 'text-positive text-weight-bold' : ''">
                    {{ String.fromCharCode(65 + oIdx) }}. {{ opt.text }}
                  </span>
                  <q-icon v-if="opt.is_correct" name="check_circle" color="positive" class="q-ml-xs" />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Hidden file input untuk upload gambar manual -->
        <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="handleFileSelected" />
      </q-card-section>

      <q-card-actions align="right" class="bg-white q-pa-md">
        <q-btn flat label="Batal" color="grey-7" v-close-popup />
        <q-btn label="Simpan ke Database" color="primary" icon="save" :loading="loading"
          :disable="questionsList.length === 0" @click="submitImport" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ExamService } from '@/services/admin/ExamService'
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: Boolean,
  examId: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'success'])

const $q = useQuasar()
const isOpen = ref(false)
const loading = ref(false)
const rawText = ref('')
const questionsList = ref([])

// Ref untuk upload file gambar manual
const fileInputRef = ref(null)
const activeUploadIdx = ref(null)

watch(() => props.modelValue, (v) => { isOpen.value = v })
watch(isOpen, (v) => emit('update:modelValue', v))

// 1. Parser Utama saat Paste Tabel Word
const handleWordPaste = (event) => {
  const clipboardData = event.clipboardData || window.clipboardData
  const htmlData = clipboardData.getData('text/html')

  if (htmlData && htmlData.includes('<table')) {
    event.preventDefault()

    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlData, 'text/html')
    const rows = Array.from(doc.querySelectorAll('table tr'))

    const extracted = []
    let currentQ = null

    rows.forEach((tr) => {
      const tdElements = Array.from(tr.querySelectorAll('td, th'))
      const cellsText = tdElements.map((td) => td.innerText.replace(/\s+/g, ' ').trim())

      const jenisIdx = cellsText.findIndex(
        (c) => c.toUpperCase() === 'SOAL' || c.toUpperCase() === 'JAWABAN'
      )

      if (jenisIdx !== -1) {
        const jenis = cellsText[jenisIdx].toUpperCase()
        const isiCell = tdElements[jenisIdx + 1]
        const isiText = (cellsText[jenisIdx + 1] || '').replace(/\|/g, '/')
        const isKunci = (cellsText[jenisIdx + 2] || '0').trim() === '1'

        if (jenis === 'SOAL') {
          if (currentQ) extracted.push(currentQ)

          // Cek apakah di dalam sel SOAL terdapat gambar (<img> atau VML Word <v:imagedata>)
          let imageUrl = null
          let needsImage = false

          if (isiCell) {
            const imgTag = isiCell.querySelector('img')
            const vmlTag = isiCell.getElementsByTagName('v:imagedata')[0]

            if (imgTag) {
              const src = imgTag.getAttribute('src') || ''
              if (src.startsWith('data:image')) {
                imageUrl = src // Langsung dapat Base64 (Google Docs / Office Web)
              } else {
                needsImage = true // Path lokal file:/// dari Word Desktop (terblokir browser)
              }
            } else if (vmlTag) {
              needsImage = true
            }
          }

          currentQ = {
            question_text: isiText,
            question_type: 'PG',
            options: [],
            correct_option: '',
            media_url: imageUrl,
            needs_image: needsImage
          }
        } else if (jenis === 'JAWABAN' && currentQ) {
          const letter = String.fromCharCode(65 + currentQ.options.length)
          if (isKunci) currentQ.correct_option = letter
          currentQ.options.push({
            text: isiText,
            is_correct: isKunci
          })
        }
      }
    })

    if (currentQ) extracted.push(currentQ)

    if (extracted.length > 0) {
      questionsList.value.push(...extracted)
      rawText.value = `${questionsList.value.length} soal berhasil dimuat dari tabel Word. Cek hasil di bawah.`

      const imgCount = extracted.filter(q => q.needs_image).length
      $q.notify({
        type: imgCount > 0 ? 'warning' : 'positive',
        message: imgCount > 0
          ? `${extracted.length} soal dimuat. Ada ${imgCount} soal bergambar yang perlu ditempel ulang gambarnya.`
          : `${extracted.length} soal berhasil dimuat!`
      })
    }
  }
}

// 2. Handler Paste 1 Gambar Langsung ke Kotak Peringatan Soal
const handleSingleImagePaste = (event, questionIdx) => {
  const items = (event.clipboardData || window.clipboardData).items
  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      const blob = item.getAsFile()
      const reader = new FileReader()
      reader.onload = (e) => {
        questionsList.value[questionIdx].media_url = e.target.result
        questionsList.value[questionIdx].needs_image = false
        $q.notify({ type: 'positive', message: 'Gambar berhasil ditempel ke soal!' })
      }
      reader.readAsDataURL(blob)
      break
    }
  }
}

// 3. Handler Upload File Manual jika tidak lewat Copy-Paste
const triggerFileInput = (idx) => {
  activeUploadIdx.value = idx
  fileInputRef.value.click()
}

const handleFileSelected = (event) => {
  const file = event.target.files
  if (!file || activeUploadIdx.value === null) return

  const reader = new FileReader()
  reader.onload = (e) => {
    questionsList.value[activeUploadIdx.value].media_url = e.target.result
    questionsList.value[activeUploadIdx.value].needs_image = false
    event.target.value = '' // Reset input
  }
  reader.readAsDataURL(file)
}
// 4. Simpan ke Backend
const submitImport = async () => {
  if (!props.examId) {
    $q.notify({ type: 'negative', message: 'Exam ID tidak ditemukan.' })
    return
  }
  loading.value = true
  try {
    // Konversi data lokal ke format domain.Question Go
    const formattedQuestions = questionsList.value.map(q => ({
      question_text: q.question_text,
      question_type: q.question_type || 'PG',
      correct_option: q.correct_option,
      options: JSON.stringify(q.options),
      media_url: q.media_url_url || '', // Ubah image_url jadi media_url (sesuai tag Go)
      score: 10
    }))

    // Bungkus sesuai ekspektasi handler Go: { exam_id, questions }
    const payload = {
      exam_id: props.examId,
      questions: formattedQuestions
    }

    await ExamService.importQuestions(payload.exam_id, payload.questions)
    $q.notify({ type: 'positive', message: `${payload.length} soal berhasil diimport!` })
    emit('success')
    isOpen.value = false
    rawText.value = ''
    questionsList.value = []
  } catch (err) {
    $q.notify({ type: 'negative', message: `Gagal import: ${err.message}` })
  } finally {
    loading.value = false
  }
}
</script>
