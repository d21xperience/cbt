// src/composables/admin/useRoomManagement.js
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { RoomService } from '@/services/admin/RoomService'

export function useRoomManagement() {
  const $q = useQuasar()

  const loading = ref(false)
  const rooms = ref([])
  const searchQuery = ref('')
  const filterGedung = ref(null)

  const dialogOpen = ref(false)
  const isEditing = ref(false)
  const initialForm = ref({})
  const submitting = ref(false)

  const gedungOptions = computed(() => {
    const set = new Set(rooms.value.map((r) => r.gedung).filter(Boolean))
    return Array.from(set).map((g) => ({ label: g, value: g }))
  })

  const filteredRooms = computed(() => {
    let list = rooms.value
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      list = list.filter(
        (r) => r.nama.toLowerCase().includes(q) || (r.keterangan || '').toLowerCase().includes(q),
      )
    }
    if (filterGedung.value) list = list.filter((r) => r.gedung === filterGedung.value)
    return list
  })

  const load = async () => {
    loading.value = true
    try {
      const res = await RoomService.list()
      rooms.value = Array.isArray(res.data?.data) ? res.data.data : []
    } catch (e) {
      console.error('[Rooms] load failed:', e)
      rooms.value = []
    } finally {
      loading.value = false
    }
  }

  const openCreateDialog = () => {
    isEditing.value = false
    initialForm.value = {
      nama: '',
      gedung: '',
      lantai: 1,
      kapasitas: 0,
      keterangan: '',
      aktif: true,
    }
    dialogOpen.value = true
  }

  const openEditDialog = (row) => {
    isEditing.value = true
    initialForm.value = { ...row }
    dialogOpen.value = true
  }

  const submitForm = async (payload) => {
    submitting.value = true
    try {
      if (isEditing.value) {
        await RoomService.update(initialForm.value.id, payload)
        $q.notify({ type: 'positive', message: 'Ruang berhasil diperbarui' })
      } else {
        await RoomService.create(payload)
        $q.notify({ type: 'positive', message: 'Ruang berhasil dibuat' })
      }
      dialogOpen.value = false
      await load()
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Gagal menyimpan'
      $q.notify({ type: 'negative', message: msg })
    } finally {
      submitting.value = false
    }
  }

  const deleteRoom = async (row) => {
    try {
      await RoomService.remove(row.id)
      $q.notify({ type: 'positive', message: 'Ruang dihapus' })
      await load()
    } catch (e) {
      $q.notify({ type: 'negative', message: `Gagal menghapus \n ${e}` })
    }
  }

  return {
    loading,
    rooms,
    searchQuery,
    filterGedung,
    dialogOpen,
    isEditing,
    initialForm,
    submitting,
    gedungOptions,
    filteredRooms,
    load,
    openCreateDialog,
    openEditDialog,
    submitForm,
    deleteRoom,
  }
}
