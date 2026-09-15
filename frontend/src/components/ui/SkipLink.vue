<!-- src/components/ui/SkipLink.vue -->
<template>
  <a
    href="#main-content"
    class="skip-link"
    @click.prevent="skipToMain"
    :style="{
      position: 'fixed',
      top: '-999px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--q-primary)',
      color: 'white',
      padding: '8px 16px',
      zIndex: 9999,
      borderRadius: '0 0 4px 4px',
      opacity: 0,
      transition: 'opacity 0.2s',
      ':focus': {
        top: '0',
        opacity: 1,
      },
    }"
  >
    Lompat ke konten utama
  </a>
</template>

<script setup>
const skipToMain = () => {
  const main = document.getElementById('main-content')
  if (main) {
    main.setAttribute('tabindex', '-1')
    main.focus()
    // Remove tabindex after focus to avoid permanent outline
    setTimeout(() => main.removeAttribute('tabindex'), 100)
  }
}
</script>

<style scoped>
.skip-link:focus {
  top: 0 !important;
  opacity: 1 !important;
}
</style>
