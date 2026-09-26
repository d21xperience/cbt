// src/mocks/data/proctorProfileData.js
// Mock profile proctor — CR-004 draft.

export const mockProctorProfile = {
  user_id: 'teacher-uuid-001',
  name: 'Pak Ahmad',
  is_homeroom_teacher: true, // ubah ke false untuk test guru mapel
  homeroom_class: {
    id: 'cls-10-ipa-1',
    name: '10 IPA 1',
  },
  teaching_subjects: [
    { id: 'mtk', name: 'Matematika', classes: ['10 IPA 1', '11 IPA 2'] },
    { id: 'fis', name: 'Fisika', classes: ['10 IPA 1'] },
  ],
  assigned_sessions: ['sess-001', 'sess-002'],
}
