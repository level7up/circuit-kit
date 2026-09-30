<script setup lang="ts">
defineProps<{ num: number; title: string; sub?: string }>()
</script>

<template>
  <h2><span class="num">{{ String(num).padStart(2, '0') }}</span>{{ title }}</h2>
  <p v-if="sub" class="sub" v-html="sub" />
</template>
