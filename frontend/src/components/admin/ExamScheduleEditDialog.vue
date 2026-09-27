<!-- src/components/admin/ExamScheduleEditDialog.vue -->
<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="$emit('update:modelValue', $event)" maximized>
    <q-card>
      <q-card-section class="bg-primary text-white row items-center">
        <q-icon name="edit_calendar" size="md" class="q-mr-sm" />
        <div>
          <div class="text-h6">Edit Jadwal Ujian</div>
          <div class="text-caption text-white" style="opacity: 0.85">
            {{ row?.subject_nama }} — Tingkat {{ row?.tingkat }}
          </div>
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section v-if="row" class="q-gutter-md">
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-3">
            <q-input v-model="form.tanggal" type="date" label="Tanggal" outlined dense />
          </div>
          <div class="col-12 col-md-3">
            <q-input v-model="form.jam_mulai" type="time" label="Jam Mulai" outlined dense />
          </div>
          <div class="col-12 col-md-3">
            <q-input v-model.number="form.durasi_menit" type="number" label="Durasi (menit)" outlined dense />
          </div>
          <div class="col-12 col-md-3 flex items-center">
            <q-chip outline color="indigo" icon="schedule">
              Selesai: {{ endTime }}
            </q-chip>
          </div>
        </div>

        <div class="row q-col-gutter-md q-mt-sm">
          <div class="col-12 col-md-6">
            <q-input v-model="form.subject_nama" label="Mata Pelajaran" outlined dense readonly />
          </div>
          <div class="col-12 col-md-3">
            <q-input v-model="form.subject_kode" label="Kode" outlined dense readonly />
          </div>
          <div class="col-12 col-md-3">
            <q-chip outline :color="form.kelompok === 'KEJURUAN' ? 'deep-purple' : 'primary'">
              {{ form.kelompok }}{{ form.jurusan_nama ? ` — ${form.jurusan_nama}` : '' }}
            </q-chip>
          </div>
        </div>

        <q-separator class="q-my-md" />

        <div class="row items-center q-mb-sm">
          <div class="text-subtitle2 text-weight-bold">
            <q-icon name="groups" class="q-mr-xs" />
            Distribusi Kelas & Pengawas ({{ localDetails.length }} kelas)
          </div>
          <q-space />
          <q-btn flat dense size="sm" color="primary" icon="auto_fix_high" label="Auto-assign Semua"
            :disable="loadingRefs" @click="autoAssignAll" />
        </div>

        <q-table :rows="localDetails" :columns="detailColumns" row-key="class_id" flat bordered dense hide-pagination
          :pagination="{ rowsPerPage: 0 }" :loading="loadingRefs">
          <template #body-cell-class_nama="props">
            <q-td :props="props">
              <div class="text-weight-medium">{{ props.row.class_nama }}</div>
            </q-td>
          </template>

          <template #body-cell-ruang="props">
            <q-td :props="props">
              <q-select v-model="props.row.ruang_id" :options="ruangOptionsAll" dense outlined emit-value map-options
                options-dense />
            </q-td>
          </template>

          <template #body-cell-pengawas1="props">
            <q-td :props="props">
              <q-select v-model="props.row.pengawas_ids[0]" :options="teacherOptions" dense outlined emit-value
                map-options options-dense clearable />
            </q-td>
          </template>

          <template #body-cell-pengawas2="props">
            <q-td :props="props">
              <q-select v-model="props.row.pengawas_ids[1]" :options="teacherOptions" dense outlined emit-value
                map-options options-dense clearable />
            </q-td>
          </template>

          <template #body-cell-aksi="props">
            <q-td :props="props" class="text-center">
              <q-btn flat round dense icon="delete" color="negative" size="sm"
                @click="removeDetail(props.row.class_id)">
                <q-tooltip>Hapus kelas dari jadwal</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>

        <div v-if="localDetails.length === 0" class="text-center text-grey-7 q-pa-md">
          <q-icon name="info" size="2rem" />
          <div class="q-mt-sm text-caption">Belum ada kelas terdaftar untuk jadwal ini.</div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-pb-md q-pr-md">
        <q-btn flat label="Batal" color="grey-7" v-close-popup />
        <q-btn color="primary" icon="save" label="Simpan Perubahan" :loading="submitting" @click="onSubmit" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { ExamScheduleService } from '@/services/admin/ExamScheduleService'
import { TeacherService } from '@/services/admin/TeacherService'
import { ClassService } from '@/services/admin/ClassService'
import { RoomService } from '@/services/admin/RoomService'
import {
  autoAssignPengawas,
  buildDetailsForRow,
  calcEndTime,
} from '@/utils/exam/scheduleHelpers'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  row: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const $q = useQuasar()
const submitting = ref(false)
const loadingRefs = ref(false)

const teachers = ref([])
const classes = ref([])
const rooms = ref([])

const form = ref({
  tanggal: '',
  jam_mulai: '',
  durasi_menit: 90,
  subject_nama: '',
  subject_kode: '',
  kelompok: 'WAJIB',
  jurusan_nama: null,
})

const localDetails = ref([])

const teacherOptions = computed(() =>
  teachers.value
    .filter((t) => t.status === 'AKTIF')
    .map((t) => ({ label: `${t.nama}${t.nip ? ` (${t.nip})` : ''}`, value: t.id })),
)

const ruangOptionsAll = computed(() =>
  rooms.value.map((r) => ({ label: r.nama, value: r.id })),
)

const endTime = computed(() => calcEndTime(form.value.jam_mulai, form.value.durasi_menit))

const detailColumns = [
  { name: 'class_nama', label: 'Kelas', field: 'class_nama', align: 'left', style: 'min-width: 140px' },
  { name: 'ruang', label: 'Ruang', field: 'ruang_id', align: 'left', style: 'min-width: 160px' },
  { name: 'pengawas1', label: 'Pengawas 1', field: 'pengawas1', align: 'left', style: 'min-width: 220px' },
  { name: 'pengawas2', label: 'Pengawas 2', field: 'pengawas2', align: 'left', style: 'min-width: 220px' },
  { name: 'aksi', label: '', align: 'center', style: 'width: 60px' },
]

const loadRefs = async () => {
  loadingRefs.value = true
  try {
    const [tRes, cRes, rRes] = await Promise.all([
      TeacherService.list(),
      ClassService.list(),
      RoomService.list(),
    ])
    teachers.value = tRes.data?.data || tRes.data || []
    classes.value = cRes.data?.data || cRes.data || []
    rooms.value = rRes.data?.data || rRes.data || []
  } catch (e) {
    console.error('[EditDialog] loadRefs failed', e)
    $q.notify({ type: 'negative', message: 'Gagal memuat data referensi' })
  } finally {
    loadingRefs.value = false
  }
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open && props.row) {
      form.value = {
        tanggal: props.row.tanggal || '',
        jam_mulai: props.row.jam_mulai || '',
        durasi_menit: props.row.durasi_menit || 90,
        subject_nama: props.row.subject_nama || '',
        subject_kode: props.row.subject_kode || '',
        kelompok: props.row.kelompok || 'WAJIB',
        jurusan_nama: props.row.jurusan_nama || null,
      }
      await loadRefs()

      const existing = Array.isArray(props.row.details) ? props.row.details : []
      if (existing.length > 0) {
        localDetails.value = existing.map((d) => ({
          ...d,
          pengawas_ids: Array.isArray(d.pengawas_ids)
            ? [...d.pengawas_ids, null, null].slice(0, 2)
            : [null, null],
        }))
      } else {
        localDetails.value = buildDetailsForRow(
          { tingkat: props.row.tingkat, jurusan_id: props.row.jurusan_id },
          classes.value,
        )
      }
    }
  },
)

const autoAssignAll = () => {
  const activeTeachers = teachers.value.filter((t) => t.status === 'AKTIF')
  localDetails.value = autoAssignPengawas(localDetails.value, activeTeachers, 2)
}

const removeDetail = (classId) => {
  localDetails.value = localDetails.value.filter((d) => d.class_id !== classId)
}

const syncPengawasNama = () => {
  localDetails.value = localDetails.value.map((d) => {
    const ids = (d.pengawas_ids || []).filter(Boolean)
    const namas = ids
      .map((id) => teachers.value.find((t) => t.id === id)?.nama)
      .filter(Boolean)
    return { ...d, pengawas_ids: ids, pengawas_namas: namas }
  })
}

const onSubmit = async () => {
  if (!form.value.tanggal || !form.value.jam_mulai) {
    $q.notify({ type: 'warning', message: 'Tanggal & jam mulai wajib diisi' })
    return
  }
  syncPengawasNama()
  localDetails.value = localDetails.value.map((d) => {
    const r = rooms.value.find((x) => x.id === d.ruang_id)
    return { ...d, ruang_nama: r?.nama || d.ruang_nama || null }
  })

  submitting.value = true
  try {
    await ExamScheduleService.update(props.row.id, {
      tanggal: form.value.tanggal,
      jam_mulai: form.value.jam_mulai,
      durasi_menit: form.value.durasi_menit,
      details: localDetails.value,
    })
    $q.notify({ type: 'positive', message: 'Jadwal diperbarui' })
    emit('saved')
    emit('update:modelValue', false)
  } catch (e) {
    $q.notify({ type: 'negative', message: e?.message || 'Gagal memperbarui' })
  } finally {
    submitting.value = false
  }
}
</script>
