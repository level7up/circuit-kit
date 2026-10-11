# Plan: electronic door lock with RFID card + unlock button

Status: plan only, not implemented.

## 1. How it should behave

- **Tap a known card**: green LED and a short beep, the lock opens for **3 seconds**, then it locks again by itself.
- **Unknown card**: red LED and 3 beeps, and it stays locked. After **5 wrong cards in a row**, the reader ignores cards for 30 seconds.
- **Button inside**: opens the lock for 3 seconds at any time, with no card.
- **Adding and removing cards** without a computer, using a **master card**: tap the master, then tap a new card to add it (or a known card to remove it).
- Optional: a **door sensor** (magnet + reed switch) that beeps if the door is left open.

## 2. Two ways to build it

| | A. Ready RFID controller board | B. Arduino Nano + RC522 reader (recommended) |
|---|---|---|
| Programming | None | Yes, a short Arduino sketch |
| Cards | 125 kHz (EM4100) cards and tags | 13.56 MHz (MIFARE) cards and tags, usually included with the reader |
| What you build | Wiring only: the board already has the relay, button input and master card | The whole circuit: reader, driver, LEDs, buzzer |
| Learning | Little | A lot: SPI, transistor driver, saving cards |
| Fits the existing kits | Not really | Yes, same style |

**Recommendation: B.** It is the only one that can really be built and learned from, and the app could simulate it. But it is the first kit that needs a program; everything so far has been "no programming". If that rule should stay, A is the only real option: RFID cannot be done with simple logic chips.

## 3. The lock itself

- **For learning or a cabinet/drawer:** a **12V solenoid cabinet lock**. It is cheap, opens while powered, and is **locked when there is no power** (fail-secure).
- **For a real room door:** an **electric strike**, also locked with no power, with the normal door handle and key still working.
- **Avoid a magnetic lock (maglock) for a beginner.** It only holds while powered: if the power cuts, the door opens. It also needs a separate emergency release by law in many places.
- **Never trap anyone inside:** the inside must always open by hand (handle or mechanical lever), with or without electricity. The button is extra, not the only way out.

## 4. The circuit (way B)

- **Power:** 12V 2A adapter. It feeds the lock directly, and a **7805** (from the existing kits) or a small DC-DC converter makes 5V for the Arduino.
- **Reader:** **RC522** on the Arduino's **3.3V** pin, never 5V. It talks to the Arduino over SPI.
- **Lock driver:** the **TIP122** from the parking-flicker kit, or a logic-level MOSFET (IRLZ44N, runs cooler).
  - The lock goes between +12V and the transistor.
  - A **1N4007 across the lock** is essential. When the solenoid switches off it throws a voltage spike that would kill the transistor and reset the Arduino.
- **Exit button:** between an Arduino pin and GND, using the pin's built-in pull-up. No extra resistor needed.
- **Feedback:** green LED and red LED, each with 330Ω, plus a buzzer.
- **Optional:** reed switch for the door sensor, and a backup battery (12V 1.2Ah UPS-type) so it works during power cuts.

### Proposed pin map (Arduino Nano)

| Part | Nano pin |
|---|---|
| RC522 SDA / SCK / MOSI / MISO / RST | D10 / D13 / D11 / D12 / D9 |
| Lock driver (via 1k for TIP122, or 220Ω + 100k pull-down for MOSFET) | D7 |
| Exit button | D2 |
| Green LED / red LED / buzzer | D5 / D6 / D8 |
| Door sensor (optional) | D3 |

## 5. Program logic (described only)

- **States:** Locked → Unlocked (3 s timer) → Locked. Plus "add/remove cards" mode, triggered by the master card and left automatically after 10 seconds.
- Saved card IDs are kept in the Arduino's memory (EEPROM), so they survive power cuts. Room for about 50 cards.
- The lock is **never powered for more than 5–10 seconds** at a time. Solenoids overheat if held open.
- The button works even while the reader is ignoring cards after wrong tries.

## 6. Security, honestly

- The card's ID number (MIFARE Classic UID) is **easy to copy**. That is fine for a cabinet, a room or a hobby project, but not enough for a main house door or a shop.
- Only the reader goes outside. The Arduino, driver and power stay **inside**, so nobody can short two wires from outside to open it.
- Keep a mechanical key or other way in, in case the electronics fail.

## 7. Parts list (way B, estimated)

- Arduino Nano + USB cable
- RC522 module (comes with 1 card + 1 keychain tag); extra cards are cheap
- 12V solenoid cabinet lock
- 12V 2A adapter
- TIP122 or IRLZ44N, 1N4007 × 2 (one across the lock, one on the input against reversed polarity)
- 7805 + 100µF + 100nF × 2
- Push button (12–16 mm, for a panel)
- Green and red LEDs + 330Ω × 2, buzzer
- 1k resistor
- 5×7 cm dot board + pin headers (so the Nano plugs in and is not soldered)
- Plastic box for the electronics; optional reed switch and backup battery

## 8. Build order (each stage tested before the next)

1. **Reader only** on a breadboard: show each card's ID on the computer.
2. **LEDs + buzzer:** green for a saved card, red for an unknown one.
3. **Lock + button only:** the button opens the lock for 3 seconds. Check the diode is on and the transistor stays cool.
4. **Put it all together:** card or button opens the lock; then the master card and saving cards.
5. **Final board** on dot board, the box, mounting on the door/cabinet, and the 5-wrong-cards lockout.

## 9. How it could fit in the app (when implemented later)

A new kit "🔐 قفل باب RFID" (RFID door lock) with the usual tabs: idea, circuit drawing, breadboard, pinouts, parts list, interactive steps, dot-board assembly, troubleshooting. New things it would need:

- **A simulator you can click:** tap a saved card, tap an unknown card, press the button, tap the master card. It would show the lock state, the LEDs and beeps, and a timeline.
- **A "code" tab:** the Arduino sketch, with each part explained in Egyptian Arabic and a copy button. The app does not have this yet.
- Drawings for the RC522, the Nano and the solenoid lock.

## 10. Open decisions

1. **Way A or B:** a ready board (no programming), or Arduino (learning, needs a program)?
2. **What it is for:** a cabinet/drawer (solenoid lock), or a real room door (electric strike)?
3. **Cards:** 13.56 MHz (RC522, comes with the cards) or 125 kHz (ready boards)?
4. **Backup battery** for power cuts: yes or no?
