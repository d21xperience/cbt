// src/composables/useUserConfig.js
export function useUserConfig() {
  const kelasOptions = [
    '10 IPA 1',
    '10 IPA 2',
    '10 IPS 1',
    '11 IPA 1',
    '11 IPA 2',
    '11 IPS 1',
    '12 IPA 1',
    '12 IPA 2',
    '12 IPS 1',
  ]
  const mapelOptions = [
    'Matematika',
    'Fisika',
    'Kimia',
    'Biologi',
    'Bahasa Indonesia',
    'Bahasa Inggris',
    'Sejarah',
    'Geografi',
    'Ekonomi',
  ]

  const getColumns = (role) => {
    const base = [
      { name: 'nama', label: 'Nama', field: 'nama', align: 'left', sortable: true },
      { name: 'email', label: 'Email', field: 'email', align: 'left', sortable: true },
      { name: 'username', label: 'Username', field: 'username', align: 'left', sortable: true },
      { name: 'actions', label: 'Aksi', field: 'actions', align: 'center' },
    ]

    if (role === 'siswa') {
      base.splice(
        3,
        0,
        { name: 'kelas', label: 'Kelas', field: 'kelas', align: 'left' },
        { name: 'nis', label: 'NIS', field: 'nis', align: 'left' },
      )
    } else if (role === 'guru') {
      base.splice(
        3,
        0,
        { name: 'nip', label: 'NIP', field: 'nip', align: 'left' },
        {
          name: 'mataPelajaran',
          label: 'Mapel',
          field: 'mataPelajaran',
          align: 'left',
          format: (val) => (Array.isArray(val) ? val.join(', ') : val),
        },
      )
    } else if (role === 'admin') {
      base.splice(3, 0, { name: 'level', label: 'Level', field: 'level', align: 'left' })
    }
    return base
  }

  const getFormRules = () => ({
    nama: [(val) => !!val || 'Nama harus diisi'],
    email: [
      (val) => !!val || 'Email harus diisi',
      (val) => /.+@.+\..+/.test(val) || 'Email tidak valid',
    ],
    username: [(val) => !!val || 'Username harus diisi'],
    password: [(val) => !!val || 'Password harus diisi'],
    confirmPassword: (pwd) => [(val) => val === pwd || 'Password tidak cocok'],
    kelas: [(val) => !!val || 'Kelas harus dipilih'],
  })

  return { kelasOptions, mapelOptions, getColumns, getFormRules }
}
