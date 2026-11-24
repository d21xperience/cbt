<template>
  <q-dialog
    v-model="isOpen"
    persistent
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="column no-wrap" style="height: 100vh">
      <!-- Top bar -->
      <q-bar class="bg-primary text-white">
        <div class="text-subtitle1">
          <q-icon name="edit" class="q-mr-xs" />
          {{ isEditing ? 'Edit Soal' : 'Tambah Soal Baru' }}
        </div>
        <q-space />
        <q-btn dense flat icon="close" @click="onCancel" />
      </q-bar>

      <q-card-section class="col scroll">
        <q-form @submit.prevent="onSubmit">
          <div class="row q-col-gutter-md">
            <!-- KOLOM KIRI (Editor & Opsi) -->
            <div class="col-12 col-md-8">
              <!-- Pengaturan Horizontal -->
              <div class="row q-col-gutter-sm q-mb-md">
                <div class="col-12 col-sm-5">
                  <q-select
                    v-model="localForm.question_type"
                    :options="typeOptions"
                    label="Tipe Soal"
                    outlined
                    dense
                    emit-value
                    map-options
                  />
                </div>
                <div class="col-12 col-sm-2">
                  <q-input
                    v-model.number="localForm.score"
                    type="number"
                    label="Skor"
                    outlined
                    dense
                    :min="1"
                    :rules="[(v) => v > 0 || 'Skor harus > 0']"
                  />
                </div>
                <div class="col-12 col-sm-5">
                  <q-input
                    v-if="!isAudioVideo"
                    v-model="localForm.media_url"
                    label="URL Media (opsional)"
                    outlined
                    dense
                    hint="Atau klik icon"
                  >
                    <template v-slot:append>
                      <q-btn flat round dense icon="image" color="primary" @click="onPickMainMedia">
                        <q-tooltip>Insert gambar (max 1 MB)</q-tooltip>
                      </q-btn>
                    </template>
                  </q-input>
                </div>
              </div>

              <!-- Teks Soal & Editor -->
              <div class="q-mb-md">
                <div class="row items-center q-mb-xs">
                  <div class="text-caption text-grey-7 col">
                    <q-icon name="edit_note" size="xs" class="q-mr-xs" />
                    Teks Soal (dukung LaTeX <code>$...$</code>, HTML, non-Latin)
                  </div>
                  <div class="row q-gutter-xs">
                    <q-btn
                      flat
                      dense
                      icon="translate"
                      label="Aksara"
                      no-caps
                      size="sm"
                      color="primary"
                      @click="scriptPickerOpen = true"
                    />
                    <q-btn
                      flat
                      dense
                      icon="functions"
                      label="Simbol"
                      no-caps
                      size="sm"
                      color="primary"
                      @click="mathPickerOpen = true"
                    />
                  </div>
                </div>
                <q-editor
                  ref="editorRef"
                  v-model="localForm.question_text"
                  :definitions="editorDefinitions"
                  :toolbar="editorToolbar"
                  min-height="200px"
                  placeholder="Tulis soal di sini..."
                  @paste="onPasteEditor"
                />
              </div>

              <QuestionMediaUpload
                v-if="isAudioVideo"
                v-model="localForm.media_url"
                :is-audio="isAudio"
              />

              <!-- Opsi & Tipe Soal Lainnya -->
              <div v-if="isPGType" class="q-mb-md">
                <!-- <div class="text-caption text-grey-7 q-mb-xs"><q-icon name="list" size="xs" class="q-mr-xs" /> Opsi Jawaban</div> -->
                <QuestionOptions
                  v-model="localForm.options"
                  :multi-correct="localForm.question_type === 'PG_COMPLEX'"
                  @media="onPickOptionMedia"
                />
              </div>

              <div v-if="localForm.question_type === 'MATCHING'" class="q-mb-md">
                <QuestionMatching v-model="localForm.pairs" />
              </div>
              <div v-if="localForm.question_type === 'TRUE_FALSE'" class="q-mb-md">
                <QuestionTrueFalse v-model="localForm.statements" />
              </div>
              <div v-if="localForm.question_type === 'SHORT_ANSWER'" class="q-mb-md">
                <QuestionShortAnswer
                  v-model="localForm.accepted_answers"
                  :case-sensitive="localForm.case_sensitive"
                  :trim-whitespace="localForm.trim_whitespace"
                  @update:case-sensitive="localForm.case_sensitive = $event"
                  @update:trim-whitespace="localForm.trim_whitespace = $event"
                />
              </div>
              <div v-if="localForm.question_type === 'CODING'" class="q-mb-md">
                <QuestionCoding
                  v-model="localForm.test_cases"
                  :language="localForm.language"
                  :starter-code="localForm.starter_code"
                  @update:language="localForm.language = $event"
                  @update:starter-code="localForm.starter_code = $event"
                />
              </div>
              <div v-if="localForm.question_type === 'HOTSPOT'" class="q-mb-md">
                <QuestionHotspot
                  v-model="localForm.hotspots"
                  :image-url="localForm.image_url"
                  @update:image-url="localForm.image_url = $event"
                />
              </div>
              <div v-if="localForm.question_type === 'ESSAY'" class="q-mb-md">
                <q-input
                  v-model="localForm.rubric"
                  type="textarea"
                  label="Rubrik Penilaian (opsional)"
                  outlined
                  autogrow
                  :rows="3"
                />
              </div>
            </div>

            <!-- KOLOM KANAN (Preview & Navigasi) -->
            <div class="col-12 col-md-4">
              <!-- No Soal -->
              <q-card flat bordered class="q-mb-md bg-grey-2">
                <q-card-section>
                  <div class="text-caption text-grey-7 q-mb-sm">No. Soal</div>
                  <div class="row q-col-gutter-xs">
                    <div class="col-2" v-for="n in totalQuestions + 1" :key="n">
                      <q-btn
                        class="full-width"
                        :color="n === activeNumber ? 'primary' : 'grey-4'"
                        :text-color="n === activeNumber ? 'white' : 'black'"
                        :label="n"
                        @click="onSelectNumber(n)"
                      />
                    </div>
                  </div>
                </q-card-section>
              </q-card>

              <!-- Preview Soal -->
              <q-card flat bordered class="bg-grey-2">
                <q-card-section>
                  <div class="text-caption text-grey-7 q-mb-sm">
                    <q-icon name="visibility" size="xs" class="q-mr-xs" /> Preview Soal
                  </div>
                  <div class="preview-box bg-white q-pa-md rounded-borders">
                    <QuestionPreviewInline
                      :question="{
                        question_type: localForm.question_type,
                        question_text: localForm.question_text,
                        options: localForm.options,
                        pairs: localForm.pairs,
                        statements: localForm.statements,
                        accepted_answers: localForm.accepted_answers,
                        case_sensitive: localForm.case_sensitive,
                        trim_whitespace: localForm.trim_whitespace,
                        language: localForm.language,
                        starter_code: localForm.starter_code,
                        test_cases: localForm.test_cases,
                        image_url: localForm.image_url,
                        hotspots: localForm.hotspots,
                        media_url: localForm.media_url,
                        rubric: localForm.rubric,
                      }"
                    />
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-form>
      </q-card-section>

      <!-- Actions -->
      <q-separator />
      <q-card-actions align="right" class="q-pa-md bg-white">
        <q-btn flat label="Batal" color="grey-7" @click="onCancel" />
        <q-btn
          color="primary"
          :label="isEditing ? 'Simpan Perubahan' : 'Tambah Soal'"
          :loading="submitting"
          :disable="!canSubmit"
          @click="onSubmit"
        />
      </q-card-actions>
    </q-card>

    <!-- Hidden file inputs -->
    <input
      ref="mainMediaInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      hidden
      @change="onMainMediaSelected"
    />
    <input
      ref="optionMediaInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      hidden
      @change="onOptionMediaSelected"
    />

    <!-- Popups -->
    <MathEquationEditor v-model="mathPickerOpen" @insert="onInsertMathEquation" />
    <ScriptPickerPopover v-model="scriptPickerOpen" @pick="onPickScript" />
  </q-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useDynamicOptions } from '@/composables/admin/useDynamicOptions'

import { useScriptPicker } from '@/composables/admin/useScriptPicker'
import QuestionOptions from './QuestionOptions.vue'
import MathEquationEditor from './MathEquationEditor.vue'
import ScriptPickerPopover from './ScriptPickerPopover.vue'

import QuestionMatching from './QuestionMatching.vue'
import QuestionPreviewInline from './QuestionPreviewInline.vue'
import QuestionTrueFalse from './QuestionTrueFalse.vue'
import QuestionShortAnswer from './QuestionShortAnswer.vue'
import QuestionMediaUpload from './QuestionMediaUpload.vue'
import QuestionCoding from './QuestionCoding.vue'
import QuestionHotspot from './QuestionHotspot.vue'

const props = defineProps({
  modelValue: Boolean,
  isEditing: Boolean,
  initialForm: { type: Object, default: () => ({}) },
  submitting: Boolean,
  questions: { type: Array, default: () => [] },
  editingId: { type: String, default: null },
})
const emit = defineEmits(['update:modelValue', 'submit', 'cancel', 'load-question', 'create-new'])

const $q = useQuasar()
const {
  createDefaultOptions,
  createDefaultPairs,
  createDefaultStatements,
  createDefaultAnswers,
  createDefaultTestCases,
} = useDynamicOptions()

// const { QUICK_SNIPPETS, buildInsert } = useMathToolbar()
const { buildScriptWrapper } = useScriptPicker()

const MAX_IMG_SIZE = 1 * 1024 * 1024

const isOpen = ref(false)
const editorRef = ref(null)

const totalQuestions = computed(() => props.questions?.length || 0)
const activeNumber = computed(() => {
  // Jika tidak sedang edit, arahkan ke nomor baru (total + 1)
  if (!props.isEditing) return totalQuestions.value + 1
  // Jika sedang edit, cari indeks soalnya
  const idx = props.questions.findIndex((q) => q.id === props.editingId)
  return idx !== -1 ? idx + 1 : totalQuestions.value + 1
})
const onSelectNumber = (n) => {
  if (n === totalQuestions.value + 1) {
    emit('create-new')
  } else {
    const q = props.questions[n - 1]
    if (q) emit('load-question', q)
  }
}

const localForm = reactive({
  question_type: 'PG',
  question_text: '',
  options: createDefaultOptions(4),
  pairs: createDefaultPairs(),
  statements: createDefaultStatements(),
  accepted_answers: createDefaultAnswers(),
  case_sensitive: false,
  trim_whitespace: true,
  // ── CODING
  language: 'javascript',
  starter_code: '',
  test_cases: createDefaultTestCases(),
  // ── HOTSPOT
  image_url: '',
  hotspots: [],
  score: 10,
  media_url: '',
  rubric: '',
})
const isPGType = computed(() =>
  ['PG', 'PG_COMPLEX', 'AUDIO', 'VIDEO'].includes(localForm.question_type),
)
const isAudio = computed(() => localForm.question_type === 'AUDIO')
const isVideo = computed(() => localForm.question_type === 'VIDEO')
const isAudioVideo = computed(() => isAudio.value || isVideo.value)
const mainMediaInput = ref(null)
const optionMediaInput = ref(null)
const editingOptionId = ref(null)

const mathPickerOpen = ref(false)
const scriptPickerOpen = ref(false)
const activeScriptId = ref('latin')

const typeOptions = [
  { label: 'Pilihan Ganda (PG)', value: 'PG' },
  { label: 'PG Kompleks (multi jawaban)', value: 'PG_COMPLEX' },
  { label: 'Menjodohkan', value: 'MATCHING' },
  { label: 'Benar / Salah', value: 'TRUE_FALSE' },
  { label: 'Isian Singkat', value: 'SHORT_ANSWER' },
  { label: 'Audio (PG)', value: 'AUDIO' },
  { label: 'Video (PG)', value: 'VIDEO' },
  { label: 'Coding', value: 'CODING' },
  { label: 'Hotspot (area klik)', value: 'HOTSPOT' },
  { label: 'Essay', value: 'ESSAY' },
]

// const quickSnippets = QUICK_SNIPPETS

const editorToolbar = [
  ['bold', 'italic', 'underline', 'strike'],
  ['undo', 'redo'],
  [{ header: [false, 1, 2, 3] }],
  ['unordered', 'ordered'],
  ['quote', 'code'],
  ['link'],
  ['remove-formatting'],
]

const editorDefinitions = {}

watch([() => props.modelValue, () => props.initialForm], ([val, init]) => {
  isOpen.value = val
  if (val) {
    init = init || {}
    localForm.question_type = init.question_type || 'PG'
    localForm.question_text = init.question_text || ''
    localForm.options =
      Array.isArray(init.options) && init.options.length > 0
        ? init.options
        : createDefaultOptions(4)
    localForm.pairs =
      Array.isArray(init.pairs) && init.pairs.length > 0 ? init.pairs : createDefaultPairs()
    localForm.statements =
      Array.isArray(init.statements) && init.statements.length > 0
        ? init.statements
        : createDefaultStatements()
    localForm.accepted_answers =
      Array.isArray(init.accepted_answers) && init.accepted_answers.length > 0
        ? init.accepted_answers
        : createDefaultAnswers()
    localForm.case_sensitive = !!init.case_sensitive
    localForm.trim_whitespace = init.trim_whitespace !== false
    // CODING
    localForm.language = init.language || 'javascript'
    localForm.starter_code = init.starter_code || ''
    localForm.test_cases =
      Array.isArray(init.test_cases) && init.test_cases.length > 0
        ? init.test_cases
        : createDefaultTestCases()
    // HOTSPOT
    localForm.image_url = init.image_url || ''
    localForm.hotspots = Array.isArray(init.hotspots) ? init.hotspots : []

    localForm.score = Number(init.score) || 10
    localForm.media_url = init.media_url || ''
    localForm.rubric = init.rubric || ''
    activeScriptId.value = 'latin'
  }
})
watch(isOpen, (val) => emit('update:modelValue', val))

const canSubmit = computed(() => {
  if (!localForm.question_text?.trim()) return false
  if (!localForm.score || localForm.score <= 0) return false

  const t = localForm.question_type

  if (t === 'PG' || t === 'AUDIO' || t === 'VIDEO') {
    const correctCount = localForm.options.filter((o) => o.is_correct).length
    if (correctCount !== 1) return false
    if (localForm.options.some((o) => !o.text?.trim() && !o.is_other)) return false
    if (t === 'AUDIO' || t === 'VIDEO') {
      if (!localForm.media_url?.trim()) return false
    }
  }

  if (t === 'PG_COMPLEX') {
    const correctCount = localForm.options.filter((o) => o.is_correct).length
    if (correctCount < 2) return false
    if (localForm.options.some((o) => !o.text?.trim() && !o.is_other)) return false
  }

  if (t === 'MATCHING') {
    if (localForm.pairs.length < 2) return false
    if (localForm.pairs.some((p) => !p.left?.trim() || !p.right?.trim())) return false
  }

  if (t === 'TRUE_FALSE') {
    if (localForm.statements.length < 1) return false
    if (localForm.statements.some((s) => !s.text?.trim())) return false
  }

  if (t === 'SHORT_ANSWER') {
    if (localForm.accepted_answers.length < 1) return false
    if (localForm.accepted_answers.some((a) => !a.text?.trim())) return false
  }

  if (t === 'CODING') {
    if (!localForm.language) return false
    if (localForm.test_cases.length < 1) return false
    if (localForm.test_cases.some((tc) => !tc.input?.trim() || !tc.expected_output?.trim()))
      return false
  }

  if (t === 'HOTSPOT') {
    if (!localForm.image_url?.trim()) return false
    if (localForm.hotspots.length < 1) return false
    if (!localForm.hotspots.some((h) => h.is_correct)) return false
  }

  return true
})

// ═══ Insert helpers ═══
const insertTextAtCursor = (text) => {
  const editor = editorRef.value
  if (!editor) {
    localForm.question_text += text
    return
  }
  // q-editor's native method: insert into contenteditable
  editor.focus?.()
  document.execCommand('insertHTML', false, text)
}

// const renderQuickPreview = (key) => {
//   const snippet = buildInsert(key)
//   if (!snippet) return '?'
//   try {
//     return katex.renderToString(snippet, { throwOnError: false })
//   } catch {
//     return snippet
//   }
// }

// const insertMath = (key) => {
//   const insert = buildInsert(key)
//   const wrapped = `$${insert}$`
//   insertTextAtCursor(wrapped)
// }

const onInsertMathEquation = (latexCode) => {
  // Wrap dalam $...$ (inline) atau $$...$$ (display)
  const wrapped = ` $${latexCode}$ `
  insertTextAtCursor(wrapped)
  mathPickerOpen.value = false
}

const onPickScript = (script) => {
  activeScriptId.value = script.id
  // Insert wrapper span supaya font/RTL apply
  const wrapper = buildScriptWrapper(script.id, '‎')
  insertTextAtCursor(wrapper)
}

// ═══ Paste image ═══
const onPasteEditor = (e) => {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (!file) continue
      if (file.size > MAX_IMG_SIZE) {
        $q.notify({ type: 'negative', message: 'Ukuran gambar max 1 MB.' })
        return
      }
      e.preventDefault?.()
      const reader = new FileReader()
      reader.onload = () => {
        insertTextAtCursor(`<img src="${reader.result}" style="max-width:100%;" />`)
      }
      reader.readAsDataURL(file)
      return
    }
  }
}

// ═══ Media — MAIN ═══
const onPickMainMedia = () => mainMediaInput.value?.click()

const onMainMediaSelected = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > MAX_IMG_SIZE) {
    $q.notify({ type: 'negative', message: 'Ukuran file max 1 MB.' })
    e.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    localForm.media_url = reader.result
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

// ═══ Media — OPTION ═══
const onPickOptionMedia = (opt) => {
  editingOptionId.value = opt.id
  optionMediaInput.value?.click()
}

const onOptionMediaSelected = (e) => {
  const file = e.target.files?.[0]
  if (!file || !editingOptionId.value) return
  if (file.size > MAX_IMG_SIZE) {
    $q.notify({ type: 'negative', message: 'Ukuran file max 1 MB.' })
    e.target.value = ''
    editingOptionId.value = null
    return
  }
  const targetId = editingOptionId.value
  const reader = new FileReader()
  reader.onload = () => {
    const idx = localForm.options.findIndex((o) => o.id === targetId)
    if (idx !== -1) {
      localForm.options[idx].media_url = reader.result
    }
    editingOptionId.value = null
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

// ═══ Submit ═══
const onSubmit = () => {
  const t = localForm.question_type
  const payload = {
    question_type: t,
    question_text: localForm.question_text,
    options:
      t === 'PG' || t === 'PG_COMPLEX' || t === 'AUDIO' || t === 'VIDEO'
        ? localForm.options.map((o) => ({ ...o }))
        : [],
    pairs: t === 'MATCHING' ? localForm.pairs.map((p) => ({ ...p })) : [],
    statements: t === 'TRUE_FALSE' ? localForm.statements.map((s) => ({ ...s })) : [],
    accepted_answers: t === 'SHORT_ANSWER' ? localForm.accepted_answers.map((a) => ({ ...a })) : [],
    case_sensitive: t === 'SHORT_ANSWER' ? localForm.case_sensitive : false,
    trim_whitespace: t === 'SHORT_ANSWER' ? localForm.trim_whitespace : true,
    // CODING
    language: t === 'CODING' ? localForm.language : null,
    starter_code: t === 'CODING' ? localForm.starter_code : '',
    test_cases: t === 'CODING' ? localForm.test_cases.map((tc) => ({ ...tc })) : [],
    // HOTSPOT
    image_url: t === 'HOTSPOT' ? localForm.image_url : '',
    hotspots: t === 'HOTSPOT' ? localForm.hotspots.map((h) => ({ ...h })) : [],
    score: Number(localForm.score),
    media_url: localForm.media_url || null,
    rubric: localForm.rubric || null,
  }
  emit('submit', payload)
}

const onCancel = () => emit('cancel')
</script>

<style scoped>
.preview-box {
  min-height: 200px;
  border: 1px solid #e0e0e0;
}

.preview-text {
  font-size: 14px;
  line-height: 1.6;
}

.preview-text :deep(img) {
  max-width: 100%;
  border-radius: 6px;
}

.preview-option {
  border-radius: 6px;
  padding-left: 8px;
  padding-right: 8px;
  transition: background-color 0.15s;
}

.preview-option--correct {
  background: #e8f5e9;
}

.quick-math-bar :deep(.katex) {
  font-size: 0.9em;
}
</style>
