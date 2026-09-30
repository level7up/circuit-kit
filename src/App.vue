<script setup lang="ts">
import { findCircuit } from './circuits'
import GuidePage from './components/GuidePage.vue'
import HomePage from './components/HomePage.vue'
import BreadboardLesson from './components/learn/BreadboardLesson.vue'

const query = new URLSearchParams(location.search)
const circuit = findCircuit(query.get('circuit'))
const lesson = query.get('learn') === 'breadboard'
</script>

<template>
  <GuidePage v-if="circuit" :circuit="circuit" />
  <BreadboardLesson v-else-if="lesson" />
  <HomePage v-else />
</template>
