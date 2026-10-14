# Tempra Handheld: Wi-Fi and Bluetooth

The phone never talks to the car. The handheld runs the K-line protocol (`session.h`) and the phone is a remote control and display. The K-line needs byte replies within milliseconds, which neither link can guarantee.

**Status: written and tested against stand-ins only.** The message format is tested on both sides. The Wi-Fi, web server and Bluetooth code in `tempra_diag.ino` compiles against stub headers I wrote, not against the real libraries, and has not run on an ESP32.

## Options

| | Wi-Fi | Bluetooth |
|---|---|---|
| Phones | Any browser, iPhone and Android | Chrome on Android, or desktop Chrome/Edge (Web Bluetooth). Not iPhone |
| App comes from | The handheld itself, at `http://192.168.4.1` | The normal hosted app |
| Internet needed | No | Only to load the app the first time |
| Transport | WebSocket `ws://192.168.4.1/ws` | Nordic UART Service (`6E400001-…`), RX write, TX notify |

The Wi-Fi app has to come from the handheld because a page loaded over HTTPS may not open an unencrypted `ws://` connection to a local device. It is the same Tempra app, built separately with `npm run build:device` (about 50 KB gzipped), so the kits site is not on the device.

## Security

- The access point is WPA2. Its name is `TEMPRA-xxxx` (from the MAC address). Its password is 8 random characters generated on first boot with `esp_random()`, stored in NVS (`Preferences`), and shown on the handheld's `LINK` page. It is not derived from the MAC address, because the MAC address is broadcast in every Wi-Fi beacon.
- Bluetooth has no pairing. Anyone in range can connect and read faults. Accepted because the link is read-only.
- The handheld accepts exactly two commands, `READ FAULTS` and `READ SENSORS`. Any other line is ignored. There is no clear-codes or actuator command on any link.
- Over Wi-Fi at most 2 clients can connect (`WIFI_MAX_CLIENTS`).

## Messages

One JSON object per line, ending in `\n`. Short keys keep each line small for Bluetooth notifications, which are sent in 20-byte chunks.

| Line | Meaning |
|------|---------|
| `{"t":"hello","fw":"tempra_diag 2"}` | Sent when a client connects |
| `{"t":"state","ph":"ready","f":"none","rc":0,"id":"…","bat":12.4,"ssid":"TEMPRA-1A2B","wc":1,"bc":0}` | On change and every second. `ph` is the displayed phase (keep-alives show `ready`) |
| `{"t":"faults","rej":0,"b":[[2,10,30]]}` | Raw fault blocks, decoded by the app |
| `{"t":"sensors","rej":0,"b":[[…10 bytes…]]}` | Raw sensor block |

`firmware/tempra_diag/test/link_fixtures.txt` holds one example of each. The C++ test (`link_test.cpp`) must produce them byte for byte. The app test (`tests/tempra-device-link.spec.ts`) must parse them. The app also rejects anything malformed: unknown phases, bytes outside 0–255, too many blocks, and overlong lines.

## Timing

The Wi-Fi and Bluetooth stacks run on core 0, and the K-line loop runs on core 1. Commands from the network only set an atomic flag. The main loop turns that into a request, and sends status only while no K-line exchange is in progress (`PHASE_LINK` or `PHASE_KEYWORDS`).

## Building

- Arduino IDE 2, esp32 core 2.x, Partition Scheme **Huge APP (3MB No OTA/1MB SPIFFS)**.
- Libraries:
  - Adafruit SSD1306
  - Adafruit GFX
  - NimBLE-Arduino **1.4.x** (2.x changed the callback signatures)
  - ESP Async WebServer (ESP32Async) with AsyncTCP
- `npm run build:device`, then upload the `data/` folder with the arduino-littlefs-upload extension.

## Not yet verified

- That the real library versions accept the code as written. It was compiled only against my stub headers.
- RAM headroom with Wi-Fi, Bluetooth, the web server and the OLED all running.
- That publishing status never disturbs K-line timing on real hardware.
