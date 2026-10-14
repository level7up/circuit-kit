import { TITLE, hex, type Block } from './protocol'

export const FAULT_SOURCE = 'fiat-tipo.ru/fpost8823.html via Fabio3rs/Monomotronic-MA1.7-Scanner'
export const STATUS_PRESENT = 0x1e

type Text = Readonly<{ ar: string; en: string }>
type TextList = Readonly<{ ar: readonly string[]; en: readonly string[] }>

export interface FaultInfo {
  readonly code: number
  readonly short: string
  readonly part: Text
  readonly meaning: Text
  readonly causes: TextList
  readonly checks: TextList
  readonly engineOffNormal?: boolean
}

export interface FaultReport {
  readonly raw: readonly number[]
  readonly code: number | null
  readonly codeHex: string
  readonly status: number | null
  readonly present: boolean
  readonly info: FaultInfo | null
}

const WIRING_AR = 'راجع الفيشة: صدا، أو ريشة مفتوحة، أو سلك مقطوع أو مقشور (والمفتاح مقفول).'
const WIRING_EN = 'Inspect the connector for corrosion, a loose pin, or a cut or chafed wire (key off).'

export const FAULTS: readonly FaultInfo[] = [
  {
    code: 0x1a01, short: 'IDLE ACTUATOR',
    part: { ar: 'موتور الرالنتي (Stepper)', en: 'Idle actuator (stepper motor)' },
    meaning: { ar: 'إشارة موتور الرالنتي مش سليمة: ممكن يكون عطلان أو مزنوق.', en: 'Idle actuator signal is wrong: the motor may be faulty or stuck.' },
    causes: { ar: ['ضفيرة أو فيشة الموتور', 'الموتور مزنوق من الكربون', 'الموتور نفسه عطلان'], en: ['Actuator wiring or connector', 'Actuator stuck with carbon', 'Faulty actuator'] },
    checks: { ar: [WIRING_AR, 'بص على بوابة الهوا من فوق: فيه كربون تقيل حوالين الموتور؟'], en: [WIRING_EN, 'Look into the throttle body: heavy carbon around the actuator?'] }
  },
  {
    code: 0x0302, short: 'CRANK SENSOR', engineOffNormal: true,
    part: { ar: 'حساس لفات الكرنك', en: 'Crankshaft speed sensor' },
    meaning: { ar: 'مفيش إشارة من حساس الكرنك. ده طبيعي لو الموتور مطفي وانت بتقرا.', en: 'No signal from the crank sensor. Normal if the engine is off while reading.' },
    causes: { ar: ['الموتور مطفي وقت القراية', 'فيشة أو سلك الحساس', 'الحساس بعيد عن الترس أو عطلان'], en: ['Engine off while reading', 'Sensor connector or wiring', 'Sensor gap too large, or faulty sensor'] },
    checks: { ar: ['لو قريت والموتور مطفي، الكود ده متوقع. متعتبرهوش عطل إلا لو الموتور بيدور بصعوبة أو بيطفي لوحده.', WIRING_AR], en: ['If you read with the engine off, this code is expected. Only treat it as a fault if the engine is hard to start or stalls.', WIRING_EN] }
  },
  {
    code: 0x0402, short: 'IDLE SWITCH',
    part: { ar: 'سويتش الرالنتي في موتور الرالنتي', en: 'Idle switch in the idle actuator' },
    meaning: { ar: 'سويتش الرالنتي فيه قفلة على الأرضي أو على التغذية.', en: 'Idle switch circuit shorted to ground or to supply.' },
    causes: { ar: ['سلك مقشور لامس الشاسيه أو سلك تاني', 'فيشة موتور الرالنتي', 'السويتش جوه الموتور'], en: ['Chafed wire touching chassis or another wire', 'Idle actuator connector', 'Switch inside the actuator'] },
    checks: { ar: [WIRING_AR], en: [WIRING_EN] }
  },
  {
    code: 0x0602, short: 'TPS',
    part: { ar: 'حساس البدال (TPS)', en: 'Throttle position sensor (TPS)' },
    meaning: { ar: 'قراية حساس البدال برّه الحدود.', en: 'Throttle position reading out of range.' },
    causes: { ar: ['فيشة أو سلك الحساس', 'الحساس متآكل من جوه', 'الحساس متحرك من مكانه'], en: ['Sensor connector or wiring', 'Worn sensor track', 'Sensor moved from its position'] },
    checks: { ar: [WIRING_AR, 'المفتاح ON والموتور مطفي: الملتيميتر على سلك الإشارة، والجهد لازم يزيد بنعومة وانت بتدوس البدال، من غير قفزات.'], en: [WIRING_EN, 'Key ON, engine off: the signal wire voltage should rise smoothly as you press the pedal, without jumps.'] }
  },
  {
    code: 0x0a02, short: 'COOLANT TEMP',
    part: { ar: 'حساس حرارة المية', en: 'Coolant temperature sensor' },
    meaning: { ar: 'قراية حساس حرارة المية غلط.', en: 'Coolant temperature sensor reading is wrong.' },
    causes: { ar: ['فيشة الحساس مصدّية أو مفصولة', 'سلك مقطوع أو مقفول', 'الحساس نفسه'], en: ['Corroded or unplugged sensor connector', 'Open or shorted wire', 'Faulty sensor'] },
    checks: { ar: [WIRING_AR, 'المفتاح مقفول والفيشة مفصولة: قيس مقاومة الحساس. على البارد بتبقى كام كيلو أوم، وبتقل لما الموتور يسخن.'], en: [WIRING_EN, 'Key off, connector unplugged: measure the sensor. Cold it reads a few kΩ, and it drops as the engine warms.'] }
  },
  {
    code: 0x0b02, short: 'AIR TEMP',
    part: { ar: 'حساس حرارة الهوا', en: 'Intake air temperature sensor' },
    meaning: { ar: 'دايرة حساس حرارة الهوا مفتوحة أو مقفولة على الأرضي أو التغذية.', en: 'Air temperature sensor circuit open, or shorted to ground or supply.' },
    causes: { ar: ['فيشة الحساس', 'سلك مقطوع أو مقشور', 'الحساس نفسه'], en: ['Sensor connector', 'Cut or chafed wire', 'Faulty sensor'] },
    checks: { ar: [WIRING_AR, 'المفتاح مقفول والفيشة مفصولة: الحساس لازم يقرا مقاومة (مش صفر ومش مفتوح).'], en: [WIRING_EN, 'Key off, connector unplugged: the sensor must read a resistance (neither zero nor open).'] }
  },
  {
    code: 0x0d02, short: 'LAMBDA',
    part: { ar: 'حساس الأكسجين (Lambda)', en: 'Oxygen sensor (lambda)' },
    meaning: { ar: 'إشارة حساس الأكسجين مش سليمة.', en: 'Oxygen sensor signal problem.' },
    causes: { ar: ['الحساس قديم أو متسمم', 'تهريب في الشكمان قبل الحساس', 'سلك أو فيشة الحساس'], en: ['Old or contaminated sensor', 'Exhaust leak before the sensor', 'Sensor wiring or connector'] },
    checks: { ar: [WIRING_AR, 'اسمع صوت تهريب في الشكمان قريب من المنيفولد والموتور شغال.'], en: [WIRING_EN, 'Listen for an exhaust leak near the manifold with the engine running.'] }
  },
  {
    code: 0x3102, short: 'MIXTURE',
    part: { ar: 'تصحيح خليط البنزين والهوا', en: 'Fuel mixture correction' },
    meaning: { ar: 'الكمبيوتر وصل لآخر حد في تصحيح الخليط: الخليط فقير أو غني زيادة.', en: 'The ECU reached its mixture correction limit: running too lean or too rich.' },
    causes: { ar: ['تهريب هوا (خرطوم مفكوك أو مشقوق)', 'ضغط بنزين ضعيف أو فلتر مسدود', 'رشاش وسخان', 'حساس الأكسجين'], en: ['Vacuum leak (loose or cracked hose)', 'Low fuel pressure or blocked filter', 'Dirty injector', 'Oxygen sensor'] },
    checks: { ar: ['والموتور شغال: اسمع صفير تهريب هوا حوالين بوابة الهوا والخراطيم.', 'اسأل عن آخر مرة اتغيّر فلتر البنزين.'], en: ['Engine running: listen for a vacuum hiss around the throttle body and hoses.', 'Find out when the fuel filter was last changed.'] }
  },
  {
    code: 0x0303, short: 'CRANK SYNC',
    part: { ar: 'حساس الكرنك (التزامن)', en: 'Crankshaft sensor (synchronisation)' },
    meaning: { ar: 'إشارة الكرنك موجودة بس الكمبيوتر مش قادر يلاقي مكان الترس الصح.', en: 'Crank signal present, but the ECU cannot find the reference position.' },
    causes: { ar: ['شوشرة على سلك الحساس', 'ترس الحساس فيه سنة مكسورة أو وسخ', 'الحساس نفسه'], en: ['Interference on the sensor wire', 'Damaged or dirty reluctor teeth', 'Faulty sensor'] },
    checks: { ar: [WIRING_AR, 'شوف السلك ماشي بعيد عن كابلات البوجيهات.'], en: [WIRING_EN, 'Check the wire runs away from the spark plug leads.'] }
  },
  {
    code: 0x3a46, short: 'IMMOBILIZER',
    part: { ar: 'الإيموبلايزر', en: 'Immobilizer' },
    meaning: { ar: 'الإيموبلايزر شغال: الكمبيوتر مانع الموتور يدور.', en: 'Immobilizer active: the ECU is blocking the engine.' },
    causes: { ar: ['المفتاح مش متبرمج', 'دايرة الإيموبلايزر'], en: ['Key not programmed', 'Immobilizer circuit'] },
    checks: { ar: ['جرّب المفتاح الاحتياطي.'], en: ['Try the spare key.'] }
  },
  {
    code: 0xffff, short: 'ECU / LINK',
    part: { ar: 'الكمبيوتر أو الاتصال', en: 'ECU or connection' },
    meaning: { ar: 'خطأ عام: عطل في الكمبيوتر، أو اتصال مش سليم.', en: 'General error: ECU fault, or a bad connection.' },
    causes: { ar: ['توصيلة الأدابتر أو الأرضي', 'الكمبيوتر نفسه'], en: ['Adapter or ground connection', 'The ECU itself'] },
    checks: { ar: ['افصل ووصّل تاني، واقرا مرة كمان قبل أي استنتاج.'], en: ['Disconnect, reconnect and read again before drawing any conclusion.'] }
  }
]

const byCode = new Map(FAULTS.map(f => [f.code, f]))

export function decodeFault(block: Block): FaultReport {
  const raw = block.data
  const usable = block.title === TITLE.errorData && raw.length >= 3
  const code = usable ? raw[0] | (raw[1] << 8) : null
  const status = usable ? raw[2] : null
  return {
    raw,
    code,
    codeHex: code === null ? hex(raw) : code.toString(16).toUpperCase().padStart(4, '0'),
    status,
    present: status === STATUS_PRESENT,
    info: code === null ? null : byCode.get(code) ?? null
  }
}
