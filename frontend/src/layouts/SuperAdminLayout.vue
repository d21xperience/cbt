<template>
  <q-layout view="lHh Lpr lFf" class="bg-grey-1">
    <!-- Header Utama -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title class="text-weight-bold">
          CBT Engine <span class="text-subtitle2 text-weight-light">| Superadmin Panel</span>
        </q-toolbar-title>

        <!-- Informasi Sesi Server & User -->
        <div class="row items-center q-gutter-sm">
          <q-chip dense color="indigo-9" text-color="white" icon="cloud" class="gt-xs">
            VPS 2GB Mode
          </q-chip>
          <q-btn-dropdown flat no-caps icon="account_circle" :label="adminName">
            <q-list style="min-width: 150px">
              <q-item clickable v-close-popup @click="handleLogout">
                <q-item-section avatar>
                  <q-icon name="logout" color="negative" />
                </q-item-section>
                <q-item-section class="text-negative text-weight-medium">Keluar</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </div>
      </q-toolbar>
    </q-header>

    <!-- Sidebar Navigasi -->
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered class="bg-white" :width="260">
      <q-scroll-area class="fit">
        <!-- Banner Profil Ringkas -->
        <div class="q-pa-md bg-grey-2 text-center border-bottom">
          <q-avatar size="60px" class="bg-primary text-white q-mb-sm">
            SA
          </q-avatar>
          <div class="text-weight-bold text-grey-9">Utama Superadmin</div>
          <div class="text-caption text-primary text-weight-medium">Akses Tingkat Sistem</div>
        </div>

        <!-- Menu List Navigasi -->
        <q-list padding class="q-mt-sm">
          <q-item-label header class="text-weight-bold text-uppercase text-grey-6 text-caption">
            Navigasi Utama
          </q-item-label>

          <q-item v-for="(menu, index) in menuList" :key="index" clickable v-ripple :to="menu.to" exact
            active-class="bg-blue-1 text-primary text-weight-bold">
            <q-item-section avatar>
              <q-icon :name="menu.icon" />
            </q-item-section>
            <q-item-section>
              {{ menu.label }}
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <!-- Konten Halaman Dinamis -->
    <q-page-container>
      <router-view v-slot="{ Component }">
        <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut" mode="out-in"
          :duration="200">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from '@/stores/auth'
const { logout } = useAuthStore()
const $q = useQuasar()
const router = useRouter()

const leftDrawerOpen = ref(false)
const adminName = ref('Super Admin')

// List menu navigasi dashboard superadmin
const menuList = [
  {
    label: 'Dashboard Overview',
    icon: 'dashboard',
    to: { name: 'super-dashboard' }
  },
  {
    label: 'Manajemen Tenant Sekolah',
    icon: 'domain',
    to: { name: 'manajemen-sekolah' }
  },
  {
    label: 'Billing & Keuangan',
    icon: 'receipt_long', // Menggunakan icon struk/invoice bawaan Quasar
    to: { name: 'manajemen-biling' }
  },
  {
    label: 'Log Telemetri Server',
    icon: 'monitor_heart', // Menggunakan icon rekam medis jantung untuk kesehatan server
    to: { name: 'log-telemetri' }
  }
]

const toggleLeftDrawer = () => {
  leftDrawerOpen.value = !leftDrawerOpen.value
}

// Handler logout aman sesuai standar sistem auth token CBT Engine
const handleLogout = () => {
  $q.dialog({
    title: 'Konfirmasi Keluar',
    message: 'Apakah Anda yakin ingin keluar dari panel Superadmin?',
    cancel: true,
    persistent: true
  }).onOk(() => {
    logout()
    $q.notify({
      type: 'positive',
      message: 'Anda berhasil keluar dari sistem.'
    })

    // Redirect ke halaman login auth pusat
    router.push({ name: 'superadmin-login' })
  })
}
</script>

<style scoped>
.border-bottom {
  border-bottom: 1px solid #e0e0e0;
}

/* Memperhalus tampilan transisi fade-in-out bawaan css animate quasar */
.animated {
  animation-duration: 0.2s;
}
</style>
