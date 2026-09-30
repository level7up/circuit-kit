<script setup lang="ts">
defineProps<{ items: { id: string; label: string }[]; active: string }>()
</script>

<template>
  <nav class="nav">
    <div class="wrap" role="tablist" aria-label="أجزاء الدليل">
      <a v-for="i in items" :key="i.id" role="tab" :href="'#' + i.id" :class="{ on: active === i.id }" :aria-selected="active === i.id">{{ i.label }}</a>
    </div>
  </nav>
</template>
