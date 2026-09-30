<script setup lang="ts">
import { computed } from 'vue'
import type { AnyAlt } from '../../types/circuit'

const STATUS_ICON = { ok: '✅', warn: '⚠️', bad: '⛔' } as const

const props = defineProps<{ options: AnyAlt[]; current: number }>()
const emit = defineEmits<{ choose: [index: number] }>()
const chosen = computed(() => (props.current ? props.options[props.current] : null))
</script>

<template>
  <div class="edu alt">
    <b>🔁 اختار بديل وشوف النتيجة لايف</b>
    <div class="opts">
      <button v-for="(o, i) in options" :key="o.t" class="opt" :class="{ on: i === current }" @click.stop="emit('choose', i)">
        {{ i ? '' : 'الأصلي: ' }}{{ o.t }}
      </button>
    </div>
    <div v-if="chosen && chosen.st" class="res" :class="'st-' + chosen.st">{{ STATUS_ICON[chosen.st] }} {{ chosen.r }}</div>
  </div>
</template>
