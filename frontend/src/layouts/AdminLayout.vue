<!-- eslint-disable no-unused-vars -->
<!-- src/layouts/AdminLayout.vue -->
<template>
  <q-layout view="hHh lpR fFf" class="admin-layout">
    <!-- Skip Link for Accessibility -->
    <SkipLink />
    <AppHeader title="CBT Admin Panel" :badge="authStore.user?.role" :show-menu-toggle="true"
      :drawer-open="leftDrawerOpen" :show-notifications="true" :notification-count="3" :show-refresh="true"
      :is-refreshing="isRefreshing" @toggle-drawer="toggleDrawer" @notifications-click="showNotifications = true"
      @refresh="refreshData" @logout="confirmLogout" />

    <!-- Enhanced Drawer -->
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

      <q-scroll-area style="height: calc(100% - 80px)">
        <q-list padding>
          <!-- Main Navigation -->
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
          <q-item-label header class="text-uppercase text-grey-7">
            <q-icon name="settings" class="q-mr-xs" size="xs" aria-hidden="true" />
            Management
          </q-item-label>

          <q-item v-for="item in managementNavItems" :key="item.name" clickable v-ripple :to="item.to"
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

          <!-- Quick Stats -->
          <div class="q-px-md q-py-sm" role="complementary" aria-label="Quick statistics">
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
          </div>

          <!-- Footer Actions -->

        </q-list>
      </q-scroll-area>
    </q-drawer>

    <!-- Page Content -->
    <q-page-container>
      <q-page class="bg-grey-2" id="main-content" role="main">
        <!-- Breadcrumb -->
        <q-toolbar class="q-py-xs bg-primary-dark" v-if="currentRoute" role="navigation" aria-label="Breadcrumb">
          <div class="text-caption q-px-md">
            <q-breadcrumbs>
              <q-breadcrumbs-el label="Home" icon="home" :to="{ name: 'admin-dashboard' }" />
              <q-breadcrumbs-el :label="getBreadcrumbLabel" />
            </q-breadcrumbs>
          </div>
          <div class="absolute-bottom q-pa-md">
            <q-btn flat color="grey-7" icon="help" label="Bantuan" size="sm" class="full-width q-mb-xs"
              @click="showHelp" aria-label="Help" />
            <div class="text-caption text-grey-6 text-center q-mt-xs" aria-live="polite">
              {{ currentDateTime }}
            </div>
          </div>
        </q-toolbar>
        <router-view v-slot="{ Component }">
          <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut" mode="out-in">
            <component :is="Component" :key="$route.fullPath" />
          </transition>
        </router-view>
      </q-page>
    </q-page-container>

    <!-- Notification Dialog -->
    <q-dialog v-model="showNotifications" :aria-label="'Notifications'">
      <q-card style="min-width: 350px; max-width: 500px;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Notifikasi</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup aria-label="Close notifications" />
        </q-card-section>

        <q-list separator>
          <q-item v-for="n in notifications" :key="n.id" clickable>
            <q-item-section avatar>
              <q-icon :name="n.icon" :color="n.color" aria-hidden="true" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ n.title }}</q-item-label>
              <q-item-label caption>{{ n.message }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge>{{ n.time }}</q-badge>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </q-dialog>

    <!-- Logout Confirmation Dialog -->
    <q-dialog v-model="showLogoutDialog" :aria-label="'Konfirmasi keluar'">
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="logout" color="primary" text-color="white" aria-hidden="true" />
          <span class="q-ml-sm text-h6">Konfirmasi Keluar</span>
        </q-card-section>

        <q-card-section>
          Apakah Anda yakin ingin keluar dari panel admin?
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Batal" color="grey" v-close-popup aria-label="Batal" />
          <q-btn flat label="Keluar" color="primary" @click="logout" aria-label="Keluar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useQuasar } from 'quasar'
import SkipLink from '@/components/ui/SkipLink.vue'
import { useKeyboardShortcuts } from '@/composables/ui/useKeyboardShortcuts'
import AppHeader from '@/components/ui/AppHeader.vue'
import { useLayout } from '@/composables/ui/useLayout'
// Use layout composable for common logic
const { leftDrawerOpen, toggleDrawer, confirmLogout } = useLayout()
const showLogoutDialog = ref(false)
const showNotifications = ref(false)
const isRefreshing = ref(false)
const currentDateTime = ref('')

const router = useRouter()
const route = useRoute()
const $q = useQuasar()
const authStore = useAuthStore()
const themeStore = useThemeStore()

// Keyboard shortcuts
useKeyboardShortcuts({
  'ctrl+d': () => themeStore.toggleDark(),
  'ctrl+/': () => {
    // Open help
    showHelp()
  },
  'ctrl+1': () => router.push({ name: 'admin-dashboard' }),
  'ctrl+2': () => router.push({ name: 'admin-questions' }),
  'ctrl+q': () => confirmLogout(),
})

// Navigation Items
const mainNavItems = [
  { name: 'dashboard', label: 'Dashboard', icon: 'dashboard', to: { name: 'admin-dashboard' } },
  // { name: 'sync', label: 'Sync SIAKAD', icon: 'sync', to: { name: 'admin-sync' } },
  // { name: 'sessions', label: 'Sesi Ujian', icon: 'event', to: { name: 'admin-sessions' } },
]

const managementNavItems = [
  { name: 'participants', label: 'Data Peserta', icon: 'group', to: { name: 'admin-participants' } },
  { name: 'examCard', label: 'Kartu Ujian', icon: 'card_membership', to: { name: 'admin-exam-card' } },
  { name: 'questions', label: 'Buat Jadwal', icon: 'schedule', to: { name: 'admin-exam-management' } },
  { name: 'questions', label: 'Kelola Soal', icon: 'quiz', to: { name: 'admin-questions' } },
  { name: 'archive', label: 'Archive Semester', icon: 'archive', to: { name: 'admin-archive' } },
]

const stats = ref({ totalQuestions: 0, totalParticipants: 0 })

const currentRoute = computed(() => route)
const getBreadcrumbLabel = computed(() => {
  const meta = route.meta
  if (meta && meta.breadcrumb) return meta.breadcrumb
  const nameMap = {
    'admin-dashboard': 'Dashboard',
    'admin-sync': 'Sync SIAKAD',
    'admin-sessions': 'Sesi Ujian',
    'admin-questions': 'Kelola Soal',
    'admin-participants': 'Data Peserta',
    'admin-archive': 'Archive Semester',
  }
  return nameMap[route.name] || route.name || 'Page'
})

const isActiveRoute = (to) => {
  if (!to || !to.name) return false
  return route.name === to.name
}

const notifications = ref([
  { id: 1, icon: 'warning', color: 'orange', title: 'Ujian Akan Berakhir', message: 'Sesi ujian akan berakhir dalam 30 menit', time: '5m ago' },
  { id: 2, icon: 'check_circle', color: 'green', title: 'Sinkronisasi Berhasil', message: 'Data mahasiswa berhasil disinkronkan', time: '1h ago' },
  { id: 3, icon: 'error', color: 'red', title: 'Gagal Mengupload Soal', message: 'Terjadi kesalahan pada file soal', time: '2h ago' },
])

// const toggleLeftDrawer = () => {
//   leftDrawerOpen.value = !leftDrawerOpen.value
// }

const logout = () => {
  showLogoutDialog.value = false
  authStore.logout()
  router.push({ name: 'admin-login' })
}

const refreshData = async () => {
  isRefreshing.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    stats.value = {
      totalQuestions: Math.floor(Math.random() * 100) + 50,
      totalParticipants: Math.floor(Math.random() * 200) + 100,
    }
    $q.notify({ type: 'positive', message: 'Data berhasil di-refresh', position: 'top-right', timeout: 3000 })
  } catch (error) {
    $q.notify({ type: 'negative', message: 'Gagal refresh data: ' + (error.message || 'Unknown error'), position: 'top-right', timeout: 3000 })
  } finally {
    isRefreshing.value = false
  }
}

const showHelp = () => {
  $q.dialog({
    title: 'Bantuan',
    message: 'Untuk bantuan lebih lanjut, hubungi administrator sistem.\n\nShortcuts:\nCtrl+D: Toggle Dark Mode\nCtrl+1: Dashboard\nCtrl+2: Kelola Soal\nCtrl+Q: Logout',
    persistent: true,
    ok: 'OK',
  })
}

let intervalId = null
const updateDateTime = () => {
  const now = new Date()
  currentDateTime.value = now.toLocaleString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const loadStats = () => {
  stats.value = { totalQuestions: 75, totalParticipants: 150 }
}

onMounted(() => {
  updateDateTime()
  intervalId = setInterval(updateDateTime, 60000)
  loadStats()
  // Initialize theme
  themeStore.initTheme()
  // Focus management: after route change, focus main content
  if (route.meta && route.meta.focusOnMount) {
    const main = document.getElementById('main-content')
    if (main) setTimeout(() => main.focus(), 100)
  }
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<style lang="scss" scoped>
.admin-layout {
  .bg-primary-dark {
    background: rgba(0, 0, 0, 0.1);
  }

  .q-drawer {
    .q-item {
      border-radius: 4px;
      margin: 2px 8px;

      &--active {
        background: rgba(25, 118, 210, 0.08);

        .q-item__section--avatar .q-icon {
          color: $primary;
        }
      }

      &:hover {
        background: rgba(0, 0, 0, 0.03);
      }
    }
  }

  .q-drawer__content {
    display: flex;
    flex-direction: column;
  }

  // Responsive: adjust padding and font sizes on mobile
  @media (max-width: 600px) {
    .q-toolbar-title {
      font-size: 16px;

      .text-h6 {
        font-size: 16px;
      }
    }

    .q-drawer {
      width: 280px !important;
    }

    .q-page {
      padding: 12px !important;
    }

    .q-toolbar {
      padding: 0 8px;
    }
  }

  // Touch targets for mobile
  .q-btn {
    min-height: 44px;
    min-width: 44px;
  }
}

// Dark mode overrides (will be applied via body class)
body.dark-mode {
  .admin-layout {
    .bg-primary {
      background-color: #1e1e1e !important;
    }

    .bg-primary-dark {
      background-color: #2a2a2a !important;
    }

    .bg-grey-1 {
      background-color: #2d2d2d !important;
    }

    .bg-grey-2 {
      background-color: #1a1a1a !important;
    }

    .text-white {
      color: #e0e0e0 !important;
    }

    .text-grey-7 {
      color: #b0b0b0 !important;
    }

    .bg-blue-1 {
      background-color: #1a3a5c !important;
    }

    .bg-green-1 {
      background-color: #1a4a3a !important;
    }

    .q-item {
      color: #e0e0e0;
    }

    .q-item--active {
      background: rgba(66, 165, 245, 0.15) !important;
    }

    .q-card {
      background-color: #2d2d2d;
      border-color: #444;
    }

    .q-drawer {
      border-right: 1px solid #444;
    }

    .q-separator {
      background: #444;
    }
  }
}

// Animation
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// Focus styles for accessibility
:focus-visible {
  outline: 2px solid var(--q-primary);
  outline-offset: 2px;
}

// Skip link hidden by default
.skip-link {
  position: fixed;
  top: -999px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--q-primary);
  color: white;
  padding: 8px 16px;
  z-index: 9999;
  border-radius: 0 0 4px 4px;
  opacity: 0;
  transition: top 0.2s, opacity 0.2s;

  &:focus {
    top: 0;
    opacity: 1;
  }
}
</style>
