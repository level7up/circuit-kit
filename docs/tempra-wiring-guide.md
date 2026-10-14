# Tempra Diagnostic: Wiring Guide (rev A)

How the KKL cable (first session) and later the handheld ([tempra-hardware.md](tempra-hardware.md)) connect to the car's 3-pin diagnostic plug.

**Status: blocked until the 3-pin plug is actually measured.** The readings below are the *expected* pattern, not measurements.

## 1. The car's 3-pin plug

Female, no cap, branching from the ECU main harness. Wires: solid blue, white with red stripe, solid black.

Fill in the colour column from your own measurements before connecting anything:

| Role | Key off, Ω to battery − | Key on, V to battery − | Colour (fill in) |
|------|-------------------------|------------------------|------------------|
| Ground | ≈ 0 Ω | ≈ 0 V | |
| K-line | high (kΩ or open) | ≈ battery voltage | |
| Third pin (probably L-line) | high | 0 V or battery voltage | |

If the readings do **not** fit this pattern (two pins near 0 Ω, a pin at battery voltage with the key **off**, or no pin near battery voltage), stop. Report the numbers before going further.

If both non-ground pins sit at battery voltage, K and L cannot be told apart by measurement. Connect only the one you pick as K. If the handshake fails, swap to the other. Both are diagnostic lines that a tester is meant to drive, so trying the wrong one is low-risk.

## 2. The Fiat 3-pin to OBD-II adapter

The KKL cable and the handheld both have an OBD-II male plug, so one adapter serves both. Adapters are not consistent, so check yours on the bench before it goes near the car.

1. With nothing connected, beep each male pin of the adapter's Fiat end to the OBD-II female pins. The commonly published mapping is Fiat pin 1 → OBD 7 (K), pin 2 → OBD 4/5 (ground), pin 3 → OBD 15 (L), and the red lead → OBD 16 (+12 V). Status: unconfirmed; it comes from one cable seller.
2. Mate the adapter to the car plug **with the key off and the red lead disconnected**. Find which car wire lands on which OBD pin by beeping from the OBD socket back to the car-side wire colours.
3. Required result:
   - the car's **ground** wire reaches OBD **4 and 5**
   - the car's **K** wire reaches OBD **7**
   - nothing from the car reaches OBD **16**
4. If the adapter maps differently, do not use it as-is. Re-pin it, or build the lead in section 3.
5. Fit a **1 A inline fuse** on the adapter's red lead, as close to the battery clip as possible.

## 3. Home-made lead (if no adapter)

- The car side needs male terminals that fit the plug's female cavities. The terminal type is unknown. Do not force multimeter probes or wires into the cavities: a stretched terminal causes intermittent faults later. Take the plug to a parts shop and match the terminal by eye.
- Wire: car ground → OBD female 4 and 5; car K → OBD female 7; battery + via 1 A fuse → OBD female 16. Leave the third car pin unconnected.

## 4. First session: laptop + KKL cable (read-only)

1. Laptop **on battery**, charger unplugged.
2. Key **off**. Plug the KKL cable into the adapter, then the adapter into the car plug.
3. Connect the adapter's fused red lead to battery +.
4. Key **on**, engine **off**. This is the only state used in the first session.
5. Open the web app (`?app=tempra`) in Chrome or Edge, tick the checklist, press Connect and pick the KKL cable's port. The app can only read: identification, stored codes, raw sensor data.
6. Press "Download log" before disconnecting, and keep the file. It is the evidence used to confirm the protocol.
7. To disconnect: key off, then the red lead, then the adapter.

## 5. Handheld connection

Same adapter and the same order as section 4. The handheld's OBD-II male plug uses pin 7 = K, pins 4 and 5 = ground, pin 16 = +12 V. Nothing else is connected.

## 6. Never

- Bridge two pins of the car plug, or test them with a test lamp.
- Connect anything with the key on.
- Feed 12 V into any pin of the car plug.
- Use an ELM327 or Bluetooth OBD dongle: they cannot talk to this ECU and they drive pins this car does not have.
- Jump-start the car with the handheld connected.
