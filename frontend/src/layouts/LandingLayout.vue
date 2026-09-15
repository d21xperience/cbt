<template>
  <q-layout view="lHh Lpr lFf" class="bg-grey-1">
    <!-- Navbar Atas -->
    <q-header elevated class="bg-indigo-10 text-white">
      <q-toolbar class="container q-py-sm">
        <q-avatar
          square
          size="40px"
          icon="school"
          class="bg-white text-indigo-10 rounded-borders q-mr-sm"
        />
        <q-toolbar-title class="text-weight-bolder letter-spacing-1">
          UJIAN.PW
          <span class="text-subtitle2 text-weight-light text-grey-4">| SaaS CBT Portal</span>
        </q-toolbar-title>

        <!-- Akses Cepat Login Superadmin -->
        <q-btn
          flat
          no-caps
          icon="admin_panel_settings"
          color="amber-4"
          :to="{ name: 'superadmin-login' }"
          class="text-weight-bold"
        />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Footer Sistem -->
    <q-footer class="bg-grey-9 text-grey-4 text-center q-py-md">
      <div class="text-caption text-weight-light">
        &copy; {{ new Date().getFullYear() }} ULANGAN.CO.ID Cloud CBT System. All Rights Reserved.
      </div>
    </q-footer>
  </q-layout>
</template>
