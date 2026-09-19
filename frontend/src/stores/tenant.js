// src/stores/tenant.js
import { defineStore } from 'pinia'
import { LocalStorage } from 'quasar'

const STORAGE_KEY = 'cbt_tenant_slug'

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    slug: LocalStorage.getItem(STORAGE_KEY) || null,
  }),
  getters: {
    hasTenant: (state) => !!state.slug,
  },
  actions: {
    setSlug(slug) {
      if (!slug || typeof slug !== 'string' || slug === 'null' || slug === 'undefined') {
        return
      }
      this.slug = slug
      // Production pakai hostname — hanya dev yang butuh persist
      if (import.meta.env.DEV) {
        LocalStorage.set(STORAGE_KEY, slug)
      }
    },
    clearSlug() {
      this.slug = null
      LocalStorage.remove(STORAGE_KEY)
    },
    hydrateFromUrl() {
      // Panggil saat app boot / landing page load
      // Kalau URL punya ?tenant=xxx → simpan
      const hostname = window.location.hostname
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') return

      const fromSearch = new URLSearchParams(window.location.search).get('tenant')
      if (fromSearch) {
        this.setSlug(fromSearch)
        return
      }

      if (window.location.hash) {
        const hashQuery = window.location.hash.split('?')[1]
        if (hashQuery) {
          const fromHash = new URLSearchParams(hashQuery).get('tenant')
          if (fromHash) this.setSlug(fromHash)
        }
      }
    },
  },
})
