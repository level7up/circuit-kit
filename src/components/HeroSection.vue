<script setup lang="ts">
import { useCircuit } from '../composables/context'
import LampBulb from './LampBulb.vue'

const { hero } = useCircuit()
</script>

<template>
  <header class="hero">
    <div class="wrap hero-grid">
      <div>
        <span class="tag">{{ hero.tag }}</span>
        <h1 v-html="hero.titleHtml" />
        <p class="lead">{{ hero.lead }}</p>
        <div class="stats">
          <div v-for="s in hero.stats" :key="s.label" class="stat"><b>{{ s.value }}</b>{{ s.label }}</div>
        </div>
      </div>
      <div class="bulbbox">
        <div class="lamp-shell"><LampBulb /></div>
        <div class="bulbcap">{{ hero.bulbCaption }}</div>
      </div>
    </div>
  </header>
</template>
