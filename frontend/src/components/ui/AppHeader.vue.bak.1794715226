<!-- src/components/ui/AppHeader.vue -->
<template>
  <q-header :elevated="elevated" class="bg-primary text-white" role="banner">
    <q-toolbar class="q-py-sm">
      <!-- Menu toggle (optional) -->
      <q-btn
        v-if="showMenuToggle"
        flat
        dense
        round
        icon="menu"
        @click="$emit('toggle-drawer')"
        :aria-label="menuToggleAriaLabel"
        :aria-expanded="drawerOpen ? 'true' : 'false'"
        aria-controls="main-drawer"
      />

      <q-toolbar-title class="text-weight-medium">
        <div class="flex items-center">
          <q-icon name="school" class="q-mr-sm" aria-hidden="true" />
          <span class="text-h6" :class="{ 'text-h5': $q.screen.gt.sm }">
            {{ title }}
          </span>
          <q-badge
            v-if="badge"
            color="white"
            text-color="primary"
            class="q-ml-md q-px-sm"
            rounded
            aria-label="Role"
          >
            {{ badge }}
          </q-badge>
        </div>
      </q-toolbar-title>

      <!-- Actions -->
      <div class="q-gutter-sm flex items-center" role="toolbar" aria-label="Header actions">
        <!-- Dark mode toggle (optional) -->
        <q-btn
          v-if="enableDarkMode"
          flat
          round
          :icon="themeStore.dark ? 'dark_mode' : 'light_mode'"
          @click="themeStore.toggleDark()"
          :aria-label="themeStore.dark ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <q-tooltip>{{ themeStore.dark ? 'Mode Terang' : 'Mode Gelap' }}</q-tooltip>
        </q-btn>

        <!-- Slot for custom actions (e.g., fullscreen, timer) -->
        <slot name="actions" />

        <!-- Notifications (optional) -->
        <q-btn
          v-if="showNotifications"
          flat
          round
          icon="notifications"
          @click="$emit('notifications-click')"
          aria-label="Notifications"
        >
          <q-badge color="red" floating>{{ notificationCount }}</q-badge>
          <q-tooltip>Notifikasi</q-tooltip>
        </q-btn>

        <!-- Refresh (optional) -->
        <q-btn
          v-if="showRefresh"
          flat
          round
          icon="refresh"
          @click="$emit('refresh')"
          :loading="isRefreshing"
          aria-label="Refresh data"
        >
          <q-tooltip>Refresh Data</q-tooltip>
        </q-btn>

        <!-- Logout -->
        <q-btn flat round icon="logout" @click="$emit('logout')" aria-label="Logout">
          <q-tooltip>Keluar</q-tooltip>
        </q-btn>
      </div>
    </q-toolbar>

    <!-- Slot for secondary bar (e.g., breadcrumb) -->
    <slot name="secondary" />
  </q-header>
</template>

<script setup>
import { useThemeStore } from '@/stores/theme'

defineProps({
  title: { type: String, required: true },
  badge: { type: String, default: '' },
  elevated: { type: Boolean, default: true },
  showMenuToggle: { type: Boolean, default: false },
  drawerOpen: { type: Boolean, default: false },
  menuToggleAriaLabel: { type: String, default: 'Toggle navigation menu' },
  enableDarkMode: { type: Boolean, default: true }, // baru: bisa dimatikan
  showNotifications: { type: Boolean, default: false },
  notificationCount: { type: Number, default: 0 },
  showRefresh: { type: Boolean, default: false },
  isRefreshing: { type: Boolean, default: false },
})

defineEmits(['toggle-drawer', 'notifications-click', 'refresh', 'logout'])

// Hanya digunakan jika enableDarkMode = true
const themeStore = useThemeStore()
</script>
