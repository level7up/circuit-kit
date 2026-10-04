export type Html = string

export interface Point {
  x: number
  y: number
}

export interface InfoEntry {
  n: string
  v: string
  t: string
  p?: string
}

export interface TitledCard {
  title: string
  body: Html
}

export interface KindCard extends TitledCard {
  kind: 'ok' | 'warn' | 'danger'
}

export interface HeroMeta {
  tag: string
  titleHtml: Html
  lead: string
  stats: { value: string; label: string }[]
  bulbCaption: string
}

export interface OverviewDef {
  title: string
  sub: string
  stages: { icon: string; stage: string; title: string; body: Html }[]
  cards: KindCard[]
}

export interface SchematicTab {
  key: string
  label: string
}

export interface SchematicDef {
  title: string
  sub: string
  tabs: SchematicTab[]
  note: Html
  legend: { label: string; color: string }[]
  render: (tab: string) => { viewBox: string; svg: string }
  info: Record<string, InfoEntry>
  emptyInfo: Html
}

export interface PinoutDef {
  title: string
  sub: string
  chips: string[]
  polarity: TitledCard[]
}

export interface BomGroup {
  g: string
}

export interface BomItem {
  n: string
  s: string
  q: number
  p: number
  u?: string
  on: number
  est?: number
  car?: number
}

export type BomRow = BomGroup | BomItem

export interface BomDef {
  title: string
  sub: Html
  rows: BomRow[]
  footnote: Html
}

export interface BuildStep {
  t: string
  m: string
  b: Html
  c: string[]
  x: Html
}

export interface StepsDef {
  title: string
  sub: Html
  items: BuildStep[]
}

export interface WireGroup {
  g: string
  i: string[]
}

export interface WiringDef {
  title: string
  sub: string
  groups: WireGroup[]
}

export interface CarDef {
  title: string
  sub: string
  svg: () => string
  cards: KindCard[]
}

export interface TroubleItem {
  q: string
  a: string[]
}

export interface TroubleDef {
  title: string
  sub: string
  items: TroubleItem[]
}

export type PartKind =
  | 'res' | 'diode' | 'tvs' | 'ceramic' | 'can' | 'to220' | 'dip'
  | 'jumper' | 'wire' | 'adapter' | 'fuse' | 'lamp' | 'led' | 'rt'

export type Pin = [hole: string, net: string]

export interface BoardPart {
  id: string
  k: PartKind
  s: number
  pins: Pin[]
  lab?: string
  nets?: string[]
  link?: string[]
  note?: string
  pn?: string[]
  t?: string
  via?: string[]
  pts?: (string | Point)[]
  at?: Point
  r?: number
  lbl?: string
  ohm?: number
  info?: string
  mode?: string
}

export interface BoardStage {
  s: number
  b: string
  d: string
  step?: number
}

export type BoardLabel = [x: number, y: number, text: string, anchor: 'start' | 'middle' | 'end', sub?: string]

export interface NetDef {
  n: string
  c: string
}

export interface EduEntry {
  ic: string
  n: string
  short: string
  what: string
  why: string
}

export type AltStatus = 'ok' | 'warn' | 'bad'

export interface AltOption<P> {
  t: string
  st?: AltStatus
  r?: string
  fx?: (p: P) => P
}

export interface LampMode {
  key: string
  switchLabel: string
}

export interface BoardDynamics<P> {
  hidden: (p: P) => Set<string>
  ohm: (partId: string, p: P) => number | undefined
  labelText: (partId: string, base: string, p: P) => string
  labelSub: (partId: string, base: string, p: P) => string
  partText: (partId: string, p: P) => string | undefined
  lampMode: (p: P) => string
  withLampMode: (p: P, mode: string) => P
  lampModeForStage: (stage: number) => string
  glowColor: (p: P) => string
  partVariant: (partId: string, p: P) => string | undefined
  partDead: (p: P) => boolean
}

export interface RemovalEffect {
  st: AltStatus
  r: string
}

export interface BoardRemoval<P> {
  effects: Record<string, RemovalEffect>
  apply: (p: P, removed: Set<string>) => P
}

export interface BoardDef<P> {
  title: string
  sub: string
  viewBox: string
  readingGuide: Html
  jumperHint: string
  parts: BoardPart[]
  stages: BoardStage[]
  labels: Record<string, BoardLabel>
  nets: Record<string, NetDef>
  netChips: string[]
  wireColors: Record<string, string>
  wireNames: Record<string, string>
  railNames: Record<string, string>
  railNets: Record<string, string>
  partInfo: Record<string, InfoEntry>
  edu: Record<string, EduEntry>
  eduOf: Record<string, string>
  eduFallback: string
  alternatives: Record<string, AltOption<P>[]>
  basics: TitledCard[]
  lampModes: LampMode[]
  dynamics: BoardDynamics<P>
  removal: BoardRemoval<P>
}

export interface SimControl<P> {
  key: string
  label: string
  options: number[]
  format: (v: number) => string
  get: (p: P) => number
  set: (p: P, v: number) => P
  hint: (p: P) => string
  isDefault: (v: number) => boolean
}

export interface TraceDef<S> {
  key: string
  label: string
  color: string
  height: number
  max: number
  value: (s: S) => number
  fill?: boolean
  threshold?: { value: number; label: string }
  topLabel?: string
}

export interface Readout<S, P> {
  label: string
  value: (s: S, p: P) => string
}

export interface SimModel<P, S> {
  title: string
  sub: string
  note: string
  footnote: string
  defaults: P
  controls: SimControl<P>[]
  traces: TraceDef<S>[]
  readouts: Readout<S, P>[]
  init: (p: P) => S
  step: (s: S, p: P, dt: number) => void
  brightness: (s: S) => number
  netReading: (net: string, s: S, p: P) => string
}

export interface CircuitCard {
  icon: string
  summary: string
  level: string
}

export type Hole = [x: number, y: number]

export type PerfKind = 'res' | 'resUp' | 'diode' | 'tvs' | 'ceramic' | 'can' | 'to220' | 'dip' | 'pad'

export interface PerfPart {
  id: string
  k: PerfKind
  s: number
  legs: Hole[]
  nets: string[]
  lab: string
  val: string
  tip: string
  ohm?: number
  color?: string
  face?: 'up' | 'down' | 'left' | 'right'
  optional?: boolean
  labelAt?: [dx: number, dy: number]
}

export interface PerfTrace {
  net: string
  s: number
  pts: Hole[]
}

export interface PerfLayout {
  cols: number
  rows: number
  parts: PerfPart[]
  traces: PerfTrace[]
  nets: Record<string, NetDef>
}

export interface AssemblyPhase extends BuildStep {
  s: number
}

export interface AssemblyDef {
  title: string
  sub: Html
  intro: KindCard[]
  layout: PerfLayout
  boardNote: Html
  skills: TitledCard[]
  phases: AssemblyPhase[]
  mistakes: KindCard[]
}

export interface Circuit<P, S> {
  id: string
  title: string
  card: CircuitCard
  hero: HeroMeta
  overview?: OverviewDef
  schematic?: SchematicDef
  board?: BoardDef<P>
  sim: SimModel<P, S>
  pinouts?: PinoutDef
  bom?: BomDef
  steps?: StepsDef
  wiring?: WiringDef
  assembly?: AssemblyDef
  car?: CarDef
  trouble?: TroubleDef
  footer: string
}

export type AnyBoard = BoardDef<any>
export type AnyAlt = AltOption<any>
