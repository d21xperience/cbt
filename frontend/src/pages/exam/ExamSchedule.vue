<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Jadwal Ujian</div>
    <q-table :rows="exams" :columns="columns" row-key="id" binary-state-sort bordered>
      <template v-slot:body-cell-action="props">
        <q-td :props="props">
          <q-btn
            :label="props.row.hasCache ? 'Mulai' : 'Unduh'"
            :color="props.row.hasCache ? 'primary' : 'orange'"
            @click="store.handleExamAction(props.row)"
            :disable="props.row.status === 'finished'"
            size="sm"
          />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
// import { useExamScheduleStore } from '@/stores/exam/examSchedule';
// import { useCacheManager } from '@/composables/exam/useCacheManager';
// import { useRouter } from 'vue-router';

// const store = useExamStore();
// const { hasValidPackage } = useCacheManager();
// const router = useRouter();
const exams = ref([])

const columns = [
  { name: 'name', label: 'Nama Ujian', field: 'name', sortable: true },
  { name: 'subject', label: 'Mata Pelajaran', field: 'subject' },
  {
    name: 'date',
    label: 'Tanggal & Waktu',
    field: (row) => new Date(row.date).toLocaleString('id-ID'),
  },
  { name: 'duration', label: 'Durasi (menit)', field: 'duration' },
  { name: 'status', label: 'Status', field: (row) => row.status },
  { name: 'action', label: 'Aksi', field: 'action' },
]

onMounted(async () => {
  // const res = await api.get('/exam/schedule');
  // const res = await store.getSchedule()
  // exams.value = res.data;
  // for (const exam of exams.value) {
  //   exam.hasCache = await hasValidPackage(exam.id);
  // }
})

// const handleAction = (exam) => {
//   console.log(exam)
//   if (exam.hasCache) {
//     store.setCurrentExam(exam.id, exam.name);
//     router.push('/exam/session');
//   } else {
//     router.push({ name: 'exam-preparation', query: { examId: exam.id } });
//   }
// };
</script>
