<!-- src/components/superadmin/InfrastructureSummaryCards.vue -->
<template>
  <div class="row q-col-gutter-md q-mb-md">
    <div class="col-6 col-sm-3">
      <q-card flat bordered class="bg-white">
        <q-card-section class="text-center">
          <div class="text-caption text-grey-7">Total</div>
          <div class="text-h5 text-weight-bold">{{ summary.total }}</div>
        </q-card-section>
      </q-card>
    </div>
    <div class="col-6 col-sm-3">
      <q-card flat bordered class="bg-green-1 text-green-9">
        <q-card-section class="text-center">
          <div class="text-caption">Active</div>
          <div class="text-h5 text-weight-bold">{{ summary.active }}</div>
        </q-card-section>
      </q-card>
    </div>
    <div class="col-6 col-sm-3">
      <q-card flat bordered class="bg-orange-1 text-orange-9">
        <q-card-section class="text-center">
          <div class="text-caption">Expiring ≤30d</div>
          <div class="text-h5 text-weight-bold">{{ summary.expiring_soon }}</div>
        </q-card-section>
      </q-card>
    </div>
    <div class="col-6 col-sm-3">
      <q-card flat bordered class="bg-red-1 text-red-9">
        <q-card-section class="text-center">
          <div class="text-caption">Expired</div>
          <div class="text-h5 text-weight-bold">{{ summary.expired }}</div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup>
defineProps({
  summary: {
    type: Object,
    default: () => ({ total: 0, active: 0, expiring_soon: 0, expired: 0 }),
  },
})
</script>
