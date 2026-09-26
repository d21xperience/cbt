// src/composables/admin/useEquationEditor.js
//
// Composable: katalog simbol ter-kategorisasi by TYPE.
// TYPE:
//   'sym'  → simbol kecil (1-2 char) → grid kecil
//   'struct' → struktur kompleks → grid besar dengan label

export function useEquationEditor() {
  const TABS = [
    { id: 'symbols', label: 'Simbol', icon: 'grid_view' },
    { id: 'functions', label: 'Fungsi', icon: 'functions' },
    { id: 'examples', label: 'Contoh', icon: 'menu_book' },
    { id: 'history', label: 'Riwayat', icon: 'history' },
  ]

  // ══════════════════════════════════════════════════════════════
  // SMALL SYMBOLS (grid kecil)
  // ══════════════════════════════════════════════════════════════

  const GROUPS_SMALL = [
    {
      title: 'Dasar',
      items: [
        { insert: '+', label: '+' },
        { insert: '-', label: '−' },
        { insert: '\\pm ', label: '±' },
        { insert: '\\times ', label: '×' },
        { insert: '\\div ', label: '÷' },
        { insert: '\\cdot ', label: '·' },
        { insert: '=', label: '=' },
        { insert: '\\neq ', label: '≠' },
        { insert: '\\approx ', label: '≈' },
        { insert: '\\equiv ', label: '≡' },
        { insert: '<', label: '<' },
        { insert: '>', label: '>' },
        { insert: '\\leq ', label: '≤' },
        { insert: '\\geq ', label: '≥' },
        { insert: '\\ll ', label: '≪' },
        { insert: '\\gg ', label: '≫' },
        { insert: '\\infty ', label: '∞' },
        { insert: '\\propto ', label: '∝' },
        { insert: '\\partial ', label: '∂' },
        { insert: '\\nabla ', label: '∇' },
      ],
    },
    {
      title: 'Himpunan & Logika',
      items: [
        { insert: '\\in ', label: '∈' },
        { insert: '\\notin ', label: '∉' },
        { insert: '\\ni ', label: '∋' },
        { insert: '\\subset ', label: '⊂' },
        { insert: '\\subseteq ', label: '⊆' },
        { insert: '\\cup ', label: '∪' },
        { insert: '\\cap ', label: '∩' },
        { insert: '\\emptyset ', label: '∅' },
        { insert: '\\forall ', label: '∀' },
        { insert: '\\exists ', label: '∃' },
        { insert: '\\neg ', label: '¬' },
        { insert: '\\land ', label: '∧' },
        { insert: '\\lor ', label: '∨' },
        { insert: '\\Rightarrow ', label: '⇒' },
        { insert: '\\Leftrightarrow ', label: '⇔' },
        { insert: '\\to ', label: '→' },
        { insert: '\\mapsto ', label: '↦' },
      ],
    },
    {
      title: 'Greek Kecil',
      items: [
        { insert: '\\alpha ', label: 'α' },
        { insert: '\\beta ', label: 'β' },
        { insert: '\\gamma ', label: 'γ' },
        { insert: '\\delta ', label: 'δ' },
        { insert: '\\epsilon ', label: 'ϵ' },
        { insert: '\\zeta ', label: 'ζ' },
        { insert: '\\eta ', label: 'η' },
        { insert: '\\theta ', label: 'θ' },
        { insert: '\\iota ', label: 'ι' },
        { insert: '\\kappa ', label: 'κ' },
        { insert: '\\lambda ', label: 'λ' },
        { insert: '\\mu ', label: 'μ' },
        { insert: '\\nu ', label: 'ν' },
        { insert: '\\xi ', label: 'ξ' },
        { insert: '\\pi ', label: 'π' },
        { insert: '\\rho ', label: 'ρ' },
        { insert: '\\sigma ', label: 'σ' },
        { insert: '\\tau ', label: 'τ' },
        { insert: '\\upsilon ', label: 'υ' },
        { insert: '\\phi ', label: 'ϕ' },
        { insert: '\\chi ', label: 'χ' },
        { insert: '\\psi ', label: 'ψ' },
        { insert: '\\omega ', label: 'ω' },
      ],
    },
    {
      title: 'Greek Besar',
      items: [
        { insert: '\\Gamma ', label: 'Γ' },
        { insert: '\\Delta ', label: 'Δ' },
        { insert: '\\Theta ', label: 'Θ' },
        { insert: '\\Lambda ', label: 'Λ' },
        { insert: '\\Xi ', label: 'Ξ' },
        { insert: '\\Pi ', label: 'Π' },
        { insert: '\\Sigma ', label: 'Σ' },
        { insert: '\\Phi ', label: 'Φ' },
        { insert: '\\Psi ', label: 'Ψ' },
        { insert: '\\Omega ', label: 'Ω' },
      ],
    },
    {
      title: 'Geometri',
      items: [
        { insert: '\\angle ', label: '∠' },
        { insert: '^{\\circ} ', label: '°' },
        { insert: '\\triangle ', label: '△' },
        { insert: '\\square ', label: '□' },
        { insert: '\\perp ', label: '⊥' },
        { insert: '\\parallel ', label: '∥' },
        { insert: '\\cong ', label: '≅' },
        { insert: '\\simeq ', label: '≃' },
      ],
    },
    {
      title: 'Fisika',
      items: [
        { insert: '\\hbar ', label: 'ℏ' },
        { insert: '\\ell ', label: 'ℓ' },
        { insert: '\\Re ', label: 'ℜ' },
        { insert: '\\Im ', label: 'ℑ' },
        { insert: '\\aleph ', label: 'ℵ' },
        { insert: '\\wp ', label: '℘' },
      ],
    },
  ]

  // ══════════════════════════════════════════════════════════════
  // STRUCTURES (grid besar dengan preview)
  // ══════════════════════════════════════════════════════════════

  const GROUPS_STRUCT = [
    {
      title: 'Pecahan & Akar',
      items: [
        { insert: '\\frac{a}{b}', label: 'Pecahan' },
        { insert: '\\dfrac{a}{b}', label: 'Pecahan Display' },
        { insert: '\\sqrt{x}', label: 'Akar Kuadrat' },
        { insert: '\\sqrt[n]{x}', label: 'Akar n' },
        { insert: 'x^{n}', label: 'Pangkat' },
        { insert: 'x_{n}', label: 'Subscript' },
        { insert: 'x_{i}^{2}', label: 'Sub & Super' },
        { insert: '\\binom{n}{k}', label: 'Kombinasi' },
      ],
    },
    {
      title: 'Besar (Sum/Prod/Limit)',
      items: [
        { insert: '\\sum_{i=1}^{n} x_i', label: 'Sigma (Σ)' },
        { insert: '\\prod_{i=1}^{n} x_i', label: 'Produk (Π)' },
        { insert: '\\coprod_{i=1}^{n} x_i', label: 'Koproduk' },
        { insert: '\\lim_{x \\to a} f(x)', label: 'Limit' },
        { insert: '\\lim_{n \\to \\infty}', label: 'Limit ∞' },
        { insert: '\\int_{a}^{b} f(x) dx', label: 'Integral' },
        { insert: '\\iint_{D} f \\, dA', label: 'Integral Ganda' },
        { insert: '\\oint_{C} f \\, ds', label: 'Integral Kontur' },
      ],
    },
    {
      title: 'Turunan',
      items: [
        { insert: '\\frac{d}{dx} f(x)', label: 'Turunan' },
        { insert: '\\frac{dy}{dx}', label: 'dy/dx' },
        { insert: '\\frac{\\partial f}{\\partial x}', label: 'Parsial' },
        { insert: '\\frac{\\partial^2 f}{\\partial x^2}', label: 'Parsial²' },
        { insert: '\\dot{x}', label: 'Dot' },
        { insert: '\\ddot{x}', label: 'Double Dot' },
      ],
    },
    {
      title: 'Kurung',
      items: [
        { insert: '\\left( x \\right)', label: '( )' },
        { insert: '\\left[ x \\right]', label: '[ ]' },
        { insert: '\\left\\{ x \\right\\}', label: '{ }' },
        { insert: '\\left| x \\right|', label: '| |' },
        { insert: '\\left\\| x \\right\\|', label: '‖ ‖' },
        { insert: '\\left\\lfloor x \\right\\rfloor', label: '⌊ ⌋' },
        { insert: '\\left\\lceil x \\right\\rceil', label: '⌈ ⌉' },
      ],
    },
    {
      title: 'Vektor & Aksen',
      items: [
        { insert: '\\vec{v}', label: 'Vektor' },
        { insert: '\\overrightarrow{AB}', label: '→AB' },
        { insert: '\\overleftarrow{AB}', label: '←AB' },
        { insert: '\\hat{x}', label: 'Hat' },
        { insert: '\\bar{x}', label: 'Bar' },
        { insert: '\\tilde{x}', label: 'Tilde' },
        { insert: '\\overline{AB}', label: 'Overline' },
        { insert: '\\underline{x}', label: 'Underline' },
      ],
    },
    {
      title: 'Matriks & Sistem',
      items: [
        { insert: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', label: 'Matriks 2×2' },
        {
          insert: '\\begin{bmatrix} a & b & c \\\\ d & e & f \\end{bmatrix}',
          label: 'Matriks 2×3',
        },
        {
          insert: '\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}',
          label: 'Matriks 3×3',
        },
        { insert: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', label: 'Matriks ( )' },
        { insert: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', label: 'Determinan' },
        {
          insert: '\\begin{cases} a & x > 0 \\\\ b & x \\leq 0 \\end{cases}',
          label: 'Sistem (cases)',
        },
        { insert: '\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}', label: 'Aligned' },
      ],
    },
  ]

  // ── Backward compat: GRID (jika ada consumer lain)
  const GRID = GROUPS_SMALL

  // ══════════════════════════════════════════════════════════════
  // FUNCTIONS / EXAMPLES (tetap)
  // ══════════════════════════════════════════════════════════════

  const EXAMPLES = [
    { label: 'Persamaan Kuadrat', latex: 'ax^2 + bx + c = 0' },
    { label: 'Rumus ABC', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
    { label: 'Integral Tentu', latex: '\\int_{0}^{1} 2x \\, dx = 1' },
    { label: 'Limit Trigonometri', latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1' },
    { label: 'Turunan Pangkat', latex: '\\frac{d}{dx} \\left( x^n \\right) = nx^{n-1}' },
    { label: 'Identitas Trig', latex: '\\sin^2 \\theta + \\cos^2 \\theta = 1' },
    { label: 'Identitas Euler', latex: 'e^{i\\pi} + 1 = 0' },
    {
      label: 'Determinan 2×2',
      latex: '\\det\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} = ad - bc',
    },
    { label: 'Sigma Aritmetika', latex: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}' },
    { label: 'Barisan Aritmetika', latex: 'a_n = a_1 + (n-1) b' },
    { label: 'Barisan Geometri', latex: 'a_n = a_1 \\cdot r^{n-1}' },
    { label: 'Hukum Newton', latex: 'F = m \\cdot a' },
    { label: 'Energi Relativistik', latex: 'E = m c^2' },
    { label: 'Logaritma', latex: '\\log_a b = \\frac{\\ln b}{\\ln a}' },
    { label: 'Rata-rata', latex: '\\bar{x} = \\frac{\\sum_{i=1}^{n} x_i}{n}' },
    { label: 'Peluang', latex: 'P(A) = \\frac{n(A)}{n(S)}' },
  ]

  const FONT_OPTIONS = [
    { label: 'Latin Modern', value: 'Latin Modern' },
    { label: 'Times', value: 'Times New Roman' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Sans Serif', value: 'sans-serif' },
  ]

  const SIZE_OPTIONS = [
    { label: '10pt Normal', value: '10pt' },
    { label: '12pt Normal', value: '12pt' },
    { label: '14pt Normal', value: '14pt' },
    { label: '16pt Normal', value: '16pt' },
  ]

  const ZOOM_OPTIONS = [
    { label: '100', value: 100 },
    { label: '110', value: 110 },
    { label: '125', value: 125 },
    { label: '150', value: 150 },
  ]

  const BG_OPTIONS = [
    { label: 'Kuning', value: '#fffde7' },
    { label: 'Putih', value: '#ffffff' },
    { label: 'Hijau', value: '#e8f5e9' },
    { label: 'Biru', value: '#e3f2fd' },
  ]

  return {
    TABS,
    GROUPS_SMALL,
    GROUPS_STRUCT,
    GRID, // alias
    EXAMPLES,
    FONT_OPTIONS,
    SIZE_OPTIONS,
    ZOOM_OPTIONS,
    BG_OPTIONS,
  }
}
