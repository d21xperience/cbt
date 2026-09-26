<template>
  <q-dialog v-model="isOpen">
    <q-card style="min-width: 320px; max-width: 95vw">
      <q-card-section class="bg-primary text-white row items-center">
        <div class="text-h6">
          <q-icon name="translate" class="q-mr-xs" />
          Pilih Aksara / Script
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-list separator>
        <q-item v-for="script in scripts" :key="script.id" clickable v-ripple @click="onPick(script)">
          <q-item-section avatar>
            <q-icon :name="script.icon" color="primary" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ script.name }}</q-item-label>
            <q-item-label caption>{{ script.dir.toUpperCase() }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon name="arrow_forward" color="grey-6" />
          </q-item-section>
        </q-item>
      </q-list>

      <q-card-section class="bg-grey-1">
        <div class="text-caption text-grey-7">
          <q-icon name="info" size="xs" class="q-mr-xs" />
          Setelah dipilih, ketik di dalam area editor. Arab otomatis RTL.
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useScriptPicker } from '@/composables/admin/useScriptPicker'

const props = defineProps({
  modelValue: Boolean,
})
const emit = defineEmits(['update:modelValue', 'pick'])

const { SCRIPTS } = useScriptPicker()
const scripts = SCRIPTS

const isOpen = ref(false)
watch(() => props.modelValue, (v) => { isOpen.value = v })
watch(isOpen, (v) => emit('update:modelValue', v))

const onPick = (script) => {
  emit('pick', script)
  isOpen.value = false
}
</script>
