<!-- src/components/ui/MathText.vue -->
<template>
  <span v-html="renderedContent" class="math-text" />
</template>

<script setup>
import { renderMathInText } from '@/utils/mathrender'
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
/* Style untuk KaTeX agar responsif */
.math-text .katex {
  font-size: 1.05em;
}

.math-text .katex-display {
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.5em 0;
  margin: 0.5em 0;
}

/* Prevent line break inside math */
.math-text .katex .base {
  white-space: nowrap;
}
</style>
