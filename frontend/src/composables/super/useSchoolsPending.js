// src/composables/super/useSchoolsPending.js
//
// Composable: UI orchestration untuk halaman Antrian Persetujuan Sekolah.
// Responsibility:
//   - state: pendingList, loading, approving
//   - fetch orchestration
//   - approve/reject workflow + dialog
//   - error handling
//
// BUKAN responsibility:
//   - business rule (mis. kondisi kapan sekolah boleh di-approve)
//   - HTTP detail (didelegasikan ke TenantService)

import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { TenantService } from '@/services/super/TenantService'
import ApprovalResultDialog from '@/components/superadmin/ApprovalResultDialog.vue'

export function useSchoolsPending() {
  const $q = useQuasar()

  // ── State
  const loading = ref(false)
  const approving = ref(null)
  const pendingList = ref([])

  // ── Fetch
  const loadPending = async () => {
    loading.value = true
    try {
      const res = await TenantService.getPendingSchools()
      const data = res?.data?.data
      // Defensive: nil-slice bug
      pendingList.value = Array.isArray(data) ? data : []
    } catch (err) {
      console.error('[useSchoolsPending] load error:', err)
      // Jangan reset data lama saat error
      if (err.response?.status !== 404) {
        $q.notify({
          type: 'negative',
          message: err.response?.data?.error || 'Gagal memuat antrian sekolah.',
        })
      }
    } finally {
      loading.value = false
    }
  }

  // ── Approve
  const onApprove = (row) => {
    $q.dialog({
      title: 'Konfirmasi Persetujuan',
      message: `Setujui pendaftaran <b>${row.school_name}</b> (${row.npsn})?`,
      html: true,
      cancel: true,
      persistent: true,
    }).onOk(async () => {
      approving.value = row.tenant_id
      try {
        const res = await TenantService.approveSchool(row.tenant_id)
        const data = res?.data?.data || {}

        $q.dialog({
          component: ApprovalResultDialog,
          componentProps: { data },
        })

        await loadPending()
      } catch (err) {
        console.error('[useSchoolsPending] approve error:', err)
        $q.notify({
          type: 'negative',
          message: err.response?.data?.error || 'Gagal menyetujui sekolah.',
        })
      } finally {
        approving.value = null
      }
    })
  }

  // ── Reject
  const onReject = (row) => {
    $q.dialog({
      title: 'Tolak Pendaftaran',
      message: `Alasan penolakan untuk <b>${row.school_name}</b>:`,
      html: true,
      prompt: {
        model: '',
        type: 'textarea',
        placeholder: 'Minimal 5 karakter',
        isValid: (val) => val && val.trim().length >= 5,
      },
      cancel: true,
      persistent: true,
    }).onOk(async (reason) => {
      try {
        await TenantService.rejectSchool(row.tenant_id, reason.trim())
        $q.notify({ type: 'positive', message: 'Pendaftaran ditolak.' })
        await loadPending()
      } catch (err) {
        console.error('[useSchoolsPending] reject error:', err)
        $q.notify({
          type: 'negative',
          message: err.response?.data?.error || 'Gagal menolak pendaftaran.',
        })
      }
    })
  }

  // ── Lifecycle
  onMounted(() => {
    loadPending()
  })

  return {
    // state
    loading,
    approving,
    pendingList,
    // actions
    loadPending,
    onApprove,
    onReject,
  }
}
