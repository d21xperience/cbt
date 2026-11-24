import { api } from '@/boot/axios'

export const SuperSchoolService = {
  resetAdminPassword(tenantId, username, newPassword) {
    console.log('tenant id', tenantId)
    console.log('username', username)
    console.log('newPassword', newPassword)

    // Prefix /super ditambahkan sesuai grup platformPub di backend
    return api.post(`/super/schools/${tenantId}/admin/reset-password`, {
      username: username,
      new_password: newPassword,
    })
  },
}
