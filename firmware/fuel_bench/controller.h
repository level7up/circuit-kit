#pragma once

#include <stdint.h>

namespace fuelbench {

enum State : uint8_t { DISABLED = 0, SELF_TEST = 1, READY = 2, RUNNING = 3, FAULT_LATCHED = 4 };

enum Fault : uint8_t {
  FAULT_NONE = 0,
  FAULT_SENSOR_OPEN = 1,
  FAULT_SENSOR_SHORT = 2,
  FAULT_OVER_PRESSURE = 3,
  FAULT_UNDER_PRESSURE = 4,
  FAULT_OUTPUT = 5,
  FAULT_WATCHDOG = 6,
  FAULT_BAD_PROFILE = 7
};

const uint16_t ADC_MAX = 1023;

struct Profile {
  uint16_t sensorOpenBelow;
  uint16_t sensorShortAbove;
  uint16_t sensorZero;
  uint16_t sensorSpan;
  uint8_t pressureLowPct;
  uint8_t pressureHighPct;
  uint8_t minDutyPct;
  uint8_t maxDutyPct;
  uint8_t startKnobMaxPct;
  uint16_t armOnAbove;
  uint16_t drainHighAbove;
  uint16_t selfTestMs;
  uint16_t primeMs;
  uint16_t faultPersistMs;
  uint16_t resetHoldMs;
  uint16_t debounceMs;
};

const Profile BENCH_PROFILE = {51, 972, 102, 819, 25, 85, 30, 80, 5, 200, 200, 1000, 2000, 100, 2000, 30};

struct Inputs {
  uint32_t nowMs;
  uint16_t sensorRaw;
  uint16_t knobRaw;
  uint16_t armRaw;
  uint16_t drainRaw;
  bool buttonDown;
};

struct Timer {
  bool running;
  uint32_t sinceMs;
};

struct Timers {
  Timer open;
  Timer shorted;
  Timer over;
  Timer under;
  Timer output;
  Timer armOff;
};

struct Controller {
  State state;
  Fault fault;
  uint32_t stateSinceMs;
  uint16_t sensorFiltered;
  uint8_t pressurePct;
  uint8_t requestPct;
  uint8_t dutyPct;
  bool buttonDown;
  uint32_t buttonSinceMs;
  bool longPressUsed;
  bool hasSample;
  Timers timers;
};

struct Outputs {
  uint8_t dutyPct;
  bool runLed;
  bool faultLed;
};

struct Press {
  bool shortPress;
  bool longPress;
};

inline long clampLong(long v, long lo, long hi) { return v < lo ? lo : (v > hi ? hi : v); }

inline long roundedDiv(long num, long den) { return num >= 0 ? (num + den / 2) / den : -((-num + den / 2) / den); }

inline Timers noTimers() { return Timers{{false, 0}, {false, 0}, {false, 0}, {false, 0}, {false, 0}, {false, 0}}; }

inline bool isProfileValid(const Profile& p) {
  return p.sensorOpenBelow < p.sensorZero && (uint32_t)p.sensorZero + p.sensorSpan <= p.sensorShortAbove &&
         p.sensorShortAbove <= ADC_MAX && p.sensorSpan > 0 && p.pressureLowPct < p.pressureHighPct &&
         p.pressureHighPct <= 100 && p.minDutyPct <= p.maxDutyPct && p.maxDutyPct <= 100 &&
         p.startKnobMaxPct < p.minDutyPct && p.resetHoldMs > p.debounceMs;
}

inline uint8_t pressurePctOf(uint16_t raw, const Profile& p) {
  return (uint8_t)clampLong(roundedDiv(((long)raw - p.sensorZero) * 100L, p.sensorSpan), 0, 100);
}

inline uint8_t knobPctOf(uint16_t raw) { return (uint8_t)clampLong(roundedDiv((long)raw * 100L, ADC_MAX), 0, 100); }

inline uint8_t dutyFor(uint8_t requestPct, const Profile& p) {
  return (uint8_t)clampLong(requestPct, p.minDutyPct, p.maxDutyPct);
}

inline Controller fresh(State state, Fault fault, uint32_t nowMs) {
  Controller c = {};
  c.state = state;
  c.fault = fault;
  c.stateSinceMs = nowMs;
  c.buttonSinceMs = nowMs;
  c.timers = noTimers();
  return c;
}

inline Controller begin(Fault storedFault, bool wasWatchdogReset, const Profile& p, uint32_t nowMs) {
  if (!isProfileValid(p)) return fresh(FAULT_LATCHED, FAULT_BAD_PROFILE, nowMs);
  if (wasWatchdogReset) return fresh(FAULT_LATCHED, FAULT_WATCHDOG, nowMs);
  if (storedFault != FAULT_NONE) return fresh(FAULT_LATCHED, storedFault, nowMs);
  return fresh(DISABLED, FAULT_NONE, nowMs);
}

inline Timer since(bool active, Timer prev, uint32_t nowMs) {
  if (!active) return Timer{false, 0};
  return prev.running ? prev : Timer{true, nowMs};
}

inline bool lasted(Timer t, uint32_t nowMs, uint32_t ms) { return t.running && nowMs - t.sinceMs >= ms; }

struct ButtonState {
  bool buttonDown;
  uint32_t buttonSinceMs;
  bool longPressUsed;
  Press press;
};

inline ButtonState readButton(const Controller& c, const Inputs& i, const Profile& p) {
  if (i.buttonDown != c.buttonDown) {
    uint32_t heldMs = i.nowMs - c.buttonSinceMs;
    bool isRelease = !i.buttonDown;
    bool shortPress = isRelease && heldMs >= p.debounceMs && heldMs < p.resetHoldMs && !c.longPressUsed;
    return ButtonState{i.buttonDown, i.nowMs, false, Press{shortPress, false}};
  }
  bool longPress = c.buttonDown && !c.longPressUsed && i.nowMs - c.buttonSinceMs >= p.resetHoldMs;
  return ButtonState{c.buttonDown, c.buttonSinceMs, c.longPressUsed || longPress, Press{false, longPress}};
}

inline Timers nextTimers(const Controller& c, const Inputs& i, uint8_t pressurePct, const Profile& p) {
  bool armOn = i.armRaw >= p.armOnAbove;
  bool primed = c.state == RUNNING && i.nowMs - c.stateSinceMs >= p.primeMs;
  bool outputWatched = c.state == SELF_TEST || c.state == READY;
  Timers t;
  t.open = since(i.sensorRaw < p.sensorOpenBelow, c.timers.open, i.nowMs);
  t.shorted = since(i.sensorRaw > p.sensorShortAbove, c.timers.shorted, i.nowMs);
  t.over = since(pressurePct > p.pressureHighPct, c.timers.over, i.nowMs);
  t.under = since(primed && pressurePct < p.pressureLowPct, c.timers.under, i.nowMs);
  t.output = since(outputWatched && armOn && i.drainRaw < p.drainHighAbove, c.timers.output, i.nowMs);
  t.armOff = since(!armOn, c.timers.armOff, i.nowMs);
  return t;
}

inline Fault detectFault(const Timers& t, uint32_t nowMs, const Profile& p) {
  if (lasted(t.open, nowMs, p.faultPersistMs)) return FAULT_SENSOR_OPEN;
  if (lasted(t.shorted, nowMs, p.faultPersistMs)) return FAULT_SENSOR_SHORT;
  if (lasted(t.over, nowMs, p.faultPersistMs)) return FAULT_OVER_PRESSURE;
  if (lasted(t.under, nowMs, p.faultPersistMs)) return FAULT_UNDER_PRESSURE;
  if (lasted(t.output, nowMs, p.faultPersistMs)) return FAULT_OUTPUT;
  return FAULT_NONE;
}

inline bool canClear(const Controller& c, const Inputs& i, const Profile& p) {
  bool sensorOk = i.sensorRaw >= p.sensorOpenBelow && i.sensorRaw <= p.sensorShortAbove;
  return c.fault != FAULT_BAD_PROFILE && sensorOk && c.pressurePct <= p.pressureHighPct &&
         knobPctOf(i.knobRaw) <= p.startKnobMaxPct;
}

inline bool canStart(const Inputs& i, const Profile& p) {
  return i.armRaw >= p.armOnAbove && i.drainRaw >= p.drainHighAbove && knobPctOf(i.knobRaw) <= p.startKnobMaxPct;
}

inline Controller enter(Controller c, State state, uint32_t nowMs) {
  c.state = state;
  c.stateSinceMs = nowMs;
  c.dutyPct = 0;
  c.timers = noTimers();
  return c;
}

inline Controller holdOff(Controller c) {
  c.dutyPct = 0;
  return c;
}

inline Controller nextState(const Controller& c, const Inputs& i, Press press, const Profile& p) {
  if (c.state == FAULT_LATCHED) {
    if (!(press.longPress && canClear(c, i, p))) return holdOff(c);
    Controller cleared = enter(c, SELF_TEST, i.nowMs);
    cleared.fault = FAULT_NONE;
    return cleared;
  }
  Fault fault = c.state == DISABLED ? FAULT_NONE : detectFault(c.timers, i.nowMs, p);
  if (fault != FAULT_NONE) {
    Controller latched = enter(c, FAULT_LATCHED, i.nowMs);
    latched.fault = fault;
    return latched;
  }
  switch (c.state) {
    case DISABLED:
      return enter(c, SELF_TEST, i.nowMs);
    case SELF_TEST:
      return i.nowMs - c.stateSinceMs >= p.selfTestMs ? enter(c, READY, i.nowMs) : holdOff(c);
    case READY: {
      if (!(press.shortPress && canStart(i, p))) return holdOff(c);
      Controller running = enter(c, RUNNING, i.nowMs);
      running.dutyPct = dutyFor(c.requestPct, p);
      return running;
    }
    default: {
      if (press.shortPress || lasted(c.timers.armOff, i.nowMs, p.faultPersistMs)) return enter(c, READY, i.nowMs);
      Controller running = c;
      running.dutyPct = dutyFor(c.requestPct, p);
      return running;
    }
  }
}

inline Controller step(const Controller& c, const Inputs& i, const Profile& p) {
  ButtonState button = readButton(c, i, p);
  uint16_t filtered = c.hasSample ? (uint16_t)roundedDiv((long)c.sensorFiltered * 3 + i.sensorRaw, 4) : i.sensorRaw;
  uint8_t pressurePct = pressurePctOf(filtered, p);
  Controller measured = c;
  measured.sensorFiltered = filtered;
  measured.pressurePct = pressurePct;
  measured.requestPct = knobPctOf(i.knobRaw);
  measured.buttonDown = button.buttonDown;
  measured.buttonSinceMs = button.buttonSinceMs;
  measured.longPressUsed = button.longPressUsed;
  measured.hasSample = true;
  measured.timers = c.state == FAULT_LATCHED ? noTimers() : nextTimers(c, i, pressurePct, p);
  return nextState(measured, i, button.press, p);
}

inline Outputs outputsOf(const Controller& c) {
  return Outputs{c.state == RUNNING ? c.dutyPct : (uint8_t)0, c.state == RUNNING, c.state == FAULT_LATCHED};
}

inline const char* stateName(State s) {
  switch (s) {
    case DISABLED: return "DISABLED";
    case SELF_TEST: return "SELF TEST";
    case READY: return "READY";
    case RUNNING: return "RUNNING";
    default: return "FAULT";
  }
}

inline const char* faultName(Fault f) {
  switch (f) {
    case FAULT_SENSOR_OPEN: return "SENSOR OPEN";
    case FAULT_SENSOR_SHORT: return "SENSOR SHORT";
    case FAULT_OVER_PRESSURE: return "OVER PRESS";
    case FAULT_UNDER_PRESSURE: return "UNDER PRESS";
    case FAULT_OUTPUT: return "OUTPUT FAULT";
    case FAULT_WATCHDOG: return "WATCHDOG";
    case FAULT_BAD_PROFILE: return "BAD PROFILE";
    default: return "NONE";
  }
}

const uint8_t LCD_COLS = 16;

inline void padInto(char* out, uint8_t from, const char* text) {
  uint8_t k = from;
  for (const char* t = text; *t && k < LCD_COLS; ++t) out[k++] = *t;
}

inline void pctInto(char* out, uint8_t at, uint8_t value) {
  out[at] = value >= 100 ? '1' : ' ';
  out[at + 1] = value >= 10 ? (char)('0' + (value / 10) % 10) : ' ';
  out[at + 2] = (char)('0' + value % 10);
  out[at + 3] = '%';
}

inline void lcdLines(const Controller& c, char* top, char* bottom) {
  for (uint8_t k = 0; k < LCD_COLS; ++k) {
    top[k] = ' ';
    bottom[k] = ' ';
  }
  top[LCD_COLS] = '\0';
  bottom[LCD_COLS] = '\0';
  padInto(top, 0, stateName(c.state));
  top[11] = 'P';
  pctInto(top, 12, c.pressurePct);
  if (c.state == FAULT_LATCHED) {
    bottom[0] = 'F';
    bottom[1] = (char)('0' + c.fault);
    padInto(bottom, 3, faultName(c.fault));
    return;
  }
  padInto(bottom, 0, "REQ");
  pctInto(bottom, 3, c.requestPct);
  padInto(bottom, 8, "OUT");
  pctInto(bottom, 11, outputsOf(c).dutyPct);
}

}
