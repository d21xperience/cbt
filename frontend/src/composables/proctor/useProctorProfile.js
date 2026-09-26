// src/composables/proctor/useProctorProfile.js
//
// Composable: Proctor profile (sub-role detection).
// Lazy load — fetch saat pertama dipanggil (cached untuk session).
// Shared state via module-level refs — hindari duplicate fetch dari AdminLayout + ProctorDashboard.
//
// Responsibility:
//   - state: profile, loading, error
//   - fetch sekali, cache
//   - computed: isHomeroomTeacher, homeroomClass, teachingSubjects
//
// BUKAN responsibility:
//   - business rule
//   - HTTP detail (delegasi ke ProctorProfileService)

import { ref, computed } from 'vue'
import { ProctorProfileService } from '@/services/proctor/ProctorProfileService'

// ── Module-level state (shared across component instances)
const profile = ref(null)
const loading = ref(false)
const loaded = ref(false)
const error = ref(null)

let inflight = null

async function fetchProfile(force = false) {
  if (loaded.value && !force) return profile.value
  if (inflight) return inflight

  loading.value = true
  error.value = null

  inflight = ProctorProfileService.getProfile()
    .then((res) => {
      const data = res?.data?.data || res?.data || null
      profile.value = data
      loaded.value = true
      return data
    })
    .catch((err) => {
      error.value = err?.message || 'Failed to load proctor profile'
      console.warn('[useProctorProfile] fetch failed:', err?.message)
      return null
    })
    .finally(() => {
      loading.value = false
      inflight = null
    })

  return inflight
}

export function useProctorProfile() {
  const isHomeroomTeacher = computed(() => !!profile.value?.is_homeroom_teacher)
  const homeroomClass = computed(() => profile.value?.homeroom_class || null)
  const teachingSubjects = computed(() =>
    Array.isArray(profile.value?.teaching_subjects) ? profile.value.teaching_subjects : [],
  )

  return {
    // state
    profile,
    loading,
    loaded,
    error,
    // computed
    isHomeroomTeacher,
    homeroomClass,
    teachingSubjects,
    // actions
    fetchProfile,
  }
}
