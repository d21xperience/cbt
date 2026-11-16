// src/mocks/data/usersData.js
// User management data (siswa, guru, admin) — dipakai stateStore → getUsers().

export const mockUserData = {
  siswa: [
    {
      id: 1,
      nama: 'Ahmad Faizal',
      email: 'ahmad@example.com',
      username: 'ahmad',
      role: 'siswa',
      kelas: '12 IPA 1',
      nis: '12345',
    },
    {
      id: 2,
      nama: 'Siti Nurhaliza',
      email: 'siti@example.com',
      username: 'siti',
      role: 'siswa',
      kelas: '11 IPS 2',
      nis: '12346',
    },
  ],
  guru: [
    {
      id: 3,
      nama: 'Budi Santoso',
      email: 'budi@example.com',
      username: 'budi',
      role: 'guru',
      nip: '98765',
      mataPelajaran: ['Matematika', 'Fisika'],
    },
    {
      id: 4,
      nama: 'Dewi Lestari',
      email: 'dewi@example.com',
      username: 'dewi',
      role: 'guru',
      nip: '98766',
      mataPelajaran: ['Bahasa Inggris'],
    },
  ],
  admin: [
    {
      id: 5,
      nama: 'Admin Utama',
      email: 'admin@example.com',
      username: 'admin',
      role: 'admin',
      level: 'super',
    },
  ],
}
