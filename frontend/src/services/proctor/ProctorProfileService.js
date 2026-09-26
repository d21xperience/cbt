// src/services/proctor/ProctorProfileService.js
// Adapter HTTP untuk profile proctor (sub-role detection).
// CR-004 DRAFT: GET /proctor/profile
//
// Response: { user_id, name, is_homeroom_teacher, homeroom_class, teaching_subjects, assigned_sessions }

import { api } from '@/boot/axios'

export const ProctorProfileService = {
  getProfile() {
    return api.get('/proctor/profile')
  },
}
