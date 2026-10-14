# Tempra MA1.7 K-line Protocol Core

Two implementations of the same rules:
- Firmware (ESP32 handheld, later): `firmware/tempra_diag/` (`kline.h`, `session.h`). Tests: `npm run test:firmware:tempra`.
- Web app (USB, now): `src/tempra/` (`protocol.ts`, `session.ts`, `serial-driver.ts`), page at `?app=tempra`. Tests: `tests/tempra-*.spec.ts`.

The two run the same test scenarios against equivalent simulated ECUs. A rule change must be made in both.
ECU background: [ecu-identification.md](ecu-identification.md).

This is the hardware-independent protocol layer of the handheld (architecture B). It has no pins, no UART and no display. It is a pure `step(session, inputs, timing)` state machine. An ESP32 sketch will feed it received bytes and act on its outputs, once the 3-pin plug pinout has been measured and the K-line transceiver chosen.

**Nothing here has talked to the real car yet.** Every protocol rule below comes from the sources listed and is exercised only against a simulated ECU (`test/ecu_sim.h`).

## Protocol rules implemented

| Rule | Value used | Source | Status |
|------|------------|--------|--------|
| Wake-up | Line idle high 300 ms, then address `0x10` at 5 baud (200 ms/bit): start bit low, 8 data bits LSB first, then release | MA1.7-Scanner `sendInitSequence`; startrek | unconfirmed on this car |
| Session baud | 4800, 8N1 | MA1.7-Scanner Tipo profile; startrek (Bosch M2.10.4) | unconfirmed (a general KW71 reference says 9600) |
| Sync | ECU sends `0x55` within 2 s | MA1.7-Scanner | unconfirmed |
| Keyword reply | After a 250 ms quiet gap, send the bit-inverse of the **third** byte (counting `0x55`) | MA1.7-Scanner (`~key2`); startrek ("bit-inverse of the third byte") | two sources agree |
| Block | `[length][counter][title][data 0–12][0x03]`; length counts the bytes after itself | startrek; MA1.7-Scanner | two sources agree |
| Byte acknowledgement | Receiver answers every byte except the final `0x03` with its bit-inverse; sender checks it | MA1.7-Scanner `ECUWritePacket`/`ECUReadPacket`; startrek | two sources agree |
| Echo | The single-wire K-line returns every byte the tester sends; it is read back and checked | startrek (409.1 KKL); also true of an L9637D-class transceiver | confirmed for KKL cables |
| Exchange | ECU non-ACK block → store and answer ACK; ECU ACK → exchange complete; ECU NAK → reply marked rejected | startrek ID-block flow; MA1.7-Scanner error-read loop | unconfirmed |
| Keep-alive | ACK block after 500 ms idle; ECU drops the link after 1 s | MA1.7-Scanner (500 ms); startrek (1 s) | two sources agree |
| Fault recovery | Any timeout, echo, complement, length or end-byte error → 2.6 s back-off, then a new wake-up | MA1.7-Scanner `kRecoveryBackoff` | unconfirmed |

## Requests

| Request | Title sent | ECU reply title | Data |
|---------|-----------|-----------------|------|
| `readErrors()` | `0x07` | `0xFC` per stored code, then ACK | none |
| `readMemory(address, length)` | `0x01` | `0xFE` | `[length 1–12][address high][address low]` |
| `readSensors()` | `0x12` | `0xF4` (10 bytes) | none |

The code has no way to send `0x05` (clear codes), `0x04` (actuator test) or `0x24` (security code). Requests are chosen by purpose, not by raw title, and a test checks that no purpose maps to those titles. This follows spec section 9: no clearing codes or driving actuators until the effect is verified.

## Deliberately not implemented

- **Confirmed fault-code meanings.** `src/tempra/faults.ts` (mirrored for the OLED in `firmware/tempra_diag/faults.h`) holds the 11 codes from the reference scanner, which cites a fiat-tipo.ru forum post. The code is the first two data bytes, low byte first; `0x1E` in the third byte is shown as "present (likely)". Every report is labelled **unverified**, shows the raw bytes, and gives only general causes and safe checks. Nothing is confirmed until a capture from this Tempra matches.
- **Sensor scaling.** The `0xF4` layout and conversion curves come from one reverse-engineering project and depend on an ECU RAM flag. To be added after a capture from this car.
- **End of diagnosis (`0x06`)**, ADC reads (`0x08`) and the 9600-baud variant: not needed for the first read-only session.

## Before the first car connection

1. Measure the 3-pin plug (ecu-identification.md, section 4).
2. First session: laptop + FTDI KKL cable + the web app (`?app=tempra`, Chrome or Edge). Download the connection log and compare it with the rules above. Correct any rule that differs, in both implementations.
3. Only then write the ESP32 sketch around `session.h` and test it against a recorded-traffic simulator on the bench.

Startrek also notes that the Fiat 3-pin adaptor's red lead goes to the battery positive terminal, because the 3-pin plug does not supply power to the interface.

## Sources

- [Fabio3rs/Monomotronic-MA1.7-Scanner](https://github.com/Fabio3rs/Monomotronic-MA1.7-Scanner) (MIT): `src/ECUSerial/ECUMonomotronic.cpp`, `ECULinkConfig.cpp`
- [nailed-barnacle.co.uk startrek](http://www.nailed-barnacle.co.uk/coupe/startrek/startrek.html): Bosch 5-baud init, block format, frame types, keep-alive
- [colinbourassa diagnostic protocols](https://colinbourassa.github.io/car_stuff/diagnostic_protocols/): KW71 overview (9600-baud figure)
