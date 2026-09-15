<!-- src/components/superadmin/SchoolFormDialog.vue -->
<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 550px; max-width: 90vw">
      <q-card-section class="row items-center bg-primary text-white">
        <div class="text-h6 text-weight-bold">Registrasi Tenant CBT Baru</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-gutter-md q-pt-md">
        <q-input v-model="form.npsn" label="NPSN Sekolah" outlined dense mask="########" />
        <q-input v-model="form.nama" label="Nama Sekolah" outlined dense />

        <!-- Input Subdomain -->
        <q-input
          v-model="form.subdomain"
          label="Subdomain CBT"
          outlined
          dense
          prefix="https://"
          suffix=".ulangan.co.id"
        >
          <template v-slot:hint> Alamat akses unik untuk sekolah ini. </template>
        </q-input>

        <!-- Paket Sewa & Billing -->
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-select
              v-model="form.package"
              :options="packageOptions"
              label="Paket Sewa"
              outlined
              dense
              emit-value
              map-options
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-input
              v-model.number="form.max_participants"
              type="number"
              label="Kuota User Aktif"
              outlined
              dense
            />
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="text-primary q-pb-md q-pr-md">
        <q-btn flat label="Batal" v-close-popup />
        <q-btn
          color="primary"
          label="Daftarkan & Aktivasi"
          @click="submitForm"
          :loading="submitting"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useSuperAdminStore } from '@/stores/super/superTenant'
import { useQuasar } from 'quasar'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'saved'])
const $q = useQuasar()
const store = useSuperAdminStore()

const isOpen = ref(false)
const submitting = ref(false)
const form = ref({
  npsn: '',
  nama: '',
  subdomain: '',
  package: 'monthly_500',
  max_participants: 500,
})

const packageOptions = [
  { label: 'Bulanan - Maks 500 Siswa', value: 'monthly_500' },
  { label: 'Tahunan - Maks 500 Siswa', value: 'yearly_500' },
  { label: 'Tahunan - Maks 1000 Siswa', value: 'yearly_1000' },
]

watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val
  },
)
watch(isOpen, (val) => {
  emit('update:modelValue', val)
})

// Auto-generate rekomendasi string subdomain berdasarkan nama sekolah (lowercase, buang spasi)
watch(
  () => form.value.nama,
  (newNama) => {
    form.value.subdomain = newNama.toLowerCase().replace(/[^a-z0-9]/g, '')
  },
)

const submitForm = async () => {
  submitting.value = true
  try {
    await store.createSchoolTenant(form.value)
    $q.notify({ type: 'positive', message: 'Tenant sekolah dan billing perdana berhasil dibuat!' })
    emit('saved')
    isOpen.value = false
  } catch {
    $q.notify({ type: 'negative', message: 'Gagal meregistrasikan tenant sekolah.' })
  } finally {
    submitting.value = false
  }
}
</script>
