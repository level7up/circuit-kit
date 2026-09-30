# معمل الدواير (Circuit Lab)

Vue 3 + TypeScript app that turns a circuit definition into a full interactive guide: schematic, realistic breadboard, live simulator, selectable alternatives, parts list, build steps, wiring checklist and troubleshooting.

The original single-file page, `parking_light_flicker_guide.html`, is kept as a reference.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # layout, simulation and formatting tests
npm run build      # type-check + production build into dist/
```

Pick a circuit with `?circuit=<id>`; without it the first registered circuit loads.

## Layout

```
src/
  types/circuit.ts        the contract every circuit fills in
  circuits/
    index.ts              registry – add new circuits here
    parking-flicker/      one folder per circuit
  lib/
    breadboard/           geometry, part drawings, selection logic, layout verifier
    schematic-symbols.ts  schematic drawing primitives (resistor, capacitor, NPN, …)
    pinouts.ts            DIP / TO-220 pinout drawings, schematic panel stacking
    format.ts             Ω / µF formatting, resistor colour bands
  composables/            simulation loop, dependency injection
  components/             one component per page section; board/ holds the breadboard
tests/                    Vitest specs
```

## Adding a circuit

1. Copy `src/circuits/parking-flicker/` to `src/circuits/<your-id>/`.
2. Edit the files:

| File | What it holds |
|---|---|
| `simulate.ts` | `Params` (every value an alternative or control can change), `State`, and the `step()` maths. Also the simulator controls, scope traces, readouts and multimeter readings per net. |
| `board-parts.ts` | Breadboard parts. Each pin is `[hole, net]`, e.g. `['g26', 'AIN']`. Holes: rows `a–j`, columns `1–63`, rails `tp tn bn bp`. `s` is the build stage the part appears in. |
| `board.ts` | Board texts, stages, lamp modes and `dynamics`: how params change the drawing (resistor values, hidden parts, labels). |
| `edu.ts` | Beginner explanation per part group, `eduOf` (part id → group) and `alternatives` (each with `st` ok/warn/bad, result text `r`, and `fx` that returns new params). |
| `removal.ts` | What happens when each part is taken off the board: an explanation (`effects`) and `apply()`, which changes the params to match. The tests fail if a part has no entry. |
| `info.ts` | Technical description per part (schematic and board). |
| `schematic.ts`, `schematic-panels.ts` | Schematic tabs and panel drawings. |
| `content.ts` | Hero, overview, pinouts, car install, basics cards, footer. |
| `bom.ts`, `steps.ts`, `wiring.ts`, `trouble.ts` | Parts list, build steps, wiring checklist, troubleshooting. |
| `index.ts` | Assembles the `Circuit` object. |

3. Register it in `src/circuits/index.ts`.
4. Run `npm test`. The breadboard spec runs against **every** registered circuit and fails on shorts (two nets in one strip), reused holes, missing rail holes, nets that are split, unknown nets, parts without beginner text or alternatives, and stages pointing at missing build steps. It checks every build stage, not only the finished board.

Every section except the simulator is optional: leave `car`, `pinouts`, etc. out of the `Circuit` object and the section and its nav link disappear.

## Notes

- Breadboard rails in the included circuit: top = +5V / GND, bottom = GND / +12V.
- Simulation numbers are approximations meant to show behaviour, not SPICE-accurate values.
