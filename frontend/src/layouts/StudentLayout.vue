<template>
  <q-layout view="hHh lpR fFf">
    <AppHeader title="CBT" :badge="authStore.user?.role" :show-menu-toggle="true" :drawer-open="leftDrawerOpen"
      :show-notifications="false" :notification-count="3" :show-refresh="true" :is-refreshing="isRefreshing"
      @toggle-drawer="toggleDrawer" @notifications-click="showNotifications = true" @logout="confirmLogout" />
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered class="bg-grey-1" :width="280" :breakpoint="1024"
      id="admin-drawer" role="navigation" aria-label="Main navigation">
      <!-- Drawer Header -->
      <!-- <div class="q-py-md q-px-md bg-primary text-white">
        <div class="flex items-center">
          <q-avatar size="48px" class="q-mr-sm" aria-hidden="true">
            <img src="@/assets/quasar-logo-vertical.svg" alt="Logo" />
          </q-avatar>
          <div>
            <div class="text-subtitle1 text-weight-bold">CBT System</div>
            <div class="text-caption text-white text-opacity-70">Version 2.0.0</div>
          </div>
        </div>
      </div> -->

      <!-- Main Navigation -->
      <q-scroll-area style="height: calc(100% - 80px)">
        <q-list padding>
          <q-item-label header class="text-uppercase text-grey-7 q-mt-sm">
            <q-icon name="apps" class="q-mr-xs" size="xs" aria-hidden="true" />
            Main Navigation
          </q-item-label>

          <q-item v-for="item in mainNavItems" :key="item.name" clickable v-ripple :to="item.to"
            active-class="bg-blue-1 text-primary" exact :aria-current="isActiveRoute(item.to) ? 'page' : undefined">
            <q-item-section avatar>
              <q-icon :name="item.icon" :color="isActiveRoute(item.to) ? 'primary' : 'grey-7'" aria-hidden="true" />
            </q-item-section>
            <q-item-section>
              {{ item.label }}
            </q-item-section>
            <q-item-section side v-if="item.badge">
              <q-badge :color="item.badgeColor || 'red'" rounded>
                {{ item.badge }}
              </q-badge>
            </q-item-section>
          </q-item>

          <q-separator class="q-my-sm" />

          <!-- Management Section -->
          <!-- <q-item-label header class="text-uppercase text-grey-7">
            <q-icon name="settings" class="q-mr-xs" size="xs" aria-hidden="true" />
            Management
          </q-item-label> -->

          <!-- <q-item v-for="item in managementNavItems" :key="item.name" clickable v-ripple :to="item.to"
            active-class="bg-blue-1 text-primary" exact :aria-current="isActiveRoute(item.to) ? 'page' : undefined">
            <q-item-section avatar>
              <q-icon :name="item.icon" :color="isActiveRoute(item.to) ? 'primary' : 'grey-7'" aria-hidden="true" />
            </q-item-section>
            <q-item-section>
              {{ item.label }}
            </q-item-section>
            <q-item-section side v-if="item.badge">
              <q-badge :color="item.badgeColor || 'red'" rounded>
                {{ item.badge }}
              </q-badge>
            </q-item-section>
          </q-item> -->

          <!-- <q-separator class="q-my-sm" /> -->

          <!-- Quick Stats -->
          <!-- <div class="q-px-md q-py-sm" role="complementary" aria-label="Quick statistics">
            <q-item-label header class="text-uppercase text-grey-7">
              <q-icon name="trending_up" class="q-mr-xs" size="xs" aria-hidden="true" />
              Quick Stats
            </q-item-label>
            <div class="row q-col-gutter-xs q-mt-sm">
              <div class="col-6">
                <q-card flat bordered class="bg-blue-1">
                  <q-card-section class="q-py-xs q-px-sm text-center">
                    <div class="text-caption text-grey-7">Total Soal</div>
                    <div class="text-h6 text-weight-bold" aria-live="polite">{{ stats.totalQuestions }}</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-6">
                <q-card flat bordered class="bg-green-1">
                  <q-card-section class="q-py-xs q-px-sm text-center">
                    <div class="text-caption text-grey-7">Peserta</div>
                    <div class="text-h6 text-weight-bold" aria-live="polite">{{ stats.totalParticipants }}</div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div> -->

          <!-- Footer Actions -->

        </q-list>
      </q-scroll-area>
    </q-drawer>
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'

import AppHeader from '@/components/ui/AppHeader.vue';
import { useAuthStore } from '@/stores/auth'
import { useLayout } from '@/composables/ui/useLayout'
import { ref } from 'vue';
// Use layout composable for common logic
const { leftDrawerOpen, toggleDrawer, confirmLogout } = useLayout()
const authStore = useAuthStore()
const isRefreshing = ref(false)
// eslint-disable-next-line no-unused-vars
const router = useRouter()
const route = useRoute()
// const showLogoutDialog = ref(false)
const showNotifications = ref(false)
// Navigation Items
const mainNavItems = [
  { name: 'dashboard', label: 'Dashboard', icon: 'dashboard', to: { name: 'waiting-room' } },
  { name: 'schedule', label: 'Jadwal Ujian', icon: 'event', to: { name: 'exam-schedule' } },
  { name: 'history', label: 'Riwayat Ujian', icon: 'history', to: { name: 'exam-history' } },
  { name: 'profile', label: 'Profile', icon: 'person', to: { name: 'exam-user-profile' } },
  // { name: 'sessions', label: 'Sesi Ujian', icon: 'event', to: { name: 'admin-sessions' } },
]
const isActiveRoute = (to) => {
  if (!to || !to.name) return false
  return route.name === to.name
}

// const refreshData = async () => {
//   isRefreshing.value = true
//   try {
//     await new Promise(resolve => setTimeout(resolve, 1000))
//     stats.value = {
//       totalQuestions: Math.floor(Math.random() * 100) + 50,
//       totalParticipants: Math.floor(Math.random() * 200) + 100,
//     }
//     $q.notify({ type: 'positive', message: 'Data berhasil di-refresh', position: 'top-right', timeout: 3000 })
//   } catch (error) {
//     $q.notify({ type: 'negative', message: 'Gagal refresh data: ' + (error.message || 'Unknown error'), position: 'top-right', timeout: 3000 })
//   } finally {
//     isRefreshing.value = false
//   }
// }



</script>
