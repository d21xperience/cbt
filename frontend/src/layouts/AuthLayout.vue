<!-- src/layouts/AuthLayout.vue -->
<template>
  <q-layout view="hHh lpR fFf" class="auth-layout">
    <q-header elevated class="bg-primary text-white" role="banner">
      <q-toolbar>
        <q-toolbar-title class="text-h6">
          <div class="flex items-center">
            <q-icon name="school" class="q-mr-sm" />
            <span>Computer Based Test</span>
          </div>
        </q-toolbar-title>
        <div class="q-gutter-sm">
          <q-btn flat v-if="isParticipantPage" :to="{ name: 'admin-login', query: route.query }"
            icon="admin_panel_settings"></q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="bg-grey-3 text-grey-7 text-center q-py-sm">
      <div class="text-caption">
        &copy; {{ new Date().getFullYear() }} - CBT System v2.0
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

// Deteksi apakah user sedang berada di halaman login peserta/siswa
const isParticipantPage = computed(() => {
  return route.path === '/auth/participant' || route.name === 'participant-login';
});

// const loginConfig = computed(() => {
//   // if (route.path.includes('/auth/admin')) {
//   //   return {
//   //     routeName: 'superadmin-login',
//   //     icon: 'gavel',
//   //     label: 'Login Superadmin'
//   //   };
//   // }
//   return {
//     routeName: 'admin-login',
//     icon: 'admin_panel_settings',
//     label: 'Login Admin'
//   };
// });
</script>

<style lang="scss" scoped>
.auth-layout {
  .q-header {
    background: #1976d2;
  }
}

body.dark-mode {
  .auth-layout {
    .q-header {
      background: #1e1e1e !important;
    }

    .bg-grey-3 {
      background-color: #2d2d2d !important;
    }

    .text-grey-7 {
      color: #b0b0b0 !important;
    }
  }
}
</style>
