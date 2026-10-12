# Project Plan: Independent 12 V EFI Fuel-System Controller

## 1. Purpose

Design and prototype an independent electronic controller for an
automotive EFI fuel system. The operator can request a target value
using a knob, while the controller monitors fuel pressure and applies
safety limits.

**Important scope limit:** This is not a universal drop-in controller
for every engine. Engine fuel-pressure requirements, pump
characteristics, return/returnless architecture, injector sizing, and
the original engine-management strategy vary. The design must be
configured and validated for one specific system before any vehicle use.

## 2. Safety Requirements --- Must Not Be Skipped

-   Do not build a device that arbitrarily restricts a running engine's
    fuel supply to control engine fueling.
-   Do not control injector opening pulses directly unless designing a
    complete, engine-specific ECU with the necessary sensors,
    calibration, and validation. A generic knob/PWM circuit is not a
    safe substitute for an ECU.
-   Do not use a generic water solenoid, aquarium valve, or unverified
    valve in a gasoline line.
-   Do not use a hobby MOSFET module or PWM circuit directly on a fuel
    pump without verifying the pump's electrical characteristics and
    using an automotive-rated driver.
-   Fuel-pressure reduction can cause a lean mixture and engine damage.
    A pressure sensor alone does not prove that the air/fuel ratio is
    safe.
-   The first prototype must be tested on a non-fuel electrical bench,
    then on a professionally configured fuel-system test bench using
    suitable fuel-compatible equipment and fire-safety controls. Do not
    test improvised fuel plumbing in a home or occupied garage.
-   Do not connect the prototype to a road vehicle until a qualified
    automotive technician/engineer has reviewed and validated the
    design.
-   On a detected fault, command the pump output OFF and latch the fault
    until an explicit safe reset. The vehicle's required crash/inertia
    shutdown and original safety interlocks must not be bypassed.
-   Use an automotive-rated fuse close to the power source,
    reverse-polarity protection, transient/load-dump protection,
    appropriate wiring/connectors, and an enclosure suitable for the
    installation environment. Keep electrical switching components away
    from fuel vapour and possible leaks.

## 3. Define the Intended Function Before Implementation

The implementation agent must clarify which of these is actually
required:

1.  **Fuel-pressure monitoring and pump control:** Adjust pump operation
    only within the pump manufacturer's approved control method, while
    maintaining the pressure specified for the selected EFI system.
2.  **Fuel delivery measurement:** Measure flow with a fuel-compatible
    flow sensor or test-bench instrument. Do not infer flow accurately
    from knob position or pump duty cycle alone.
3.  **Engine fueling / injected quantity:** This is an engine-management
    task. It requires an engine-specific ECU strategy and relevant
    sensor inputs; it is outside the scope of a universal pump
    controller.

The recommended first project is a **pressure-monitoring controller with
a configurable pump command for a compatible EFI pump**, not a universal
fuel-metering valve.

## 4. Proposed Functional Architecture

-   Operator input: potentiometer or rotary encoder for a requested
    setting.
-   Controller: Arduino/ESP32-class board for a non-vehicle bench
    prototype.
-   Pressure input: calibrated pressure transducer explicitly compatible
    with the selected fuel, pressure range, temperature, and electrical
    interface.
-   Optional flow input: fuel-compatible flow sensor approved for the
    intended fuel and pressure range. Validate sensor accuracy and
    pressure drop.
-   Output stage: only a pump driver/controller explicitly compatible
    with the selected pump and its current, voltage, and control
    interface. The microcontroller pin must never drive a pump directly.
-   Safety layer: independent fuse, hardware enable/interlock, watchdog,
    sensor plausibility checks, over/under-pressure limits, timeout, and
    latched fault state.
-   User interface: requested setting, measured pressure, optional
    measured flow, output status, and clear fault indication.
-   Calibration profile: one named profile per tested system, storing
    its specified pressure range, sensor calibration, pump
    compatibility, and limits. Never assume one profile works for every
    engine.

## 5. Operating Logic

1.  Power-up with the pump output disabled.
2.  Validate the pressure sensor signal and controller state.
3.  Require an explicit enable action; do not start automatically after
    a fault or reboot.
4.  Read the operator's request and sensor measurements.
5.  Apply only the pump manufacturer's approved control method and the
    selected EFI system's validated pressure limits.
6.  If pressure is outside the configured safe range, the sensor is
    disconnected/implausible, the watchdog expires, or any internal
    fault occurs:
    -   disable the pump command;
    -   latch a fault;
    -   show a fault code;
    -   require inspection and deliberate reset.
7.  Do not claim that pressure control guarantees safe air/fuel ratio.
    Any engine-running validation requires appropriate independent
    instrumentation and qualified supervision.

## 6. Implementation Phases

### Phase 1 --- Requirements and system identification

-   Identify the target pump, EFI architecture, fuel type, specified
    operating pressure, maximum flow, current draw, and control
    interface.
-   Identify the pressure sensor range, output type, accuracy, and fuel
    compatibility.
-   Document what the knob is intended to command: pressure target, pump
    command, or a test-bench flow request.
-   Stop and request missing information instead of inventing
    specifications.

**Deliverable:** Requirements document and compatibility checklist.

### Phase 2 --- Electrical design

-   Produce a block diagram and a schematic for low-voltage bench
    testing.
-   Specify fuse, wire gauge, connector ratings, reverse-polarity
    protection, transient protection, driver ratings, grounding, and
    sensor conditioning.
-   Separate low-current logic from high-current pump wiring.
-   Identify hazards and define safe-state behavior.

**Deliverable:** Reviewed schematic, bill of materials, and hazard
analysis. Do not provide a vehicle-ready fuel-line design without the
target-system specifications.

### Phase 3 --- Firmware

-   Implement a non-blocking state machine: `DISABLED`, `SELF_TEST`,
    `READY`, `RUNNING`, `FAULT_LATCHED`.
-   Add sensor scaling and calibration constants, input filtering,
    bounds checking, watchdog handling, startup output-off behavior, and
    fault logging.
-   Keep pump-driver commands behind a safety interlock.
-   Do not implement direct injector timing or arbitrary inline-valve
    control as a shortcut.
-   Use unit tests and simulated sensor values before connecting any
    pump.

**Deliverable:** Source code, configuration example, unit tests, and
fault-state documentation.

### Phase 4 --- Bench verification

-   Test with a simulated sensor signal and a dummy electrical load
    first.
-   Verify startup, sensor disconnection, short/open sensor signals,
    implausible readings, watchdog reset, over-limit readings, power
    cycling, and fault latching.
-   Verify that every fault leads to a safe output state.
-   Test real fuel-system hardware only on a professionally controlled,
    fuel-compatible test bench.

**Deliverable:** Test report with pass/fail results and recorded fault
responses.

### Phase 5 --- System-specific validation

-   Have an automotive fuel-system specialist confirm compatibility and
    safe pressure limits.
-   Verify pressure under all expected operating conditions with
    appropriate instrumentation.
-   If the purpose is to alter engine fueling, validate with the correct
    engine-management equipment and air/fuel-ratio instrumentation under
    qualified supervision.
-   Do not approve road use based solely on a successful bench test.

**Deliverable:** System-specific validation report and operating
instructions.

## 7. Required Outputs from the AI Implementation Agent

1.  A requirements questionnaire listing every missing system-specific
    parameter.
2.  System block diagram.
3.  Risk analysis and fail-safe state table.
4.  Electrical schematic and bill of materials for a bench prototype.
5.  Firmware architecture, source code, and unit tests.
6.  Calibration procedure and fault-code table.
7.  Bench test plan and acceptance criteria.
8.  Clear statement of what has and has not been validated.

## 8. Acceptance Criteria

-   The device boots with its output disabled.
-   No sensor or controller fault can leave the pump command active.
-   Faults latch and require a deliberate reset after the cause is
    addressed.
-   Sensor readings are calibrated against a suitable reference.
-   Driver, fuse, wiring, and connectors are rated for the selected
    hardware.
-   No claim of universal engine compatibility is made.
-   No vehicle-use claim is made without system-specific review and
    validation.

## 9. Information Needed Before Hardware Can Be Finalized

The implementation agent must ask for: - Exact engine and EFI system, or
confirmation that this is only a test bench. - Pump make/model, rated
voltage/current, and approved control method. - Fuel type. -
Manufacturer-specified pressure range and expected flow. - Return-style
or returnless fuel architecture. - Pressure sensor model and output
type. - Whether the requested control is pressure, measured flow, or
engine fueling. - Intended environment and applicable automotive safety
requirements.

**Final instruction to the implementation agent:** Prioritize safety,
compatibility, testability, and fail-safe behavior over a quick circuit.
Do not invent pressure values or claim the controller works with every
EFI engine. If the required specifications are unknown, stop at a
simulator/bench prototype and ask for them.
