// src/services/admin/BeritaAcaraService.js
// Adapter HTTP untuk Master Template Berita Acara.

import { api } from '@/boot/axios'

export const BeritaAcaraService = {
  getTemplate() {
    return api.get('/admin/berita-acara-template')
  },
  saveTemplate(payload) {
    return api.put('/admin/berita-acara-template', payload)
  },
}
