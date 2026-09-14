// src/stores/userStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/boot/axios'

export const useUserStore = defineStore('user', () => {
  const users = ref({ siswa: [], guru: [], admin: [] })
  const loading = ref(false)

  const getUsersByRole = (role) => users.value[role] || []

  async function fetchUsers(role) {
    loading.value = true
    try {
      const data = await api.get('/cbt/admin/users') //getUsers(role)
      users.value[role] = data
    } catch (err) {
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  // async function createUser(userData) {
  //   const newUser = await userApi.createUser(userData)
  //   users.value[userData.role].push(newUser)
  //   return newUser
  // }

  // async function updateUser(id, userData) {
  //   const updatedUser = await userApi.updateUser(id, userData)
  //   const role = userData.role
  //   const index = users.value[role].findIndex((u) => u.id === id)
  //   if (index !== -1) users.value[role][index] = updatedUser
  //   return updatedUser
  // }

  // async function deleteUser(id, role) {
  //   await userApi.deleteUser(id, role)
  //   const index = users.value[role].findIndex((u) => u.id === id)
  //   if (index !== -1) users.value[role].splice(index, 1)
  // }

  return { users, loading, getUsersByRole, fetchUsers } //createUser, updateUser, deleteUser }
})
