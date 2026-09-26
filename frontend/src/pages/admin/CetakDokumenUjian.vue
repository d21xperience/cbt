<!-- src/pages/admin/CetakDokumenUjian.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-xs">Cetak Dokumen Ujian</div>
    <div class="text-caption text-grey-7 q-mb-lg">
      Pusat cetak dokumen pelaksanaan ujian. Pilih dokumen yang ingin dicetak.
    </div>

    <div class="row q-col-gutter-md">
      <div v-for="doc in docs" :key="doc.key" class="col-12 col-sm-6 col-md-4">
        <q-card flat bordered class="doc-card cursor-pointer" :class="{ 'doc-card--disabled': !doc.ready }"
          @click="openDoc(doc)">
          <q-card-section class="row items-center q-col-gutter-md">
            <q-avatar :color="doc.color" text-color="white" :icon="doc.icon" size="48px" />
            <div class="col">
              <div class="text-subtitle1 text-weight-medium">{{ doc.label }}</div>
              <div class="text-caption text-grey-7">{{ doc.desc }}</div>
            </div>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <q-badge :color="doc.ready ? 'positive' : 'grey'" :label="doc.ready ? 'Siap' : 'Segera hadir'" />
          </q-card-section>
        </q-card>
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
    desc: 'Daftar pengawas per hari (2b-3b)',
    icon: 'supervisor_account',
    color: 'deep-purple',
    ready: false,
  },
  {
    key: 'berita-acara',
    label: 'Berita Acara',
    desc: 'Berita acara pelaksanaan per ruang (2b-3c)',
    icon: 'assignment_turned_in',
    color: 'teal',
    ready: false,
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
.doc-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.doc-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.doc-card--disabled {
  opacity: 0.65;
}
</style>
