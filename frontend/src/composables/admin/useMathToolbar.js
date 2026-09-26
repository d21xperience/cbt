// src/composables/admin/useMathToolbar.js
//
// Composable: math toolbar + symbol picker untuk q-editor.
// Pure utility — return snippets LaTeX.

export function useMathToolbar() {
  /**
   * Snippets LaTeX yang akan di-insert ke cursor.
   * Format: { label, icon, insert, cursorOffset }
   *   insert: string LaTeX
   *   cursorOffset: posisi cursor relatif dari akhir (untuk placeholder)
   */
  const SNIPPETS = {
    // Arithmetic
    frac: { label: 'Pecahan', insert: '\\frac{a}{b}', cursorOffset: 7 },
    sqrt: { label: 'Akar', insert: '\\sqrt{x}', cursorOffset: 6 },
    nthRoot: { label: 'Akar n', insert: '\\sqrt[n]{x}', cursorOffset: 7 },
    power: { label: 'Pangkat', insert: 'x^{n}', cursorOffset: 4 },
    subscript: { label: 'Subscript', insert: 'x_{n}', cursorOffset: 4 },
    times: { label: 'Perkalian', insert: '\\times ' },
    div: { label: 'Pembagian', insert: '\\div ' },
    plusMinus: { label: 'Plus-Minus', insert: '\\pm ' },
    neq: { label: 'Tidak Sama', insert: '\\neq ' },
    approx: { label: 'Approx', insert: '\\approx ' },

    // Calculus
    integral: { label: 'Integral', insert: '\\int_{a}^{b} f(x) \\, dx', cursorOffset: 12 },
    integral2: { label: 'Integral Ganda', insert: '\\iint_{D} f(x,y) \\, dA' },
    sum: { label: 'Sigma (Sum)', insert: '\\sum_{i=1}^{n} x_i' },
    product: { label: 'Pi (Product)', insert: '\\prod_{i=1}^{n} x_i' },
    lim: { label: 'Limit', insert: '\\lim_{x \\to a} f(x)' },
    deriv: { label: 'Turunan', insert: '\\frac{d}{dx} f(x)' },
    partial: { label: 'Turunan Parsial', insert: '\\frac{\\partial f}{\\partial x}' },

    // Greek
    alpha: { label: 'α', insert: '\\alpha ' },
    beta: { label: 'β', insert: '\\beta ' },
    gamma: { label: 'γ', insert: '\\gamma ' },
    delta: { label: 'δ', insert: '\\delta ' },
    theta: { label: 'θ', insert: '\\theta ' },
    lambda: { label: 'λ', insert: '\\lambda ' },
    mu: { label: 'μ', insert: '\\mu ' },
    pi: { label: 'π', insert: '\\pi ' },
    sigma: { label: 'σ', insert: '\\sigma ' },
    phi: { label: 'φ', insert: '\\phi ' },
    omega: { label: 'ω', insert: '\\omega ' },
    Delta: { label: 'Δ', insert: '\\Delta ' },
    Omega: { label: 'Ω', insert: '\\Omega ' },

    // Relations & Sets
    leq: { label: '≤', insert: '\\leq ' },
    geq: { label: '≥', insert: '\\geq ' },
    in: { label: '∈', insert: '\\in ' },
    notin: { label: '∉', insert: '\\notin ' },
    subset: { label: '⊂', insert: '\\subset ' },
    cup: { label: '∪', insert: '\\cup ' },
    cap: { label: '∩', insert: '\\cap ' },
    forall: { label: '∀', insert: '\\forall ' },
    exists: { label: '∃', insert: '\\exists ' },

    // Geometry
    angle: { label: 'Sudut', insert: '\\angle ' },
    degree: { label: '°', insert: '^{\\circ} ' },
    triangle: { label: 'Segitiga', insert: '\\triangle ' },
    perp: { label: '⊥', insert: '\\perp ' },
    parallel: { label: '∥', insert: '\\parallel ' },
    vector: { label: 'Vektor', insert: '\\vec{v}' },
    overrightarrow: { label: '→ AB', insert: '\\overrightarrow{AB}' },

    // Matrix
    matrix2x2: {
      label: 'Matriks 2×2',
      insert: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}',
    },
    matrix3x3: {
      label: 'Matriks 3×3',
      insert: '\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}',
    },
    determinant: { label: 'Determinan', insert: '\\det(A)' },

    // Delimiters
    paren: { label: '( )', insert: '\\left( x \\right)' },
    bracket: { label: '[ ]', insert: '\\left[ x \\right]' },
    brace: { label: '{ }', insert: '\\left\\{ x \\right\\}' },
    abs: { label: '| |', insert: '\\left| x \\right|' },

    // Logic
    land: { label: '∧', insert: '\\land ' },
    lor: { label: '∨', insert: '\\lor ' },
    neg: { label: '¬', insert: '\\neg ' },
    implies: { label: '⇒', insert: '\\Rightarrow ' },
    iff: { label: '⇔', insert: '\\Leftrightarrow ' },
  }

  /**
   * Kategori untuk grid picker.
   */
  const CATEGORIES = [
    {
      name: 'Aritmetika',
      icon: 'calculate',
      keys: [
        'frac',
        'sqrt',
        'nthRoot',
        'power',
        'subscript',
        'times',
        'div',
        'plusMinus',
        'neq',
        'approx',
      ],
    },
    {
      name: 'Kalkulus',
      icon: 'functions',
      keys: ['integral', 'integral2', 'sum', 'product', 'lim', 'deriv', 'partial'],
    },
    {
      name: 'Greek',
      icon: 'translate',
      keys: [
        'alpha',
        'beta',
        'gamma',
        'delta',
        'theta',
        'lambda',
        'mu',
        'pi',
        'sigma',
        'phi',
        'omega',
        'Delta',
        'Omega',
      ],
    },
    {
      name: 'Himpunan',
      icon: 'category',
      keys: ['leq', 'geq', 'in', 'notin', 'subset', 'cup', 'cap', 'forall', 'exists'],
    },
    {
      name: 'Geometri',
      icon: 'change_history',
      keys: ['angle', 'degree', 'triangle', 'perp', 'parallel', 'vector', 'overrightarrow'],
    },
    { name: 'Matriks', icon: 'grid_on', keys: ['matrix2x2', 'matrix3x3', 'determinant'] },
    { name: 'Kurung', icon: 'code', keys: ['paren', 'bracket', 'brace', 'abs'] },
    { name: 'Logika', icon: 'psychology', keys: ['land', 'lor', 'neg', 'implies', 'iff'] },
  ]

  /**
   * Snippet inline (tombol cepat di toolbar).
   */
  const QUICK_SNIPPETS = ['frac', 'sqrt', 'power', 'subscript', 'integral', 'sum', 'pi', 'theta']

  /**
   * Bangun string LaTeX untuk insert.
   */
  const buildInsert = (key) => {
    const snippet = SNIPPETS[key]
    return snippet ? snippet.insert : ''
  }

  /**
   * Hitung posisi cursor setelah insert.
   */
  const cursorPositionAfter = (key) => {
    const snippet = SNIPPETS[key]
    if (!snippet || !snippet.cursorOffset) return null
    return snippet.insert.length - snippet.cursorOffset
  }

  return {
    SNIPPETS,
    CATEGORIES,
    QUICK_SNIPPETS,
    buildInsert,
    cursorPositionAfter,
  }
}
