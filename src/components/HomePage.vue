<script setup lang="ts">
import { circuitHref, circuits } from '../circuits'
import { lessonMeta } from '../learn/breadboard-lesson'

document.title = 'معمل الدواير – اختار دايرتك'
</script>

<template>
  <header class="hero home-hero">
    <div class="wrap">
      <span class="tag">معمل الدواير · DIY</span>
      <h1>اختار <span class="grad">الدايرة</span> اللي عايز تبنيها</h1>
      <p class="lead">كل دايرة معاها رسمتها، وشكلها على البريد بورد زي الحقيقة، ومحاكي يوريك هتشتغل إزاي، وقائمة المكونات، وخطوات التنفيذ خطوة بخطوة.</p>
    </div>
  </header>
  <main class="wrap home">
    <h2 class="home-count">🔰 لو أول مرة، ابدأ من هنا</h2>
    <div class="kit-grid">
      <a class="card kit-card learn-card" href="?learn=breadboard">
        <div class="kit-icon" aria-hidden="true">{{ lessonMeta.icon }}</div>
        <span class="tag">{{ lessonMeta.tag }}</span>
        <h3>{{ lessonMeta.title }}</h3>
        <p>{{ lessonMeta.summary }}</p>
        <div class="kit-foot">
          <span class="kit-level">{{ lessonMeta.level }}</span>
          <span class="btn pri">ابدأ الدرس ←</span>
        </div>
      </a>
      <a class="card kit-card learn-card lab-card" href="?lab=sandbox">
        <div class="kit-icon" aria-hidden="true">🧪</div>
        <span class="tag">معمل حر · جرّب بإيدك</span>
        <h3>ركّب دايرتك بنفسك وشوفها بتشتغل</h3>
        <p>اسحب مقاومات وLED ومفاتيح وسلوك على البريد بورد، واختار جهد المصدر، وشوف الـ LED بينوّر ولا بيتحرق، وليه.</p>
        <div class="kit-foot">
          <span class="kit-level">بعد الدرس الأول</span>
          <span class="btn pri">افتح المعمل ←</span>
        </div>
      </a>
    </div>
    <h2 class="home-count">{{ circuits.length }} {{ circuits.length === 1 ? 'دايرة متاحة' : 'دواير متاحة' }}</h2>
    <div class="kit-grid">
      <a v-for="c in circuits" :key="c.id" class="card kit-card" :href="circuitHref(c.id)">
        <div class="kit-icon" aria-hidden="true">{{ c.card.icon }}</div>
        <span class="tag">{{ c.hero.tag }}</span>
        <h3>{{ c.title }}</h3>
        <p>{{ c.card.summary }}</p>
        <div class="kit-stats">
          <span v-for="s in c.hero.stats" :key="s.label" class="kit-stat"><b>{{ s.value }}</b> {{ s.label }}</span>
        </div>
        <div class="kit-foot">
          <span class="kit-level">{{ c.card.level }}</span>
          <span class="btn pri">ابدأ ←</span>
        </div>
      </a>
    </div>
  </main>
  <footer>معمل الدواير · أدلة تعليمية تفاعلية</footer>
</template>
