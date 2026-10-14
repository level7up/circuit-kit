<script setup lang="ts">
import { findCircuit } from './circuits'
import GuidePage from './components/GuidePage.vue'
import HomePage from './components/HomePage.vue'
import BreadboardLesson from './components/learn/BreadboardLesson.vue'
import SandboxPage from './components/lab/SandboxPage.vue'
import TempraApp from './components/tempra/TempraApp.vue'

const query = new URLSearchParams(location.search)
const circuit = findCircuit(query.get('circuit'))
const lesson = query.get('learn') === 'breadboard'
const sandbox = query.get('lab') === 'sandbox'
const tempra = query.get('app') === 'tempra'
</script>

<template>
  <GuidePage v-if="circuit" :circuit="circuit" />
  <BreadboardLesson v-else-if="lesson" />
  <SandboxPage v-else-if="sandbox" />
  <TempraApp v-else-if="tempra" />
  <HomePage v-else />
</template>
