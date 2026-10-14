<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'
import { HOME_HREF, circuitHref } from '../../circuits/links'
import { useTempraLink, type SerialApi } from '../../composables/useTempraLink'
import { bluetoothApi, bluetoothTransport, deviceSocketUrl, webSocketTransport, type BluetoothLike, type TransportFactory } from '../../tempra/device-link'
import { deviceScreen, nextPage, type ScreenPage } from '../../tempra/device-screen'
import { STRINGS, direction, type Lang } from '../../tempra/i18n'
import { hex } from '../../tempra/protocol'
import DeviceScreen from './DeviceScreen.vue'
import TempraConnect from './TempraConnect.vue'
import TempraFaults from './TempraFaults.vue'

const props = defineProps<{ serial?: SerialApi | null; bluetooth?: BluetoothLike | null; wifi?: TransportFactory; standalone?: boolean }>()

const LANG_KEY = 'tempra-lang'

const readLang = (): Lang => {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ar'
  } catch {
    return 'ar'
  }
}

const lang = ref<Lang>(readLang())
const t = computed(() => STRINGS[lang.value])
const link = useTempraLink(props.serial)
const bluetooth = props.bluetooth === undefined ? bluetoothApi() : props.bluetooth
const wifiFactory = (): TransportFactory => props.wifi ?? webSocketTransport(deviceSocketUrl(location))
const v = link.view
const page = ref<ScreenPage>('status')
const showDevice = computed(() => link.source.value !== null && link.source.value !== 'usb')
const screen = computed(() =>
  deviceScreen({ ...v.value, faults: link.faults.value, sensors: link.sensors.value, page: page.value }))
const sourceLabel = computed(() => (link.source.value === 'ble' ? t.value.bleLabel : t.value.wifiLabel))
const sensorBytes = computed(() => hex(link.sensors.value?.blocks[0]?.data ?? []))

watch(() => link.faults.value, f => { if (f) page.value = 'faults' })
watch(() => link.sensors.value, r => { if (r) page.value = 'sensors' })
watch(() => link.source.value, () => { page.value = 'status' })

function toggleLang(): void {
  lang.value = lang.value === 'ar' ? 'en' : 'ar'
  try {
    localStorage.setItem(LANG_KEY, lang.value)
  } catch {
    return
  }
}

function downloadLog(): void {
  const url = URL.createObjectURL(new Blob([link.logText() + '\n'], { type: 'text/plain' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `tempra-log-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

const connectBluetooth = (): Promise<void> => (bluetooth ? link.connectDevice(bluetoothTransport(bluetooth), 'ble') : Promise.resolve())
const connectWifi = (): Promise<void> => link.connectDevice(wifiFactory(), 'wifi')

watchEffect(() => (document.title = t.value.title))
</script>

<template>
  <div class="tempra" :dir="direction(lang)" :lang="lang">
    <div class="wrap">
      <div class="tempra-top">
        <span v-if="!standalone" class="links">
          <a class="homelink-inline" :href="HOME_HREF" :aria-label="t.home">⌂</a>
          <a :href="circuitHref('tempra-diag')">{{ t.guide }}</a>
        </span>
        <span v-else />
        <button class="chip" type="button" @click="toggleLang">{{ t.langSwitch }}</button>
      </div>
      <header class="tempra-head">
        <h1><span class="grad">{{ t.title }}</span></h1>
        <p class="lead">{{ t.subtitle }}</p>
      </header>

      <TempraConnect
        v-if="!link.active.value"
        :t="t"
        :serial-supported="link.supported"
        :ble-supported="bluetooth !== null"
        :standalone="!!standalone"
        @usb="link.connect()"
        @ble="connectBluetooth()"
        @wifi="connectWifi()"
        @demo="link.connectDemo()"
      />
      <p v-if="link.cancelled.value" class="note">{{ t.cancelled }}</p>
      <p v-if="link.error.value" class="card bad-card" role="alert">{{ link.error.value }}</p>

      <template v-if="link.active.value">
        <p v-if="link.demo.value" class="card demo-banner" role="status">{{ t.demoBanner }}</p>
        <p v-else-if="showDevice" class="card device-banner" role="status">
          {{ t.wirelessBanner }} {{ sourceLabel }}<span v-if="link.firmware.value"> · {{ t.firmwareLabel }}: <bdi dir="ltr">{{ link.firmware.value }}</bdi></span>
        </p>

        <section class="card" aria-live="polite">
          <div class="readout">
            <span>{{ t.status }}</span><b :class="'phase-' + v.phase">{{ t.phase[v.phase] }}</b>
            <span>{{ t.reconnects }}</span><b>{{ v.reconnects }}</b>
            <span>{{ t.lastFault }}</span><b>{{ t.fault[v.fault] }}</b>
          </div>
          <div class="row"><button class="btn" type="button" @click="link.disconnect()">{{ t.disconnect }}</button></div>
          <p class="note">{{ t.foregroundNote }}</p>
        </section>

        <section v-if="showDevice" class="card">
          <h3>{{ t.deviceTitle }}</h3>
          <DeviceScreen
            :lines="screen"
            :connected="link.connected.value"
            :labels="{ page: t.devicePage, sensors: t.deviceSensors, faults: t.deviceFaults, caption: t.deviceCaption }"
            @page="page = nextPage(page)"
            @sensors="link.requestSensors()"
            @faults="link.requestErrors()"
          />
          <p v-if="link.demo.value" class="note">{{ t.demoBattery }}</p>
        </section>

        <section v-if="v.ident" class="card">
          <h3>{{ t.ecuTitle }}</h3>
          <p>{{ t.ecuIdent }}: <code dir="ltr">{{ v.ident }}</code></p>
          <div class="row">
            <button class="btn" type="button" :disabled="!link.connected.value" @click="link.requestErrors()">{{ t.readErrors }}</button>
            <button class="btn" type="button" :disabled="!link.connected.value" @click="link.requestSensors()">{{ t.readSensors }}</button>
          </div>
        </section>
      </template>

      <TempraFaults v-if="link.faults.value" :reply="link.faults.value" :lang="lang" :t="t" />

      <section v-if="link.sensors.value" class="card">
        <h3>{{ t.sensorsTitle }}</h3>
        <p v-if="link.sensors.value.rejected" class="note bad">{{ t.rejected }}</p>
        <code v-else dir="ltr">{{ sensorBytes }}</code>
        <p class="note">{{ t.rawNote }}</p>
      </section>

      <section v-if="link.logCount.value > 0" class="card">
        <h3>{{ t.logTitle }}</h3>
        <p>{{ t.logCount }}: <b>{{ link.logCount.value }}</b></p>
        <button class="btn" type="button" @click="downloadLog">{{ t.downloadLog }}</button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tempra{padding:20px 0 48px}
.tempra .wrap{display:grid;gap:16px;max-width:760px}
.tempra-top{display:flex;justify-content:space-between;align-items:center}
.links{display:flex;gap:14px;align-items:center;font-size:14px}
.homelink-inline{color:var(--muted);text-decoration:none;font-size:20px}
.tempra-head h1{font-size:clamp(26px,5vw,38px)}
section.card{padding:16px 18px}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
.note{color:var(--muted);font-size:14px;margin:8px 0 0}
.bad{color:var(--red)}
.bad-card{border-color:#5a2020;color:var(--red);margin:0}
.readout{grid-template-columns:auto 1fr;font-size:15px}
.readout b{font-family:inherit;direction:inherit}
.phase-ready{color:var(--green)}
.phase-backoff{color:var(--red)}
code{font-family:Consolas,monospace;background:var(--panel2);padding:2px 8px;border-radius:6px;word-break:break-all}
.demo-banner{border-color:var(--amber);color:var(--amber);margin:0}
.device-banner{border-color:#174a36;color:var(--green);margin:0}
</style>
