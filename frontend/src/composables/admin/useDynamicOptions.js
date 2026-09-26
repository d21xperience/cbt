// src/composables/admin/useDynamicOptions.js
//
// Composable: manipulasi opsi dinamis (Google Forms style).
// Pure utility — tidak simpan state global.

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function useDynamicOptions() {
  /**
   * Buat opsi baru.
   */
  const createOption = (text = '') => ({
    id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    media_url: null,
    is_correct: false,
    is_other: false,
  })

  /**
   * Buat opsi default (n opsi kosong).
   */
  const createDefaultOptions = (count = 4) => Array.from({ length: count }, () => createOption(''))

  /**
   * Buat opsi "Lainnya" (Google Forms style).
   */
  const createOtherOption = () => ({
    id: `opt-other-${Date.now()}`,
    text: 'Lainnya',
    media_url: null,
    is_correct: false,
    is_other: true,
  })

  const createPair = () => ({
    id: `pair-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    left: '',
    right: '',
  })

  const createDefaultPairs = () => [createPair(), createPair()]

  const createStatement = () => ({
    id: `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: '',
    correct: true,
  })
  const createDefaultStatements = () => [createStatement()]

  const createAcceptedAnswer = () => ({
    id: `ans-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: '',
  })
  const createDefaultAnswers = () => [createAcceptedAnswer()]

  const createTestCase = () => ({
    id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    input: '',
    expected_output: '',
    is_hidden: false,
  })
  const createDefaultTestCases = () => [createTestCase()]
  /**
   * Label untuk opsi (A, B, C, ...).
   */
  const optionLabel = (index) => LABELS[index] || `#${index + 1}`

  /**
   * Set satu jawaban benar (single-answer mode).
   * Reset yang lain.
   */
  const setSingleCorrect = (options, optionId) => {
    options.forEach((o) => {
      o.is_correct = o.id === optionId
    })
  }
  /**
   * Toggle correct (multi-correct mode).
   * Tidak reset yang lain — flip status option ini saja.
   */
  const toggleCorrect = (options, optionId) => {
    return options.map((o) => (o.id === optionId ? { ...o, is_correct: !o.is_correct } : o))
  }
  return {
    createOption,
    createDefaultOptions,
    createOtherOption,
    createPair,
    createDefaultPairs,
    optionLabel,
    setSingleCorrect,
    createDefaultStatements,
    createDefaultAnswers,
    toggleCorrect,
    createDefaultTestCases,
  }
}
