// src/mocks/data/schoolProfileData.js
// Mock Profil Sekolah — multi-tenant (Batch multi-jenjang).

export const mockSchoolProfiles = {
  // ── SMK (existing)
  smkpasja: {
    nss: '402021015029',
    kode_sekolah: 'SMKPASJA',
    alamat_jalan: 'Jalan Kolonel Ahmad Syam Jatinangor',
    alamat_desa: 'Cikeruh',
    alamat_kecamatan: 'Kec. Jatinangor',
    alamat_kabupaten: 'Kab. Sumedang',
    alamat_provinsi: 'Prov. Jawa Barat',
    alamat_kode_pos: '45363',
    telp: '0227782242',
    email: 'smkspasundanjatinangor@gmail.com',
    website: 'http://smkpasundanjatinangor.sch.id',
    kepala_sekolah_nama: 'Nunung Kurnia S.T, M.Pd',
    kepala_sekolah_nip: '-',
    logo_url: '',
  },

  smknkawali: {
    nss: '402021015030',
    kode_sekolah: 'SMKNKAWALI',
    alamat_jalan: 'Jalan Raya Kawali',
    alamat_desa: 'Kawali',
    alamat_kecamatan: 'Kec. Kawali',
    alamat_kabupaten: 'Kab. Ciamis',
    alamat_provinsi: 'Prov. Jawa Barat',
    alamat_kode_pos: '46253',
    telp: '0265-123456',
    email: 'info@smknkawali.sch.id',
    website: 'http://smknkawali.sch.id',
    kepala_sekolah_nama: 'Dr. H. Ahmad, M.Pd',
    kepala_sekolah_nip: '-',
    logo_url: 'https://fathschool.smkn1kawali.sch.id/uploads/images/1772244774_69a24f267028d.png',
  },

  // ── MTs (existing)
  mtsmaarifjtr: {
    nss: '402021015031',
    kode_sekolah: 'MTSMAARIF',
    alamat_jalan: 'Jalan Raya Jatinangor',
    alamat_desa: 'Cibeusi',
    alamat_kecamatan: 'Kec. Jatinangor',
    alamat_kabupaten: 'Kab. Sumedang',
    alamat_provinsi: 'Prov. Jawa Barat',
    alamat_kode_pos: '45363',
    telp: '022-123456',
    email: 'info@mtsmaarifjtr.sch.id',
    website: '-',
    kepala_sekolah_nama: 'H. Ade Faturohman, M.Pd.I',
    kepala_sekolah_nip: '-',
    logo_url: 'https://www.mtssdlingo.sch.id/style/img/logo_wa.png',
  },

  // ── SMP (BARU)
  smpn1jatinangor: {
    nss: '402021015040',
    kode_sekolah: 'SMPN1JTR',
    alamat_jalan: 'Jalan Raya Jatinangor No. 100',
    alamat_desa: 'Sayang',
    alamat_kecamatan: 'Kec. Jatinangor',
    alamat_kabupaten: 'Kab. Sumedang',
    alamat_provinsi: 'Prov. Jawa Barat',
    alamat_kode_pos: '45363',
    telp: '022-7788001',
    email: 'info@smpn1jatinangor.sch.id',
    website: 'http://smpn1jatinangor.sch.id',
    kepala_sekolah_nama: 'Dra. Siti Nurlela, M.Pd',
    kepala_sekolah_nip: '-',
    logo_url:
      'https://yt3.googleusercontent.com/shtalb7Vsdvv9mzC3iaXzcGaN2MKwk4IkJ63zQWpZF9VW0-5ujoDDME46TZapUFpm6e3ueEL2g=s900-c-k-c0x00ffffff-no-rj',
  },

  // ── SMA (BARU)
  sman1cirebon: {
    nss: '402021015041',
    kode_sekolah: 'SMAN1CRB',
    alamat_jalan: 'Jalan Wahidin Sudirohusodo No. 2',
    alamat_desa: 'Kebonbaru',
    alamat_kecamatan: 'Kec. Kejaksan',
    alamat_kabupaten: 'Kota Cirebon',
    alamat_provinsi: 'Prov. Jawa Barat',
    alamat_kode_pos: '45123',
    telp: '0231-200001',
    email: 'info@sman1cirebon.sch.id',
    website: 'http://sman1cirebon.sch.id',
    kepala_sekolah_nama: 'Drs. Bambang Sutrisno, M.Pd',
    kepala_sekolah_nip: '-',
    logo_url:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhtV8d5REQGNNq-DzlD52d5bPzx3mcyFOrPAh3goAzvg&s=10',
  },
}

// Alias untuk backward-compat
export const mockSchoolProfile = mockSchoolProfiles.smkpasja
