#ifndef VOICE_OLED
#define VOICE_OLED 0
#endif

#include "device.h"

#if VOICE_OLED
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>
#endif

using namespace voiceterm;

const uint8_t PIN_PTT = 4;
const uint8_t PIN_CANCEL = 5;
const uint8_t PIN_LED = 6;
const uint8_t PIN_SDA = 8;
const uint8_t PIN_SCL = 9;
const long SERIAL_BAUD = 115200;

#if VOICE_OLED
const uint8_t OLED_ADDRESS = 0x3C;
const uint8_t OLED_WIDTH = 128;
const uint8_t OLED_HEIGHT = 64;
Adafruit_SSD1306 oled(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);
bool hasOled = false;
#endif

Debounce ptt;
Debounce cancelButton;
LineReader reader;
HostState lastHostState = HOST_UNKNOWN;
uint32_t lastHostMs = 0;
HostState drawnState = HOST_IDLE;

void sendLine(const char* line) {
  Serial.print(line);
  Serial.print('\n');
}

void pollPtt(uint32_t nowMs) {
  DebounceStep s = debounce(ptt, digitalRead(PIN_PTT) == LOW, nowMs);
  ptt = s.next;
  if (s.event == EVENT_DOWN) sendLine(LINE_PTT_DOWN);
  if (s.event == EVENT_UP) sendLine(LINE_PTT_UP);
}

void pollCancel(uint32_t nowMs) {
  DebounceStep s = debounce(cancelButton, digitalRead(PIN_CANCEL) == LOW, nowMs);
  cancelButton = s.next;
  if (s.event == EVENT_DOWN) sendLine(LINE_CANCEL);
}

void readHost(uint32_t nowMs) {
  while (Serial.available() > 0) {
    FeedStep s = feed(reader, (char)Serial.read());
    reader = s.next;
    if (s.result != FEED_LINE) continue;
    HostState parsed = parseStateLine(reader.buf);
    if (parsed == HOST_UNKNOWN) continue;
    lastHostState = parsed;
    lastHostMs = nowMs;
  }
}

#if VOICE_OLED
void setupOled() {
  Wire.begin(PIN_SDA, PIN_SCL);
  hasOled = oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS);
}

void drawOled(HostState s) {
  if (!hasOled || s == drawnState) return;
  drawnState = s;
  oled.clearDisplay();
  oled.setTextColor(SSD1306_WHITE);
  oled.setTextSize(1);
  oled.setCursor(0, 0);
  oled.print("Claude Voice");
  oled.setTextSize(2);
  oled.setCursor(0, 28);
  oled.print(stateLabel(s));
  oled.display();
}
#else
void setupOled() {}
void drawOled(HostState s) { drawnState = s; }
#endif

void setup() {
  pinMode(PIN_PTT, INPUT_PULLUP);
  pinMode(PIN_CANCEL, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);
  Serial.begin(SERIAL_BAUD);
  setupOled();
  uint32_t nowMs = millis();
  ptt = releasedButton(nowMs);
  cancelButton = releasedButton(nowMs);
  reader = emptyReader();
  drawnState = HOST_IDLE;
  sendLine(LINE_READY);
}

void loop() {
  uint32_t nowMs = millis();
  pollPtt(nowMs);
  pollCancel(nowMs);
  readHost(nowMs);
  HostState shown = shownState(lastHostState, lastHostMs, nowMs);
  digitalWrite(PIN_LED, ledOn(shown, nowMs) ? HIGH : LOW);
  drawOled(shown);
  delay(1);
}
