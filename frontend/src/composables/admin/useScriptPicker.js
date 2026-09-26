// src/composables/admin/useScriptPicker.js
//
// Composable: script/font picker + RTL support.

export function useScriptPicker() {
  const SCRIPTS = [
    {
      id: 'latin',
      name: 'Latin',
      icon: 'abc',
      fontFamily: 'inherit',
      dir: 'ltr',
    },
    {
      id: 'arab',
      name: 'Arab',
      icon: 'language',
      fontFamily: "'Noto Sans Arabic', 'Amiri', 'Scheherazade New', serif",
      dir: 'rtl',
    },
    {
      id: 'sunda',
      name: 'Sunda',
      icon: 'language',
      fontFamily: "'Noto Sans Sundanese', sans-serif",
      dir: 'ltr',
    },
    {
      id: 'jawa',
      name: 'Jawa',
      icon: 'language',
      fontFamily: "'Noto Sans Javanese', sans-serif",
      dir: 'ltr',
    },
    {
      id: 'balinese',
      name: 'Bali',
      icon: 'language',
      fontFamily: "'Noto Sans Balinese', sans-serif",
      dir: 'ltr',
    },
  ]

  /**
   * Bangun wrapper HTML untuk insert script.
   */
  const buildScriptWrapper = (scriptId, content = '') => {
    const script = SCRIPTS.find((s) => s.id === scriptId)
    if (!script || script.id === 'latin') {
      return `<span>${content}</span>`
    }
    const style = `font-family: ${script.fontFamily};`
    const dirAttr = script.dir === 'rtl' ? ' dir="rtl"' : ''
    return `<span style="${style}"${dirAttr}>${content}</span>`
  }

  /**
   * Deteksi script dari karakter (auto-detect unicode range).
   */
  const detectScript = (text) => {
    if (!text) return 'latin'
    // Arab: 0600-06FF
    if (/[\u0600-\u06FF]/.test(text)) return 'arab'
    // Sunda: 1B80-1BBF
    if (/[\u1B80-\u1BBF]/.test(text)) return 'sunda'
    // Jawa: A980-A9DF
    if (/[\uA980-\uA9DF]/.test(text)) return 'jawa'
    // Bali: 1B00-1B7F
    if (/[\u1B00-\u1B7F]/.test(text)) return 'balinese'
    return 'latin'
  }

  return {
    SCRIPTS,
    buildScriptWrapper,
    detectScript,
  }
}
