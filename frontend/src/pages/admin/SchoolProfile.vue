<template>
  <q-page padding>
    <!-- Header -->
    <div class="row justify-between items-center q-mb-md">
      <div>
        <div class="text-h5 text-weight-bold">
          <q-icon name="school" color="primary" size="sm" class="q-mr-sm" />
          Profil Sekolah
        </div>
        <div class="text-caption text-grey-7">
          Informasi identitas sekolah. Data ini akan dipakai di kartu ujian, laporan, dan invoice.
        </div>
      </div>
      <div class="q-gutter-sm">
        <template v-if="!isEditing">
          <q-btn
            color="primary"
            icon="edit"
            label="Edit Profil"
            no-caps
            :disable="loading"
            @click="startEditing"
          />
        </template>
        <template v-else>
          <q-btn
            flat
            color="grey-7"
            icon="close"
            label="Batal"
            no-caps
            :disable="saving"
            @click="cancelEditing"
          />
          <q-btn
            color="primary"
            icon="save"
            label="Simpan"
            no-caps
            :loading="saving"
            :disable="!canSubmit"
            @click="saveProfile"
          />
        </template>
      </div>
    </div>

    <!-- Error banners -->
    <q-banner
      v-if="errorState === 'endpoint_not_ready'"
      dense
      rounded
      class="bg-blue-grey-2 text-blue-grey-9 q-mb-md"
    >
      <template v-slot:avatar><q-icon name="construction" /></template>
      Endpoint profil sekolah belum tersedia di backend. Menampilkan data mock.
    </q-banner>
    <q-banner
      v-else-if="errorState === 'network_error'"
      dense
      rounded
      class="bg-orange-1 text-orange-9 q-mb-md"
    >
      <template v-slot:avatar><q-icon name="wifi_off" color="orange" /></template>
      Koneksi terputus. Data terakhir tetap ditampilkan.
    </q-banner>
    <q-banner
      v-else-if="errorState === 'server_error'"
      dense
      rounded
      class="bg-red-1 text-red-9 q-mb-md"
    >
      <template v-slot:avatar><q-icon name="error" color="red" /></template>
      Server error. Klik refresh untuk coba lagi.
    </q-banner>

    <!-- Dirty hint -->
    <q-banner
      v-if="isEditing && !isDirty"
      dense
      rounded
      class="bg-blue-grey-1 text-blue-grey-9 q-mb-md"
    >
      <template v-slot:avatar><q-icon name="info" /></template>
      Tidak ada perubahan yang perlu disimpan.
    </q-banner>

    <!-- Content -->
    <q-card flat bordered>
      <q-card-section>
        <q-inner-loading :showing="loading" />
        <q-form @submit.prevent="saveProfile" class="q-gutter-md">
          <!-- ═══ Section 1: Identitas ═══ -->
          <div class="text-subtitle2 text-weight-bold text-primary row items-center">
            <q-icon name="badge" size="xs" class="q-mr-xs" />
            Identitas Sekolah
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-8">
              <q-input
                v-model="form.nama"
                label="Nama Sekolah"
                outlined
                dense
                :readonly="!isEditing"
                :rules="[(v) => !!v || 'Nama wajib diisi']"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-select
                v-model="form.jenjang"
                :options="jenjangOptions"
                label="Jenjang"
                outlined
                dense
                emit-value
                map-options
                :readonly="!isEditing"
                :rules="[(v) => !!v || 'Jenjang wajib']"
              />
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-input
                v-model="form.npsn"
                label="NPSN"
                outlined
                dense
                :readonly="!isEditing"
                mask="########"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="form.nss"
                label="NSS"
                outlined
                dense
                :readonly="!isEditing"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="form.kode_sekolah"
                label="Kode Sekolah (internal CBT)"
                outlined
                dense
                :readonly="!isEditing"
                hint="Prefix invoice / kartu ujian"
              />
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-input
                v-model.number="form.program_duration_years"
                type="number"
                label="Durasi Program (tahun)"
                outlined
                dense
                :readonly="!isEditing"
                :min="1"
                :max="6"
                hint="3 tahun (default) atau 4 tahun (SMK)"
              />
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- ═══ Section 2: Alamat ═══ -->
          <div class="text-subtitle2 text-weight-bold text-primary row items-center">
            <q-icon name="location_on" size="xs" class="q-mr-xs" />
            Alamat
          </div>

          <q-input
            v-model="form.alamat_jalan"
            label="Jalan"
            outlined
            dense
            :readonly="!isEditing"
          />

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-input
                v-model="form.alamat_desa"
                label="Desa / Kelurahan"
                outlined
                dense
                :readonly="!isEditing"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="form.alamat_kecamatan"
                label="Kecamatan"
                outlined
                dense
                :readonly="!isEditing"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="form.alamat_kabupaten"
                label="Kabupaten / Kota"
                outlined
                dense
                :readonly="!isEditing"
              />
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.alamat_provinsi"
                label="Provinsi"
                outlined
                dense
                :readonly="!isEditing"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.alamat_kode_pos"
                label="Kode Pos"
                outlined
                dense
                :readonly="!isEditing"
                mask="#####"
              />
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- ═══ Section 3: Kontak ═══ -->
          <div class="text-subtitle2 text-weight-bold text-primary row items-center">
            <q-icon name="contact_phone" size="xs" class="q-mr-xs" />
            Kontak
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-input
                v-model="form.telp"
                label="Telp / Fax"
                outlined
                dense
                :readonly="!isEditing"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="form.email"
                type="email"
                label="Email"
                outlined
                dense
                :readonly="!isEditing"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="form.website"
                label="Website"
                outlined
                dense
                :readonly="!isEditing"
              />
            </div>
          </div>

          <q-separator class="q-my-md" />

          <!-- ═══ Section 4: Kepala Sekolah ═══ -->
          <div class="text-subtitle2 text-weight-bold text-primary row items-center">
            <q-icon name="person" size="xs" class="q-mr-xs" />
            Kepala Sekolah
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-8">
              <q-input
                v-model="form.kepala_sekolah_nama"
                label="Nama Kepala Sekolah"
                outlined
                dense
                :readonly="!isEditing"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input
                v-model="form.kepala_sekolah_nip"
                label="NIP"
                outlined
                dense
                :readonly="!isEditing"
              />
            </div>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useSchoolProfile } from '@/composables/admin/useSchoolProfile'

const {
  form,
  loading,
  saving,
  isEditing,
  errorState,
  isDirty,
  canSubmit,
  loadProfile,
  startEditing,
  cancelEditing,
  saveProfile,
} = useSchoolProfile()

const jenjangOptions = [
  { label: 'SMP', value: 'SMP' },
  { label: 'MTs', value: 'MTs' },
  { label: 'SMA', value: 'SMA' },
  { label: 'MA', value: 'MA' },
  { label: 'SMK', value: 'SMK' },
  { label: 'MAK', value: 'MAK' },
]

onMounted(loadProfile)
</script>
