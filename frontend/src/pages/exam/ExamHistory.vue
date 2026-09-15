<template>
  <q-page class="q-pa-md">
    <!-- KOLOM KANAN: Profil & Riwayat (Lebar 4 dari 12 di desktop) -->
    <div class="col-12 col-md-4">
      <!-- Riwayat Ujian Selesai -->
      <q-card flat bordered class="shadow-1">
        <q-card-section class="bg-grey-2 q-py-sm">
          <div class="text-subtitle1 text-weight-bold text-grey-8 flex items-center">
            <q-icon name="history" class="q-mr-xs" />
            Riwayat Ujian
          </div>
        </q-card-section>

        <q-list separator>
          <q-item v-for="history in completedExams" :key="history.id">
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ history.subject }}</q-item-label>
              <q-item-label caption>Selesai kemarin</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge
                color="grey-4"
                text-color="grey-8"
                label="Selesai"
                class="text-weight-bold"
              />
            </q-item-section>
          </q-item>

          <q-item v-if="completedExams.length === 0">
            <q-item-section class="text-center text-grey-5 q-py-md">
              Belum ada riwayat ujian.
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref } from 'vue'

// import { useQuasar } from 'quasar'
// const $q = useQuasar()
const completedExams = ref({
  id: '',
  subject: '',
  length: '',
})
</script>
