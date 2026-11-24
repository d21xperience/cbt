<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 600px; max-width: 95vw">
      <q-card-section class="bg-primary text-white row items-center">
        <div class="text-h6">
          {{ isEditing ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran' }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-pt-md">
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-4">
            <q-input
              v-model="localForm.nama_singkat"
              @update:model-value="(val) => (localForm.nama_singkat = val ? val.toUpperCase() : '')"
              label="Nama Singkat"
              outlined
              dense
              maxlength="6"
              :rules="[(v) => !!v || 'Nama singkat wajib diisi']"
              hint="Contoh: MTK, B.IND"
            />
          </div>
          <div class="col-12 col-sm-8">
            <q-input
              v-model="localForm.nama"
              @update:model-value="(val) => (localForm.nama = toTitleCase(val))"
              label="Nama Mata Pelajaran"
              outlined
              dense
              input-class="text-capitalize"
              :rules="[(v) => !!v || 'Nama wajib diisi']"
            />
          </div>
        </div>
        <div class="row q-col-gutter-sm q-mt-sm">
          <q-select
            class="col-12 col-sm-6"
            v-model="localForm.tingkat"
            :options="tingkatOptions"
            label="Tingkat"
            outlined
            dense
            emit-value
            map-options
            :rules="[(v) => !!v || 'Tingkat wajib']"
          />
          <q-select
            class="col-12 col-sm-6"
            v-model="localForm.kelompok"
            :options="kelompokOptions"
            label="Kelompok"
            outlined
            dense
            emit-value
            map-options
            :rules="[(v) => !!v || 'Kelompok wajib']"
            @update:model-value="onKelompokChange"
          />
        </div>

        <div v-if="localForm.kelompok === 'KEJURUAN'" class="col-12 col-sm-6">
          <q-select
            v-model="localForm.jurusan_id"
            :options="jurusanOptions"
            label="Jurusan (Program Keahlian)"
            outlined
            dense
            emit-value
            map-options
            use-input
            input-debounce="200"
            :loading="loadingContext"
            :disable="loadingContext || jurusanOptions.length === 0"
            :rules="[(v) => !!v || 'Jurusan wajib untuk mapel kejuruan']"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">
                  <div class="text-caption">
                    <q-icon name="warning" color="orange" size="xs" class="q-mr-xs" />
                    Belum ada program keahlian untuk sekolah ini.
                  </div>
                  <div class="text-caption text-grey-6 q-mt-xs">
                    Hubungi Super Admin untuk assign program keahlian ke sekolah Anda.
                  </div>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-banner
            v-if="!loadingContext && jurusanOptions.length === 0"
            dense
            rounded
            class="bg-orange-1 text-orange-9 q-mt-sm"
          >
            <template v-slot:avatar>
              <q-icon name="info" color="orange" />
            </template>
            <div class="text-caption">
              Belum ada program keahlian. Minta Super Admin assign di
              <b>/super/schools</b> → Tab Program Keahlian.
            </div>
          </q-banner>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-pb-md q-pr-md">
        <q-btn flat label="Batal" color="grey-7" v-close-popup />
        <q-btn
          color="primary"
          :label="isEditing ? 'Simpan Perubahan' : 'Simpan'"
          :loading="submitting"
          :disable="!canSubmitInternal"
          @click="onSubmit"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  isEditing: Boolean,
  initialForm: { type: Object, default: () => ({}) },
  submitting: Boolean,
  kelompokOptions: { type: Array, default: () => [] },
  tingkatOptions: { type: Array, default: () => [] },
  jurusanOptions: { type: Array, default: () => [] },
  loadingContext: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'submit'])

const EMPTY = {
  kode: '',
  nama: '',
  nama_singkat: '',
  kelompok: 'WAJIB',
  tingkat: '',
  jurusan_id: null,
}

const isOpen = ref(false)
const localForm = reactive({ ...EMPTY })
const originalSnapshot = ref(null)

watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val
    if (val) {
      Object.keys(EMPTY).forEach((k) => {
        localForm[k] = props.initialForm?.[k] ?? EMPTY[k]
      })
      originalSnapshot.value = props.isEditing ? JSON.stringify({ ...localForm }) : null
    }
  },
)
watch(isOpen, (val) => emit('update:modelValue', val))

const isDirty = computed(() => {
  if (!originalSnapshot.value) return true
  return JSON.stringify({ ...localForm }) !== originalSnapshot.value
})

const canSubmitInternal = computed(() => {
  // if (!localForm.kode?.trim()) return false
  if (!localForm.nama?.trim()) return false
  if (!localForm.nama_singkat?.trim()) return false
  if (!localForm.tingkat) return false
  if (localForm.kelompok === 'KEJURUAN' && !localForm.jurusan_id) return false
  if (props.isEditing && !isDirty.value) return false
  return true
})

const onKelompokChange = (val) => {
  if (val !== 'KEJURUAN') localForm.jurusan_id = null
}

const onSubmit = () => {
  localForm.kode = `${localForm.nama_singkat}-${localForm.tingkat} `
  emit('submit', { ...localForm })
}

const toTitleCase = (str) => {
  if (!str) return ''
  return str.replace(/\b\w/g, (char) => char.toUpperCase())
}
</script>
