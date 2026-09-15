<!-- components/UserFormDialog.vue -->
<template>
  <q-dialog v-model="dialogModel" persistent>
    <q-card style="min-width: 500px">
      <q-card-section>
        <div class="text-h6">{{ isEdit ? 'Edit' : 'Tambah' }} {{ roleLabel }}</div>
      </q-card-section>
      <q-card-section>
        <q-form ref="formRef" @submit="onSubmit" class="q-gutter-md">
          <q-input
            v-model="form.nama"
            label="Nama Lengkap"
            lazy-rules
            :rules="rules.nama"
            outlined
          />
          <q-input
            v-model="form.email"
            label="Email"
            type="email"
            lazy-rules
            :rules="rules.email"
            outlined
          />
          <q-input
            v-model="form.username"
            label="Username"
            lazy-rules
            :rules="rules.username"
            outlined
          />

          <template v-if="!isEdit">
            <q-input
              v-model="form.password"
              label="Password"
              type="password"
              lazy-rules
              :rules="rules.password"
              outlined
            />
            <q-input
              v-model="form.confirmPassword"
              label="Konfirmasi Password"
              type="password"
              lazy-rules
              :rules="rules.confirmPassword(form.password)"
              outlined
            />
          </template>

          <template v-if="role === 'siswa'">
            <q-select
              v-model="form.kelas"
              :options="kelasOptions"
              label="Kelas"
              outlined
              :rules="rules.kelas"
            />
            <q-input v-model="form.nis" label="NIS" outlined />
          </template>

          <template v-if="role === 'guru'">
            <q-input v-model="form.nip" label="NIP" outlined />
            <q-select
              v-model="form.mataPelajaran"
              :options="mapelOptions"
              label="Mata Pelajaran"
              multiple
              outlined
              use-chips
            />
          </template>

          <template v-if="role === 'admin'">
            <q-input v-model="form.level" label="Level Admin" outlined />
          </template>
        </q-form>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Batal" color="negative" v-close-popup />
        <q-btn flat label="Simpan" color="primary" type="submit" :loading="loading" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useUserConfig } from '@/composables/admin/useUserConfig'

const props = defineProps({ modelValue: Boolean, role: String, user: Object, loading: Boolean })
const emit = defineEmits(['update:modelValue', 'submit'])

const { kelasOptions, mapelOptions, getFormRules } = useUserConfig()
const formRef = ref(null)
const rules = getFormRules()

const dialogModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})
const isEdit = computed(() => !!props.user)
const roleLabel = computed(() => props.role.charAt(0).toUpperCase() + props.role.slice(1))

const getDefaultForm = () => ({
  nama: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  kelas: null,
  nis: '',
  nip: '',
  mataPelajaran: [],
  level: '',
})
const form = ref(getDefaultForm())

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen)
      form.value = props.user
        ? { ...getDefaultForm(), ...props.user, password: '', confirmPassword: '' }
        : getDefaultForm()
  },
)

function onSubmit() {
  formRef.value.validate().then((success) => {
    if (success) {
      const payload = { ...form.value, role: props.role }
      if (isEdit.value) payload.id = props.user.id
      emit('submit', payload)
    }
  })
}

defineExpose({ resetValidation: () => formRef.value?.resetValidation() })
</script>
