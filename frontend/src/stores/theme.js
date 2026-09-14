import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(localStorage.getItem('theme-dark') === 'true')

  const applyTheme = () => {
    if (isDark.value) {
      document.documentElement.setAttribute('data-theme', 'dark')
      document.body.classList.add('dark-mode')
    } else {
      document.documentElement.removeAttribute('data-theme')
      document.body.classList.remove('dark-mode')
    }
    const quasarHtml = document.querySelector('html')
    if (quasarHtml) quasarHtml.classList.toggle('q-dark', isDark.value)
  }

  const toggleDark = () => {
    isDark.value = !isDark.value
    localStorage.setItem('theme-dark', String(isDark.value))
    applyTheme()
  }

  return { isDark, toggleDark, initTheme: applyTheme }
})
