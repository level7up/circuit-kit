# Design Brief: 12 V Automotive Headlight Animation Controller

## Purpose

Design and simulate a four-pattern lighting controller for a 1993 Fiat
Tempra, using a nominal 12 V automotive electrical system. The intended
build is a standalone demonstration controller, operated only while the
vehicle is stationary on private property. Do not connect it to the
vehicle's original road-lighting, headlamp, turn-signal, or hazard-light
circuits.

The design must be detailed enough for another AI model or an
electronics engineer to create a proper schematic, run a circuit
simulation, inspect waveforms, and produce a buildable bill of
materials.

## Important safety and engineering constraints

-   The original proposal mentioned 55 W halogen headlamps. A 55 W lamp
    draws approximately 4.6 A at 12 V once hot, and its cold-filament
    inrush current is significantly higher. Two lamps on one side may
    draw approximately 9.2 A at nominal voltage, before inrush.
-   Rapidly switching halogen lamps can shorten their service life and
    create glare. Prefer separate, low-power LED demonstration loads for
    the animation. If the halogen-load case is modelled, clearly label
    it as a bench simulation only and account for cold-filament inrush
    and relay contact ratings.
-   Never interrupt or modify the vehicle's required road lighting or
    signalling functions. The animation circuit must be electrically
    independent, have a clearly defined master enable, and default to
    OFF on loss of control power or a fault.
-   Automotive 12 V systems are electrically harsh: supply voltage
    varies, reverse battery connection is possible, and
    load-dump/transient events can occur. Do not connect an unprotected
    prototype directly to the vehicle battery.
-   Do not claim that a design is automotive-qualified unless the
    relevant tests and standards have actually been met.
-   Do not invent component ratings or claim a simulation passed without
    showing the circuit/model and results.
-   Use a separate fused supply for the power stage and a protected
    low-voltage rail for logic. Include suitable flyback suppression for
    relay coils and transient protection for the supply.
-   Ensure the output stage is designed for the actual load, including
    inrush, wiring ampacity, connector ratings, thermal performance, and
    switching frequency.
-   Do not use a mechanical relay as a high-speed oscillator element.
    Mechanical relays have finite operating/release times, contact
    bounce, audible noise, and limited electrical life. Use solid-state
    logic/timing for sequencing and use relays only where the switching
    rate and load are within their ratings.
-   The final response must distinguish between a conceptual schematic,
    a simulated circuit, and a verified physical build.

## Required animation patterns

Provide four selectable patterns. The logic must define the exact
sequence and timing for each pattern, not merely describe it in prose.

1.  **Alternating sides:** left output, OFF/dead time if needed, right
    output, repeat.
2.  **Synchronous flash:** left and right outputs switch together.
3.  **Double flash:** two short pulses on the left, then two short
    pulses on the right, repeat.
4.  **Alternating groups / sweep effect:** define a sequence using the
    available independent output channels. If only left and right
    channels exist, explain that a true multi-segment sweep is not
    possible without more separately controlled channels.

Add a four-position pattern selector and a master enable. Define
power-up behaviour, selector-change behaviour, and what happens if the
clock or logic stops.

## Preferred architecture

Evaluate this architecture, then justify any changes:

-   Protected 12 V input with a main fuse and reverse-polarity
    protection.
-   Automotive transient suppression suitable for the intended
    environment.
-   A regulated logic supply.
-   A timer/oscillator (for example, NE555) to create the clock.
-   A counter/sequencer (for example, CD4017) and appropriate
    combinational logic to create the required patterns.
-   A pattern selector that changes patterns deterministically.
-   A transistor or logic-level MOSFET driver stage for relay coils,
    with flyback suppression.
-   Properly rated output relays or, preferably for rapid switching, an
    appropriate solid-state output stage for separate LED demonstration
    loads.
-   Separate branch protection for output loads.

Do not assume that an NE555 + CD4017 + one logic IC automatically
implements four patterns. Derive the logic, provide a state table, and
verify the sequence in simulation.

## Deliverables required from the design/simulation AI

### 1. Design assumptions

List the supply-voltage range, load type, number of lamps/channels,
target pulse widths, duty cycle, repetition rate, selector behaviour,
and whether the simulated output is LED or halogen. If a parameter is
unknown, state the assumption explicitly.

### 2. Functional block diagram

Show the power input, protection, logic rail, oscillator, sequencer,
pattern selection, drivers, output switching, and loads.

### 3. Complete schematic

Provide a readable schematic with: - Every IC pin number and signal
name. - Component reference designators and values. - Transistor/MOSFET
part numbers and gate/base resistors. - Relay coil and contact pin
assignments, including COM/NO/NC. - Flyback diodes and their polarity. -
Fuse locations and proposed ratings, with the calculation and
assumptions. - Grounding and decoupling. - A clear boundary between
logic current and load current.

Do not provide only a block diagram as if it were a complete schematic.

### 4. State table and timing

For every selector position, provide the complete output state sequence.
Include the oscillator frequency, ON/OFF durations, dead time if used,
and a timing diagram. Ensure the pattern-selector logic cannot create
unintended simultaneous states.

### 5. Simulation project

Use a real circuit simulator such as LTspice, Qucs-S, KiCad/ngspice, or
another suitable simulator. State the exact simulator and version if
known.

Provide: - Native project/netlist files where possible. - Any required
model files or a list of built-in models used. - Simulation
commands/settings and analysis duration. - Transient plots for all four
patterns. - Plots of logic outputs, driver signals, relay-coil
currents/voltages if relay models are included, and load current. -
Startup behaviour and selector changes. - Tests for supply variation, a
disconnected load, a shorted output where the simulator model permits
it, and loss of logic power. - A concise table of expected versus
simulated results.

If mechanical relay dynamics are not represented in the simulator, say
so explicitly. Do not treat an ideal switch as proof that a real relay
can switch at the requested rate.

### 6. Bill of materials

Create a table with designator, exact part/value, quantity, role, key
rating, and acceptable alternatives. Avoid obscure parts unless
necessary.

### 7. Build and test procedure

Give a staged procedure: 1. Simulate the logic without power loads. 2.
Build the logic on a current-limited bench supply. 3. Verify each
pattern using indicator LEDs. 4. Test the driver stage with a dummy
load. 5. Test the power stage through correctly rated fuses and wiring.
6. Inspect temperatures and switching behaviour. 7. Only consider
vehicle installation after independent review; do not connect to factory
road-lighting circuits.

### 8. Engineering review

List limitations, failure modes, thermal/current calculations, and any
requirements that still need confirmation before physical construction.

## Acceptance criteria

The design is acceptable only if:

-   All four patterns are explicitly defined and selectable.
-   The complete schematic agrees with the state table.
-   The simulation produces the stated output sequences.
-   Logic pins are never required to drive relay coils or lamp loads
    directly.
-   Protection and load-current calculations are shown.
-   The design defaults safely to OFF.
-   The simulation's limitations, especially relay speed and halogen
    inrush, are disclosed.
-   The final output contains enough detail for an independent reviewer
    to reproduce the simulation.

## Required response format

Organize the result in this order:

1.  Summary and assumptions
2.  Block diagram
3.  State table and timing diagram
4.  Complete schematic
5.  Component calculations
6.  Simulation files/netlist and instructions
7.  Simulation plots and results
8.  Bill of materials
9.  Bench test procedure
10. Safety review and unresolved questions

If the selected simulator cannot be run in the current environment, do
not pretend it was run. Instead, provide a simulator-ready
netlist/project and clearly mark simulation results as **not executed**.
