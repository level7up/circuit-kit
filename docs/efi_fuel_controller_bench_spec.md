# EFI Fuel-System Controller — Bench Prototype Spec

Implements `efi_fuel_controller_implementation_plan.md` up to the point the plan
allows without system-specific data: a **simulator and electrical bench
prototype**. No fuel, pump, pressure sensor or vehicle is involved. The "pump"
is a 12 V 5 W lamp and the "pressure sensor" is a potentiometer that produces a
0.5–4.5 V ratiometric signal.

Kit id: `fuel-bench` (`?circuit=fuel-bench`).

## 1. Requirements questionnaire (all still open)

| # | Parameter | Answer |
|---|---|---|
| 1 | Engine and EFI system, or confirmation this is a test bench only | — |
| 2 | Pump make/model, rated voltage and current, **manufacturer-approved control method** (on/off, PWM, dedicated module) | — |
| 3 | Fuel type | — |
| 4 | Manufacturer-specified pressure range and expected flow | — |
| 5 | Return-style or returnless | — |
| 6 | Pressure sensor model, range, output type, fuel compatibility | — |
| 7 | What the knob commands: pressure target, pump command, or bench flow request | Bench: pump command (duty %) |
| 8 | Installation environment and applicable automotive safety requirements | — |

Until 1–6 and 8 are answered, nothing beyond this bench prototype is designed.

## 2. Block diagram

```
12V adapter ─ fuse 2A ─ D1 1N5408 ─┬─ D2 P6KE18A / C1 / C2 ─ GND
                                    ├─ Nano VIN
                                    └─ S1 (hardware enable) ─ LAMP+ ─ lamp ─ LAMP− ─ Q1 IRLZ44N ─ GND
                                                   │                          │          │
                                         47k/10k ─ A2 (arm sense)    47k/10k ─ A3   D9 ─ 220Ω ─ G, 100k ─ GND
sensor pot ─ 1k ─ A0 (100k pulldown, 100nF)
knob pot   ─────── A1 (100k pulldown)
button ─ D2 (pull-up)   RUN LED ─ D7   FAULT LED ─ D8   LCD 1602 I2C ─ A4/A5
```

## 3. Risk analysis and fail-safe states

| Hazard / fault | Detection | Response | Independent backstop |
|---|---|---|---|
| Output on at power-up or reset | — | Gate driven low first in `setup()`; state starts `DISABLED` | R11 100k gate pulldown |
| Automatic restart after reboot or fault | — | Only a short press in `READY` with knob ≤ 5 % and S1 on starts | — |
| Sensor wire open | raw < 0.25 V for 100 ms | F1, latch, output off | R2 pulls A0 to 0 V |
| Sensor shorted to 5 V | raw > 4.75 V for 100 ms | F2, latch | — |
| Over-pressure (any active state) | filtered > high % for 100 ms | F3, latch | — |
| Under-pressure while running | filtered < low % for 100 ms after priming time | F4, latch | — |
| MOSFET shorted / lamp open | S1 on, output off, drain < threshold for 100 ms (self test and ready) | F5, latch, start refused | **S1** is the only cut for a shorted MOSFET |
| Firmware hang | AVR watchdog 250 ms | MCU reset → gate low → boots latched F6 | R11 |
| Invalid calibration profile | `isProfileValid` at boot | F7, latch, cannot be cleared by button | — |
| Knob wire open | — | R3 pulls request to 0 % | — |
| Overcurrent / short | — | — | Inline 2 A fuse |
| Reverse polarity / transients | — | — | D1, D2 |

Latching: every fault stores its code in EEPROM; a power cycle comes back
latched. Reset requires a ≥ 2 s press **and** sensor in range **and** pressure
not above the high limit **and** knob ≤ 5 %, then a full self test.

Not detected: MOSFET short while running (PWM masks the drain check); the
over-pressure check is the only coverage there. Pressure says nothing about
air/fuel ratio.

## 4. Schematic and BOM

Netlist: `src/circuits/fuel-bench/board.ts` (`SCHEMATIC`, `NANO_NETS`), laid
out on a 30 × 18 perfboard and checked by `verifyPerfboard` at every build
stage. BOM: `src/circuits/fuel-bench/bom.ts`. Ratings are for the bench lamp
only; a real pump needs a driver approved for that pump.

## 5. Firmware

- `firmware/fuel_bench/controller.h`: pure, header-only state machine
  (`DISABLED → SELF_TEST → READY → RUNNING`, any fault → `FAULT_LATCHED`).
  `step(controller, inputs, profile)` returns a new controller; no I/O.
- `firmware/fuel_bench/fuel_bench.ino`: I/O, 10 ms tick, watchdog, EEPROM
  fault log, LCD, serial commands `c` (raw readings), `l` (fault log), `w`
  (deliberate hang for the watchdog test).
- `src/circuits/fuel-bench/controller.ts`: rule-for-rule TypeScript port that
  drives the web simulator. The two test suites assert the same cases.
- Tests: `npm run test:firmware` (native C++, 49 checks) and `npm test`
  (`tests/fuel-bench-controller.spec.ts`, `tests/fuel-bench.spec.ts`).
- Needs: Arduino Nano with the **new bootloader** (Optiboot); the old Nano
  bootloader can reset-loop on a watchdog reset. Library: LiquidCrystal I2C.

## 6. Calibration and fault codes

`BENCH_PROFILE` values are ADC counts and **percent of sensor span**, not
pressure units:

| Field | Value | Meaning |
|---|---|---|
| sensorOpenBelow / sensorShortAbove | 51 / 972 | 0.25 V / 4.75 V |
| sensorZero / sensorSpan | 102 / 819 | 0.5 V / 4.0 V |
| pressureLowPct / pressureHighPct | 25 / 85 | bench limits |
| minDutyPct / maxDutyPct | 30 / 80 | output clamp |
| startKnobMaxPct | 5 | knob must be at zero to start or reset |
| armOnAbove / drainHighAbove | 200 | ≈ 5.7 V on the 12 V side |
| selfTestMs / primeMs / faultPersistMs / resetHoldMs / debounceMs | 1000 / 2000 / 100 / 2000 / 30 | timing |

Procedure: measure the real 5 V rail; set the sensor input to 0.50 V and
4.50 V with a meter and record the `c` readings as `sensorZero` and
`sensorZero + sensorSpan`; confirm arm/drain read ≥ 400 with S1 on. A real
sensor is calibrated against a reference gauge on a prepared bench, into a new
profile named for that system.

Fault codes: F1 sensor open, F2 sensor short, F3 over-pressure, F4
under-pressure, F5 output fault, F6 watchdog, F7 bad profile.

## 7. Bench test plan and acceptance

| Test | Pass criterion |
|---|---|
| Power-cycle 5× | Lamp off, `READY`, never starts by itself |
| Start with knob > 5 % or S1 off | Refused |
| Start with knob 0, S1 on | Runs at 30 %, follows knob, capped at 80 % |
| S1 off while running | Returns to `READY`, lamp off |
| Sensor pot to either end | F1 / F2, lamp off, latched |
| Sensor high / low (after 2 s) while running | F3 / F4 |
| Remove lamp in `READY` | F5, start refused |
| Serial `w` while running | Lamp off < 1 s, boots latched F6 |
| Power-cycle while latched | Still latched |
| Short press while latched | Ignored |
| Long press with cause present / knob up | Refused |
| Long press with cause cleared | Self test → `READY`, no start |
| Serial `l` | Log shows every injected fault |

Record results per test before signing off.

## 8. Validation status

| Item | Status |
|---|---|
| Controller logic (TS and C++) | Unit-tested on host, passing |
| Simulator scenarios incl. watchdog, power cycle, shorted MOSFET | Tested, passing |
| Perfboard netlist and build-stage shorts | Verified by test |
| `fuel_bench.ino` compiling for AVR | **Not verified** (no AVR toolchain in the dev environment) |
| Hardware bench test (§7) | **Not performed** |
| Any pump, sensor, fuel, engine or vehicle | **Out of scope; not validated; no compatibility is claimed** |
