# Claude Voice Terminal
## Hardware + Software Implementation Plan

**Project type:** DIY USB-connected voice interface for Claude Code
**Target host:** macOS
**Primary goal:** Use a physical push-to-talk button to speak prompts to Claude Code and hear responses spoken aloud.
**Initial strategy:** Keep speech processing and Claude Code on the Mac. Use an ESP32-S3 as a USB-connected hardware controller.

---

## 1. Project Goals

Build a compact desktop device that allows the user to interact with Claude Code by voice.

### MVP requirements

- A physical Push-to-Talk button.
- USB connection between the device and the Mac.
- ESP32-S3 firmware that reports button events over USB serial.
- A host-side Python application that reads device events.
- A working speech-input path into Claude Code.
- A spoken-response path using macOS text-to-speech, where feasible and reliable.
- Clear status feedback for idle, listening, processing, speaking, and error states.
- A reliable way to stop recording or speech playback.
- No direct connection from the microcontroller to Claude or to the internet.

### Non-goals for the first version

- Running an AI model on the ESP32.
- Building a fully independent network-connected assistant.
- Adding a dedicated microphone, amplifier, speaker, touchscreen, or 3D-printed enclosure before the MVP works.
- Automatically executing arbitrary shell commands without user confirmation.

---

## 2. Recommended Architecture

```text
┌─────────────────────────────────────┐
│ Claude Voice Terminal               │
│                                     │
│ ESP32-S3                            │
│ ├── Push-to-Talk button             │
│ ├── Optional cancel button          │
│ ├── Optional status LED             │
│ └── Optional OLED status display    │
└──────────────────┬──────────────────┘
                   │ USB serial
                   ▼
┌─────────────────────────────────────┐
│ macOS host application (Python)     │
│ ├── Serial event reader             │
│ ├── State machine                   │
│ ├── Audio capture / device control  │
│ ├── Claude Code integration adapter │
│ ├── Speech playback (macOS TTS)     │
│ └── Logging and configuration       │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│ Claude Code                         │
│ ├── Existing CLI / supported input  │
│ └── Existing project and permissions│
└─────────────────────────────────────┘
```

### Architectural rules

1. **The Mac handles all AI and audio processing.** The ESP32-S3 only reports physical inputs and optionally drives simple indicators.
2. **Keep the Claude Code integration behind an adapter.** Do not couple the application to terminal screen scraping or undocumented internals.
3. **Prefer supported Claude Code functionality.** First test the built-in `/voice` feature and the installed version's supported workflow. Confirm whether the desired input and response behavior can be automated reliably.
4. **Treat speech-to-text and text-to-speech as separate components.** Claude Code voice input does not automatically guarantee that every response will be spoken aloud.
5. **If the supported Claude Code interface cannot provide reliable programmatic input/output,** evaluate a documented CLI/SDK integration or a small custom client using the Claude API. An API-based client is a different integration path and may incur separate usage charges.
6. **Do not store API keys in firmware or source control.** Use environment variables or macOS Keychain if API credentials are needed.
7. **Use explicit permissions and confirmation.** Voice input must not silently grant Claude Code additional tool or shell permissions.

---

## 3. Hardware Bill of Materials

Prices below are planning estimates in Egyptian pounds (EGP), not verified live quotes.

| Component | Purpose | Estimated cost |
|---|---|---:|
| ESP32-S3 development board with USB support | Reads buttons and communicates with Mac | 250–600 EGP |
| Momentary push button | Push-to-talk input | 20–100 EGP |
| Breadboard and jumper wires | Prototyping | 80–150 EGP |
| USB cable suitable for data | Connects board to Mac | 50–150 EGP |
| Optional 0.96-inch I2C OLED | Displays state | 150–300 EGP |
| Existing Mac-compatible headset or microphone and headphones | Initial audio input/output | 0 EGP if already owned; otherwise roughly 400–1,000 EGP |
| Optional status LED and resistor | Visual feedback | 10–40 EGP |
| Optional enclosure | Protects finished electronics | 100–400 EGP |

### Budget scenarios

- **Minimum MVP, using an existing headset:** roughly 400–900 EGP.
- **Desktop prototype with display and enclosure:** roughly 900–2,000 EGP.
- **Later integrated audio prototype:** roughly 1,500–3,500 EGP.

Actual prices vary by seller, board model, shipping, and availability. Confirm the exact board is an **ESP32-S3** before buying; a classic ESP32 board is not interchangeable for every USB-related implementation.

### Purchase order

Buy only the following for the first iteration:

1. ESP32-S3 development board.
2. Data-capable USB cable, if needed.
3. Momentary push button.
4. Breadboard and jumper wires.

Reuse the Mac's existing microphone and audio output initially. Add the OLED and integrated audio only after the software workflow works.

---

## 4. Software Stack

### Firmware

- Arduino IDE or PlatformIO.
- ESP32 board support package.
- USB serial communication.
- Debounced button input.
- Optional LED/OLED status output.

### macOS host application

- Python 3.
- `pyserial` for USB serial communication.
- A small state machine for device states.
- macOS built-in `say` command or an equivalent local TTS interface for a first playback prototype.
- A replaceable audio capture / speech-to-text component.
- A replaceable Claude Code integration adapter.
- Unit tests for event parsing and state transitions.

Keep dependencies minimal for the first prototype.

### Suggested project structure

```text
claude-voice-terminal/
├── README.md
├── docs/
│   ├── architecture.md
│   ├── hardware.md
│   ├── protocol.md
│   └── safety.md
├── firmware/
│   └── claude_voice_terminal/
│       └── claude_voice_terminal.ino
├── host/
│   ├── pyproject.toml
│   └── src/
│       └── claude_voice_terminal/
│           ├── main.py
│           ├── serial_device.py
│           ├── state_machine.py
│           ├── audio_input.py
│           ├── speech_output.py
│           ├── claude_adapter.py
│           └── config.py
└── tests/
    ├── test_protocol.py
    └── test_state_machine.py
```

This structure is a suggested starting point, not a requirement to create every file on day one.

---

## 5. USB Serial Protocol

Use a simple newline-delimited protocol for the MVP.

### Device to host

```text
BTN:PTT_DOWN
BTN:PTT_UP
BTN:CANCEL
```

### Host to device (optional)

```text
STATE:IDLE
STATE:LISTENING
STATE:PROCESSING
STATE:SPEAKING
STATE:ERROR
```

### Protocol requirements

- End each message with `\n`.
- Ignore malformed messages safely.
- Limit line length and reject unexpected input.
- Debounce button input in firmware.
- Avoid sending repeated button-down events while the button remains held.
- Add a protocol version later if the protocol grows.
- The host must not interpret serial messages as shell commands.

---

## 6. State Machine

Expected states:

- `IDLE`: Waiting for input.
- `LISTENING`: Recording or collecting speech input.
- `PROCESSING`: Speech transcription / Claude Code request is in progress.
- `SPEAKING`: The host is reading a response aloud.
- `CANCELLED`: Current recording or playback was cancelled.
- `ERROR`: An operation failed and needs visible feedback.

### Initial interaction

1. Device starts and sends a ready event.
2. User presses and holds Push-to-Talk.
3. Host begins capturing audio, or activates the chosen supported voice-input workflow.
4. User releases the button.
5. Host finalizes the utterance and sends it through the configured integration.
6. Host receives a response through a supported channel.
7. Host optionally reads the response aloud.
8. Host returns to `IDLE`.

If the first implementation uses Claude Code's interactive `/voice` workflow, test the exact behavior manually first. Do not assume it offers a stable public API for external button automation or response capture.

---

## 7. Implementation Phases

### Phase 0 — Verify the software workflow

**Objective:** Prove that the desired interaction is possible before buying or integrating hardware.

Tasks:

1. Check the installed Claude Code version and authentication method.
2. Test the built-in `/voice` feature with the Mac's existing microphone.
3. Determine whether the installed version can accept voice input in the desired way.
4. Determine how the response can be captured reliably for text-to-speech.
5. Test local macOS speech output with a short known sentence.
6. Write down the exact limitations of the chosen integration.

**Acceptance criteria:**

- Voice input works manually.
- A response can be obtained.
- Local TTS works.
- The chosen integration path is documented.

**Important:** If direct automation of Claude Code's voice workflow is not supported, do not use fragile terminal scraping as the foundation. Choose between a supported CLI/SDK integration and a custom API-based voice client, understanding that the latter is not the same as controlling the Claude Code interactive session.

### Phase 1 — Firmware prototype

Tasks:

1. Install Arduino IDE or PlatformIO.
2. Install the correct ESP32-S3 board support.
3. Connect one momentary button between a GPIO pin and GND.
4. Configure the input with the internal pull-up where supported.
5. Debounce the button.
6. Send `BTN:PTT_DOWN` and `BTN:PTT_UP` events over USB serial.
7. Test with the serial monitor.

**Acceptance criteria:**

- Press and release events are correct.
- No excessive duplicate events occur.
- Repeated presses work reliably.

### Phase 2 — Host-side serial application

Tasks:

1. Create a Python virtual environment.
2. Add `pyserial`.
3. Discover and select the correct serial port.
4. Parse incoming events.
5. Implement and test the state machine.
6. Handle unplug/replug and serial errors gracefully.
7. Add structured logs without recording audio by default.

**Acceptance criteria:**

- Pressing the hardware button creates the correct host event.
- The application recovers from disconnects.
- Invalid serial input cannot execute commands.

### Phase 3 — Voice input

Tasks:

1. Choose the supported Claude Code input path established in Phase 0.
2. Implement audio capture or activation of the verified voice workflow.
3. Add clear start/stop recording behavior.
4. Display the current state through console logs or an LED.
5. Test noisy-room behavior and accidental activations.

**Acceptance criteria:**

- A button action initiates the intended voice-input flow.
- Recording stops deterministically.
- The user receives clear feedback when input fails.

### Phase 4 — Spoken responses

Tasks:

1. Obtain response text through the chosen supported integration.
2. Add macOS TTS playback.
3. Add cancel/stop playback.
4. Avoid reading huge outputs by default; provide a configurable summary or first-response mode.
5. Handle errors and empty responses.

**Acceptance criteria:**

- A response can be read aloud.
- Playback can be stopped.
- Errors do not leave the device stuck in `SPEAKING`.

### Phase 5 — Display and enclosure

Tasks:

1. Add an OLED over I2C if desired.
2. Display concise states such as `READY`, `LISTENING`, `THINKING`, `SPEAKING`, and `ERROR`.
3. Add a cancel button and status LED if needed.
4. Design and print or assemble an enclosure.
5. Add strain relief for the USB cable.

**Acceptance criteria:**

- State information remains legible.
- No exposed conductive parts can short together.
- Buttons and connectors remain mechanically secure.

### Phase 6 — Reliability and release

Tasks:

1. Add unit tests for serial parsing and state transitions.
2. Test repeated interactions over an extended session.
3. Test USB disconnect/reconnect.
4. Confirm that recording and playback stop on cancellation.
5. Document installation and recovery.
6. Confirm Claude Code permissions remain under the user's control.

---

## 8. Safety, Privacy, and Security

- Use **push-to-talk by default**, not always-on recording.
- Provide an obvious way to cancel recording and stop speech playback.
- Do not save raw audio unless the user explicitly enables it.
- Do not log API tokens, sensitive prompts, or complete project output by default.
- Keep credentials out of firmware and version control.
- Do not bypass Claude Code permission prompts or grant broad shell access merely for convenience.
- Require explicit confirmation for any action that modifies files, runs commands, or performs other consequential operations if the integration path exposes those actions.
- Keep the microcontroller firmware simple: button events and display state only.
- Avoid connecting a 5 V signal directly to a 3.3 V-only ESP32-S3 GPIO.
- Power the prototype over USB and follow the development board's pinout and current limits.

---

## 9. Known Risks and Decisions

### Risk: Claude Code integration details

Claude Code's built-in `/voice` functionality is useful for manually dictating prompts, but it must not be assumed to expose a stable API for external hardware, programmatic prompt submission, or response retrieval.

**Mitigation:** Prove the integration in Phase 0 and isolate it behind `claude_adapter.py`.

### Risk: Speech output

Text-to-speech requires access to response text. If the selected Claude Code interface does not expose responses through a supported mechanism, a custom API client may be necessary.

**Mitigation:** Treat the voice frontend and Claude Code integration as separate modules; make the integration decision before designing the final enclosure.

### Risk: Cost

Using Claude Code under an existing subscription and using the Claude API can have different billing and access terms.

**Mitigation:** Check the current terms and costs for the chosen route before implementation. Do not assume an API key is included with a Claude subscription.

### Risk: Hardware compatibility

ESP32 boards vary in USB capabilities and pin mapping.

**Mitigation:** Confirm the exact ESP32-S3 board model and native USB/USB-serial behavior before wiring or buying accessories.

---

## 10. Definition of Done for the MVP

The MVP is complete when:

- [ ] ESP32-S3 connects to the Mac over USB.
- [ ] A physical button produces reliable serial events.
- [ ] The host application receives events and updates its state.
- [ ] The chosen voice-input workflow works reliably.
- [ ] Claude Code can be used through the documented integration path.
- [ ] A response can be read aloud, or a documented integration limitation and alternative are agreed upon.
- [ ] Recording and playback can be cancelled.
- [ ] The application recovers safely from common errors.
- [ ] No secrets are committed to source control.
- [ ] Setup and troubleshooting instructions are documented.

---

## 11. Recommended First Action

Do **Phase 0 first**, using only the Mac:

1. Open Claude Code.
2. Test `/voice` manually.
3. Test macOS speech output with `say "Hello, this is a speech test."`.
4. Decide whether the project will control Claude Code through a supported interface or use a separate Claude API-based voice client.

Once this is proven, build the ESP32-S3 button prototype. This order avoids spending money on hardware before the most important integration question is resolved.
