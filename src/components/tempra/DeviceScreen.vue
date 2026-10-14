<script setup lang="ts">
import { OLED_ROWS } from '../../tempra/device-screen'

const props = defineProps<{ lines: readonly string[]; connected: boolean; labels: { page: string; sensors: string; faults: string; caption: string } }>()
const emit = defineEmits<{ page: []; sensors: []; faults: [] }>()

const rows = (): string[] => Array.from({ length: OLED_ROWS }, (_, i) => props.lines[i] ?? '')
</script>

<template>
  <figure class="device" :aria-label="labels.caption">
    <div class="body" dir="ltr">
      <span class="led" :class="{ on: connected }" aria-hidden="true" />
      <div class="oled" dir="ltr" role="img" :aria-label="lines.join(' / ')">
        <div v-for="(row, i) in rows()" :key="i" class="row">{{ row }}</div>
      </div>
      <div class="keys">
        <button type="button" @click="emit('page')"><span class="cap" />{{ labels.page }}</button>
        <button type="button" @click="emit('sensors')"><span class="cap" />{{ labels.sensors }}</button>
        <button type="button" @click="emit('faults')"><span class="cap" />{{ labels.faults }}</button>
      </div>
      <div class="model" dir="ltr">ESP32 · LM393 · 2N2222A</div>
    </div>
    <figcaption>{{ labels.caption }}</figcaption>
  </figure>
</template>

<style scoped>
.device{margin:0;display:flex;flex-direction:column;align-items:center;gap:8px}
.body{position:relative;width:min(100%,300px);background:#1a1f2b;border:2px solid #2a3242;border-radius:18px;padding:22px 18px 14px;box-shadow:0 10px 30px #0008}
.led{position:absolute;top:10px;inset-inline-end:14px;width:10px;height:10px;border-radius:50%;background:#2a3242;border:1px solid #566179}
.led.on{background:#3ddc97;box-shadow:0 0 10px #3ddc97}
.oled{background:#05070b;border:2px solid #2a3242;border-radius:6px;padding:8px 10px;font-family:Consolas,"Courier New",monospace;font-size:13px;line-height:1.35;color:#7dd3fc;min-height:calc(8 * 1.35em + 16px)}
.row{white-space:pre;height:1.35em;overflow:hidden}
.keys{display:flex;justify-content:space-around;margin-top:16px}
.keys button{display:flex;flex-direction:column;align-items:center;gap:6px;background:none;border:0;color:var(--muted);font:inherit;font-size:12px;cursor:pointer}
.cap{width:30px;height:30px;border-radius:50%;background:#2b3446;border:2px solid #111;box-shadow:0 3px 0 #0b0f17;transition:transform .08s}
.keys button:active .cap{transform:translateY(3px);box-shadow:none}
.keys button:focus-visible .cap{outline:2px solid var(--amber)}
.model{text-align:center;color:var(--muted);font-size:11px;margin-top:10px}
figcaption{color:var(--muted);font-size:13px;text-align:center}
</style>
