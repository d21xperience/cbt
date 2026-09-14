// # API manajemen siswa, guru, & sesi
import { api } from '@/boot/axios'

export const UserService = {
  getList(params) {
    // params: { page, limit, search, sortBy, sortDesc, filters }
    return api.get('/admin/participants', { params })
  },

  create(data) {
    return api.post('/admin/participants', data)
  },

  update(id, data) {
    return api.put(`/admin/participants/${id}`, data)
  },

  delete(id) {
    return api.delete(`/admin/participants/${id}`)
  },

  // Fungsi khusus: Bulk import dari CSV/Siakad (jika ada)
  bulkImport(formData) {
    return api.post('/admin/participants/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
