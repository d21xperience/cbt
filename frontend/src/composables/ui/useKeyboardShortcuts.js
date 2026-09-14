// src/composables/useKeyboardShortcuts.js
import { onMounted, onUnmounted } from 'vue'

export function useKeyboardShortcuts(shortcuts) {
  const handler = (event) => {
    const ctrl = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()

    for (const [keys, action] of Object.entries(shortcuts)) {
      const parts = keys.split('+').map((s) => s.toLowerCase())
      const match = parts.every((k) => {
        if (k === 'ctrl') return ctrl
        if (k === 'shift') return event.shiftKey
        if (k === 'alt') return event.altKey
        return key === k
      })
      if (match) {
        event.preventDefault()
        action(event)
        break
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handler)
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', handler)
  })
}
