import type { SceneFrame } from '../../types/circuit'
import { COLORS, adapter, label, meter, scene, wire } from '../../lib/scene/draw'
import { nets } from './board'

const board = (x: number, y: number): string =>
  `<rect x="${x}" y="${y}" width="190" height="130" rx="8" fill="#c9a76a" stroke="#6b5531" stroke-width="2"/>` +
  `<rect x="${x + 40}" y="${y + 40}" width="110" height="44" rx="4" fill="#0f766e" stroke="#134e4a"/>` +
  label(x + 95, y + 67, 'Nano', { size: 13 }) + label(x + 95, y + 118, 'البورد', { size: 12, color: '#1b2333' })

const fuse = (x: number, y: number): string =>
  `<rect x="${x}" y="${y - 12}" width="44" height="24" rx="5" fill="#2a1414" stroke="${COLORS.plus}" stroke-width="2"/>` +
  label(x + 22, y + 5, '2A', { size: 12, color: '#ff9a9a' })

const rocker = (x: number, y: number): string =>
  `<rect x="${x}" y="${y}" width="34" height="50" rx="5" fill="#111" stroke="#566179" stroke-width="2"/><rect x="${x + 5}" y="${y + 5}" width="24" height="20" rx="3" fill="#ef4444"/>` +
  label(x + 17, y + 68, 'S1', { size: 12 })

const bulb = (x: number, y: number, lit: boolean): string =>
  (lit ? `<circle cx="${x}" cy="${y}" r="40" fill="#ffd27a" opacity=".3"/>` : '') +
  `<circle cx="${x}" cy="${y}" r="20" fill="${lit ? '#ffd27a' : '#2a3242'}" stroke="#8a96a8" stroke-width="2"/>` +
  label(x, y + 42, 'لمبة 5W', { size: 12, color: COLORS.muted })

export const loadScene: SceneFrame[] = [
  {
    say: 'الكهربا: أدابتر 12V ← <b>فيوز 2A</b> ← البورد. ومن البورد <b>S1</b> ← اللمبة ← <b>LAMP−</b> (الموسفت). سلك رفيع من بعد S1 لـ <b>LAMP+</b> عشان الأردوينو يعرف S1 مفتوح ولا لأ.',
    svg: scene(
      adapter(20, 40, [120, 196], [212, 250]),
      fuse(120, 196), wire([[164, 196], [212, 196]], COLORS.plus, 3),
      board(212, 170),
      wire([[300, 170], [300, 120], [360, 120]], nets.VP.c, 3), rocker(360, 95),
      wire([[394, 120], [470, 120]], nets.LP.c, 3), bulb(500, 120, true),
      wire([[380, 145], [380, 160], [340, 160], [340, 170]], nets.LP.c, 2),
      wire([[520, 140], [520, 230], [402, 230]], nets.DRN.c, 3),
      label(300, 110, 'S1', { size: 11, color: nets.VP.c }), label(450, 110, 'LAMP+', { size: 11, color: nets.LP.c }),
      label(460, 222, 'LAMP−', { size: 11, color: nets.DRN.c })
    ),
    spots: [
      { x: 142, y: 170, t: 'فيوز 2A', d: 'أول حاجة بعد الأدابتر. لو حصل قصر في أي حتة، الفيوز يتحرق بدل السلك أو الأدابتر.' },
      { x: 377, y: 180, t: 'S1 = القفل اليدوي', d: 'بيقطع كهربا اللمبة بإيده. لو الموسفت ضرب أو الكود هنّج، S1 هو اللي بيطفّيها. ده اللي الخطة بتسميه <b>Hardware interlock</b>.' },
      { x: 500, y: 60, t: 'ليه لمبة مش طرمبة؟', d: 'اللمبة بتوريك الخرج من غير بنزين ولا ضغط حقيقي. أي غلطة على المكتب = لمبة بتنوّر في وقت غلط، مش حريقة.' }
    ]
  }
]

export const drainTestScene: SceneFrame[] = [
  {
    say: 'قبل ما تبدأ: S1 مفتوح والمتحكم <b>READY</b>. الملتيميتر بين <b>LAMP−</b> والأرضي لازم يقرا حوالي <b>11V</b>: اللمبة سليمة والموسفت مقفول.',
    svg: scene(
      board(60, 120), bulb(420, 90, false),
      wire([[440, 110], [440, 200], [252, 200]], nets.DRN.c, 3),
      meter(470, 150, '11.2V', [440, 200], [252, 230]),
      wire([[252, 230], [260, 230]], '#2b2b2b', 2)
    ),
    spots: [
      { x: 330, y: 190, t: 'لو قرا 0V', d: 'يا إما اللمبة مش متركّبة، يا إما الموسفت ضارب. الكود هيقول <b>OUTPUT FAULT</b> ومش هيرضى يبدأ، وده المطلوب.' }
    ]
  }
]
