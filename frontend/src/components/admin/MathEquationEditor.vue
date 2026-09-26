<template>
  <q-dialog v-model="isOpen" persistent maximized>
    <q-card class="column no-wrap" style="height: 100vh">
      <!-- Top bar -->
      <q-bar class="bg-primary text-white">
        <div class="text-subtitle1">
          <q-icon name="functions" class="q-mr-xs" />
          Equation Editor
        </div>
        <q-space />
        <q-btn dense flat icon="close" @click="onCancel" />
      </q-bar>

      <q-card-section class="col scroll q-pa-md">
        <!-- ═══ Toolbar Row ═══ -->
        <div class="row items-center q-gutter-xs q-mb-md">
          <q-btn
            flat dense no-caps color="grey-8" icon="refresh" label="Clear" size="sm"
            @click="onClear"
          />
          <q-btn
            flat dense no-caps color="grey-8" icon="palette" label="Colors" size="sm"
          >
            <q-menu auto-close>
              <div class="q-pa-md" style="min-width: 200px">
                <div class="text-caption text-grey-7 q-mb-sm">Warna:</div>
                <div class="row q-gutter-xs">
                  <div
                    v-for="c in colorSwatches"
                    :key="c"
                    :style="{ background: c }"
                    class="color-swatch cursor-pointer"
                    @click="onInsertColor(c)"
                  />
                </div>
              </div>
            </q-menu>
          </q-btn>
          <q-separator vertical inset />
          <q-btn
            flat dense no-caps size="sm"
            :color="tab === 'functions' ? 'primary' : 'grey-8'"
            :class="{ 'bg-blue-1': tab === 'functions' }"
            icon="functions" label="Functions"
            @click="tab = 'functions'"
          />
          <q-btn
            flat dense no-caps size="sm"
            :color="tab === 'examples' ? 'primary' : 'grey-8'"
            :class="{ 'bg-blue-1': tab === 'examples' }"
            icon="menu_book" label="Examples"
            @click="tab = 'examples'"
          />
          <q-btn
            flat dense no-caps size="sm"
            :color="tab === 'history' ? 'primary' : 'grey-8'"
            :class="{ 'bg-blue-1': tab === 'history' }"
            icon="history" label="History"
            @click="tab = 'history'"
          />
          <q-btn
            flat dense no-caps size="sm"
            :color="tab === 'favorites' ? 'primary' : 'grey-8'"
            :class="{ 'bg-blue-1': tab === 'favorites' }"
            icon="star" label="Favorites"
            @click="tab = 'favorites'"
          />
          <q-space />
          <q-btn
            v-if="tab !== 'symbols'"
            flat dense no-caps color="primary"
            icon="arrow_back" label="Kembali ke Simbol" size="sm"
            @click="tab = 'symbols'"
          />
        </div>

        <!-- ═══ TAB: SYMBOLS ═══ -->
        <template v-if="tab === 'symbols'">
          <!-- Small symbols -->
          <div
            v-for="(group, gi) in GROUPS_SMALL"
            :key="`s-${gi}`"
            class="q-mb-md"
          >
            <div class="text-caption text-weight-bold text-grey-7 q-mb-xs text-uppercase">
              {{ group.title }}
            </div>
            <div class="symbol-grid">
              <button
                v-for="(item, i) in group.items"
                :key="i"
                type="button"
                class="symbol-btn"
                :title="item.label"
                @click="onInsertSnippet(item)"
              >
                <span v-html="renderSymbol(item)" />
              </button>
            </div>
          </div>

          <!-- Structures -->
          <div
            v-for="(group, gi) in GROUPS_STRUCT"
            :key="`t-${gi}`"
            class="q-mb-md"
          >
            <div class="text-caption text-weight-bold text-grey-7 q-mb-xs text-uppercase">
              {{ group.title }}
            </div>
            <div class="struct-grid">
              <button
                v-for="(item, i) in group.items"
                :key="i"
                type="button"
                class="struct-btn"
                :title="item.label"
                @click="onInsertSnippet(item)"
              >
                <div class="struct-preview" v-html="renderLatex(item.insert)" />
                <div class="struct-label">{{ item.label }}</div>
              </button>
            </div>
          </div>
        </template>

        <!-- ═══ TAB: FUNCTIONS ═══ -->
        <template v-else-if="tab === 'functions'">
          <div class="text-caption text-grey-7 q-mb-md">
            Fungsi LaTeX umum — klik untuk insert:
          </div>
          <div class="row q-col-gutter-sm">
            <div v-for="(fn, i) in latexFunctions" :key="i" class="col-12 col-sm-6 col-md-4">
              <q-btn
                outline color="primary" no-caps
                class="full-width q-pa-sm function-btn"
                @click="onInsertSnippet({ insert: fn.code, label: fn.label })"
              >
                <div class="column items-center full-width">
                  <div class="text-caption text-grey-7">{{ fn.label }}</div>
                  <div class="q-mt-xs function-preview" v-html="renderLatex(fn.code)" />
                </div>
              </q-btn>
            </div>
          </div>
        </template>

        <!-- ═══ TAB: EXAMPLES ═══ -->
        <template v-else-if="tab === 'examples'">
          <div class="text-caption text-grey-7 q-mb-md">
            Contoh rumus umum — klik untuk insert:
          </div>
          <div class="row q-col-gutter-sm">
            <div v-for="(ex, i) in EXAMPLES" :key="i" class="col-12 col-sm-6 col-md-4">
              <q-btn
                outline color="primary" no-caps
                class="full-width q-pa-sm function-btn"
                @click="onInsertSnippet({ insert: ex.latex, label: ex.label })"
              >
                <div class="column items-center full-width">
                  <div class="text-caption text-grey-7">{{ ex.label }}</div>
                  <div class="q-mt-xs function-preview" v-html="renderLatex(ex.latex)" />
                </div>
              </q-btn>
            </div>
          </div>
        </template>

        <!-- ═══ TAB: HISTORY ═══ -->
        <template v-else-if="tab === 'history'">
          <div v-if="history.length === 0" class="text-center q-pa-xl text-grey-6">
            <q-icon name="history" size="64px" color="grey-4" />
            <div class="q-mt-md">Belum ada riwayat.</div>
          </div>
          <div v-else class="row q-col-gutter-sm">
            <div v-for="(h, i) in history" :key="i" class="col-12 col-sm-6 col-md-4">
              <q-btn
                outline color="grey-7" no-caps
                class="full-width q-pa-sm function-btn"
                @click="onInsertSnippet({ insert: h, label: h })"
              >
                <div class="function-preview" v-html="renderLatex(h)" />
              </q-btn>
            </div>
          </div>
        </template>

        <!-- ═══ TAB: FAVORITES ═══ -->
        <template v-else-if="tab === 'favorites'">
          <div v-if="favorites.length === 0" class="text-center q-pa-xl text-grey-6">
            <q-icon name="star" size="64px" color="grey-4" />
            <div class="q-mt-md">Belum ada favorit. Klik ⭐ di preview untuk simpan.</div>
          </div>
          <div v-else class="row q-col-gutter-sm">
            <div v-for="(f, i) in favorites" :key="i" class="col-12 col-sm-6 col-md-4">
              <q-btn
                outline color="orange" no-caps
                class="full-width q-pa-sm function-btn"
                @click="onInsertSnippet({ insert: f, label: f })"
              >
                <div class="function-preview" v-html="renderLatex(f)" />
              </q-btn>
            </div>
          </div>
        </template>

        <!-- ═══ Style Row ═══ -->
        <div class="row q-gutter-sm items-center q-mt-lg q-pt-md style-row">
          <q-select
            v-model="style.font"
            :options="FONT_OPTIONS"
            dense outlined emit-value map-options
            label="Font"
            style="min-width: 140px"
          />
          <q-select
            v-model="style.size"
            :options="SIZE_OPTIONS"
            dense outlined emit-value map-options
            label="Ukuran"
            style="min-width: 130px"
          />
          <q-select
            v-model="style.zoom"
            :options="ZOOM_OPTIONS"
            dense outlined emit-value map-options
            label="Zoom"
            style="min-width: 90px"
          />
          <q-select
            v-model="style.background"
            :options="BG_OPTIONS"
            dense outlined emit-value map-options
            label="Background"
            style="min-width: 130px"
          />
          <q-checkbox v-model="style.inline" label="Inline" dense />
          <q-space />
          <q-btn
            flat dense no-caps color="orange"
            icon="star" label="Simpan Favorit"
            @click="onSaveFavorite"
          />
        </div>

        <!-- ═══ Preview ═══ -->
        <div class="q-mt-md">
          <div class="text-caption text-weight-bold text-grey-7 q-mb-xs text-uppercase">
            Preview
          </div>
          <div
            class="equation-preview"
            :style="{
              background: style.background,
              fontFamily: style.font,
            }"
          >
            <div v-if="latex.trim()" class="equation-rendered" v-html="renderedLatex" />
            <div v-else class="text-caption text-grey-5 italic">
              Klik simbol di atas untuk mulai membuat rumus...
            </div>
          </div>

          <div class="q-mt-sm">
            <div class="text-caption text-weight-bold text-grey-7 q-mb-xs text-uppercase">
              LaTeX Code
            </div>
            <q-input
              v-model="latex"
              type="textarea"
              outlined
              autogrow
              :rows="3"
              class="latex-input"
              hint="Bisa edit langsung di sini"
            />
          </div>
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-separator />
      <q-card-actions align="right" class="q-pa-md bg-white">
        <q-btn flat label="Batal" color="grey-7" @click="onCancel" />
        <q-btn
          color="primary"
          icon="check"
          label="Insert ke Editor"
          no-caps
          :disable="!latex.trim()"
          @click="onInsert"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { LocalStorage } from 'quasar'
import katex from 'katex'
import { useEquationEditor } from '@/composables/admin/useEquationEditor'

const props = defineProps({
  modelValue: Boolean,
  initialLatex: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'insert'])

const {
  GROUPS_SMALL,
  GROUPS_STRUCT,
  EXAMPLES,
  FONT_OPTIONS,
  SIZE_OPTIONS,
  ZOOM_OPTIONS,
  BG_OPTIONS,
} = useEquationEditor()

const isOpen = ref(false)
const tab = ref('symbols')
const latex = ref('')

const style = reactive({
  font: 'Latin Modern',
  size: '12pt',
  zoom: 110,
  background: '#fffde7',
  inline: false,
})

const HISTORY_KEY = 'cbt_eq_history'
const FAV_KEY = 'cbt_eq_favorites'

const history = ref(LocalStorage.getItem(HISTORY_KEY) || [])
const favorites = ref(LocalStorage.getItem(FAV_KEY) || [])

const colorSwatches = [
  '#000000', '#d32f2f', '#1976d2', '#388e3c',
  '#f57c00', '#7b1fa2', '#00796b', '#455a64',
]

const latexFunctions = [
  { label: 'Fraction',        code: '\\frac{a}{b}' },
  { label: 'Sqrt',            code: '\\sqrt{x}' },
  { label: 'Nth Root',        code: '\\sqrt[n]{x}' },
  { label: 'Power',           code: 'x^{n}' },
  { label: 'Subscript',       code: 'x_{n}' },
  { label: 'Sum',             code: '\\sum_{i=1}^{n} x_i' },
  { label: 'Product',         code: '\\prod_{i=1}^{n} x_i' },
  { label: 'Integral',        code: '\\int_{a}^{b} f(x) \\, dx' },
  { label: 'Double Integral', code: '\\iint_{D} f \\, dA' },
  { label: 'Limit',           code: '\\lim_{x \\to a} f(x)' },
  { label: 'Derivative',      code: '\\frac{d}{dx} f(x)' },
  { label: 'Partial Deriv',   code: '\\frac{\\partial f}{\\partial x}' },
  { label: 'Matrix 2×2',      code: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}' },
  { label: 'Matrix 3×3',      code: '\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}' },
  { label: 'Cases',           code: '\\begin{cases} a & x > 0 \\\\ b & x \\leq 0 \\end{cases}' },
  { label: 'Binomial',        code: '\\binom{n}{k} = \\frac{n!}{k!(n-k)!}' },
]

watch(() => props.modelValue, (val) => {
  isOpen.value = val
  if (val) {
    latex.value = props.initialLatex || ''
    tab.value = 'symbols'
  }
})
watch(isOpen, (val) => emit('update:modelValue', val))

const renderedLatex = computed(() => {
  if (!latex.value?.trim()) return ''
  try {
    return katex.renderToString(latex.value, {
      throwOnError: false,
      displayMode: !style.inline,
    })
  } catch {
    return `<code>${latex.value}</code>`
  }
})

/**
 * Render simbol kecil — kalau LaTeX, render KaTeX; kalau char, langsung tampil.
 */
const renderSymbol = (item) => {
  const ins = item.insert || ''
  // Kalau ada `\` atau `{`, render KaTeX
  if (ins.includes('\\') || ins.includes('{') || ins.includes('}')) {
    try {
      return katex.renderToString(ins, { throwOnError: false })
    } catch {
      return item.label
    }
  }
  return item.label
}

const renderLatex = (code) => {
  if (!code) return ''
  try {
    return katex.renderToString(code, { throwOnError: false })
  } catch {
    return `<code style="font-size:11px">${code}</code>`
  }
}

const onInsertSnippet = (item) => {
  if (!item?.insert) return
  latex.value = latex.value + item.insert
}

const onInsertColor = (color) => {
  latex.value = `\\color{${color}}{ ${latex.value} }`
}

const onClear = () => {
  latex.value = ''
}

const onSaveFavorite = () => {
  const trimmed = latex.value.trim()
  if (!trimmed) return
  if (!favorites.value.includes(trimmed)) {
    favorites.value = [...favorites.value, trimmed]
    LocalStorage.set(FAV_KEY, favorites.value)
  }
}

const onInsert = () => {
  const trimmed = latex.value.trim()
  if (!trimmed) return
  const newHistory = [trimmed, ...history.value.filter((h) => h !== trimmed)].slice(0, 20)
  history.value = newHistory
  LocalStorage.set(HISTORY_KEY, newHistory)
  emit('insert', trimmed)
}

const onCancel = () => {
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* ═══ Small symbols grid ═══ */
.symbol-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: 4px;
}

.symbol-btn {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.12s;
  padding: 0;
  overflow: hidden;
  font-family: inherit;
  font-size: 18px;
  color: #333;
}

.symbol-btn:hover {
  background: #e3f2fd;
  border-color: #1976d2;
  color: #1976d2;
}

.symbol-btn:active {
  transform: scale(0.95);
}

.symbol-btn :deep(.katex) {
  font-size: 16px !important;
  line-height: 1 !important;
}

.symbol-btn :deep(.katex-html) {
  display: inline !important;
}

/* ═══ Structure grid ═══ */
.struct-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 6px;
}

.struct-btn {
  min-height: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fafafa;
  cursor: pointer;
  padding: 8px 6px;
  transition: all 0.12s;
  overflow: hidden;
  font-family: inherit;
}

.struct-btn:hover {
  background: #e3f2fd;
  border-color: #1976d2;
}

.struct-btn:active {
  transform: scale(0.98);
}

.struct-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  overflow: hidden;
  margin-bottom: 4px;
}

.struct-preview :deep(.katex) {
  font-size: 14px !important;
  line-height: 1 !important;
}

.struct-label {
  font-size: 10px;
  color: #757575;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  text-align: center;
  line-height: 1.2;
}

/* ═══ Function / Example buttons ═══ */
.function-btn {
  min-height: 72px;
  overflow: hidden;
}

.function-btn :deep(.q-btn__content) {
  display: block;
  width: 100%;
}

.function-preview {
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
}

.function-preview :deep(.katex) {
  font-size: 14px !important;
}

/* ═══ Style Row ═══ */
.style-row {
  border-top: 1px solid #e0e0e0;
}

/* ═══ Color swatch ═══ */
.color-swatch {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: 1px solid #bdbdbd;
  transition: transform 0.12s;
}

.color-swatch:hover {
  transform: scale(1.15);
  border-color: #1976d2;
}

/* ═══ Preview ═══ */
.equation-preview {
  min-height: 120px;
  max-height: 200px;
  overflow: auto;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.equation-rendered {
  font-size: 18px;
}

.equation-rendered :deep(.katex-display) {
  margin: 0;
}

/* ═══ LaTeX input ═══ */
.latex-input :deep(textarea) {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
}
</style>
