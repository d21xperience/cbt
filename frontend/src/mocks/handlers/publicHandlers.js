// src/mocks/handlers/publicHandlers.js
import { getPublicSchools, cloneMock } from '../data/onboardingData'

const DELAY = 300

export const publicHandlers = (mock) => {
  // GET /public/schools — TANPA auth, TANPA X-Tenant-Slug
  // Data derived dari mockSchoolTenant + mockSchoolProfiles — no duplication
  mock.onGet('/public/schools').reply(() => {
    const data = cloneMock(getPublicSchools())
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
