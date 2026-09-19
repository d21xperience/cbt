<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide" persistent>
    <q-card style="min-width: 520px; max-width: 95vw">
      <q-card-section class="bg-positive text-white">
        <div class="text-h6">
          <q-icon name="check_circle" size="sm" class="q-mr-xs" />
          Sekolah Berhasil Disetujui
        </div>
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <div class="text-body2 text-grey-7">
          <q-icon name="warning" color="orange" />
          Simpan informasi di bawah. <b>Password hanya ditampilkan sekali.</b>
        </div>

        <q-input :model-value="data.subdomain" label="Subdomain" readonly outlined dense>
          <template v-slot:append>
            <q-btn flat dense round icon="content_copy" @click="copy(data.subdomain)" />
          </template>
        </q-input>

        <q-input :model-value="data.admin_username" label="Admin Username" readonly outlined dense>
          <template v-slot:append>
            <q-btn flat dense round icon="content_copy" @click="copy(data.admin_username)" />
          </template>
        </q-input>

        <q-input :model-value="data.temp_password" label="Temp Password" readonly outlined dense class="bg-yellow-1">
          <template v-slot:append>
            <q-btn flat dense round icon="content_copy" color="primary" @click="copy(data.temp_password)" />
          </template>
        </q-input>

        <q-input v-if="data.login_url" :model-value="data.login_url" label="Login URL" readonly outlined dense>
          <template v-slot:append>
            <q-btn flat dense round icon="open_in_new" @click="openUrl(data.login_url)" />
          </template>
        </q-input>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Tutup" color="primary" @click="onDialogOK" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { useDialogPluginComponent, useQuasar } from 'quasar'

defineProps({
  data: { type: Object, required: true },
})

defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
const $q = useQuasar()

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(String(text ?? ''))
    $q.notify({ type: 'positive', message: 'Disalin ke clipboard', timeout: 1500 })
  } catch {
    $q.notify({ type: 'negative', message: 'Gagal menyalin' })
  }
}

const openUrl = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>
