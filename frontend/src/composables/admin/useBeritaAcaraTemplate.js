// src/composables/admin/useBeritaAcaraTemplate.js
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { BeritaAcaraService } from '@/services/admin/BeritaAcaraService'

export function useBeritaAcaraTemplate() {
  const $q = useQuasar()

  const loading = ref(false)
  const saving = ref(false)
  const form = ref({
    header: { judul: '', subjudul_1: '', subjudul_2: '' },
    paragraf_pembuka: '',
    statistik: {
      enabled: true,
      label_peserta: '',
      label_hadir: '',
      label_tidak_hadir: '',
    },
    paragraf_sampul: '',
    paragraf_kondisi: '',
    checklist_kejadian: [],
    label_catatan: '',
    tampilkan_daftar_siswa: true,
    tampilkan_ttd_pengawas: true,
    tampilkan_ttd_kepala: true,
    tampilkan_ttd_panitia: true,
  })

  const load = async () => {
    loading.value = true
    try {
      const res = await BeritaAcaraService.getTemplate()
      const data = res.data?.data || res.data || {}
      form.value = { ...form.value, ...data }
    } catch (e) {
      console.error('[BATemplate] load failed', e)
      $q.notify({ type: 'negative', message: 'Gagal memuat template' })
    } finally {
      loading.value = false
    }
  }

  const save = async () => {
    if (!form.value.header?.judul) {
      $q.notify({ type: 'warning', message: 'Judul wajib diisi' })
      return { success: false }
    }
    saving.value = true
    try {
      const res = await BeritaAcaraService.saveTemplate(form.value)
      const data = res.data?.data || form.value
      form.value = { ...form.value, ...data }
      $q.notify({ type: 'positive', message: 'Template berhasil disimpan' })
      return { success: true }
    } catch (e) {
      $q.notify({
        type: 'negative',
        message: e?.response?.data?.message || e?.message || 'Gagal menyimpan',
      })
      return { success: false }
    } finally {
      saving.value = false
    }
  }

  const addChecklistItem = () => {
    const id = `c${Date.now()}`
    form.value.checklist_kejadian.push({ id, label: 'Kejadian baru', enabled: true })
  }

  const removeChecklistItem = (idx) => {
    form.value.checklist_kejadian.splice(idx, 1)
  }

  const resetDefault = async () => {
    await load()
  }

  return {
    loading,
    saving,
    form,
    load,
    save,
    addChecklistItem,
    removeChecklistItem,
    resetDefault,
  }
}
