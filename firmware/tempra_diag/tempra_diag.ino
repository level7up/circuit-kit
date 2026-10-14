#include <Adafruit_GFX.h>
#include <ESPAsyncWebServer.h>
#include <LittleFS.h>
#include <NimBLEDevice.h>
#include <Preferences.h>
#include <WiFi.h>
#include <atomic>
#include <Adafruit_SSD1306.h>
#include <Wire.h>
#include <driver/gpio.h>

#include "faults.h"
#include "link.h"
#include "session.h"

using namespace tempradiag;

const uint8_t PIN_K_RX = 27;
const uint8_t PIN_K_TX = 26;
const uint8_t PIN_VBAT = 34;
const uint8_t PIN_PAGE = 32;
const uint8_t PIN_SENSORS = 33;
const uint8_t PIN_FAULTS = 25;
const uint8_t PIN_LED = 2;
const uint8_t PIN_SDA = 13;
const uint8_t PIN_SCL = 14;

const uint8_t OLED_ADDRESS = 0x3C;
const uint8_t OLED_WIDTH = 128;
const uint8_t OLED_HEIGHT = 64;
const uint8_t TEXT_COLUMNS = 21;
const uint8_t FAULT_ROWS = 5;

const long USB_BAUD = 460800;
const size_t USB_TX_BUFFER = 4096;
const uint32_t I2C_HZ = 400000;
const uint32_t SCREEN_EVERY_MS = 200;
const uint32_t VBAT_EVERY_MS = 500;
const uint32_t DEBOUNCE_MS = 30;

const float VBAT_DIVIDER = (100.0f + 12.0f) / 12.0f;
const float VBAT_CAL = 1.0f;
const float D1_DROP_V = 0.9f;
const float MV_PER_V = 1000.0f;

const char NUS_SERVICE_UUID[] = "6E400001-B5A3-F393-E0A9-E50E24DCCA9E";
const char NUS_RX_UUID[] = "6E400002-B5A3-F393-E0A9-E50E24DCCA9E";
const char NUS_TX_UUID[] = "6E400003-B5A3-F393-E0A9-E50E24DCCA9E";
const char WS_PATH[] = "/ws";
const char PREFS_NAMESPACE[] = "tempra";
const char PREFS_PASS_KEY[] = "wifipass";
const char PASS_ALPHABET[] = "abcdefghjkmnpqrstuvwxyz23456789";
const size_t PASS_LENGTH = 8;
const size_t SSID_LENGTH = 16;
const uint16_t HTTP_PORT = 80;
const uint8_t WIFI_CHANNEL = 1;
const uint8_t WIFI_MAX_CLIENTS = 2;
const uint32_t STATE_EVERY_MS = 1000;
const size_t BLE_CHUNK = 20;

enum Page : uint8_t { PAGE_STATUS = 0, PAGE_FAULTS = 1, PAGE_SENSORS = 2, PAGE_LINK = 3, PAGE_COUNT = 4 };

struct Button {
  uint8_t pin;
  bool down;
  uint32_t changedMs;
};

Adafruit_SSD1306 oled(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);
bool oledOk = false;
Session session;
bool uartAttached = false;
bool lineLow = false;
Page page = PAGE_STATUS;
bool hasFaults = false;
Reply faults;
bool hasSensors = false;
Reply sensors;
float batteryV = 0.0f;
uint32_t lastScreenMs = 0;
uint32_t lastVbatMs = 0;
uint32_t lastStepMs = 0;
AsyncWebServer server(HTTP_PORT);
AsyncWebSocket socket(WS_PATH);
NimBLECharacteristic* bleTx = nullptr;
std::atomic<uint8_t> pendingCommand{CMD_NONE};
std::atomic<bool> helloWanted{false};
std::atomic<uint8_t> bleClients{0};
char ssid[SSID_LENGTH];
char wifiPass[PASS_LENGTH + 1];
bool faultsDirty = false;
bool sensorsDirty = false;
uint32_t lastStateMs = 0;
char lastState[LINK_LINE_MAX];
Button buttons[] = {{PIN_PAGE, false, 0}, {PIN_SENSORS, false, 0}, {PIN_FAULTS, false, 0}};

const char* phaseText(Phase p) {
  switch (p) {
    case PHASE_WAKE: return "WAKE 5 BAUD";
    case PHASE_SYNC: return "WAIT ECU";
    case PHASE_KEYWORDS: return "HANDSHAKE";
    case PHASE_LINK: return "LINK";
    case PHASE_READY: return "READY";
    case PHASE_BACKOFF: return "RETRY";
    default: return "OFF";
  }
}

const char* faultText(Fault f) {
  switch (f) {
    case FAULT_NO_SYNC: return "NO ANSWER";
    case FAULT_TIMEOUT: return "TIMEOUT";
    case FAULT_ECHO: return "ECHO";
    case FAULT_COMPLEMENT: return "ACK BYTE";
    case FAULT_LENGTH: return "LENGTH";
    case FAULT_END_BYTE: return "END BYTE";
    case FAULT_UNEXPECTED_BYTE: return "UNEXPECTED";
    case FAULT_TOO_MANY_BLOCKS: return "TOO MANY";
    default: return "NONE";
  }
}

void logEntry(const char* dir, int value) {
  unsigned long nowMs = static_cast<unsigned long>(millis());
  if (value < 0) {
    Serial.printf("%lu %s\n", nowMs, dir);
    return;
  }
  Serial.printf("%lu %s %02X\n", nowMs, dir, value);
}

void attachUart() {
  Serial2.begin(SESSION_BAUD, SERIAL_8N1, PIN_K_RX, PIN_K_TX, true);
  gpio_pullup_en(static_cast<gpio_num_t>(PIN_K_RX));
  while (Serial2.available() > 0) Serial2.read();
  uartAttached = true;
}

void detachUart() {
  Serial2.end();
  pinMode(PIN_K_TX, OUTPUT);
  digitalWrite(PIN_K_TX, LOW);
  uartAttached = false;
}

void driveLine(bool high) {
  if (uartAttached) detachUart();
  bool low = !high;
  if (low != lineLow) logEntry(low ? "break-on" : "break-off", -1);
  lineLow = low;
  digitalWrite(PIN_K_TX, low ? HIGH : LOW);
}

void apply(const Outputs& out) {
  if (out.driveLine) {
    driveLine(out.lineHigh);
    return;
  }
  if (lineLow) driveLine(true);
  if (!uartAttached) attachUart();
  if (!out.hasTx) return;
  Serial2.write(out.tx);
  logEntry("tx", out.tx);
}

void collectReply() {
  if (!session.replyReady) return;
  if (session.reply.purpose == PURPOSE_READ_ERRORS) {
    faults = session.reply;
    hasFaults = true;
    faultsDirty = true;
    page = PAGE_FAULTS;
  }
  if (session.reply.purpose == PURPOSE_READ_SENSORS) {
    sensors = session.reply;
    hasSensors = true;
    sensorsDirty = true;
    page = PAGE_SENSORS;
  }
  session = takeReply(session);
}

void advance(uint32_t nowMs, bool hasRx, uint8_t rx) {
  Inputs in = {nowMs, hasRx, rx};
  session = step(session, in, MA17_TIMING);
  apply(session.out);
  collectReply();
}

void pumpLink() {
  uint32_t nowMs = millis();
  while (uartAttached && Serial2.available() > 0) {
    uint8_t b = static_cast<uint8_t>(Serial2.read());
    logEntry("rx", b);
    advance(nowMs, true, b);
  }
  if (nowMs == lastStepMs) return;
  lastStepMs = nowMs;
  advance(nowMs, false, 0);
}

bool pressed(Button& b, uint32_t nowMs) {
  bool down = digitalRead(b.pin) == LOW;
  if (down == b.down || nowMs - b.changedMs < DEBOUNCE_MS) return false;
  b.down = down;
  b.changedMs = nowMs;
  return down;
}

void readButtons() {
  uint32_t nowMs = millis();
  if (pressed(buttons[0], nowMs)) page = static_cast<Page>((page + 1) % PAGE_COUNT);
  if (pressed(buttons[1], nowMs)) session = request(session, readSensors());
  if (pressed(buttons[2], nowMs)) session = request(session, readErrors());
}

void readBattery() {
  uint32_t nowMs = millis();
  if (nowMs - lastVbatMs < VBAT_EVERY_MS) return;
  lastVbatMs = nowMs;
  batteryV = analogReadMilliVolts(PIN_VBAT) / MV_PER_V * VBAT_DIVIDER * VBAT_CAL + D1_DROP_V;
}

void printHex(const uint8_t* data, uint8_t from, uint8_t to) {
  for (uint8_t i = from; i < to; ++i) oled.printf("%02X ", data[i]);
}

void drawStatus() {
  char ident[TEXT_COLUMNS + 1];
  identText(session.ident, ident, sizeof(ident));
  oled.println("TEMPRA MA1.7");
  oled.println(phaseText(displayPhase(session)));
  oled.println(session.identReady ? ident : "-");
  oled.printf("BAT %.1fV (device)\n", batteryV);
  oled.printf("ERR %s R%u\n", faultText(session.fault), session.reconnects);
  oled.println("PG  SENS  FAULTS");
}

void drawFaults() {
  if (!hasFaults) {
    oled.println("FAULTS: press button");
    return;
  }
  if (faults.rejected) {
    oled.println("FAULTS: REJECTED");
    return;
  }
  oled.printf("FAULTS %u (unverified)\n", faults.blockCount);
  for (uint8_t i = 0; i < faults.blockCount && i < FAULT_ROWS; ++i) {
    const Block& b = faults.blocks[i];
    uint16_t code = 0;
    if (faultCode(b, code)) {
      oled.printf("%04X %s\n", code, faultName(code));
    } else {
      printHex(b.data, 0, b.dataLength);
      oled.println();
    }
  }
}

void drawSensors() {
  if (!hasSensors || sensors.blockCount == 0) {
    oled.println(hasSensors ? "SENSORS: REJECTED" : "SENSORS: press button");
    return;
  }
  const Block& b = sensors.blocks[0];
  oled.println("SENSORS (raw)");
  printHex(b.data, 0, b.dataLength);
  oled.println();
}

bool isExchanging() { return session.phase == PHASE_KEYWORDS || (session.phase == PHASE_LINK && displayPhase(session) == PHASE_LINK); }

void drawLink() {
  oled.printf("WIFI %s\n", ssid);
  oled.printf("PASS %s\n", wifiPass);
  oled.println("http://192.168.4.1");
  oled.printf("BT %s\n", ssid);
  oled.printf("CLIENTS W%u B%u\n", static_cast<unsigned>(socket.count()), static_cast<unsigned>(bleClients.load()));
}

void drawScreen() {
  uint32_t nowMs = millis();
  if (!oledOk || isExchanging() || nowMs - lastScreenMs < SCREEN_EVERY_MS) return;
  lastScreenMs = nowMs;
  oled.clearDisplay();
  oled.setCursor(0, 0);
  if (page == PAGE_STATUS) drawStatus();
  if (page == PAGE_FAULTS) drawFaults();
  if (page == PAGE_SENSORS) drawSensors();
  if (page == PAGE_LINK) drawLink();
  oled.display();
}

void queueCommand(const char* line, size_t len) {
  Command c = parseCommand(line, len);
  if (c != CMD_NONE) pendingCommand.store(c);
}

void onSocket(AsyncWebSocket*, AsyncWebSocketClient*, AwsEventType type, void* arg, uint8_t* data, size_t len) {
  if (type == WS_EVT_CONNECT) {
    helloWanted.store(true);
    return;
  }
  if (type != WS_EVT_DATA) return;
  const AwsFrameInfo* info = static_cast<const AwsFrameInfo*>(arg);
  if (!info->final || info->index != 0 || info->len != len || info->opcode != WS_TEXT) return;
  queueCommand(reinterpret_cast<const char*>(data), len);
}

class RxCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c) override {
    std::string value = c->getValue();
    queueCommand(value.data(), value.size());
  }
};

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer*) override {
    bleClients.fetch_add(1);
    helloWanted.store(true);
  }
  void onDisconnect(NimBLEServer*) override {
    if (bleClients.load() > 0) bleClients.fetch_sub(1);
    NimBLEDevice::startAdvertising();
  }
};

void loadWifiPass() {
  Preferences prefs;
  prefs.begin(PREFS_NAMESPACE, false);
  String stored = prefs.getString(PREFS_PASS_KEY, "");
  if (stored.length() != PASS_LENGTH) {
    for (size_t i = 0; i < PASS_LENGTH; ++i) wifiPass[i] = PASS_ALPHABET[esp_random() % (sizeof(PASS_ALPHABET) - 1)];
    wifiPass[PASS_LENGTH] = '\0';
    prefs.putString(PREFS_PASS_KEY, wifiPass);
  } else {
    strncpy(wifiPass, stored.c_str(), PASS_LENGTH + 1);
  }
  prefs.end();
}

void startWifi() {
  WiFi.mode(WIFI_AP);
  uint8_t mac[6];
  WiFi.softAPmacAddress(mac);
  snprintf(ssid, sizeof(ssid), "TEMPRA-%02X%02X", mac[4], mac[5]);
  loadWifiPass();
  WiFi.softAP(ssid, wifiPass, WIFI_CHANNEL, 0, WIFI_MAX_CLIENTS);
  if (!LittleFS.begin(true)) Serial.println("LittleFS mount failed: upload the web app (data folder)");
  server.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  socket.onEvent(onSocket);
  server.addHandler(&socket);
  server.begin();
}

void startBluetooth() {
  NimBLEDevice::init(ssid);
  NimBLEServer* bleServer = NimBLEDevice::createServer();
  bleServer->setCallbacks(new ServerCallbacks());
  NimBLEService* service = bleServer->createService(NUS_SERVICE_UUID);
  bleTx = service->createCharacteristic(NUS_TX_UUID, NIMBLE_PROPERTY::NOTIFY);
  NimBLECharacteristic* rx = service->createCharacteristic(NUS_RX_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);
  rx->setCallbacks(new RxCallbacks());
  service->start();
  NimBLEAdvertising* advertising = NimBLEDevice::getAdvertising();
  advertising->addServiceUUID(NUS_SERVICE_UUID);
  advertising->start();
}

void publish(const char* json) {
  char line[LINK_LINE_MAX + 1];
  int n = snprintf(line, sizeof(line), "%s\n", json);
  if (n <= 0 || static_cast<size_t>(n) >= sizeof(line)) return;
  if (socket.count() > 0) socket.textAll(line);
  if (bleTx == nullptr || bleClients.load() == 0) return;
  for (int i = 0; i < n; i += BLE_CHUNK) {
    size_t chunk = static_cast<size_t>(n - i) < BLE_CHUNK ? static_cast<size_t>(n - i) : BLE_CHUNK;
    bleTx->setValue(reinterpret_cast<const uint8_t*>(line + i), chunk);
    bleTx->notify();
  }
}

void publishReply(bool& dirty, const Reply& reply) {
  if (!dirty) return;
  dirty = false;
  char json[LINK_LINE_MAX];
  if (replyJson(json, sizeof(json), reply) > 0) publish(json);
}

void publishState(uint32_t nowMs) {
  char json[LINK_LINE_MAX];
  Wireless w = {ssid, static_cast<uint8_t>(socket.count()), bleClients.load()};
  if (stateJson(json, sizeof(json), session, batteryV, w) < 0) return;
  bool changed = strcmp(json, lastState) != 0;
  if (!changed && nowMs - lastStateMs < STATE_EVERY_MS) return;
  strncpy(lastState, json, sizeof(lastState));
  lastStateMs = nowMs;
  publish(json);
  socket.cleanupClients(WIFI_MAX_CLIENTS);
}

void serveWireless() {
  uint8_t command = pendingCommand.exchange(CMD_NONE);
  if (command == CMD_FAULTS) session = request(session, readErrors());
  if (command == CMD_SENSORS) session = request(session, readSensors());
  if (session.phase == PHASE_LINK || session.phase == PHASE_KEYWORDS) return;
  if (helloWanted.exchange(false)) {
    char hello[LINK_LINE_MAX];
    if (helloJson(hello, sizeof(hello)) > 0) publish(hello);
    lastState[0] = '\0';
  }
  publishReply(faultsDirty, faults);
  publishReply(sensorsDirty, sensors);
  publishState(millis());
}

void setup() {
  pinMode(PIN_K_TX, OUTPUT);
  digitalWrite(PIN_K_TX, LOW);
  pinMode(PIN_LED, OUTPUT);
  for (Button& b : buttons) pinMode(b.pin, INPUT_PULLUP);
  Serial.setTxBufferSize(USB_TX_BUFFER);
  Serial.begin(USB_BAUD);
  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(I2C_HZ);
  oledOk = oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS);
  if (oledOk) {
    oled.setTextSize(1);
    oled.setTextColor(SSD1306_WHITE);
  } else {
    Serial.println("OLED not found at 0x3C");
  }
  Serial.println("tempra_diag read-only");
  startWifi();
  startBluetooth();
  session = start(Session(), millis());
}

void loop() {
  pumpLink();
  readButtons();
  readBattery();
  digitalWrite(PIN_LED, isConnected(session) ? HIGH : LOW);
  serveWireless();
  drawScreen();
}
