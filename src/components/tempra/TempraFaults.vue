<script setup lang="ts">
import { computed } from 'vue'
import { FAULT_SOURCE, decodeFault } from '../../tempra/faults'
import type { Lang, Strings } from '../../tempra/i18n'
import { hex, type Reply } from '../../tempra/protocol'

const props = defineProps<{ reply: Reply; lang: Lang; t: Strings }>()

const reports = computed(() => props.reply.blocks.map(b => ({ key: b.counter, report: decodeFault(b) })))
</script>

<template>
  <section class="card faults">
    <h3>{{ t.errorsTitle }}</h3>
    <p v-if="reply.rejected" class="note bad">{{ t.rejected }}</p>
    <p v-else-if="reports.length === 0">{{ t.noErrors }}</p>
    <template v-else>
    <article v-for="{ key, report } in reports" :key="key" class="fault">
      <header>
        <b>{{ report.info ? report.info.part[lang] : t.unknownCode }}</b>
        <span class="badge">{{ t.unverified }}</span>
      </header>
      <p class="meta">
        {{ t.codeLabel }} <bdi class="hex">{{ report.codeHex }}</bdi>
        <template v-if="report.status !== null"> · {{ report.present ? t.statusPresent : t.statusOther }} <bdi v-if="!report.present" class="hex">{{ hex([report.status]) }}</bdi></template>
      </p>
      <template v-if="report.info">
        <p>{{ report.info.meaning[lang] }}</p>
        <details>
          <summary>{{ t.causesTitle }}</summary>
          <ul><li v-for="c in report.info.causes[lang]" :key="c">{{ c }}</li></ul>
        </details>
        <details>
          <summary>{{ t.checksTitle }}</summary>
          <ul><li v-for="c in report.info.checks[lang]" :key="c">{{ c }}</li></ul>
        </details>
      </template>
      <p class="raw-bytes">{{ t.rawLabel }}: <code dir="ltr">{{ hex(report.raw) }}</code></p>
    </article>
    </template>
    <p class="note">{{ t.confidenceNote }}</p>
    <p class="note src">{{ t.sourceLabel }}: <span dir="ltr">{{ FAULT_SOURCE }}</span></p>
  </section>
</template>

<style scoped>
.fault{border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:10px 0;background:var(--panel2)}
.fault header{display:flex;justify-content:space-between;gap:10px;align-items:center}
.badge{font-size:12px;color:var(--amber);border:1px solid var(--amber);border-radius:999px;padding:0 10px}
.meta{color:var(--muted);font-size:13px;margin:2px 0 6px}
.hex{font-family:Consolas,monospace;direction:ltr}
details{margin:4px 0}
summary{cursor:pointer;color:var(--blue)}
ul{margin:4px 0;padding-inline-start:20px}
.raw-bytes{font-size:13px;color:var(--muted);margin:6px 0 0}
.note{color:var(--muted);font-size:14px;margin:8px 0 0}
.bad{color:var(--red)}
.src{font-size:12px}
code{font-family:Consolas,monospace;background:var(--bg);padding:1px 6px;border-radius:6px}
</style>
