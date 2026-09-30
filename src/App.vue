<script setup lang="ts">
import { findCircuit } from './circuits'
import GuidePage from './components/GuidePage.vue'
import HomePage from './components/HomePage.vue'

const circuit = findCircuit(new URLSearchParams(location.search).get('circuit'))
</script>

<template>
  <GuidePage v-if="circuit" :circuit="circuit" />
  <HomePage v-else />
</template>
