<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="width: 720px; max-width: 95vw">
      <q-card-section class="bg-primary text-white row items-center">
        <div class="text-h6">
          <q-icon name="functions" class="q-mr-xs" />
          Pilih Simbol Matematika
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section style="max-height: 60vh; overflow-y: auto">
        <q-tabs v-model="tab" dense align="left" class="text-primary q-mb-md">
          <q-tab v-for="cat in categories" :key="cat.name" :name="cat.name" :icon="cat.icon" :label="cat.name" />
        </q-tabs>

        <q-tab-panels v-model="tab" animated>
          <q-tab-panel v-for="cat in categories" :key="cat.name" :name="cat.name" class="q-pa-none">
            <div class="row q-col-gutter-sm">
              <div v-for="key in cat.keys" :key="key" class="col-6 col-sm-4 col-md-3">
                <q-btn outline color="primary" no-caps class="full-width q-pa-md symbol-btn" @click="onPick(key)">
                  <div class="column items-center">
                    <div class="text-caption text-grey-6">{{ snippets[key].label }}</div>
                    <div class="text-body2 q-mt-xs math-preview" v-html="renderPreview(key)" />
                  </div>
                </q-btn>
              </div>
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Tutup" color="grey-7" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import katex from 'katex'
import { useMathToolbar } from '@/composables/admin/useMathToolbar'

const props = defineProps({
  modelValue: Boolean,
})
const emit = defineEmits(['update:modelValue', 'pick'])

const { SNIPPETS, CATEGORIES } = useMathToolbar()

const isOpen = ref(false)
const tab = ref(CATEGORIES[0].name)
const snippets = SNIPPETS
const categories = CATEGORIES

watch(() => props.modelValue, (v) => { isOpen.value = v })
watch(isOpen, (v) => emit('update:modelValue', v))

const renderPreview = (key) => {
  const snippet = SNIPPETS[key]
  if (!snippet) return '?'
  try {
    return katex.renderToString(snippet.insert, {
      throwOnError: false,
      displayMode: false,
    })
  } catch {
    return `<code>${snippet.insert}</code>`
  }
}

const onPick = (key) => {
  emit('pick', key)
}
</script>

<style scoped>
.symbol-btn {
  min-height: 72px;
  padding: 8px;
}

.symbol-btn :deep(.q-btn__content) {
  display: block;
  width: 100%;
}

.math-preview {
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
