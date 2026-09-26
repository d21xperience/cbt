<template>
  <q-page padding>
    <!-- Header -->
    <div class="row justify-between items-center q-mb-md">
      <div>
        <q-btn flat dense icon="arrow_back" label="Kembali" no-caps color="grey-7" :to="{ name: 'admin-questions' }"
          class="q-mb-sm" />
        <div class="text-h5 text-weight-bold">
          <q-icon name="edit_note" color="primary" size="sm" class="q-mr-sm" />
          Editor Soal
        </div>
        <div v-if="exam" class="text-caption text-grey-7">
          {{ exam.nama }} · Kelas {{ exam.class_name }} · {{ exam.total_questions }} soal
        </div>
      </div>
      <q-btn color="primary" icon="add" label="Tambah Soal" no-caps @click="openCreate" />
    </div>

    <!-- Error banner -->
    <q-banner v-if="errorState === 'endpoint_not_ready'" dense rounded class="bg-blue-grey-2 text-blue-grey-9 q-mb-md">
      <template v-slot:avatar><q-icon name="construction" /></template>
      Endpoint belum tersedia di backend. Menampilkan data mock.
    </q-banner>

    <!-- Stats -->
    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-white">
          <q-card-section class="text-center">
            <div class="text-caption text-grey-7">Total Soal</div>
            <div class="text-h5 text-weight-bold text-primary">{{ stats.total }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-white">
          <q-card-section class="text-center">
            <div class="text-caption text-grey-7">PG</div>
            <div class="text-h5 text-weight-bold text-teal">{{ stats.pg }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-white">
          <q-card-section class="text-center">
            <div class="text-caption text-grey-7">Essay</div>
            <div class="text-h5 text-weight-bold text-orange">{{ stats.essay }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="bg-white">
          <q-card-section class="text-center">
            <div class="text-caption text-grey-7">Total Skor</div>
            <div class="text-h5 text-weight-bold text-deep-purple">{{ stats.totalScore }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Empty -->
    <q-card v-if="!loading && questions.length === 0" flat bordered class="bg-white">
      <q-card-section class="text-center q-pa-xl text-grey-6">
        <q-icon name="quiz" size="64px" color="grey-4" />
        <div class="text-h6 q-mt-md">Belum Ada Soal</div>
        <div class="text-caption q-mt-sm">Klik "Tambah Soal" untuk mulai.</div>
      </q-card-section>
    </q-card>

    <!-- List Soal (cards) -->
    <div v-else class="q-gutter-md">
      <q-card v-for="(q, idx) in questions" :key="q.id" flat bordered class="bg-white">
        <q-card-section>
          <div class="row items-start no-wrap">
            <q-avatar color="primary" text-color="white" size="40px" class="q-mr-md">
              {{ idx + 1 }}
            </q-avatar>
            <div class="col">
              <div class="row items-center q-gutter-xs q-mb-sm">
                <q-badge :color="q.question_type === 'PG' ? 'blue' : 'orange'" :label="q.question_type" />
                <q-badge outline color="primary" :label="`Skor ${q.score}`" />
              </div>
              <QuestionPreviewInline :question="q" class="q-mt-sm" />
            </div>
            <div class="column q-gutter-xs">
              <q-btn flat round dense icon="edit" color="primary" @click="openEdit(q)">
                <q-tooltip>Edit</q-tooltip>
              </q-btn>
              <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(q)">
                <q-tooltip>Hapus</q-tooltip>
              </q-btn>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Dialog -->
    <QuestionEditDialog v-model="dialogOpen" :is-editing="isEditing" :initial-form="initialForm"
      :submitting="submitting" @submit="submitForm" @cancel="closeDialog" />
  </q-page>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useQuestionEditor } from '@/composables/admin/useQuestionEditor'
import QuestionEditDialog from '@/components/admin/QuestionEditDialog.vue'
import QuestionPreviewInline from '@/components/admin/QuestionPreviewInline.vue'

const $q = useQuasar()

const {
  exam,
  questions,
  loading,
  submitting,
  errorState,
  dialogOpen,
  isEditing,
  initialForm,
  stats,
  openCreate,
  openEdit,
  closeDialog,
  submitForm,
  deleteQuestion,
} = useQuestionEditor()

const confirmDelete = (row) => {
  $q.dialog({
    title: 'Hapus Soal',
    message: 'Hapus soal ini?',
    cancel: { label: 'Batal', flat: true },
    ok: { label: 'Hapus', color: 'negative', flat: true },
    persistent: true,
  }).onOk(async () => {
    await deleteQuestion(row)
  })
}
</script>
