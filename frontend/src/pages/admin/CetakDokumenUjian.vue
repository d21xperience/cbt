<!-- src/pages/admin/CetakDokumenUjian.vue -->
<template>
  <q-page class="q-pa-md bg-grey-1 row justify-center">
    <!-- Kontainer utama untuk menjaga simetri halaman -->
    <div class="col-12" style="max-width: 1400px;">

      <!-- Bagian Judul Halaman -->
      <div class="q-mb-xl">
        <div class="text-h5 text-weight-bold text-grey-9 q-mb-xs">Cetak Dokumen Ujian</div>
        <div class="text-caption text-grey-7">
          Pusat cetak dokumen pelaksanaan ujian. Pilih dokumen yang ingin dicetak.
        </div>
      </div>

      <!-- Grid Kartu Dokumen -->
      <div class="row q-col-gutter-md">
        <!-- Tambahkan class 'column' pada wrapper kolom grid -->
        <div v-for="doc in docs" :key="doc.key" class="col-12 col-sm-6 col-md-4 column">

          <!-- Tambahkan 'full-height column justify-between' dan class interaksi hover -->
          <q-card flat bordered
            class="doc-card cursor-pointer full-height column justify-between bg-white text-grey-9 shadow-1"
            :class="{ 'doc-card--disabled': !doc.ready }" @click="openDoc(doc)">
            <!-- Konten Utama Kartu (Avatar & Teks) -->
            <q-card-section class="col">
              <!-- Kita gunakan kontainer flex khusus dengan items-center agar ikon tegak lurus di tengah -->
              <div class="flex items-center no-wrap">

                <!-- Avatar dikunci posisinya -->
                <q-avatar :color="doc.color" text-color="white" :icon="doc.icon" size="48px"
                  class="flex-shrink-0 q-mr-md" />

                <!-- Area Teks -->
                <div>
                  <div class="text-subtitle1 text-weight-bold text-grey-9 lh-title">{{ doc.label }}</div>
                  <div class="text-caption text-grey-7 q-mt-xs">{{ doc.desc }}</div>
                </div>

              </div>
            </q-card-section>

            <!-- Bagian Status Badge (Selalu konsisten menempel di paling bawah kartu) -->
            <q-card-section class="q-pt-none row items-center justify-between">
              <q-badge :color="doc.ready ? 'positive' : 'grey-5'" :label="doc.ready ? 'Siap' : 'Segera hadir'"
                class="q-px-sm q-py-xs text-weight-medium text-caption" style="border-radius: 4px;" />
              <!-- Tambahkan indikator panah halus jika dokumen siap dicetak -->
              <q-icon v-if="doc.ready" name="chevron_right" color="primary" size="20px" class="gt-xs" />
            </q-card-section>

          </q-card>
        </div>
      </div>

    </div>
  </q-page>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const router = useRouter()
const $q = useQuasar()

const docs = [
  {
    key: 'kartu-ujian',
    label: 'Kartu Ujian',
    desc: 'Kartu login siswa (QR) + jadwal ujian — bolak-balik, CR80',
    icon: 'card_membership',
    color: 'primary',
    ready: true,
    to: { name: 'admin-cetak-kartu-ujian' },
  },
  {
    key: 'daftar-pengawas',
    label: 'Daftar Pengawas',
    desc: 'Daftar pengawas per hari & ruang (landscape)',
    icon: 'supervisor_account',
    color: 'deep-purple',
    ready: true,
    to: { name: 'admin-cetak-daftar-pengawas' },
  },
  {
    key: 'berita-acara',
    label: 'Berita Acara',
    desc: 'Cetak lembar isian BA per jadwal × kelas',
    icon: 'assignment_turned_in',
    color: 'teal',
    ready: true,
    to: { name: 'admin-cetak-berita-acara' },
  },
  {
    key: 'denah-duduk',
    label: 'Denah Duduk',
    desc: 'Denah kursi peserta per ruang (2b-3d)',
    icon: 'grid_view',
    color: 'orange',
    ready: false,
  },
  {
    key: 'aturan-ujian',
    label: 'Aturan Ujian',
    desc: 'Lembar tata tertib peserta (2b-3e)',
    icon: 'gavel',
    color: 'red',
    ready: false,
  },
]

const openDoc = (doc) => {
  if (!doc.ready) {
    $q.notify({ type: 'info', message: `${doc.label} segera hadir (fase ${doc.key})` })
    return
  }
  if (doc.to) router.push(doc.to)
}
</script>

<style scoped>
/* Efek hover premium menyerupai gambar contoh */
.doc-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.doc-card:hover:not(.doc-card--disabled) {
  transform: translateY(-3px);
  border-color: var(--q-primary);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05) !important;
}

/* Tampilan visual untuk kartu yang belum aktif (Segera Hadir) */
.doc-card--disabled {
  opacity: 0.6;
  cursor: not-allowed !important;
  background-color: #fafafa !important;
}

.lh-title {
  line-height: 1.25;
}
</style>
