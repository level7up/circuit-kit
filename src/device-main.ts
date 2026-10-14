import { createApp } from 'vue'
import TempraApp from './components/tempra/TempraApp.vue'
import './styles/main.css'

createApp(TempraApp, { standalone: true }).mount('#app')
