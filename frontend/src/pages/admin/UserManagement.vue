<!-- pages/UserManagementPage.vue -->
<template>
  <q-page class="q-pa-md">
    <div class="text-h5 q-mb-md">Manajemen Pengguna</div>

    <q-tabs v-model="tab" dense class="q-mb-md" align="left">
      <q-tab
        v-for="role in roles"
        :key="role"
        :name="role"
        :label="role.charAt(0).toUpperCase() + role.slice(1)"
      />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>
      <q-tab-panel v-for="role in roles" :key="role" :name="role" class="q-pa-none">
        <UserTable
          :role="role"
          :data="userStore.getUsersByRole(role)"
          :columns="getColumns(role)"
          @add="openForm(role, null)"
          @edit="openForm(role, $event)"
          @delete="confirmDelete(role, $event)"
        />
      </q-tab-panel>
    </q-tab-panels>

    <UserFormDialog
      v-model="formDialog"
      :role="currentRole"
      :user="selectedUser"
      :loading="submitting"
      @submit="handleSubmit"
      ref="formDialogRef"
    />

    <q-dialog v-model="deleteDialog" persistent>
      <q-card>
        <q-card-section class="text-h6">Konfirmasi Hapus</q-card-section>
        <q-card-section>Apakah Anda yakin ingin menghapus {{ deleteTarget?.nama }}?</q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Batal" color="negative" v-close-popup />
          <q-btn flat label="Hapus" color="primary" @click="handleDelete" :loading="deleting" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useUserStore } from '@/stores/admin/users'
import { useUserConfig } from '@/composables/admin/useUserConfig'
import UserTable from '@/components/ui/UserTable.vue'
import UserFormDialog from '@/components/ui/UserFormDialog.vue'

const $q = useQuasar()
const userStore = useUserStore()
const { getColumns } = useUserConfig()

const roles = ['siswa', 'guru', 'admin']
const tab = ref('siswa')

const formDialog = ref(false)
const currentRole = ref('siswa')
const selectedUser = ref(null)
const submitting = ref(false)
const formDialogRef = ref(null)

const deleteDialog = ref(false)
const deleteTarget = ref(null)
const deleteRole = ref('')
const deleting = ref(false)

onMounted(() => roles.forEach((role) => userStore.fetchUsers(role)))

function openForm(role, user) {
  currentRole.value = role
  selectedUser.value = user
  formDialog.value = true
}

async function handleSubmit(payload) {
  submitting.value = true
  try {
    if (payload.id) {
      await userStore.updateUser(payload.id, payload)
      $q.notify({ type: 'positive', message: 'Pengguna berhasil diupdate' })
    } else {
      await userStore.createUser(payload)
      $q.notify({ type: 'positive', message: 'Pengguna berhasil ditambahkan' })
    }
    formDialogRef.value.resetValidation()
    formDialog.value = false
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Terjadi kesalahan' })
  } finally {
    submitting.value = false
  }
}

function confirmDelete(role, user) {
  deleteRole.value = role
  deleteTarget.value = user
  deleteDialog.value = true
}

async function handleDelete() {
  deleting.value = true
  try {
    await userStore.deleteUser(deleteTarget.value.id, deleteRole.value)
    $q.notify({ type: 'positive', message: 'Pengguna berhasil dihapus' })
    deleteDialog.value = false
    // eslint-disable-next-line no-unused-vars
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Gagal menghapus' })
  } finally {
    deleting.value = false
  }
}
</script>
