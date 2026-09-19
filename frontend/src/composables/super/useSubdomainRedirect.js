// src/composables/super/useSubdomainRedirect.js

/**
 * Bangun URL subdomain tenant dari QCLI_APP_DOMAIN.
 * Return null jika env tidak diset.
 */
export function buildTenantUrl(subdomainSlug) {
  if (!subdomainSlug) return null
  const mainDomain = import.meta.env.QCLI_APP_DOMAIN
  if (!mainDomain) {
    console.error('[SubdomainRedirect] QCLI_APP_DOMAIN tidak diset')
    return null
  }
  const isLocal = mainDomain.includes('localhost') || mainDomain.includes('127.0.0.1')
  const protocol = isLocal ? 'http' : 'https'
  return `${protocol}://${subdomainSlug}.${mainDomain}`
}

export function useSubdomainRedirect() {
  /**
   * Buka halaman login tenant di tab baru.
   * - Dev (localhost): pakai query param ?tenant=<slug> di host yang sama.
   * - Prod: buka https://{slug}.{QCLI_APP_DOMAIN}/#/auth/participant
   */
  const redirectToTenant = (subdomainSlug) => {
    if (!subdomainSlug) return

    const hostname = window.location.hostname
    const port = window.location.port ? `:${window.location.port}` : ''
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1'

    if (isLocal) {
      const url = `http://${hostname}${port}/?tenant=${subdomainSlug}#/auth/participant`
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }

    const url = buildTenantUrl(subdomainSlug)
    if (!url) {
      return
    }
    window.open(`${url}/#/auth/participant`, '_blank', 'noopener,noreferrer')
  }

  return { redirectToTenant }
}
