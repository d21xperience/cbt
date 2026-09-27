<!-- src/pages/admin/cetak/BeritaAcaraTemplateEditor.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <q-btn flat round dense icon="arrow_back" @click="$router.back()" class="q-mr-sm" />
      <div>
        <div class="text-h6">Master Template Berita Acara</div>
        <div class="text-caption text-grey-7">
          Template ini akan dipakai untuk mencetak lembar isian Berita Acara (diisi manual oleh pengawas).
        </div>
      </div>
      <q-space />
      <q-btn flat color="grey-7" icon="undo" label="Muat Ulang" @click="resetDefault" :disable="saving" />
      <q-btn color="primary" icon="save" label="Simpan Template" :loading="saving" @click="onSave" class="q-ml-sm" />
    </div>

    <q-banner dense rounded class="bg-blue-1 text-blue-9 q-mb-md">
      <template #avatar><q-icon name="info" color="primary" /></template>
      Template ini akan <b>di-instansiasi</b> per jadwal × kelas saat cetak. Bagian <b>............</b> akan
      dibiarkan kosong agar diisi manual oleh pengawas.
    </q-banner>

    <q-card v-if="!loading" flat bordered class="bg-white q-pa-md">
      <div class="row q-col-gutter-md">
        <!-- ─── HEADER ─── -->
        <div class="col-12">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            <q-icon name="title" class="q-mr-xs" />Header
          </div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-4">
              <q-input v-model="form.header.judul" label="Judul" outlined dense />
            </div>
            <div class="col-12 col-md-4">
              <q-input v-model="form.header.subjudul_1" label="Sub-judul 1" outlined dense />
            </div>
            <div class="col-12 col-md-4">
              <q-input v-model="form.header.subjudul_2" label="Sub-judul 2" outlined dense />
            </div>
          </div>
        </div>

        <q-separator class="q-my-md" />

        <!-- ─── PARAGRAF PEMBUKA ─── -->
        <div class="col-12">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            <q-icon name="article" class="q-mr-xs" />Paragraf Pembuka
          </div>
          <q-editor v-model="form.paragraf_pembuka" :toolbar="editorToolbar" min-height="6rem" dense flat
            class="bg-white" />
        </div>

        <!-- ─── STATISTIK ─── -->
        <div class="col-12">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            <q-icon name="bar_chart" class="q-mr-xs" />Statistik Peserta
          </div>
          <q-toggle v-model="form.statistik.enabled" label="Tampilkan statistik peserta" color="primary" />
          <div v-if="form.statistik.enabled" class="row q-col-gutter-md q-mt-sm">
            <div class="col-12 col-md-4">
              <q-input v-model="form.statistik.label_peserta" label="Label Peserta" outlined dense />
            </div>
            <div class="col-12 col-md-4">
              <q-input v-model="form.statistik.label_hadir" label="Label Hadir" outlined dense />
            </div>
            <div class="col-12 col-md-4">
              <q-input v-model="form.statistik.label_tidak_hadir" label="Label Tidak Hadir" outlined dense />
            </div>
          </div>
        </div>

        <q-separator class="q-my-md" />

        <!-- ─── PARAGRAF SAMPUL ─── -->
        <div class="col-12">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            <q-icon name="inventory_2" class="q-mr-xs" />Paragraf Sampul
          </div>
          <q-editor v-model="form.paragraf_sampul" :toolbar="editorToolbar" min-height="5rem" dense flat />
        </div>

        <!-- ─── PARAGRAF KONDISI ─── -->
        <div class="col-12">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            <q-icon name="fact_check" class="q-mr-xs" />Paragraf Kondisi
          </div>
          <q-editor v-model="form.paragraf_kondisi" :toolbar="editorToolbar" min-height="4rem" dense flat />
        </div>

        <q-separator class="q-my-md" />

        <!-- ─── CHECKLIST KEJADIAN ─── -->
        <div class="col-12">
          <div class="row items-center q-mb-sm">
            <div class="text-subtitle2 text-weight-bold text-primary">
              <q-icon name="checklist" class="q-mr-xs" />Checklist Kejadian
            </div>
            <q-space />
            <q-btn flat dense size="sm" color="primary" icon="add" label="Tambah Item" @click="addChecklistItem" />
          </div>
          <q-list separator class="rounded-borders bg-grey-1">
            <q-item v-for="(item, idx) in form.checklist_kejadian" :key="item.id">
              <q-item-section avatar>
                <q-toggle v-model="item.enabled" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-input v-model="item.label" outlined dense :disable="!item.enabled" />
              </q-item-section>
              <q-item-section side>
                <q-btn flat round dense icon="delete" color="negative" size="sm" @click="removeChecklistItem(idx)">
                  <q-tooltip>Hapus item</q-tooltip>
                </q-btn>
              </q-item-section>
            </q-item>
          </q-list>
        </div>

        <div class="col-12">
          <q-input v-model="form.label_catatan" label="Label Catatan" outlined dense
            hint="Kalimat pembuka sebelum area catatan" />
        </div>

        <q-separator class="q-my-md" />

        <!-- ─── TAMPILKAN ─── -->
        <div class="col-12">
          <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
            <q-icon name="visibility" class="q-mr-xs" />Bagian yang Ditampilkan
          </div>
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-3">
              <q-toggle v-model="form.tampilkan_daftar_siswa" label="Daftar Siswa + TTD" color="primary" />
            </div>
            <div class="col-12 col-md-3">
              <q-toggle v-model="form.tampilkan_ttd_pengawas" label="TTD Pengawas" color="primary" />
            </div>
            <div class="col-12 col-md-3">
              <q-toggle v-model="form.tampilkan_ttd_kepala" label="TTD Kepala Sekolah" color="primary" />
            </div>
            <div class="col-12 col-md-3">
              <q-toggle v-model="form.tampilkan_ttd_panitia" label="TTD Ketua Panitia" color="primary" />
            </div>
          </div>
        </div>
      </div>

      <q-separator class="q-my-lg" />

      <div class="row justify-end q-gutter-sm">
        <q-btn flat color="grey-7" label="Batal" @click="$router.back()" />
        <q-btn color="primary" icon="save" label="Simpan Template" :loading="saving" @click="onSave" />
      </div>
    </q-card>

    <div v-else class="text-center q-pa-xl">
      <q-spinner color="primary" size="3rem" />
      <div class="text-caption text-grey-7 q-mt-md">Memuat template...</div>
    </div>
  </q-page>
</template>

<script setup>
import { onMounted } from 'vue'
import { useBeritaAcaraTemplate } from '@/composables/admin/useBeritaAcaraTemplate'

const {
  loading,
  saving,
  form,
  load,
  save,
  addChecklistItem,
  removeChecklistItem,
  resetDefault,
} = useBeritaAcaraTemplate()

const editorToolbar = [
  ['bold', 'italic', 'underline', 'strike'],
  ['unordered', 'ordered'],
  ['removeFormat'],
]

const onSave = () => save()

onMounted(load)
</script>
