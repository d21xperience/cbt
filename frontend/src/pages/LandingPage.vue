<!-- src/pages/index.vue -->
<template>
  <q-page class="flex flex-center bg-grey-1">
    <div class="main-container q-pa-md">

      <!-- Hero Section -->
      <div class="text-center q-py-xl">
        <!-- <q-avatar size="100px" class="q-mb-md shadow-4">
          <img src="~assets/quasar-logo-vertical.svg" alt="Logo" />
        </q-avatar> -->
        <div class="text-h3 text-weight-bold text-primary letter-spacing-1">
          Portal CBT
        </div>
        <div class="text-subtitle1 text-grey-6 q-mt-sm max-width-hero mx-auto">
          Temukan sekolah Anda dan mulai ujian berbasis komputer dengan mudah.
        </div>
      </div>

      <!-- Form Pencarian -->
      <q-input v-model="searchQuery" outlined dense placeholder="Cari sekolah (nama atau kota)..." class="q-mb-lg"
        clearable :loading="loading">
        <template v-slot:prepend>
          <q-icon name="search" />
        </template>
      </q-input>

      <!-- Daftar Sekolah -->
      <div v-if="loading" class="text-center q-py-xl">
        <q-spinner-grid color="primary" size="3em" />
        <div class="text-subtitle2 text-grey-7 q-mt-sm">Memuat direktori sekolah...</div>
      </div>

      <div v-else-if="filteredSchools.length === 0" class="text-center q-py-xl">
        <q-icon name="school" size="xl" color="grey-4" />
        <div class="text-grey-6 q-mt-sm">
          {{ searchQuery ? 'Tidak ada sekolah yang cocok dengan pencarian.' : 'Belum ada sekolah terdaftar.' }}
        </div>
      </div>

      <div v-else class="row q-col-gutter-md">
        <div v-for="school in filteredSchools" :key="school.id" class="col-12 col-sm-6 col-md-4">
          <q-card flat bordered class="bg-indigo-50-hover cursor-pointer" @click="redirectToTenant(school.slug)">
            <q-card-section>
              <div class="flex items-center">
                <q-avatar size="40px" class="q-mr-sm">
                  <img :src="school.logo || 'https://cdn.quasar.dev/logo/svg/quasar-logo.svg'" alt="Logo" />
                </q-avatar>
                <div>
                  <div class="text-weight-bold text-grey-9">{{ school.school_name }}</div>
                  <div class="text-caption text-grey-6">{{ school.city }}</div>
                </div>
              </div>
            </q-card-section>
            <q-card-actions align="right" class="q-pt-none">
              <q-btn flat dense color="primary" label="Masuk Ujian" icon-right="arrow_forward" />
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { usePortalDirectory } from '@/composables/super/usePortalDirectory';
import { useSubdomainRedirect } from '@/composables/super/useSubdomainRedirect';
import { onMounted } from 'vue';

// --- Composable untuk data sekolah ---
const { loading, searchQuery, filteredSchools, loadSchools } = usePortalDirectory();

// --- Composable untuk redirect subdomain ---
const { redirectToTenant } = useSubdomainRedirect();
onMounted(() => {
  loadSchools()
})

</script>

<style lang="scss" scoped>
.main-container {
  width: 800px;
  max-width: 95vw;
}

.max-width-hero {
  max-width: 600px;
}

.letter-spacing-1 {
  letter-spacing: 1px;
}

.mx-auto {
  margin-left: auto;
  margin-right: auto;
}

.bg-indigo-50-hover {
  transition: all 0.2s ease-in-out;

  &:hover {
    background-color: #f0f4ff;
    border-color: #3f51b5;
    transform: translateY(-2px);
  }
}

.cursor-pointer {
  cursor: pointer;
}
</style>
