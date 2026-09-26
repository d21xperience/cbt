// src/services/admin/SchoolProfileService.js
// Adapter HTTP untuk Profil Sekolah.
//
// CR-M1 DRAFT: GET/PUT /admin/school-profile
// Backend status: NOT READY — mock-first.

import { api } from '@/boot/axios'

export const SchoolProfileService = {
  getProfile() {
    return api.get('/admin/school-profile')
  },
  updateProfile(payload) {
    return api.put('/admin/school-profile', payload)
  },
}
