<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">
      <q-icon name="payments" class="q-mr-sm" color="primary" />
      Payment Gate — Blokir Peserta
    </div>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-4">
            <q-input v-model="form.nisn" label="NISN" outlined dense />
          </div>
          <div class="col-12 col-md-5">
            <q-input v-model="form.reason" label="Alasan blokir" outlined dense placeholder="Tunggakan SPP 2 bulan" />
          </div>
          <div class="col-12 col-md-3">
            <q-btn color="negative" icon="lock" label="Blokir" class="full-width" :loading="submitting"
              @click="block" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 q-mb-md">Daftar Peserta Diblokir ({{ list.length }})</div>
        <q-table :rows="list" :columns="columns" row-key="nisn" flat dense :loading="loading">
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat color="positive" icon="lock_open" label="Unblock" size="sm" @click="unblock(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { PaymentService } from '@/services/admin/PaymentService'
const $q = useQuasar()
const loading = ref(false)
const submitting = ref(false)
const list = ref([])
const form = ref({ nisn: '', reason: '' })

const columns = [
  { name: 'nisn', label: 'NISN', field: 'nisn', align: 'left', sortable: true },
  { name: 'reason', label: 'Alasan', field: 'reason', align: 'left' },
  { name: 'blocked_by', label: 'Diblokir oleh', field: 'blocked_by', align: 'left' },
  { name: 'blocked_at', label: 'Waktu', field: 'blocked_at', align: 'left' },
  { name: 'actions', label: '', field: 'actions', align: 'right' },
]

const load = async () => {
  loading.value = true
  try {
    const { data } = await PaymentService.getBlockedList()
    list.value = data.data || []
  } catch (e) { console.error(e) } finally { loading.value = false }
}

const block = async () => {
  if (!form.value.nisn) return
  submitting.value = true
  try {
    await PaymentService.blockParticipant(form.value)
    $q.notify({ type: 'positive', message: 'Siswa diblokir' })
    form.value = { nisn: '', reason: '' }
    await load()
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Gagal' })
  } finally { submitting.value = false }
}

const unblock = async (row) => {
  try {
    await PaymentService.unblockParticipant(row.nisn)
    $q.notify({ type: 'positive', message: 'Siswa di-unblock' })
    await load()
  } catch (e) {
    console.log(e)
    $q.notify({ type: 'negative', message: 'Gagal' })
  }
}

onMounted(load)
</script>
