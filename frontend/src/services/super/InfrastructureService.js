// src/services/super/InfrastructureService.js
// Adapter HTTP untuk monitoring infrastruktur super admin.
//
// VER-013 PENDING (draft): path provisional `/super/infra/*`
// 3 resource: vps, domains, tls

import { api } from '@/boot/axios'

const RESOURCE_PATHS = {
  vps: '/super/infra/vps',
  domains: '/super/infra/domains',
  tls: '/super/infra/tls',
}

export const InfrastructureService = {
  list(resource) {
    return api.get(RESOURCE_PATHS[resource])
  },
  create(resource, payload) {
    return api.post(RESOURCE_PATHS[resource], payload)
  },
  update(resource, id, payload) {
    return api.put(`${RESOURCE_PATHS[resource]}/${id}`, payload)
  },
  remove(resource, id) {
    return api.delete(`${RESOURCE_PATHS[resource]}/${id}`)
  },
}
