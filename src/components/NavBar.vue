<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ items: { id: string; label: string }[] }>()
const active = ref('')
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) active.value = e.target.id })
  }, { rootMargin: '-40% 0px -55% 0px' })
  props.items.forEach(i => { const el = document.getElementById(i.id); if (el) observer?.observe(el) })
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <nav class="nav">
    <div class="wrap">
      <a v-for="i in items" :key="i.id" :href="'#' + i.id" :class="{ on: active === i.id }">{{ i.label }}</a>
    </div>
  </nav>
</template>
