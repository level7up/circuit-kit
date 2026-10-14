# Tempra Diagnostic Handheld: Hardware Design (rev C)

Architecture B from [ecu-identification.md](ecu-identification.md). Protocol: [tempra-protocol.md](tempra-protocol.md). Car connection: [tempra-wiring-guide.md](tempra-wiring-guide.md). Build guide with prices: the site at `?circuit=tempra-diag`. Firmware: `firmware/tempra_diag/tempra_diag.ino`.

**Status: design only, not built, not simulated in SPICE, not connected to the car.** The 3-pin plug readings are *assumed* to match the expected pattern (one pin ≈0 Ω to chassis, one pin ≈12 V with the key on).

Rev B swapped parts for ones stocked by Makers Electronics: P6KE18A (was P6KE20A), 2N2222A (was BC547), 1N5408 (was 1N5822), 470 Ω 1 W (was 510 Ω).

Rev C follows the perfboard layout (`src/circuits/tempra-diag/board.ts`, checked by `tests/tempra-kit.spec.ts`):
- Every ESP32 signal is on the board's left header column: K-line TX = GPIO26, RX = GPIO27, OLED SDA = GPIO13, SCL = GPIO14.
- R9 is removed. GPIO27 uses the ESP32's internal pull-up (about 45 kΩ). If reception is unreliable, fit a 10 kΩ resistor from GPIO27 to 3V3.
- The battery is sensed after D1 (from VK), so D4 is no longer needed. The firmware adds `D1_DROP_V` = 0.9 V back, which makes the reading approximate (about ±0.2 V).

## 1. Block diagram

```text
 Car battery + ──F1 1A──┐
 (adapter red lead)     │
                     D1 1N5408 (reverse polarity)
                        │
                       VK ─┬─ R10/R11 divider ─► GPIO34 (ADC)
                           ├─ D2 P6KE18A ─ GND (transient clamp)
                           ├─ C1 100µF/50V, C2 100nF
                           ├─ U1 LM2596 module ─► 5V ─► ESP32 VIN, LM393 VCC
                           └─ R1 470Ω 1W ─┐
                                          K-LINE ◄─────────────► OBD pin 7 ─► car "K" pin
 ESP32 GPIO26 (TX) ─► Q1 2N2222A ─────────┤  (pulls K low)
 ESP32 GPIO27 (RX) ◄─ U2 LM393 ◄──────────┘  (reads K)
 ESP32 GPIO13/14 ─► SSD1306 OLED (I²C)
 ESP32 GPIO32/33/25 ◄─ 3 buttons
 Car GND ─────────────── device GND (OBD pins 4+5 ─► car "ground" pin)
```

The car plug's third pin (probably the L-line) is **not connected**.

## 2. Power supply

| Ref | Part | Why |
|-----|------|-----|
| F1 | 1 A blade fuse in an inline holder on the battery lead | Limits a wiring fault to 1 A. Also blows if D2 has to absorb a sustained over-voltage |
| D1 | 1N5408, 3 A / 1000 V | Reverse-polarity block. Drop about 0.9 V (VK = VBAT − 0.9 V) |
| D2 | P6KE18A TVS, 600 W, 15.3 V standoff, 25.2 V clamp | Above 14.8 V maximum charging; clamps below every downstream rating (LM2596 40 V, 2N2222A 30–40 V, LM393 36 V) |
| C1, C2 | 100 µF 50 V electrolytic + 100 nF ceramic | Bulk and HF decoupling at the regulator input |
| U1 | LM2596S buck module, set to 5.0 V **before** the ESP32 is connected | 40 V input. Used *behind* F1/D1/D2, never on its own (spec §5B) |

Load under 150 mA from 12 V.

Known limits:
- An unsuppressed load dump blows F1 instead of being absorbed by D2.
- A 24 V jump start also blows F1. Never jump-start with the device connected.

## 3. K-line interface (discrete)

```text
VK ──R1 470Ω 1W──┬──────────────────────── K (to car)
                 │                 D3 P6KE18A to GND
                 ├── C(Q1) 2N2222A, E(Q1) ── GND
GPIO26 ─R2 2.2k──┴── B(Q1), R3 10k B–E

K ──R4 47k──┬── LM393 IN− (pin 2)        VK ──R6 100k──┬── LM393 IN+ (pin 3)
           R5 10k                                     R7 10k
            GND                                        GND
                                         LM393 OUT (pin 1) ──R8 470k── IN+ (hysteresis)
                                         LM393 OUT ── GPIO27 (internal pull-up to 3.3V)
LM393 VCC (pin 8) = 5V, GND (pin 4); second comparator: pins 5, 6 to GND, pin 7 open
```

How it works:
- **Transmit:** GPIO26 high turns Q1 on and pulls K low.
- **Receive:** K high pulls GPIO27 low. Both directions are inverted, so the firmware runs UART2 inverted: `Serial2.begin(4800, SERIAL_8N1, 27, 26, true)`, then enables GPIO27's pull-up.
- **Safe at boot:** while the ESP32 boots or crashes, GPIO26 floats, R3 holds Q1 off, and K stays released.
- **5-baud wake-up:** the UART is detached and GPIO26 is driven by hand: line high → GPIO26 LOW.
- **Echo:** the comparator sees every byte Q1 sends. That is the echo `session.h` checks.

Calculated values (VK = VBAT − 0.9 V):

| VBAT | VK | Rising / falling threshold on K | LM393 IN− with K high | Current through Q1 | R1 power if K stuck low | ADC (GPIO34) |
|------|----|------|------|------|------|------|
| 9.0 V | 8.10 V | 4.47 / 4.12 V | 1.42 V | 17 mA | 0.13 W | 0.87 V |
| 12.6 V | 11.70 V | 6.30 / 5.95 V | 2.05 V | 24 mA | 0.28 W | 1.25 V |
| 14.4 V | 13.50 V | 7.22 / 6.86 V | 2.37 V | 28 mA | 0.38 W | 1.45 V |
| 15.3 V | 14.40 V | 7.68 / 7.32 V | 2.53 V | 30 mA | 0.43 W | 1.54 V |
| 25.2 V (clamp) | 24.30 V | 12.71 / 12.35 V | 4.26 V | 51 mA | 1.24 W (transient) | 2.60 V |

What the numbers show:
- **ISO 9141 levels:** at 14.4 V the standard needs low < 4.3 V and high > 10.1 V. The threshold sits at about 53% of VK, in the middle of that window, with about 0.36 V of hysteresis.
- **Comparator input range:** IN− stays inside the LM393's 0–3.5 V input range up to 15.3 V. At the clamp it is exceeded but stays far below the 36 V absolute maximum.
- **Transistor drive:** Q1 base current is 1.18 mA. At a worst-case hFE of 75 it can sink 89 mA, so even at the 51 mA clamp case Q1 is fully on.

## 4. Independent measurement: battery voltage

VK (after D1) ── R10 100k ── GPIO34 ── R11 12k ── GND, with C4 100 nF from GPIO34 to GND.

- Scale 0.107 of VK: 12.6 V battery (VK 11.7 V) reads 1.25 V; the 25.2 V clamp reads 2.60 V. VK can never go negative, so no clamp diode is needed.
- The firmware adds D1's 0.9 V drop back. That drop changes slightly with current and temperature, so the reading is approximate (about ±0.2 V).
- Calibrate once against the multimeter at about 12.6 V (`VBAT_CAL` in the firmware). The screen labels this value as measured by the device, separate from ECU data.

## 5. Controller and user interface

| Function | GPIO | Notes |
|----------|------|-------|
| K-line TX (UART2) / 5-baud bit-bang | 26 | Inverted; R3 keeps it safe at boot |
| K-line RX (UART2) | 27 | Inverted UART, internal pull-up |
| Battery ADC | 34 | ADC1, input-only pin |
| OLED SDA / SCL | 13 / 14 | SSD1306 128×64, I²C 0x3C, VCC on 3V3 |
| Buttons: Page / Sensors / Faults | 32 / 33 / 25 | To GND, internal pull-ups |
| Status LED | 2 (on-board) | Lit while connected |

Strapping pins 0, 5, 12 and 15 are not used. Power the ESP32 from the car **or** from USB, not both. When both are needed, the laptop must run on battery.

## 6. Bench test points (before the car)

Use a current-limited bench supply set to 12.6 V and 200 mA.

| TP | Condition | Expected |
|----|-----------|----------|
| VK | 12.6 V in | about 11.7 V |
| 5V | U1 output, ESP32 not connected | 5.00 ± 0.05 V, set **before** connecting the ESP32 |
| Reverse | Supply reversed | Under 1 mA drawn, nothing warm |
| K idle | GPIO26 low | ≈ VK |
| K active | GPIO26 high | < 0.4 V |
| GPIO27 | K idle / K active | < 0.4 V / ≈ 3.3 V |
| GPIO34 | 12.6 V in | about 1.25 V |
| Loopback | Firmware wake-up running, no car | Screen cycles WAKE → SYNC → retry; USB log shows `line` entries and no `rx` (nothing answers) |
