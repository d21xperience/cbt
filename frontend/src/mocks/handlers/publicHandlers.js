// src/mocks/handlers/publicHandlers.js
import { mockPublicSchools, cloneMock } from '../data/onboardingData'

const DELAY = 300

export const publicHandlers = (mock) => {
  // GET /public/schools — TANPA auth, TANPA X-Tenant-Slug
  // Response: { status, count, data: [{subdomain, school_name, npsn, logo_url}] }
  mock.onGet('/public/schools').reply(() => {
    const data = cloneMock(mockPublicSchools)
    return [
      200,
      {
        status: 'ok',
        count: data.length,
        data,
      },
      { delay: DELAY },
    ]
  })
}
