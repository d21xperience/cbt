<!-- src/components/ui/MathText.vue -->
<template>
  <span v-html="renderedContent" class="math-text" />
</template>

<script setup>
import { renderMathInText } from '@/utils/mathRender'
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  content: { type: String, default: '' },
  tag: { type: String, default: 'span' },
})

const renderedContent = ref('')

const render = async () => {
  if (!props.content) {
    renderedContent.value = ''
    return
  }
  renderedContent.value = await renderMathInText(props.content)
}

onMounted(render)
watch(() => props.content, render)
</script>

<style>
/* ── Font responsif via clamp()
   Mobile: ~15px, Desktop: ~17px
   Parent override bisa customize --math-text-size */
.math-text {
  font-size: var(--math-text-size, clamp(0.9rem, 2.6vw, 1.05rem));
  line-height: 1.55;
  word-break: break-word;
}

.math-text .katex {
  font-size: 1.05em;
}

/* Math display block — scroll horizontal di mobile */
.math-text .katex-display {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5em 0;
  margin: 0.5em 0;
  -webkit-overflow-scrolling: touch;
}

/* Prevent line break inside math */
.math-text .katex .base {
  white-space: nowrap;
}

/* Media di dalam konten (mis. inline img) */
.math-text img {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

/* Tabel di dalam konten */
.math-text table {
  max-width: 100%;
  overflow-x: auto;
  display: block;
  border-collapse: collapse;
}

/* Arabic / RTL */
.math-text .text-arabic,
.math-text [dir='rtl'] {
  direction: rtl;
  text-align: right;
  font-size: 1.15em;
}

/* ── Mobile tuning */
@media (max-width: 599px) {
  .math-text {
    line-height: 1.6;
  }

  .math-text .katex {
    font-size: 1em;
  }
}
</style>
