// src/services/admin/ScheduleService.js
import { api } from '@/boot/axios'
import { ProgramKeahlianService } from './ProgramKeahlianService'

export const ScheduleService = {
  getSchedulesList() {
    return api.get('/admin/schedules-list')
  },

  /**
   * Program keahlian assigned ke tenant.
   *
   * VER-007 Extension: endpoint resmi = /admin/programs
   * (sebelumnya asumsi /admin/majors — DIKOREKSI).
   *
   * Method name `getMajors` dipertahankan untuk backward-compat;
   * akan di-rename ke `getAssignedPrograms` di Fase 3.
   */
  getMajors() {
    return ProgramKeahlianService.getAssignedPrograms()
  },

  getSubjectsForForm() {
    return api.get('/admin/all-subjects-form')
  },

  saveMassalSchedules({ grade, major, schedules }) {
    return api.post('/admin/schedules-massal', { grade, major, schedules })
  },
}
