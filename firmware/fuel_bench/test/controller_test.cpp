#include <cstdio>
#include <cstring>
#include <functional>
#include <string>
#include <vector>

#include "../controller.h"

using namespace fuelbench;

namespace {

const uint32_t TICK_MS = 10;
const Profile& P = BENCH_PROFILE;

int failures = 0;
int checks = 0;

void expectEq(long actual, long expected, const char* what) {
  ++checks;
  if (actual == expected) return;
  ++failures;
  std::printf("FAIL %s: expected %ld, got %ld\n", what, expected, actual);
}

void expectStr(const std::string& actual, const std::string& expected, const char* what) {
  ++checks;
  if (actual == expected) return;
  ++failures;
  std::printf("FAIL %s: expected '%s', got '%s'\n", what, expected.c_str(), actual.c_str());
}

struct Bench {
  Controller c;
  uint32_t nowMs;
};

using Change = std::function<void(Inputs&)>;

const Change NOTHING = [](Inputs&) {};

Inputs idle(uint32_t nowMs) { return Inputs{nowMs, 512, 0, 430, 430, false}; }

Bench run(Bench b, uint32_t ms, const Change& change = NOTHING) {
  for (uint32_t t = 0; t < ms; t += TICK_MS) {
    b.nowMs += TICK_MS;
    Inputs in = idle(b.nowMs);
    change(in);
    b.c = step(b.c, in, P);
  }
  return b;
}

Change with(const Change& a, const Change& b) {
  return [a, b](Inputs& in) {
    a(in);
    b(in);
  };
}

const Change HELD = [](Inputs& in) { in.buttonDown = true; };
const Change SENSOR_OPEN = [](Inputs& in) { in.sensorRaw = 0; };
const Change SENSOR_SHORT = [](Inputs& in) { in.sensorRaw = 1023; };
const Change OVER = [](Inputs& in) { in.sensorRaw = 950; };
const Change LOW_PRESSURE = [](Inputs& in) { in.sensorRaw = 150; };
const Change KNOB_HALF = [](Inputs& in) { in.knobRaw = 512; };
const Change KNOB_FULL = [](Inputs& in) { in.knobRaw = 1023; };
const Change DISARMED = [](Inputs& in) {
  in.armRaw = 0;
  in.drainRaw = 0;
};
const Change DRAIN_LOW = [](Inputs& in) { in.drainRaw = 0; };

Bench boot() { return run(Bench{begin(FAULT_NONE, false, P, 0), 0}, P.selfTestMs + 50); }

Bench press(Bench b, uint32_t holdMs, const Change& change = NOTHING) {
  return run(run(b, holdMs, with(change, HELD)), TICK_MS * 2, change);
}

Bench started() { return press(boot(), 100); }

void startUp() {
  Controller first = step(begin(FAULT_NONE, false, P, 0), idle(10), P);
  expectEq(first.state, SELF_TEST, "first tick enters self test");
  expectEq(outputsOf(first).dutyPct, 0, "output off during self test");
  expectEq(boot().c.state, READY, "self test ends in ready");
  Bench later = run(boot(), 10000);
  expectEq(later.c.state, READY, "never starts by itself");
  expectEq(outputsOf(later.c).dutyPct, 0, "output stays off in ready");
  expectEq(begin(FAULT_OVER_PRESSURE, false, P, 0).state, FAULT_LATCHED, "stored fault survives power cycle");
  expectEq(begin(FAULT_NONE, true, P, 0).fault, FAULT_WATCHDOG, "watchdog reset latches");
  Profile bad = P;
  bad.pressureLowPct = 90;
  expectEq(isProfileValid(P), 1, "bench profile is valid");
  expectEq(begin(FAULT_NONE, false, bad, 0).fault, FAULT_BAD_PROFILE, "bad profile latches");
}

void explicitEnable() {
  Bench b = started();
  expectEq(b.c.state, RUNNING, "short press starts");
  expectEq(outputsOf(b.c).dutyPct, P.minDutyPct, "starts at minimum duty");
  expectEq(press(boot(), 100, KNOB_HALF).c.state, READY, "knob up blocks start");
  expectEq(press(run(boot(), 200, DISARMED), 100, DISARMED).c.state, READY, "enable switch off blocks start");
  expectEq(press(boot(), TICK_MS).c.state, READY, "bounce ignored");
  expectEq(outputsOf(run(started(), 200, KNOB_HALF).c).dutyPct, 50, "duty follows knob");
  expectEq(outputsOf(run(started(), 200, KNOB_FULL).c).dutyPct, P.maxDutyPct, "duty capped at profile max");
  expectEq(press(started(), 100).c.state, READY, "second press stops");
  expectEq(run(started(), 300, DISARMED).c.state, READY, "enable switch off stops");
}

void faults() {
  struct Case {
    const char* name;
    Change change;
    Fault fault;
  };
  std::vector<Case> cases = {
      {"open sensor", SENSOR_OPEN, FAULT_SENSOR_OPEN},
      {"shorted sensor", SENSOR_SHORT, FAULT_SENSOR_SHORT},
      {"over pressure", OVER, FAULT_OVER_PRESSURE},
  };
  for (const Case& k : cases) {
    Bench running = run(started(), 500, k.change);
    expectEq(running.c.state, FAULT_LATCHED, k.name);
    expectEq(running.c.fault, k.fault, k.name);
    expectEq(outputsOf(running.c).dutyPct, 0, k.name);
    expectEq(outputsOf(running.c).faultLed, 1, k.name);
    expectEq(run(boot(), 500, k.change).c.fault, k.fault, k.name);
  }
  expectEq(run(started(), P.primeMs - 200, LOW_PRESSURE).c.state, RUNNING, "low pressure allowed while priming");
  expectEq(run(started(), P.primeMs + 300, LOW_PRESSURE).c.fault, FAULT_UNDER_PRESSURE, "low pressure after priming");
  expectEq(run(run(started(), TICK_MS, SENSOR_OPEN), 300).c.state, RUNNING, "single noisy sample ignored");
  expectEq(run(boot(), 300, DRAIN_LOW).c.fault, FAULT_OUTPUT, "stuck output caught in ready");
  expectEq(run(Bench{begin(FAULT_NONE, false, P, 0), 0}, 500, DRAIN_LOW).c.fault, FAULT_OUTPUT, "stuck output fails self test");
  Bench cleared = run(run(started(), 500, SENSOR_OPEN), 5000);
  expectEq(cleared.c.state, FAULT_LATCHED, "stays latched after cause clears");
  expectEq(press(run(started(), 500, SENSOR_OPEN), 100).c.state, FAULT_LATCHED, "short press ignored when latched");
}

void deliberateReset() {
  Bench latched = run(run(started(), 500, SENSOR_OPEN), 200);
  Bench held = run(latched, P.resetHoldMs + 50, HELD);
  expectEq(held.c.state, SELF_TEST, "long press resets into self test");
  expectEq(held.c.fault, FAULT_NONE, "long press clears fault");
  expectEq(run(held, P.selfTestMs + 200).c.state, READY, "release after reset does not start");
  expectEq(run(latched, P.resetHoldMs + 50, with(SENSOR_OPEN, HELD)).c.state, FAULT_LATCHED, "reset refused while sensor open");
  expectEq(run(latched, P.resetHoldMs + 50, with(KNOB_HALF, HELD)).c.state, FAULT_LATCHED, "reset refused while knob up");
  Profile bad = P;
  bad.maxDutyPct = 120;
  Bench stuck = run(Bench{begin(FAULT_NONE, false, bad, 0), 0}, P.resetHoldMs + 500, HELD);
  expectEq(stuck.c.fault, FAULT_BAD_PROFILE, "bad profile never clears");
}

void display() {
  char top[LCD_COLS + 1];
  char bottom[LCD_COLS + 1];
  lcdLines(run(started(), 300, KNOB_HALF).c, top, bottom);
  expectStr(top, "RUNNING    P 50%", "lcd top while running");
  expectStr(bottom, "REQ 50% OUT 50% ", "lcd bottom while running");
  lcdLines(run(started(), 500, SENSOR_OPEN).c, top, bottom);
  expectStr(bottom, "F1 SENSOR OPEN  ", "lcd bottom when latched");
}

}

int main() {
  startUp();
  explicitEnable();
  faults();
  deliberateReset();
  display();
  std::printf("%d checks, %d failed\n", checks, failures);
  return failures == 0 ? 0 : 1;
}
