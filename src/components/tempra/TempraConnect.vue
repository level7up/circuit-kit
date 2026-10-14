<script setup lang="ts">
import { computed, reactive } from 'vue'
import type { Strings } from '../../tempra/i18n'

defineProps<{ t: Strings; serialSupported: boolean; bleSupported: boolean; standalone: boolean }>()
const emit = defineEmits<{ usb: []; ble: []; wifi: []; demo: [] }>()

const SHARED = ['checkKeyOff', 'checkKeyOn', 'checkGuide'] as const
const ticked = reactive({ checkKeyOff: false, checkKeyOn: false, checkGuide: false, checkBattery: false })
const safe = computed(() => SHARED.every(c => ticked[c]))
const usbSafe = computed(() => safe.value && ticked.checkBattery)
</script>

<template>
  <section class="card" aria-labelledby="tempra-checks">
    <h3 id="tempra-checks">{{ t.checklistTitle }}</h3>
    <label v-for="c in SHARED" :key="c" class="check" :class="{ done: ticked[c] }">
      <input v-model="ticked[c]" type="checkbox" />
      <span>{{ t[c] }}</span>
    </label>
    <p class="note ok-note">{{ t.readOnlyNote }}</p>
  </section>

  <h2 class="connect-title">{{ t.connectTitle }}</h2>

  <section v-if="standalone" class="card option">
    <h3>{{ t.wifiTitle }}</h3>
    <p class="note">{{ t.wifiNote }}</p>
    <div class="row"><button class="btn pri" type="button" :disabled="!safe" @click="emit('wifi')">{{ t.wifiButton }}</button></div>
  </section>

  <section class="card option">
    <h3>{{ t.bleTitle }}</h3>
    <p class="note">{{ t.bleNote }}</p>
    <div v-if="bleSupported" class="row"><button class="btn pri" type="button" :disabled="!safe" @click="emit('ble')">{{ t.bleButton }}</button></div>
    <p v-else class="note warn">{{ t.bleUnsupported }}</p>
  </section>

  <section v-if="!standalone" class="card option">
    <h3>{{ t.wifiTitle }}</h3>
    <p class="note">{{ t.wifiNote }}</p>
    <ol class="steps"><li>{{ t.wifiStep1 }}</li><li>{{ t.wifiStep2 }}</li><li>{{ t.wifiStep3 }}</li></ol>
  </section>

  <section class="card option">
    <h3>{{ t.usbTitle }}</h3>
    <p class="note">{{ t.usbNote }}</p>
    <template v-if="serialSupported">
      <label class="check" :class="{ done: ticked.checkBattery }">
        <input v-model="ticked.checkBattery" type="checkbox" />
        <span>{{ t.checkBattery }}</span>
      </label>
      <div class="row"><button class="btn pri" type="button" :disabled="!usbSafe" @click="emit('usb')">{{ t.connect }}</button></div>
    </template>
    <p v-else class="note warn" role="note">{{ t.unsupported }}</p>
  </section>

  <section class="card option demo-card">
    <h3>{{ t.demoTitle }}</h3>
    <p class="note">{{ t.demoNote }}</p>
    <div class="row"><button class="btn" type="button" @click="emit('demo')">{{ t.demoButton }}</button></div>
  </section>
</template>

<style scoped>
section.card{padding:16px 18px}
.connect-title{font-size:20px;margin:4px 0 -4px}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
.note{color:var(--muted);font-size:14px;margin:6px 0 0}
.ok-note{color:var(--green)}
.warn{color:var(--amber)}
.steps{margin:8px 0 0;padding-inline-start:20px;font-size:14px}
.demo-card{border-color:#2a4a6e}
</style>
