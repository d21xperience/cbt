export const getTenantSlug = () => {
  const hostname = window.location.hostname
  // Jika di lokal development (localhost atau IP lokal)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const urlParams = new URLSearchParams(window.location.search)
    // Mengambil dari ?tenant=nama_sekolah.
    return urlParams.get('tenant')
  }

  // Jika di production (cth: smkn1kawali.ulangan.co.id)
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    return parts[0] // Mengambil 'smkn1kawali'
  }

  return 'default'
}
