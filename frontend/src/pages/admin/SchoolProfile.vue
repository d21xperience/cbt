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
        <q-form @submit.prevent="saveProfile">
          <!-- ═══ Section 0: Logo Sekolah (F0.6c-1) ═══ -->
          <div class="text-subtitle2 text-weight-bold text-primary row items-center">
            <q-icon name="image" size="xs" class="q-mr-xs" />
            Logo Sekolah
          </div>

          <div class="row items-center q-col-gutter-md q-pt-xs q-mb-md">
            <div class="col-auto">
              <q-avatar v-if="form.logo_url" size="96px" square class="bg-grey-2 rounded-borders">
                <img :src="form.logo_url" alt="Logo Sekolah" />
              </q-avatar>
              <div v-else class="logo-placeholder column flex-center bg-grey-2 rounded-borders">
                <q-icon name="image" size="40px" color="grey-5" />
                <div class="text-caption text-grey-6 q-mt-xs">Belum ada logo</div>
              </div>
            </div>
            <div class="col">
              <div class="text-caption text-grey-7 q-mb-sm">
                PNG, JPEG, atau WebP · Max 1 MB<br />
                Akan tampil di kartu ujian dan landing page.
              </div>
              <div v-if="isEditing" class="q-gutter-sm">
                <q-btn
                  color="primary"
                  icon="upload_file"
                  label="Pilih Logo"
                  no-caps
                  dense
                  outline
                  @click="onPickLogo"
                />
                <q-btn
                  v-if="form.logo_url"
                  flat
                  color="negative"
                  icon="delete"
                  label="Hapus Logo"
                  no-caps
                  dense
                  @click="onClearLogo"
                />
              </div>
              <div v-else class="text-caption text-grey-6" style="font-style: italic">
                <q-icon name="info" size="xs" class="q-mr-xs" />
                Klik "Edit Profil" untuk mengubah logo.
              </div>
            </div>
          </div>

          <input
            ref="logoFileInput"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            @change="onLogoSelected"
          />

          <q-separator class="q-my-md" />
          <!-- ═══ Section 1: Identitas ═══ -->
          <div class="text-subtitle2 text-weight-bold text-primary row items-center">
            <q-icon name="badge" size="xs" class="q-mr-xs" />
            Identitas Sekolah
            <q-badge color="orange" class="q-ml-sm" dense>
              <q-icon name="lock" size="xs" class="q-mr-xs" />
              Dikelola Superadmin
            </q-badge>
          </div>

          <div class="row q-col-gutter-md q-pt-xs">
            <div class="col-12 col-md-8">
              <!-- <q-input v-model="form.nama" label="Nama Sekolah" outlined dense :readonly="!isEditing"
                :rules="[(v) => !!v || 'Nama wajib diisi']" /> -->
              <q-input
                v-model="form.nama_sekolah"
                label="Nama Sekolah"
                outlined
                dense
                disable
                hint="Nama sekolah dikelola oleh Superadmin"
              />
            </div>
            <div class="col-12 col-md-4">
              <!-- <q-select v-model="form.jenjang" :options="jenjangOptions" label="Jenjang" outlined dense emit-value
                map-options :readonly="!isEditing" :rules="[(v) => !!v || 'Jenjang wajib']" /> -->
              <q-select
                v-model="form.jenjang"
                :options="jenjangOptions"
                label="Jenjang"
                outlined
                dense
                emit-value
                map-options
                disable
                hint="Jenjang dikelola oleh Superadmin"
              />
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <!-- <q-input v-model="form.npsn" label="NPSN" outlined dense :readonly="!isEditing" mask="########" /> -->
              <q-input
                v-model="form.npsn"
                label="NPSN"
                outlined
                dense
                mask="########"
                disable
                hint="NPSN dikelola oleh Superadmin"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input v-model="form.nss" label="NSS" outlined dense :readonly="!isEditing" />
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
              <!-- <q-input v-model.number="form.program_duration_years" type="number" label="Durasi Program (tahun)"
                outlined dense :readonly="!isEditing" :min="1" :max="6" hint="3 tahun (default) atau 4 tahun (SMK)" /> -->
              <q-input
                v-model.number="form.program_duration_years"
                type="number"
                label="Durasi Program (tahun)"
                outlined
                dense
                :min="1"
                :max="6"
                disable
                hint="Durasi program dikelola oleh Superadmin"
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
import { onMounted, ref } from 'vue'
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
  setLogoFromFile,
  clearLogo,
} = useSchoolProfile()

const logoFileInput = ref(null)

const onPickLogo = () => {
  logoFileInput.value?.click()
}

const onLogoSelected = async (e) => {
  const file = e.target.files?.[0]
  e.target.value = '' // reset — supaya bisa pilih file yang sama 2x
  if (!file) return
  await setLogoFromFile(file)
}

const onClearLogo = () => {
  clearLogo()
}
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

<style scoped>
.logo-placeholder {
  width: 96px;
  height: 96px;
  border: 1px dashed #ccc;
  border-radius: 8px;
}
</style>
