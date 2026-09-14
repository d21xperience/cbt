// src/composables/useSubdomainRedirect.js
export function useSubdomainRedirect() {
  /**
   * Redirect ke subdomain tenant (baik di development maupun production)
   * @param {string} subdomainSlug - Slug tenant (contoh: 'smkn-kawali')
   */
  const redirectToTenant = (subdomainSlug) => {
    const currentHostname = window.location.hostname
    const currentPort = window.location.port ? `:${window.location.port}` : ''

    // Skenario Development (localhost / 127.0.0.1)
    if (currentHostname === 'localhost' || currentHostname === '127.0.0.1') {
      // Gunakan query param ?tenant= untuk simulasi
      window.location.href = `http://${currentHostname}${currentPort}/?tenant=${subdomainSlug}#/auth/participant`
      return
    }

    // Skenario Production (domain nyata)
    // Pisahkan domain utama (buang subdomain lama jika ada)
    const domainParts = currentHostname.split('.')
    // Jika ada minimal 3 bagian (subdomain.domain.tld), ambil 2 bagian terakhir sebagai root domain
    const rootDomain = domainParts.length >= 3 ? domainParts.slice(1).join('.') : currentHostname

    // Redirect ke subdomain baru
    window.location.href = `https://${subdomainSlug}.${rootDomain}/#/auth/participant`
  }

  return {
    redirectToTenant,
  }
}
