<!-- src/components/superadmin/SchoolFormDialog.vue -->
<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 640px; max-width: 95vw">
      <q-card-section class="row items-center bg-primary text-white">
        <div class="text-h6 text-weight-bold">
          {{ editData ? 'Edit Tenant CBT' : 'Registrasi Tenant CBT Baru' }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-gutter-md q-pt-md">
        <!-- Section 1: Identitas Sekolah -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center">
          <q-icon name="school" class="q-mr-xs" size="xs" /> Identitas Sekolah
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-5">
            <q-input v-model="form.npsn" label="NPSN Sekolah" outlined dense mask="########" :error="!!npsnError"
              :error-message="npsnError" :rules="[(v) => !!v || 'NPSN wajib diisi']">
              <template v-slot:append>
                <q-icon v-if="form.npsn && !npsnError" name="check_circle" color="positive" />
                <q-icon v-else-if="npsnError" name="error" color="negative" />
              </template>
            </q-input>
          </div>
          <div class="col-12 col-sm-7">
            <q-input v-model="form.school_name" label="Nama Sekolah" outlined dense
              :rules="[(v) => !!v || 'Nama sekolah wajib']" />
          </div>
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-select v-model="form.jenjang" :options="jenjangOptions" label="Jenjang Pendidikan" outlined dense
              emit-value map-options :rules="[(v) => !!v || 'Jenjang wajib dipilih']" />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model.number="form.program_duration_years" type="number" label="Durasi Program (tahun)" outlined
              dense :min="1" :max="6" hint="1-6 tahun. Default 3." :rules="[
                (v) => (v >= 1 && v <= 6) || 'Durasi antara 1-6 tahun',
              ]" />
          </div>
        </div>

        <!-- Section 2: Akses & Domain -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center q-mt-sm">
          <q-icon name="dns" class="q-mr-xs" size="xs" /> Akses & Domain
        </div>

        <q-input v-model="form.subdomain" label="Subdomain CBT" outlined dense prefix="https://" suffix=".ujian.pw"
          :error="!!subdomainError" :error-message="subdomainError" :rules="[(v) => !!v || 'Subdomain wajib']">
          <template v-slot:hint>
            Alamat akses unik untuk sekolah ini. Huruf kecil, angka, dan dash.
          </template>
          <template v-slot:append>
            <q-icon v-if="form.subdomain && !subdomainError" name="check_circle" color="positive" />
            <q-icon v-else-if="subdomainError" name="error" color="negative" />
          </template>
        </q-input>

        <!-- Section 3: Kontak -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center q-mt-sm">
          <q-icon name="contact_mail" class="q-mr-xs" size="xs" /> Kontak Sekolah
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-input v-model="form.contact_email" type="email" label="Email Kontak" outlined dense :rules="[
              (v) => !!v || 'Email wajib',
              (v) => /.+@.+\..+/.test(v) || 'Format email tidak valid',
            ]" />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="form.contact_phone" label="No. HP / WhatsApp" outlined dense
              :rules="[(v) => !!v || 'No. HP wajib']" />
          </div>
        </div>

        <!-- Section 4: Admin Awal -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center q-mt-sm">
          <q-icon name="admin_panel_settings" class="q-mr-xs" size="xs" /> Admin Awal
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-input v-model="form.admin_username" label="Username Admin" outlined dense
              :rules="[(v) => !!v || 'Username admin wajib']" />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="form.admin_password" :type="showPassword ? 'text' : 'password'" label="Password Admin"
              outlined dense :rules="[
                (v) => !!v || 'Password wajib',
                (v) => (v && v.length >= 6) || 'Minimal 6 karakter',
              ]">
              <template v-slot:append>
                <q-icon :name="showPassword ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                  @click="showPassword = !showPassword" />
              </template>
            </q-input>
          </div>
        </div>

        <!-- Section 5: Paket -->
        <!-- Section 5: Paket & Kuota -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center q-mt-sm">
          <q-icon name="layers" class="q-mr-xs" size="xs" /> Paket & Kuota
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-select v-model="form.package_tier" :options="tierOptions" label="Tier Paket" outlined dense emit-value
              map-options :rules="[(v) => !!v || 'Tier paket wajib dipilih']">
              <template v-slot:hint>Basic / VIP / Premium</template>
            </q-select>
          </div>
          <div class="col-12 col-sm-6">
            <q-select v-model="form.billing_type" :options="billingTypeOptions" label="Tipe Billing" outlined dense
              emit-value map-options :rules="[(v) => !!v || 'Tipe billing wajib dipilih']">
              <template v-slot:hint>Bulanan / Per Ujian</template>
            </q-select>
          </div>
        </div>

        <q-input v-model.number="form.max_participants" type="number" label="Kuota User Aktif (siswa)" outlined dense
          :min="50" :rules="[
            (v) => (v >= 50 && v <= 10000) || 'Kuota antara 50-10.000 siswa',
          ]">
          <template v-slot:hint>Jumlah maksimal peserta ujian aktif</template>
        </q-input>
      </q-card-section>

      <q-card-actions align="right" class="text-primary q-pb-md q-pr-md">
        <q-btn flat label="Batal" v-close-popup />

        <q-btn color="primary" :label="editData ? 'Simpan Perubahan' : 'Daftarkan & Aktivasi'" @click="submitForm"
          :loading="submitting" :disable="isSubmitDisabled">
          <q-tooltip v-if="editData && !isDirty">
            Tidak ada perubahan dari data awal
          </q-tooltip>
        </q-btn>
      </q-card-actions>

    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useSuperAdminStore } from '@/stores/super/superTenant'
import { useQuasar } from 'quasar'

const props = defineProps({
  modelValue: Boolean,
  editData: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const store = useSuperAdminStore()

const isOpen = ref(false)
const submitting = ref(false)
const showPassword = ref(false)
const originalSnapshot = ref(null)
// ── Form state — sesuai schema VER-007 register
const buildInitialForm = () => ({
  npsn: '',
  school_name: '',
  subdomain: '',
  jenjang: 'SMK',
  program_duration_years: 3,
  contact_email: '',
  contact_phone: '',
  admin_username: 'admin',
  admin_password: '',
  package_tier: 'BASIC',        // ← BARU
  billing_type: 'MONTHLY',      // ← BARU
  max_participants: 500,
})

const form = ref(buildInitialForm())

const jenjangOptions = [
  { label: 'SMP', value: 'SMP' },
  { label: 'MTs', value: 'MTs' },
  { label: 'SMA', value: 'SMA' },
  { label: 'MA', value: 'MA' },
  { label: 'SMK', value: 'SMK' },
  { label: 'MAK', value: 'MAK' },
]

const tierOptions = [
  { label: 'Basic', value: 'BASIC' },
  { label: 'VIP', value: 'VIP' },
  { label: 'Premium', value: 'PREMIUM' },
]

const billingTypeOptions = [
  { label: 'Bulanan (recurring)', value: 'MONTHLY' },
  { label: 'Per Ujian (one-off)', value: 'PER_EXAM' },
]

// Sinkronisasi buka/tutup + pre-fill saat edit
watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val
    if (val) {
      if (props.editData) {
        // ── Edit mode: merge dengan data existing
        const base = buildInitialForm()
        form.value = {
          ...base,
          ...props.editData,
          // Normalisasi nama field
          school_name: props.editData.school_name || props.editData.nama || '',
          max_participants:
            props.editData.max_participants || base.max_participants,
          package_tier: props.editData.package_tier || base.package_tier,
          billing_type: props.editData.billing_type || base.billing_type,
        }
        // ── Snapshot untuk dirty check
        originalSnapshot.value = JSON.stringify(form.value)
      } else {
        // ── Create mode: form kosong, snapshot null
        form.value = buildInitialForm()
        originalSnapshot.value = null
      }
    }
  },
)
watch(isOpen, (val) => emit('update:modelValue', val))

// Auto-generate subdomain dari nama sekolah
watch(
  () => form.value.school_name,
  (newName) => {
    if (!newName) return
    // Hanya auto-generate kalau user belum ubah manual
    const autoSlug = newName.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!form.value.subdomain || form.value.subdomain !== autoSlug) {
      form.value.subdomain = autoSlug
    }
  },
)

// ── Dirty check: apakah form berubah dari snapshot awal?
const isDirty = computed(() => {
  if (!originalSnapshot.value) return true  // create mode: always dirty
  return JSON.stringify(form.value) !== originalSnapshot.value
})

// ── Submit disable condition
const isSubmitDisabled = computed(() => {
  if (hasFormError.value) return true
  if (props.editData && !isDirty.value) return true
  return false
})

const submitForm = async () => {
  submitting.value = true
  try {
    const res = await store.createSchoolTenant(form.value)
    const subdomain = res?.data?.subdomain || form.value.subdomain

    $q.notify({
      type: 'positive',
      message: `Tenant ${form.value.school_name} berhasil terdaftar (${subdomain}).`,
      timeout: 4000,
    })

    emit('saved')
    isOpen.value = false
  } catch (err) {
    console.error('[SchoolFormDialog] submit error:', err)
    $q.notify({
      type: 'negative',
      message:
        err.response?.data?.error || err.message || 'Gagal meregistrasikan tenant sekolah.',
    })
  } finally {
    submitting.value = false
  }
}

// ── Real-time subdomain uniqueness check
const existingSubdomains = computed(() => {
  const list = Array.isArray(store.schools) ? store.schools : []
  return new Set(
    list.map((s) => String(s.slug || s.subdomain || '').toLowerCase()).filter(Boolean),
  )
})

// ── Real-time NPSN uniqueness check
const existingNpsns = computed(() => {
  const list = Array.isArray(store.schools) ? store.schools : []
  return new Set(
    list.map((s) => String(s.npsn || '').trim()).filter(Boolean),
  )
})

// Tracking original NPSN (edit mode)
const originalNpsn = computed(() => {
  return props.editData ? String(props.editData.npsn || '').trim() : ''
})

const npsnError = computed(() => {
  const v = String(form.value.npsn || '').trim()
  if (!v) return ''

  // Format check: 8 digit
  if (!/^\d{8}$/.test(v)) {
    return 'NPSN harus 8 digit angka'
  }

  // Skip kalau sama dengan original (edit mode)
  if (originalNpsn.value && v === originalNpsn.value) {
    return ''
  }

  // Uniqueness check
  if (existingNpsns.value.has(v)) {
    return `NPSN "${v}" sudah terdaftar`
  }

  return ''
})

// Tracking original subdomain kalau edit-mode (untuk skip check)
const originalSubdomain = computed(() => {
  return props.editData ? String(props.editData.slug || '').toLowerCase() : ''
})

const subdomainError = computed(() => {
  const v = String(form.value.subdomain || '').trim().toLowerCase()
  if (!v) return ''

  // Format check
  if (!/^[a-z0-9-]+$/.test(v)) {
    return 'Hanya huruf kecil, angka, dan dash'
  }

  // Reserved (kalau perlu)
  const reserved = ['www', 'api', 'admin', 'super', 'app']
  if (reserved.includes(v)) {
    return `Subdomain "${v}" tidak boleh digunakan`
  }

  // Skip kalau sama dengan original (edit mode)
  if (originalSubdomain.value && v === originalSubdomain.value) {
    return ''
  }

  // Uniqueness check
  if (existingSubdomains.value.has(v)) {
    return `Subdomain "${v}" sudah dipakai sekolah lain`
  }

  return ''
})

const hasFormError = computed(() => {
  return !!subdomainError.value || !!npsnError.value
})
</script>
