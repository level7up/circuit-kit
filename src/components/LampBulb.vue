<script setup lang="ts">
import { computed } from 'vue'
import { useSim } from '../composables/context'

const MIN_GLOW = 0.06
const sim = useSim()
const level = computed(() => (MIN_GLOW + (1 - MIN_GLOW) * sim.brightness.value).toFixed(3))
</script>

<template>
  <div class="bulb" :style="{ '--b': level }" />
</template>
