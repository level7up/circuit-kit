import type { SchematicDef } from '../../types/circuit'
import { Panel } from '../../lib/schematic-symbols'
import { stackPanels, type SchematicPanel } from '../../lib/pinouts'
import { partInfo } from './info'
import { panelDrive, panelMix, panelOsc, panelPower } from './schematic-panels'

const PANELS: Record<string, SchematicPanel> = {
  power: { height: 312, num: '1', title: 'الحماية والباور', sub: '+12V → +5V', draw: panelPower },
  osc: { height: 312, num: '2', title: 'المذبذبات التلاتة', sub: 'U1 = CD40106', draw: panelOsc },
  mix: { height: 292, num: '3', title: 'الخلط والتنعيم', sub: 'A + B + C → N', draw: panelMix },
  drive: { height: 332, num: '4', title: 'تشغيل اللمبة', sub: 'N → TIP122 → LAMP', draw: panelDrive }
}

export const schematic: SchematicDef = {
  title: 'رسمة الدايرة الكاملة',
  sub: 'دوس على أي قطعة في الرسمة عشان تشوف هي بتعمل إيه، وقيمتها، وإزاي تركّبها صح.',
  tabs: [
    { key: 'all', label: 'الدايرة كاملة' },
    { key: 'power', label: '① الباور والحماية' },
    { key: 'osc', label: '② المذبذبات' },
    { key: 'mix', label: '③ الخلط والتنعيم' },
    { key: 'drive', label: '④ تشغيل اللمبة' }
  ],
  note: '💡 الدايرة مقسومة 4 أجزاء عشان تبقى واضحة. <b>المربعات الملونة</b> (<b style="color:#f87171">+12V</b>، <b style="color:#fb923c">+5V</b>، <b style="color:#60a5fa">A B C</b>، <b style="color:#a78bfa">N</b>) معناها إن كل النقط اللي عليها نفس الاسم <b>متوصلة ببعض بسلك</b>، حتى لو في جزء تاني. ورمز ⏚ = الأرضي، وكله متوصل ببعض. دوس على أي جزء من فوق عشان تكبّره.',
  legend: [
    { label: '+12V محمي', color: 'var(--red)' },
    { label: '+5V', color: 'var(--amber)' },
    { label: 'المذبذبات', color: 'var(--blue)' },
    { label: 'النقطة N', color: 'var(--violet)' },
    { label: 'اللمبة', color: 'var(--green)' }
  ],
  render: tab => stackPanels(tab === 'all' ? Object.values(PANELS) : [PANELS[tab]], Panel),
  info: partInfo,
  emptyInfo: '<h3>👆 دوس على أي قطعة</h3><p style="color:var(--muted);margin:0">هيظهر هنا شرح القطعة. ابدأ من <b>IN</b> على الشمال وامشي مع الكهربا لحد اللمبة.</p>'
}
