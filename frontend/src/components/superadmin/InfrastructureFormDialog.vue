<!-- src/components/superadmin/InfrastructureFormDialog.vue -->
<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 640px; max-width: 95vw">
      <q-card-section class="bg-primary text-white row items-center">
        <div class="text-h6">{{ dialogTitle }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-gutter-md q-pt-md">
        <!-- ═══════════ VPS Fields ═══════════ -->
        <template v-if="resourceType === 'vps'">
          <q-input v-model="form.vendor" label="Vendor VPS" outlined dense :rules="[required]"
            placeholder="DigitalOcean / AWS / Biznet" />
          <q-input v-model="form.package" label="Paket / Spesifikasi" outlined dense :rules="[required]"
            placeholder="VPS 4GB / 2 vCPU" />

          <q-input v-model="biayaBulananDisplay" label="Biaya Bulanan" outlined dense prefix="Rp"
            :rules="[requiredRupiah]" placeholder="100.000">
            <template v-slot:hint> Format otomatis dengan pemisah ribuan</template>
          </q-input>

          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input v-model="form.tanggal_sewa" type="date" label="Tanggal Sewa" outlined dense stack-label
                :rules="[required]" />
            </div>
            <div class="col-12 col-sm-6">
              <q-select v-model="form.durasi_sewa" :options="durasiOptions" label="Durasi Sewa" outlined dense
                emit-value map-options :rules="[required]" />
            </div>
          </div>
        </template>

        <!-- ═══════════ Domain Fields ═══════════ -->
        <template v-else-if="resourceType === 'domains'">
          <q-input v-model="form.domain" label="Domain" outlined dense :rules="[required]" placeholder="ujian.pw" />
          <q-input v-model="form.registrar" label="Registrar" outlined dense :rules="[required]"
            placeholder="Namecheap / Cloudflare / IDCloudHost" />

          <q-input v-model="biayaTahunanDisplay" label="Biaya Tahunan" outlined dense prefix="Rp"
            :rules="[requiredRupiah]" placeholder="180.000">
            <template v-slot:hint> Format otomatis dengan pemisah ribuan</template>
          </q-input>

          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input v-model="form.tanggal_registrasi" type="date" label="Tanggal Registrasi" outlined dense
                stack-label :rules="[required]" />
            </div>
            <div class="col-12 col-sm-6">
              <q-select v-model="form.durasi_sewa" :options="durasiOptions" label="Durasi Sewa" outlined dense
                emit-value map-options :rules="[required]" />
            </div>
          </div>
        </template>

        <!-- ═══════════ TLS Fields ═══════════ -->
        <template v-else-if="resourceType === 'tls'">
          <q-input v-model="form.domain" label="Domain / Wildcard" outlined dense :rules="[required]"
            placeholder="*.ujian.pw atau ujian.pw" />

          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-8">
              <q-input v-model="form.issuer" label="Issuer" outlined dense :rules="[required]"
                placeholder="Let's Encrypt" />
            </div>
            <div class="col-12 col-sm-4">
              <q-select v-model="form.tipe" :options="tlsTypeOptions" label="Tipe" outlined dense emit-value
                map-options />
            </div>
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-12 col-sm-6">
              <q-input v-model="form.tanggal_issue" type="date" label="Tanggal Issue" outlined dense stack-label
                :rules="[required]" />
            </div>
            <div class="col-12 col-sm-6">
              <q-select v-model="form.durasi_sewa" :options="durasiOptions" label="Durasi Sertifikat" outlined dense
                emit-value map-options :rules="[required]" />
            </div>
          </div>
        </template>

        <!-- ═══════════ Auto-computed Expiry (readonly) ═══════════ -->
        <q-banner dense rounded class="bg-blue-grey-1 text-blue-grey-9">
          <template v-slot:avatar>
            <q-icon name="event" color="blue-grey" />
          </template>
          <div class="row items-center">
            <div class="col">
              <b>Tanggal Expiry (otomatis):</b>
              <span v-if="form.tanggal_expiry" class="q-ml-sm text-weight-bold">
                {{ formatDisplayDate(form.tanggal_expiry) }}
              </span>
              <span v-else class="q-ml-sm text-grey-6 italic">
                Pilih tanggal + durasi sewa terlebih dahulu
              </span>
            </div>
          </div>
        </q-banner>

        <!-- Common: Notes -->
        <q-input v-model="form.notes" type="textarea" label="Catatan (opsional)" outlined autogrow :rows="2" />
      </q-card-section>

      <q-card-actions align="right" class="q-pb-md q-pr-md">
        <q-btn flat label="Batal" v-close-popup color="grey-7" />
        <q-btn color="primary" :label="isEditing ? 'Simpan Perubahan' : 'Simpan'" :loading="submitting"
          :disable="!form.tanggal_expiry" @click="submit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  resourceType: { type: String, required: true },
  editData: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'submit'])

const isOpen = ref(false)
const isEditing = ref(false)

// ── Durasi options
const durasiOptions = [
  { label: '1 bulan', value: 1 },
  { label: '3 bulan', value: 3 },
  { label: '6 bulan', value: 6 },
  { label: '1 tahun', value: 12 },
  { label: '2 tahun', value: 24 },
  { label: '3 tahun', value: 36 },
]

const tlsTypeOptions = [
  { label: 'Wildcard', value: 'wildcard' },
  { label: 'Single', value: 'single' },
  { label: 'Multi', value: 'multi' },
]

// ── Build initial form (default durasi per resource)
const buildInitialForm = () => ({
  // VPS
  vendor: '',
  package: '',
  biaya_bulanan: 0,
  // Domain
  domain: '',
  registrar: '',
  biaya_tahunan: 0,
  tanggal_registrasi: '',
  // TLS
  issuer: '',
  tipe: 'wildcard',
  tanggal_issue: '',
  // Shared
  tanggal_sewa: '',
  durasi_sewa: props.resourceType === 'vps' ? 1 : props.resourceType === 'domains' ? 12 : 3,
  tanggal_expiry: '',
  notes: '',
})

const form = ref(buildInitialForm())

const dialogTitle = computed(() => {
  const labels = { vps: 'VPS', domains: 'Domain', tls: 'Sertifikat TLS' }
  const label = labels[props.resourceType] || 'Resource'
  return isEditing.value ? `Edit ${label}` : `Tambah ${label}`
})

// ── Validators
const required = (v) => !!v || 'Wajib diisi'
const requiredRupiah = (v) => {
  // v bisa string ter-format ("2.500.000") — parse dulu
  const n = parseRupiah(v)
  return n > 0 || 'Wajib diisi (angka > 0)'
}

// ── Rupiah helpers (function declarations — hoisted, bisa dipakai di atas)
function formatRupiah(n) {
  const num = Number(n)
  if (!Number.isFinite(num) || num === 0) return ''
  return num.toLocaleString('id-ID')
}

function parseRupiah(s) {
  const cleaned = String(s || '').replace(/[^\d]/g, '')
  return Number(cleaned) || 0
}

const biayaBulananDisplay = computed({
  get: () => formatRupiah(form.value.biaya_bulanan),
  set: (val) => {
    form.value.biaya_bulanan = parseRupiah(val)
  },
})

const biayaTahunanDisplay = computed({
  get: () => formatRupiah(form.value.biaya_tahunan),
  set: (val) => {
    form.value.biaya_tahunan = parseRupiah(val)
  },
})

// ── Auto-compute expiry
const computeExpiry = (startDate, durationMonths) => {
  if (!startDate || !durationMonths) return ''
  const d = new Date(startDate)
  if (!Number.isFinite(d.getTime())) return ''
  d.setMonth(d.getMonth() + Number(durationMonths))
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Watch tanggal_sewa + durasi_sewa → auto-update tanggal_expiry
watch(
  [() => form.value.tanggal_sewa, () => form.value.durasi_sewa, () => form.value.tanggal_registrasi, () => form.value.tanggal_issue],
  ([sewa, durasi, registrasi, issue]) => {
    // Prioritas: tanggal_sewa (VPS) > tanggal_registrasi (domain) > tanggal_issue (TLS)
    const startDate = sewa || registrasi || issue
    form.value.tanggal_expiry = computeExpiry(startDate, durasi)
  },
)

// ── Display helper untuk banner
const formatDisplayDate = (iso) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

// ── Watch modelValue / editData
watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val
    if (val) {
      if (props.editData) {
        isEditing.value = true
        form.value = { ...buildInitialForm(), ...props.editData }
      } else {
        isEditing.value = false
        form.value = buildInitialForm()
      }
    }
  },
)
watch(isOpen, (val) => emit('update:modelValue', val))

const submit = () => {
  if (!form.value.tanggal_expiry) {
    return
  }
  emit('submit', { ...form.value })
}
</script>
