import { api } from '@/boot/axios'

export const PrintSettingsService = {
  get() {
    return api.get('/admin/settings/print-preferences')
  },
  update(payload) {
    return api.put('/admin/settings/print-preferences', payload)
  },
}
