#include <EEPROM.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h>
#include <avr/wdt.h>

#include "controller.h"

using namespace fuelbench;

const uint8_t PIN_SENSOR = A0;
const uint8_t PIN_KNOB = A1;
const uint8_t PIN_ARM = A2;
const uint8_t PIN_DRAIN = A3;
const uint8_t PIN_BUTTON = 2;
const uint8_t PIN_RUN_LED = 7;
const uint8_t PIN_FAULT_LED = 8;
const uint8_t PIN_GATE = 9;

const uint8_t LCD_ADDRESS = 0x27;
const uint32_t TICK_MS = 10;
const uint32_t LCD_EVERY_MS = 200;
const long SERIAL_BAUD = 115200;

const int EE_LATCHED = 0;
const int EE_COUNT = 1;
const int EE_LOG_NEXT = 2;
const int EE_LOG = 3;
const uint8_t LOG_SIZE = 8;

uint8_t resetFlags __attribute__((section(".noinit")));

void captureResetFlags() __attribute__((naked, used, section(".init0")));
void captureResetFlags() { __asm__ __volatile__("sts %0, r2\n" : "=m"(resetFlags) :); }

LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, 2);
Controller ctl;
Inputs lastInputs;
uint32_t lastTickMs = 0;
uint32_t lastLcdMs = 0;

void outputOff() {
  analogWrite(PIN_GATE, 0);
  digitalWrite(PIN_GATE, LOW);
}

Fault storedFault() {
  uint8_t code = EEPROM.read(EE_LATCHED);
  return code <= FAULT_BAD_PROFILE ? (Fault)code : FAULT_NONE;
}

void logFault(Fault f) {
  EEPROM.update(EE_LATCHED, f);
  uint8_t count = EEPROM.read(EE_COUNT);
  if (count < 255) EEPROM.update(EE_COUNT, count + 1);
  uint8_t next = EEPROM.read(EE_LOG_NEXT) % LOG_SIZE;
  EEPROM.update(EE_LOG + next, f);
  EEPROM.update(EE_LOG_NEXT, (next + 1) % LOG_SIZE);
}

Inputs readInputs(uint32_t nowMs) {
  return Inputs{nowMs, (uint16_t)analogRead(PIN_SENSOR), (uint16_t)analogRead(PIN_KNOB), (uint16_t)analogRead(PIN_ARM),
                (uint16_t)analogRead(PIN_DRAIN), digitalRead(PIN_BUTTON) == LOW};
}

void applyOutputs(const Controller& c) {
  Outputs out = outputsOf(c);
  if (out.dutyPct == 0) outputOff();
  else analogWrite(PIN_GATE, (uint16_t)out.dutyPct * 255 / 100);
  digitalWrite(PIN_RUN_LED, out.runLed ? HIGH : LOW);
  digitalWrite(PIN_FAULT_LED, out.faultLed ? HIGH : LOW);
}

void persistFaultChange(const Controller& before, const Controller& after) {
  if (after.state == FAULT_LATCHED && before.state != FAULT_LATCHED) logFault(after.fault);
  if (before.state == FAULT_LATCHED && after.state != FAULT_LATCHED) EEPROM.update(EE_LATCHED, FAULT_NONE);
}

void drawLcd(const Controller& c) {
  char top[LCD_COLS + 1];
  char bottom[LCD_COLS + 1];
  lcdLines(c, top, bottom);
  lcd.setCursor(0, 0);
  lcd.print(top);
  lcd.setCursor(0, 1);
  lcd.print(bottom);
}

void printCalibration() {
  Serial.print(F("sensor="));
  Serial.print(lastInputs.sensorRaw);
  Serial.print(F(" knob="));
  Serial.print(lastInputs.knobRaw);
  Serial.print(F(" arm="));
  Serial.print(lastInputs.armRaw);
  Serial.print(F(" drain="));
  Serial.print(lastInputs.drainRaw);
  Serial.print(F(" filtered="));
  Serial.print(ctl.sensorFiltered);
  Serial.print(F(" pressurePct="));
  Serial.println(ctl.pressurePct);
}

void printLog() {
  Serial.print(F("latched="));
  Serial.print(EEPROM.read(EE_LATCHED));
  Serial.print(F(" count="));
  Serial.print(EEPROM.read(EE_COUNT));
  Serial.print(F(" recent="));
  uint8_t next = EEPROM.read(EE_LOG_NEXT) % LOG_SIZE;
  for (uint8_t k = 0; k < LOG_SIZE; ++k) {
    Serial.print(EEPROM.read(EE_LOG + (next + k) % LOG_SIZE));
    Serial.print(' ');
  }
  Serial.println();
}

void hangForWatchdogTest() {
  Serial.println(F("watchdog test: hanging"));
  Serial.flush();
  for (;;) {
  }
}

void handleSerial() {
  if (!Serial.available()) return;
  char cmd = Serial.read();
  if (cmd == 'c') printCalibration();
  if (cmd == 'l') printLog();
  if (cmd == 'w') hangForWatchdogTest();
}

void setup() {
  uint8_t flags = resetFlags | MCUSR;
  MCUSR = 0;
  wdt_disable();
  pinMode(PIN_GATE, OUTPUT);
  outputOff();
  pinMode(PIN_RUN_LED, OUTPUT);
  pinMode(PIN_FAULT_LED, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  Serial.begin(SERIAL_BAUD);
  lcd.init();
  lcd.backlight();
  bool wasWatchdogReset = flags & _BV(WDRF);
  ctl = begin(storedFault(), wasWatchdogReset, BENCH_PROFILE, millis());
  if (wasWatchdogReset && storedFault() != FAULT_WATCHDOG) logFault(FAULT_WATCHDOG);
  if (ctl.fault == FAULT_BAD_PROFILE) logFault(FAULT_BAD_PROFILE);
  applyOutputs(ctl);
  wdt_enable(WDTO_250MS);
}

void loop() {
  wdt_reset();
  uint32_t nowMs = millis();
  if (nowMs - lastTickMs >= TICK_MS) {
    lastTickMs = nowMs;
    lastInputs = readInputs(nowMs);
    Controller next = step(ctl, lastInputs, BENCH_PROFILE);
    persistFaultChange(ctl, next);
    ctl = next;
    applyOutputs(ctl);
  }
  if (nowMs - lastLcdMs >= LCD_EVERY_MS) {
    lastLcdMs = nowMs;
    drawLcd(ctl);
  }
  handleSerial();
}
