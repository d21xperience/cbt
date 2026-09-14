// src/utils/mathRenderer.js
// Lazy-load KaTeX agar tidak membebani bundle awal

let katex = null
let katexCSSLoaded = false

// Load KaTeX secara dinamis
const loadKaTeX = async () => {
  if (katex) return katex

  // Load CSS KaTeX sekali saja
  if (!katexCSSLoaded && typeof document !== 'undefined') {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
    document.head.appendChild(link)
    katexCSSLoaded = true
  }

  // Load JS KaTeX
  const module = await import('katex')
  katex = module.default
  return katex
}

// Render satu rumus LaTeX
export const renderMath = async (latex, displayMode = false) => {
  try {
    const k = await loadKaTeX()
    return k.renderToString(latex, {
      displayMode,
      throwOnError: false,
      errorColor: '#cc0000',
      trust: false,
    })
  } catch (error) {
    console.error('KaTeX render error:', error)
    return `<span class="text-negative">[Math Error: ${latex}]</span>`
  }
}

// Render teks yang mengandung LaTeX inline ($...$) dan display ($$...$$)
export const renderMathInText = async (text) => {
  if (!text || typeof text !== 'string') return text

  await loadKaTeX()
  const k = katex

  let result = text

  // 1. Render display math $$...$$ (harus didahulukan)
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (match, latex) => {
    try {
      return k.renderToString(latex.trim(), {
        displayMode: true,
        throwOnError: false,
      })
    } catch (e) {
      console.log(e)
      return `<span class="text-negative">[Math Error]</span>`
    }
  })

  // 2. Render inline math $...$ (tidak boleh spasi setelah $)
  result = result.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (match, latex) => {
    try {
      return k.renderToString(latex.trim(), {
        displayMode: false,
        throwOnError: false,
      })
    } catch (e) {
      console.log(e)
      return `<span class="text-negative">[Math Error]</span>`
    }
  })

  return result
}
