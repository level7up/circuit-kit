const uint8_t PIN_HALL = 2;
const uint8_t PIN_HOME = 3;
const uint8_t PIN_BTN_OPEN = 4;
const uint8_t PIN_BTN_CLOSE = 5;
const uint8_t PIN_BTN_STOP = 6;
const uint8_t PIN_EN = 7;
const uint8_t PIN_RPWM = 9;
const uint8_t PIN_LPWM = 10;
const uint8_t PIN_CURRENT = A0;
const uint8_t PIN_BATTERY = A1;

const long FULL_TURNS = 8;
const long HOME_OVERRUN_TURNS = 1;
const unsigned long PULSE_TIMEOUT_MS = 3000;
const unsigned long INRUSH_MS = 300;
const unsigned long HALL_DEBOUNCE_MS = 150;
const unsigned long REPORT_MS = 250;
const long STALL_MA = 6000;
const long MIN_RUN_MV = 12000;
const long IS_RATIO = 8500;
const long IS_OHMS = 1000;
const long DIVIDER_TOP_K = 47;
const long DIVIDER_BOTTOM_K = 10;
const uint8_t SOFT_START_STEP = 15;

enum Mode : uint8_t { CLOSED, OPENING, OPEN, CLOSING, PAUSED, STALLED, SENSOR_LOST, LOW_BATTERY };
enum Command : uint8_t { CMD_NONE, CMD_OPEN, CMD_CLOSE, CMD_STOP };

const char *const MODE_NAMES[] = { "CLOSED", "OPENING", "OPEN", "CLOSING", "PAUSED", "STALLED", "SENSOR_LOST", "LOW_BATTERY" };

volatile uint16_t hallPulses = 0;
volatile unsigned long lastHallMs = 0;

Mode mode = CLOSED;
long turns = 0;
unsigned long moveStartMs = 0;
unsigned long lastPulseMs = 0;
unsigned long lastReportMs = 0;
uint8_t duty = 0;
bool lastOpen = false;
bool lastClose = false;
bool lastStop = false;

void onHall() {
  unsigned long now = millis();
  if (now - lastHallMs < HALL_DEBOUNCE_MS) return;
  lastHallMs = now;
  hallPulses++;
}

int8_t driveOf(Mode m) {
  if (m == OPENING) return 1;
  if (m == CLOSING) return -1;
  return 0;
}

bool isMoving() { return driveOf(mode) != 0; }

bool atHome() { return digitalRead(PIN_HOME) == LOW; }

long motorMilliamps() {
  long mv = (long)analogRead(PIN_CURRENT) * 5000L / 1023L;
  return mv * IS_RATIO / IS_OHMS;
}

long batteryMillivolts() {
  long mv = (long)analogRead(PIN_BATTERY) * 5000L / 1023L;
  return mv * (DIVIDER_TOP_K + DIVIDER_BOTTOM_K) / DIVIDER_BOTTOM_K;
}

bool risingEdge(uint8_t pin, bool &last) {
  bool now = digitalRead(pin) == HIGH;
  bool rose = now && !last;
  last = now;
  return rose;
}

Command readCommand() {
  bool open = risingEdge(PIN_BTN_OPEN, lastOpen);
  bool close = risingEdge(PIN_BTN_CLOSE, lastClose);
  bool stop = risingEdge(PIN_BTN_STOP, lastStop);
  if (stop) return CMD_STOP;
  if (open) return CMD_OPEN;
  if (close) return CMD_CLOSE;
  return CMD_NONE;
}

uint16_t takePulses() {
  noInterrupts();
  uint16_t n = hallPulses;
  hallPulses = 0;
  interrupts();
  return n;
}

void startMove(Mode next, unsigned long now) {
  mode = next;
  moveStartMs = now;
  lastPulseMs = now;
  duty = 0;
}

void applyCommand(Command cmd, unsigned long now) {
  if (cmd == CMD_STOP) {
    if (isMoving()) mode = PAUSED;
    return;
  }
  if (cmd != CMD_OPEN && cmd != CMD_CLOSE) return;
  if (batteryMillivolts() < MIN_RUN_MV) {
    mode = LOW_BATTERY;
    return;
  }
  takePulses();
  if (cmd == CMD_OPEN) {
    if (turns >= FULL_TURNS) mode = OPEN;
    else startMove(OPENING, now);
    return;
  }
  if (atHome()) {
    mode = CLOSED;
    turns = 0;
  } else {
    startMove(CLOSING, now);
  }
}

void countPulses(unsigned long now) {
  uint16_t n = takePulses();
  if (n == 0) return;
  turns += driveOf(mode) * (long)n;
  lastPulseMs = now;
}

void checkEnds() {
  if (mode == OPENING && turns >= FULL_TURNS) mode = OPEN;
  if (mode == CLOSING && atHome()) {
    mode = CLOSED;
    turns = 0;
  }
}

void checkFaults(unsigned long now) {
  if (!isMoving()) return;
  if (now - moveStartMs > INRUSH_MS && motorMilliamps() > STALL_MA) mode = STALLED;
  else if (now - lastPulseMs > PULSE_TIMEOUT_MS) mode = SENSOR_LOST;
  else if (turns <= -HOME_OVERRUN_TURNS) mode = SENSOR_LOST;
}

void driveMotor() {
  int8_t drive = driveOf(mode);
  if (drive == 0) {
    duty = 0;
    analogWrite(PIN_RPWM, 0);
    analogWrite(PIN_LPWM, 0);
    return;
  }
  duty = (duty > 255 - SOFT_START_STEP) ? 255 : duty + SOFT_START_STEP;
  analogWrite(PIN_RPWM, drive > 0 ? duty : 0);
  analogWrite(PIN_LPWM, drive < 0 ? duty : 0);
}

void report(unsigned long now) {
  if (now - lastReportMs < REPORT_MS) return;
  lastReportMs = now;
  Serial.print(MODE_NAMES[mode]);
  Serial.print(" turns=");
  Serial.print(turns);
  Serial.print(" home=");
  Serial.print(atHome() ? 1 : 0);
  Serial.print(" mA=");
  Serial.print(motorMilliamps());
  Serial.print(" mV=");
  Serial.println(batteryMillivolts());
}

void setup() {
  pinMode(PIN_HALL, INPUT_PULLUP);
  pinMode(PIN_HOME, INPUT_PULLUP);
  pinMode(PIN_BTN_OPEN, INPUT);
  pinMode(PIN_BTN_CLOSE, INPUT);
  pinMode(PIN_BTN_STOP, INPUT);
  pinMode(PIN_EN, OUTPUT);
  pinMode(PIN_RPWM, OUTPUT);
  pinMode(PIN_LPWM, OUTPUT);
  digitalWrite(PIN_EN, HIGH);
  attachInterrupt(digitalPinToInterrupt(PIN_HALL), onHall, FALLING);
  Serial.begin(9600);
  mode = atHome() ? CLOSED : PAUSED;
}

void loop() {
  unsigned long now = millis();
  applyCommand(readCommand(), now);
  if (isMoving()) {
    countPulses(now);
    checkEnds();
    checkFaults(now);
  }
  driveMotor();
  report(now);
  delay(10);
}
