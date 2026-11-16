<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 640px; max-width: 95vw">
      <q-card-section class="bg-primary text-white row items-center">
        <div class="text-h6">{{ isEditing ? 'Edit Guru' : 'Tambah Guru' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="q-gutter-md q-pt-md">
        <!-- Identitas -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center">
          <q-icon name="badge" size="xs" class="q-mr-xs" /> Identitas
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-4">
            <q-input v-model="localForm.nip" label="NIP" outlined dense />
          </div>
          <div class="col-12 col-sm-8">
            <q-input v-model="localForm.nama" label="Nama Lengkap" outlined dense
              :rules="[(v) => !!v || 'Nama wajib diisi']" />
          </div>
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-input v-model="localForm.email" type="email" label="Email" outlined dense />
          </div>
          <div class="col-12 col-sm-6">
            <q-select v-model="localForm.status" :options="statusOptions" label="Status" outlined dense emit-value
              map-options />
          </div>
        </div>

        <!-- Akun Login -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center q-mt-sm">
          <q-icon name="login" size="xs" class="q-mr-xs" /> Akun Login
        </div>

        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-input v-model="localForm.username" label="Username" outlined dense
              :rules="[(v) => !!v || 'Username wajib diisi']" />
          </div>
          <div class="col-12 col-sm-6">
            <q-input v-model="localForm.password" :type="showPwd ? 'text' : 'password'"
              :label="isEditing ? 'Password Baru (opsional)' : 'Password'" outlined dense
              :rules="isEditing ? [] : [(v) => !!v || 'Password wajib']">
              <template v-slot:append>
                <q-icon :name="showPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer"
                  @click="showPwd = !showPwd" />
              </template>
            </q-input>
          </div>
        </div>

        <!-- Mata Pelajaran Diampu -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center q-mt-sm">
          <q-icon name="menu_book" size="xs" class="q-mr-xs" /> Mata Pelajaran Diampu
        </div>

        <q-select v-model="localForm.teaching_subject_ids" :options="subjectOptions" label="Pilih Mapel (multi)"
          outlined dense multiple use-chips emit-value map-options hint="Pilih satu atau lebih mapel yang diampu" />

        <!-- Wali Kelas -->
        <div class="text-subtitle2 text-weight-bold text-primary row items-center q-mt-sm">
          <q-icon name="supervisor_account" size="xs" class="q-mr-xs" /> Wali Kelas
        </div>

        <q-toggle v-model="localForm.is_homeroom" label="Guru ini menjabat sebagai Wali Kelas" color="primary"
          @update:model-value="onHomeroomToggle" />

        <q-select v-if="localForm.is_homeroom" v-model="localForm.homeroom_class_id" :options="classOptions"
          label="Kelas Binaan" outlined dense emit-value map-options clearable
          :rules="[(v) => !!v || 'Kelas wajib dipilih jika wali kelas']" />
      </q-card-section>

      <q-card-actions align="right" class="q-pb-md q-pr-md">
        <q-btn flat label="Batal" color="grey-7" v-close-popup />
        <q-btn color="primary" :label="isEditing ? 'Simpan Perubahan' : 'Simpan'" :loading="submitting"
          :disable="!canSubmitInternal" @click="onSubmit" />
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
  statusOptions: { type: Array, default: () => [] },
  subjectOptions: { type: Array, default: () => [] },
  classOptions: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const EMPTY = {
  nip: '',
  nama: '',
  email: '',
  username: '',
  password: '',
  status: 'AKTIF',
  teaching_subject_ids: [],
  is_homeroom: false,
  homeroom_class_id: null,
}

const isOpen = ref(false)
const localForm = reactive({ ...EMPTY })
const originalSnapshot = ref(null)
const showPwd = ref(false)

watch(
  () => props.modelValue,
  (val) => {
    isOpen.value = val
    if (val) {
      Object.keys(EMPTY).forEach((k) => {
        const v = props.initialForm?.[k]
        localForm[k] = Array.isArray(v) ? [...v] : (v ?? EMPTY[k])
      })
      originalSnapshot.value = props.isEditing ? JSON.stringify({ ...localForm }) : null
      showPwd.value = false
    }
  },
)
watch(isOpen, (val) => emit('update:modelValue', val))

const isDirty = computed(() => {
  if (!originalSnapshot.value) return true
  return JSON.stringify({ ...localForm }) !== originalSnapshot.value
})

const canSubmitInternal = computed(() => {
  if (!localForm.nama?.trim()) return false
  if (!localForm.username?.trim()) return false
  if (!props.isEditing && !localForm.password?.trim()) return false
  if (localForm.is_homeroom && !localForm.homeroom_class_id) return false
  if (props.isEditing && !isDirty.value) return false
  return true
})

const onHomeroomToggle = (val) => {
  if (!val) localForm.homeroom_class_id = null
}

const onSubmit = () => emit('submit', { ...localForm })
</script>
