# ECU Identification: Fiat Tempra SW 1993, 1.6 SPI

Phase One deliverable for [tempra-device.md](tempra-device.md). Research date: 2026-10-14.

Status labels used below: **confirmed** (more than one independent source agrees, or a working implementation exists), **unconfirmed** (one source, or sources disagree), **blocked** (needs evidence from the actual car).

## 0. Owner findings (2026-10-14)

| Finding | Value | Status |
|---------|-------|--------|
| ECU label | `BOSCH 0 261 200 721`; a separate field reads `000` over `810`; no Fiat number | reported by owner, no photo |
| ECU system | **Bosch Mono-Motronic MA1.7** (candidate A) | **confirmed**: three independent sources map `0261200721` to MA1.7 |
| Diagnostic plug | 3-pin **female** plug, no cap or sleeve, branching from the ECU main harness | reported by owner |
| Plug wire colours | solid blue, white with red stripe, solid black | reported by owner |
| ECU main connector marking | `A047` (likely a housing code, not a pin number) | reported by owner |
| Engine/injection warning lamp | none on the dashboard, so blink codes are not an option | reported by owner |
| Immobiliser | owner believes none | unconfirmed |
| Owner equipment | Windows laptop: yes. Will buy a KKL cable: yes. Multimeter: no | reported by owner |
| Multimeter measurements | none yet | blocked: no meter |

No MA1.7 ECU-connector pinout was found, so the plug's pins cannot be identified by tracing wires back to ECU pin numbers. A multimeter is the only safe way to identify them.

Evidence for `0261200721`:
- ATC Drivetrain lists `0 261 200 721` as "Fiat Tipo Petrol ECU MA1.7 Mono-Motronic", Tipo 1.6ie 835C2 SPI, 1993–96; alternate `0 986 261 111`. ([atcdrivetrain.co.uk](https://www.atcdrivetrain.co.uk/p/fiat-tipo-petrol-ecu/fiat-tipo-petrol-ecu-ma17-mono-motronic.html))
- 50volt lists it as a petrol ECU of type "DME MA17". ([50volt.ru](https://50volt.ru/repair-ecu/bosch-gmbh/bosch-0261200721/))
- Resellers give Fiat/Lancia OE numbers `7785228` and `7799130`. ([eBay](https://www.ebay.com.my/itm/265652607554), [eurofrance24](https://eurofrance24.com/engine-controller-7799130-0261200721-lancia-bosch.html))
- A Russian Tipo/Tempra forum thread about this ECU on a **Tempra 1.6**: one poster calls it a late 1.6 unit with a "MA1.7.2 pinout", and mentions a crankshaft sensor on a 58-tooth wheel with a two-tooth gap. ([fiat-tipo.ru](https://www.fiat-tipo.ru/viewtopic.php?t=4610), not readable directly; seen through search results only) Status: unconfirmed.

New risk: the open-source MA1.7 scanner was developed on hardware `0261 203 388`, not `0261 200 721`. Both report as MA1.7, but this car may run a different sub-version (MA1.7.2), so protocol compatibility is **unconfirmed** until the car returns an ident frame.

## 1. Feasibility assessment

The project is feasible, and cheaper than expected **if the car has a Bosch Mono-Motronic MA1.7 ECU**. That ECU has a serial diagnostic line, and an MIT-licensed open-source scanner for exactly this ECU on the Fiat Tipo 1.6ie already exists, including an ESP32 port. The Tipo and the Tempra share the same platform and engine.

If the car instead has the earlier **Bosch Mono-Jetronic A2.2 plus a separate Digiplex 2 ignition module**, there is no open protocol implementation to start from. ECU communication becomes a research project. The device would then rely on blink codes, if the ECU supports them, and on independent electrical measurements.

1993 is the year Fiat changed between the two systems, so the car's model year cannot decide this. The ECU label decides it. Section 4 lists the photographs needed.

## 2. Candidate ECUs

| # | System | Bosch part prefix | Ignition | Likelihood for this car | Status |
|---|--------|-------------------|----------|-------------------------|--------|
| A | **Bosch Mono-Motronic MA1.7** (injection and ignition in one ECU) | `0261 203 …` (seen: `0261 203 388`, `0261 203 935`) | Coil built into the distributor | High: workshop manual says 1.6 models *from 1993* use it | unconfirmed for this car |
| B | **Bosch Mono-Jetronic A2.2** (injection only) + **Marelli Digiplex 2** (ignition, e.g. `MED474A`, Fiat `7745672`) | `0280 000 …` (seen: `0280 000 713` listed for Tipo/Tempra 1.6) | Separate ignition module and external coil | Medium: Digiplex 2 listed for Tipo/Tempra 1.6 ie, 1990–1993 | unconfirmed for this car |
| C | Magneti Marelli / Weber-Marelli IAW SPI family | Marelli label, 35-pin connector | Integrated | Low: no source found tying it to the Tempra 1.6 SPI | unconfirmed |

### Evidence

- A Tipo/Tempra workshop manual states: *"On 1.6 models from 1993 with SPI Monomotronic fuel injection, the high tension coil is integral with the distributor."* This gives a visual check that needs no tools (section 4). ([Fiat Tipo Tempra 1988–1996, pdfcoffee](https://pdfcoffee.com/fiat-tipo-tempra-1988-1996-pdf-free.html))
- A Tecnomotor manual is titled "MONOMOTRONIC MA 1.7 (FIAT 1.6 ie)". ([pdfcoffee](https://pdfcoffee.com/download/tipo-16-ie-tecnomotor-pdf-free.html), not readable directly; seen through search results only)
- Bosch's repair service lists MA1.7 `0261203935` for the Fiat Tipo 1.6 i.e. 1993–1995. ([bosch-repair-service.com](https://www.bosch-repair-service.com/en/engine-control-unit/bosch/ma1-7-0261203935001/), page returned HTTP 500 when fetched; seen through search results only)
- A real ident string captured from a Tipo MA1.7: `"0261 203 388AN09I2000148BOSCH MA17  MC "`. ([Monomotronic-MA1.7-Scanner, docs/reference/protocol](https://github.com/Fabio3rs/Monomotronic-MA1.7-Scanner))
- A Marelli Digiplex 2 `MED474A` (Fiat `7745672`) is sold as the Tipo/Tempra 1.6 i.e. ECU for 1990–1993. ([drricambi.it](https://drricambi.it/shop/7745672-centralina-elettronica-ecu-fiat-tipo-tempra-digiplex-2-med474a-fiat-7745672-38138))
- A Brazilian parts list gives *both* Mono-Jetronic SPI and Mono-Motronic MA1.7 for the Tipo 1.6 ie. This supports the two-system split in the table above. (seen in search results)
- An eBay listing gives `0280000713` for the Tipo/Tempra 1.6. ([search summary](https://www.ebay.de/itm/144324888089))
- Wikipedia says all Tempras from 1993 have a catalytic converter and electronic injection. ([Fiat Tempra](https://en.wikipedia.org/wiki/Fiat_Tempra))
- Egyptian assembly of the Tempra (Nasr, Cairo) began in 1996, so a 1993 car was imported, probably from Italy or Turkey (Tofaş). That does not change the ECU candidates. ([autocade](https://autocade.net/index.php/Fiat_Tempra))

## 3. Diagnostic interface

### Candidate A: MA1.7 protocol (from a working implementation)

From [Fabio3rs/Monomotronic-MA1.7-Scanner](https://github.com/Fabio3rs/Monomotronic-MA1.7-Scanner) (MIT licence, active, last commit 2026-07-29):

| Item | Value | Status |
|------|-------|--------|
| Physical layer | Single-wire K-line, 12 V, half-duplex | confirmed (multiple sources) |
| Wake-up | Address `0x10` sent at 5 baud | unconfirmed (one implementation) |
| Session baud | 4800 | **conflicting**: a general Bosch KW71 reference gives 9600 ([colinbourassa](https://colinbourassa.github.io/car_stuff/diagnostic_protocols/)). Resolve with a logic-analyser capture. |
| Handshake | Keyword bytes, then the tester echoes each byte inverted | unconfirmed |
| Frame | `[length][counter][title][data…][0x03]` (KW71/KW1281-style block) | unconfirmed |
| Titles used | `0x01` memory read, `0x05` clear DTCs, `0x07` read DTCs, `0x09` ACK, `0x12`/`0xF4` sensor table, `0xF6` ident, `0xFC` DTC data, `0x04` actuator | unconfirmed |
| Tool support | AlfaOBD has a "KW71-Interbyte" setting for MA1.7 ([AlfaOBD help](https://www.alfaobd.com/AlfaOBD_Android_Help.pdf)). Vendor listings of Multiecuscan show "Bosch Monomotronic MA1.7". | unconfirmed |

Caveats about that repository:
- The project says its own ESP32 port has **not** been validated on real hardware. Its handoff note of 2026-06-29 lists `baudInit()`, `ECUWrite()` and `ECUWriteWaitResponse()` as needing hardware validation. The PC version, which uses a KKL cable, is the older and more proven route.
- Its DTC descriptions come from a Russian forum post (`fiat-tipo.ru/fpost8823.html`), not Bosch documentation. Treat the code meanings as unconfirmed.
- Its README gives the 3-pin connector as *pin 1 K-line, pin 2 ground, pin 3 +12 V*. That disagrees with other sources (next table) and must not be used for wiring.

Per section 8 of the spec, **none of these bytes go into our firmware until we capture them from this car.**

### 3-pin Fiat diagnostic connector

| Source | Pin A / 1 | Pin B / 2 (middle) | Pin C / 3 |
|--------|-----------|--------------------|-----------|
| [obdtester.com FAQ](http://www.obdtester.com/faq/ficom-fiat-alfa-lancia/what-is-fiat-3pin-diagnostic-connector-pinout) | L-line | Ground | K-line |
| [PinoutGuide](https://pinoutguide.com/CarElectronics/fiat_test_pinout.shtml) | K-line | K-line | Earth |
| MA1.7-Scanner README | K-line | Ground | +12 V |
| [FiatForum owner](https://www.fiatforum.com/threads/mono-jetronic-a2-2-and-digiplex-2.454432/) | n/a | middle pin should be ground | n/a |

Status: **blocked**. Two sources agree that the middle pin is ground, but that is not proof.

Wire colours reported for Fiat 3-pin plugs (Fiat colour code: `A` light blue, `B` white, `N` black, `R` red):

| Source | Colours |
|--------|---------|
| This car (owner) | blue, red/white, black |
| [Fiat Coupe Club](https://www.fiatcoupeclub.org/forum/ubbthreads.php/ubb/printthread/Board/15/main/73822/type/thread) (different car and ECU) | blue/white = 1, black/violet = 2, white/red = 3; white/red described as chassis ground |

The colours do not identify the pins on this car. Black is often ground in Fiat wiring, but that alone is not a basis for connecting anything. Also:
- Owners report the 3-pin plug sits near the ECU, often with only two wires fitted. ([FiatForum](https://www.fiatforum.com/threads/tipo-tempra-1-6-i-e-misfire.455156/))
- The same Fiat 3-pin plug style is also used for **airbag/ABS** test points. A yellow sleeve has been reported to mark the airbag one. A 1993 Tempra probably has no airbag, but this still needs checking. ([Multiecuscan forum](https://multiecuscan.net/forum/viewtopic.php?p=17928))
- One owner blew a fuse with a home-made adapter. ([FiatForum](https://www.fiatforum.com/threads/3-pin-ecu-diag-connector-help.188782/latest))
- ELM327 adapters will not work. A "dumb" KKL (FTDI/CH340 + K-line) interface is needed. ([FiatForum](https://www.fiatforum.com/threads/ecu-reader.53606/latest))

### Candidate B: Mono-Jetronic A2.2

The Bosch Mono-Jetronic documents describe self-diagnosis as an intermittent ground signal that flashes a warning lamp (blink code). A published A2.2 code table exists only for the Citroën AX/ZX, and its codes may differ on Fiat. ([French Car Forum](https://frenchcarforum.co.uk/forum/viewtopic.php?t=2085)) No Fiat-specific serial protocol was found. Status: **unconfirmed**.

## 4. Evidence needed from the car (no purchases required)

Take each photo in focus and in good light, with the label readable.

**Photographs**
1. **ECU label**, every sticker on the case, especially the Bosch number (`0261 …` or `0280 …`), the Fiat number and any "MA1.7" / "Mono-Jetronic" text. The Tipo/Tempra ECU is reported to sit near the passenger footwell or under the dash (unconfirmed).
2. **ECU connector**: the pin count and the wire colours entering it.
3. **Distributor**: does a coil sit inside or on the distributor cap (points to MA1.7), or is there a separate coil and a separate finned ignition module (points to Mono-Jetronic + Digiplex)?
4. **Any separate ignition module** and its label.
5. **3-pin diagnostic connector(s)**: every one you find, with its location, colour, sleeve colour and each wire colour, and which cavities actually hold a wire.
6. **Engine code** stamped on the block (expected `159 A3.0xx` or similar) and the **chassis/VIN plate**.
7. **Throttle-body unit** (the injector housing on top of the engine): any labels.
8. **Instrument cluster** with ignition ON, engine off: is there an injection or check-engine warning lamp?

**Measurements** (only with a digital multimeter, never a test lamp; never bridge pins together)
1. Battery voltage: engine off, then engine idling.
2. Ignition **off**: resistance from each 3-pin connector cavity to chassis ground.
3. Ignition **on**, engine off: DC voltage from each 3-pin cavity to chassis ground. An idle K-line normally sits near battery voltage, so a pin near 12 V is a K-line candidate.

## 5. Architecture options

| | **A. KKL cable + laptop** | **B. ESP32 handheld (target device)** | **C. Measurement-only handheld** |
|---|---|---|---|
| Works with | MA1.7 (and possibly A2.2 through other software) | MA1.7 once the protocol is verified | Any ECU |
| Hardware | Ready-made KKL USB cable (FTDI) + Fiat 3-pin→OBD adapter | ESP32 + K-line transceiver (L9637D / MC33290 class) + protected 12 V supply + OLED + buttons | ESP32 + protected divider/ADC inputs + OLED |
| Software | MA1.7-Scanner PC build, Multiecuscan or AlfaOBD (licence) | Our firmware, ported from MA1.7-Scanner after capture | Our firmware |
| ECU-side risk | Lowest: a proven commercial K-line interface | Medium: our own interface circuit | None: read-only voltage measurements |
| Cost | Cable and adapter only; get local quotes before deciding | Highest parts count | Lowest |
| Limitation | Needs a laptop; not standalone | Blocked on ECU ID and pinout | No DTCs, no ECU live data |

Prices are left out on purpose: none could be verified for Egypt.

## 6. Minimum viable prototype

1. **Confirm the ECU** (section 4): no cost.
2. If it is MA1.7: borrow or buy a KKL cable and 3-pin adapter, run the MA1.7-Scanner PC build, and **read only**: ident, DTCs, live data. Capture the raw K-line traffic with a cheap logic analyser or a second serial port. Do not clear codes or run actuators. This turns every "unconfirmed" row in section 3 into "confirmed" or "corrected".
3. Then build architecture B around the captured protocol. Bench-test it against a recorded-traffic ECU simulator (spec stage B) before it touches the car.

If it is Mono-Jetronic A2.2: build architecture C first and investigate blink codes with the warning lamp. Revisit serial communication only if a reliable source turns up.

## 7. Unresolved questions and risks

| Item | Status |
|------|--------|
| Which ECU is fitted | **confirmed**: MA1.7, `0 261 200 721` |
| MA1.7 sub-version (MA1.7 vs MA1.7.2) and scanner compatibility | unconfirmed |
| Immobiliser fitted | unconfirmed |
| 3-pin connector pinout for this car | blocked: sources conflict; needs a multimeter or ECU pin numbers |
| MA1.7 session baud (4800 vs 9600) | unconfirmed: needs capture |
| MA1.7 DTC meanings | unconfirmed: forum-sourced |
| Whether the 3-pin plug is ECU or another module | blocked |
| Previous owner wiring changes (cut wires reported on similar cars) | blocked |
| Mono-Jetronic A2.2 serial capability on Fiat | unconfirmed |
| Local availability of L9637D / MC33290 / KKL cable in Egypt | unconfirmed |

Main risks: wiring to the wrong 3-pin plug; a home-made adapter shorting K-line to 12 V (a fuse has blown this way before); trusting forum DTC tables; the ESP32 port of MA1.7-Scanner being untested on hardware.

## 8. Decision and next step

**Decision (updated 2026-10-14):** the ECU is MA1.7, so the project follows architecture A→B. ECU-side wiring stays unspecified until the 3-pin plug pinout is measured. Do not order the BOM.

Design work done against the *expected* readings: [tempra-protocol.md](tempra-protocol.md), [tempra-hardware.md](tempra-hardware.md), [tempra-wiring-guide.md](tempra-wiring-guide.md).

**Next action for the owner:** get a basic digital multimeter and take the three measurements in section 4. Buy the KKL cable (FTDI-based "VAG-COM 409.1 KKL", not ELM327) only after the pinout is known.
