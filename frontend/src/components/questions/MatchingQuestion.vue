<!-- src/components/questions/MatchingQuestion.vue -->
<template>
  <div class="matching-question">
    <div
      v-for="(pair, idx) in pairs"
      :key="pair.id"
      class="match-row"
      :class="{ 'match-row--answered': !!modelValue[pair.id] }"
    >
      <div class="match-row-header">
        <div class="match-row-number">{{ idx + 1 }}</div>
        <MathText :content="pair.left" class="match-row-premis" />
      </div>

      <div class="match-row-body">
        <q-icon name="arrow_forward" color="grey-6" size="18px" class="match-row-arrow" />
        <q-select
          :model-value="modelValue[pair.id] || null"
          :options="rightOptions"
          option-value="id"
          option-label="text"
          emit-value
          map-options
          outlined
          dense
          clearable
          label="Pilih pasangan..."
          class="match-row-select bg-white"
          popup-content-class="match-row-popup"
          @update:model-value="(v) => select(pair.id, v)"
        >
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section>
                <MathText :content="scope.opt.text" />
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </div>
    </div>

    <div v-if="pairs.length === 0" class="text-caption text-grey-6 text-center q-pa-md">
      Tidak ada pasangan untuk dijodohkan.
    </div>

    <div v-else class="text-caption text-grey-7 q-mt-xs">
      <q-icon name="info" size="xs" />
      {{ answeredCount }} / {{ pairs.length }} terjawab.
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import MathText from '@/components/ui/MathText.vue'

const props = defineProps({
  question: { type: Object, required: true },
  modelValue: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue'])

const pairs = computed(() => {
  const raw = props.question.pairs
  if (!raw) return []
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return []
    }
  }
  return raw
})

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Scramble once at setup (avoid re-shuffle saat reactive)
const rightOptions = ref(
  shuffle((props.question.pairs || []).map((p) => ({ id: p.id, text: p.right }))),
)

const answeredCount = computed(() => Object.values(props.modelValue).filter((v) => !!v).length)

const select = (premisId, rightId) => {
  const next = { ...props.modelValue }
  if (!rightId) {
    delete next[premisId]
  } else {
    next[premisId] = rightId
  }
  emit('update:modelValue', next)
}
</script>

<style scoped>
.matching-question {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.match-row {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #fff;
  padding: 12px 14px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.match-row:hover {
  border-color: #90caf9;
}

.match-row--answered {
  border-color: #a5d6a7;
  background: #fafffa;
}

.match-row-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 10px;
}

.match-row-number {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #e3f2fd;
  color: #1565c0;
  font-size: 0.8rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.match-row-premis {
  flex: 1;
  --math-text-size: clamp(0.95rem, 2.6vw, 1.05rem);
  line-height: 1.5;
}

.match-row-body {
  display: flex;
  align-items: center;
  gap: 8px;
}

.match-row-arrow {
  flex-shrink: 0;
}

.match-row-select {
  flex: 1;
}

.match-row-select :deep(.q-field__control) {
  min-height: 44px;
}

@media (max-width: 599px) {
  .match-row-select :deep(.q-field__control) {
    min-height: 48px;
  }
}
</style>
