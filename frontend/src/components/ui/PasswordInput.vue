<!-- src/components/PasswordInput.vue -->
<template>
  <!-- Menghubungkan value internal dengan modelValue dari parent -->
  <q-input
    v-model="model"
    :type="isPassword ? 'password' : 'text'"
    :label="label"
    :rules="rules"
    outlined
    stack-label
  >
    <template v-slot:prepend><q-icon :name="icon" /></template>
    <template v-slot:append>
      <q-icon
        :name="isPassword ? 'visibility_off' : 'visibility'"
        class="cursor-pointer"
        @click="isPassword = !isPassword"
      />
    </template>
  </q-input>
</template>

<script setup>
import { ref } from 'vue'

// Mendefinisikan properti yang bisa dikustomisasi dari luar
defineProps({
  label: {
    type: String,
    default: 'Password',
  },
  rules: {
    type: Array,
    default: () => [],
  },
  icon: {
    type: String,
    default: 'lock',
  },
})

// Fitur bawaan Vue 3.4+ untuk otomatisasi Two-Way Data Binding v-model
const model = defineModel({ type: String, default: '' })

// Status visibilitas mata password privat milik komponen ini sendiri
const isPassword = ref(true)
</script>
