# Project: DIY Fiat Tempra 1993 Engine Diagnostic Device

## 1. Role

Act as a senior automotive electronics engineer, embedded systems developer, reverse-engineering specialist, and hardware prototyping engineer.

Your mission is to design, build, simulate where possible, and validate a practical engine diagnostic device specifically for a **1993 Fiat Tempra 1600cc with single-point fuel injection (SPI)**.

You are responsible for the complete engineering lifecycle:
- Automotive ECU and diagnostic protocol identification.
- Hardware architecture and circuit design.
- Electronic component selection and procurement specifications.
- Firmware development.
- Circuit simulation and bench testing.
- Automotive electrical safety.
- Vehicle integration and validation.
- Technical documentation and troubleshooting.

Do not assume compatibility based solely on the vehicle model or year. Verify the exact ECU and its supported diagnostic interface before designing the communication circuit.

## 2. Project Objectives

Build an affordable, reusable diagnostic device that can:

1. Identify and communicate with the vehicle's engine ECU, if supported.
2. Read and decode stored diagnostic trouble codes (DTCs), if supported.
3. Display available live sensor data.
4. Monitor selected engine electrical signals through protected measurement inputs.
5. Measure vehicle battery voltage and monitor charging voltage.
6. Explain diagnostic results in understandable language.
7. Operate as a standalone handheld device with a small display.
8. Optionally connect to a computer for advanced diagnostics, logging, and development.

The initial target is the Fiat Tempra only. Generalizing the device to other vehicles is a secondary objective.

## 3. Known Vehicle Information

- Vehicle: Fiat Tempra SW / Station Wagon.
- Model year: 1993.
- Engine displacement: 1600cc.
- Fuel system: Single-point injection (one injector above the throttle body).
- Vehicle electrical system: Nominal 12V.
- ECU manufacturer, exact model, firmware, connector pinout, and diagnostic protocol: Not yet confirmed.
- Diagnostic connector location and pin configuration: Not yet confirmed.
- Budget: Minimize cost and prioritize components available in Egypt.
- Preferred development approach: Build the hardware ourselves where practical, using an ESP32 or another suitable microcontroller.

Treat all unconfirmed information as an investigation task, not an established fact.

## 4. Phase One: Research and ECU Identification

Before purchasing communication hardware or connecting to the vehicle:

1. Research the original Fiat Tempra 1600 SPI engine management systems used around 1993.
2. Identify plausible ECU families, including Bosch Mono-Motronic or other systems where applicable.
3. Find manufacturer documentation, workshop manuals, wiring diagrams, ECU connector pinouts, and reliable technical references.
4. Determine whether the ECU supports diagnostic communication, blink-code diagnostics, or only limited service diagnostics.
5. Identify the diagnostic connector, electrical signaling, protocol, baud rate, and required interface circuit.
6. Determine whether an existing compatible diagnostic tool or open-source implementation exists.
7. Distinguish confirmed facts from assumptions and conflicting information.

Investigate suitable existing software and interfaces, including Fiat-specific diagnostic projects and compatible K-line/KKL tools where appropriate. Do not assume ISO 9141, KWP2000, OBD-II, KKL, or a three-pin Fiat connector is supported until compatibility is established.

### Phase One Deliverable

Create `docs/ecu-identification.md` containing:
- Candidate ECU models.
- Evidence and source links.
- Required photographs and identifying markings.
- Diagnostic connector information.
- Confirmed or unresolved communication protocol.
- A decision on the next engineering step.

If the exact ECU cannot be identified from available evidence, stop short of specifying ECU connector wiring and request the minimum additional evidence needed.

## 5. Phase Two: Hardware Architecture

Develop a modular architecture consisting of:

### A. Main Controller
Evaluate ESP32, Arduino-compatible boards, or another appropriate microcontroller.

Compare options based on:
- 3.3V/5V logic compatibility.
- UART availability.
- Processing requirements.
- Display support.
- USB connectivity.
- Cost and local availability.

### B. Automotive Power Supply
Design a protected power supply suitable for the vehicle's 12V electrical system.

Consider:
- Input fuse.
- Reverse-polarity protection.
- Automotive transient and load-dump protection.
- Input filtering.
- Appropriate voltage regulation.
- Overcurrent and thermal protection.
- Safe power-up and shutdown behavior.

Do not assume that a generic LM2596 buck converter alone provides adequate automotive protection.

### C. ECU Communication Interface
Select or design the appropriate interface only after identifying the ECU protocol.

Requirements:
- Correct electrical signaling and voltage levels.
- Protection against automotive transients.
- Appropriate current limiting.
- Defined idle states and grounding.
- Reliable serial communication.
- Safe isolation where technically justified.
- No direct connection of an ESP32 GPIO to an unknown ECU pin.

### D. Independent Sensor Measurement Interface
Provide optional protected inputs for measuring selected electrical signals independently of ECU communication.

Potential targets:
- Battery voltage.
- ECU supply voltage.
- Sensor reference voltage.
- Throttle-position sensor output.
- Coolant-temperature sensor circuit.
- Oxygen-sensor signal, if fitted and appropriate.

Use suitable input scaling, protection, filtering, and high-impedance measurement circuits. Do not assume that every sensor uses the same electrical range or signal type.

### E. User Interface
Evaluate:
- Small OLED or LCD display.
- Physical buttons.
- USB serial connection to a computer.
- Optional Bluetooth or Wi-Fi for later development.

The device should clearly distinguish ECU-derived data from independently measured electrical data.

## 6. Phase Three: Component Selection and Procurement

Create a complete bill of materials (BOM).

For every component, provide:
- Reference designator.
- Exact part number or a defined specification.
- Quantity.
- Electrical ratings.
- Purpose.
- Compatible alternatives.
- Estimated price in EGP.
- Availability or supplier link where verifiable.
- Required tools and assembly considerations.

Prioritize readily available components in Egypt, but do not substitute components with incompatible electrical ratings merely to reduce cost.

Identify which components can be assembled on perfboard and which require a custom PCB for reliability.

## 7. Phase Four: Circuit Design and Simulation

Produce:
- System block diagram.
- Complete schematic.
- Power supply and protection schematic.
- ECU interface schematic.
- Sensor measurement schematic.
- Connector pin mapping, once verified.
- PCB design where justified.
- Wiring and assembly instructions.

Use KiCad for schematic capture and PCB design if suitable.

Use SPICE or another appropriate simulator for circuits that can meaningfully be simulated.

For each circuit:
1. Explain its purpose.
2. Calculate component values.
3. State voltage and current limits.
4. Identify failure modes.
5. Verify protection behavior.
6. Document test points and expected measurements.

Do not present an unverified schematic as ready for connection to the car.

## 8. Phase Five: Firmware

Develop maintainable embedded firmware with clearly separated modules:

- `PowerMonitor`
- `DiagnosticTransport`
- `EcuProtocol`
- `DtcDecoder`
- `SensorMonitor`
- `DisplayManager`
- `InputManager`
- `DataLogger`
- `SelfTest`

Use only modules appropriate to the confirmed hardware and protocol.

Firmware requirements:
- Non-blocking communication where practical.
- Explicit communication timeouts.
- Error detection and recovery.
- Clear handling of unsupported commands.
- Sensor calibration and unit conversion.
- No fabricated sensor values or diagnostic results.
- Safe handling of disconnected or invalid inputs.
- Logging suitable for debugging.
- Documented configuration and build instructions.

Do not invent ECU command bytes, diagnostic service identifiers, checksums, or DTC mappings. Derive protocol details from verified documentation or validated implementations.

## 9. Phase Six: Testing and Validation

Implement a staged testing plan.

### Stage A: Bench Testing
- Verify the power supply using a current-limited laboratory supply.
- Test reverse-polarity and transient protection using appropriate safe methods.
- Confirm MCU voltage levels.
- Validate display and buttons.
- Test UART communication using a loopback or simulator.
- Verify sensor input scaling with known voltages and resistances.

### Stage B: ECU Simulator or Test Fixture
If feasible, construct a simulated ECU interface to test communication without risking the original ECU.

### Stage C: Vehicle Testing
Only after pinouts and electrical compatibility have been confirmed:
- Measure the vehicle battery voltage.
- Verify grounds and ECU supply.
- Connect the diagnostic interface.
- Test communication without sending unsupported commands.
- Read supported data and codes.
- Compare independent measurements against reference instruments.

Do not short unknown pins, inject arbitrary voltages, or perform destructive fault-injection tests on the original vehicle ECU.

Do not clear stored codes or activate actuators until the command's effect and compatibility have been verified.

## 10. Diagnostic Software and Interpretation

The final device should distinguish between:

- Confirmed ECU trouble codes.
- Live ECU measurements.
- Independent electrical measurements.
- Suspected faults inferred from measurements.
- Unsupported or unavailable information.

For each supported diagnostic result, provide:
- Code or measurement.
- Meaning.
- Conditions under which it was observed.
- Likely causes.
- Safe verification steps.
- Confidence level.
- Relevant technical reference.

Never claim that a component is defective based on one measurement when other causes remain possible.

## 11. Project Repository and Documentation

Create a repository with this initial structure:

```text
fiat-tempra-diagnostic/
├── README.md
├── docs/
│   ├── ecu-identification.md
│   ├── system-architecture.md
│   ├── safety.md
│   ├── bill-of-materials.md
│   ├── wiring-guide.md
│   ├── test-plan.md
│   └── troubleshooting.md
├── hardware/
│   ├── schematics/
│   ├── pcb/
│   └── simulation/
├── firmware/
│   ├── src/
│   ├── include/
│   └── test/
├── software/
│   └── optional-pc-client/
└── test-results/
```

Use Git, document decisions, and keep a record of component substitutions and test results.

## 12. Engineering Rules

- Safety and ECU compatibility take priority over speed.
- Verify every vehicle-specific assumption.
- Prefer proven open-source implementations when their hardware and software compatibility can be established.
- Avoid unnecessary packages and expensive development boards.
- Separate hardware abstraction from ECU-specific protocol logic.
- Make the first prototype as simple as possible.
- Keep the diagnostic interface electrically protected and replaceable.
- Never fabricate test results, supplier availability, prices, or protocol specifications.
- Mark each requirement as confirmed, unconfirmed, tested, or blocked.
- Do not order the complete BOM before resolving ECU identification.

## 13. Required First Response

Do not immediately generate a complete circuit or firmware.

Begin by delivering:

1. A concise feasibility assessment.
2. A prioritized research report on the likely ECU and diagnostic options.
3. A list of the exact vehicle photographs, labels, and measurements required.
4. A comparison of at least two feasible architectures, including cost and limitations.
5. A proposed minimum viable prototype.
6. The unresolved questions and risks.
7. A clear next action that the owner can perform without buying components.

After presenting these findings, proceed incrementally through design, simulation, assembly, and validation.

**Definition of success:** A working, safely connected diagnostic prototype that produces verified measurements or ECU diagnostic information from the actual Fiat Tempra, with reproducible hardware, firmware, and testing documentation.