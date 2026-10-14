#include <algorithm>
#include <cstdio>
#include <string>
#include <vector>

#include "../session.h"
#include "ecu_sim.h"

using namespace tempradiag;

namespace {

const Timing& T = MA17_TIMING;
const uint32_t CONNECT_WITHIN_MS = 3000;

int failures = 0;
int checks = 0;

void expectEq(long actual, long expected, const char* what) {
  ++checks;
  if (actual == expected) return;
  ++failures;
  std::printf("FAIL %s: expected %ld, got %ld\n", what, expected, actual);
}

void expectTrue(bool actual, const char* what) { expectEq(actual ? 1 : 0, 1, what); }

void expectStr(const std::string& actual, const std::string& expected, const char* what) {
  ++checks;
  if (actual == expected) return;
  ++failures;
  std::printf("FAIL %s: expected '%s', got '%s'\n", what, expected.c_str(), actual.c_str());
}

struct Rig {
  Session s;
  ecusim::EcuSim ecu;
  uint32_t nowMs;
  std::vector<ecusim::Scheduled> bus;
  std::vector<uint8_t> sent;
};

Rig fresh(const ecusim::EcuSim& ecu = ecusim::EcuSim()) {
  Rig r{Session{}, ecu, 1000, {}, {}};
  r.s = start(r.s, r.nowMs);
  return r;
}

void schedule(Rig& r, uint32_t atMs, uint8_t b) {
  auto at = std::upper_bound(r.bus.begin(), r.bus.end(), atMs,
                             [](uint32_t t, const ecusim::Scheduled& s) { return t < s.atMs; });
  r.bus.insert(at, ecusim::Scheduled{atMs, b});
}

Rig tickOnce(Rig r) {
  ++r.nowMs;
  Inputs in{r.nowMs, false, 0};
  if (!r.bus.empty() && r.bus.front().atMs <= r.nowMs) {
    in.hasRx = true;
    in.rx = r.bus.front().byte;
    r.bus.erase(r.bus.begin());
  }
  r.s = step(r.s, in, T);
  ecusim::line(r.ecu, r.nowMs, r.s.out.driveLine, r.s.out.lineHigh, T.wakeBitMs);
  if (r.s.out.hasTx) {
    r.sent.push_back(r.s.out.tx);
    schedule(r, r.nowMs + 1, r.s.out.tx);
    ecusim::receive(r.ecu, r.nowMs, r.s.out.tx);
  }
  ecusim::tick(r.ecu, r.nowMs);
  for (const ecusim::Scheduled& b : r.ecu.outbox) schedule(r, b.atMs, b.byte);
  r.ecu.outbox.clear();
  return r;
}

Rig run(Rig r, uint32_t ms) {
  for (uint32_t i = 0; i < ms; ++i) r = tickOnce(r);
  return r;
}

template <typename Done>
Rig runUntil(Rig r, uint32_t maxMs, Done done) {
  for (uint32_t i = 0; i < maxMs && !done(r); ++i) r = tickOnce(r);
  return r;
}

Rig connected(const ecusim::EcuSim& ecu = ecusim::EcuSim()) {
  return runUntil(fresh(ecu), CONNECT_WITHIN_MS, [](const Rig& r) { return r.s.identReady; });
}

Rig ask(Rig r, const Request& q) {
  r.s = request(r.s, q);
  return runUntil(r, CONNECT_WITHIN_MS, [](const Rig& x) { return x.s.replyReady || x.s.phase == PHASE_BACKOFF; });
}

Rig taken(Rig r) {
  r.s = takeReply(r.s);
  return r;
}

std::string identOf(const Session& s) {
  char text[MAX_BLOCKS * MAX_DATA + 1];
  identText(s.ident, text, sizeof(text));
  return std::string(text);
}

long firstOf(const std::vector<uint8_t>& v) { return v.empty() ? -1 : v.front(); }

std::vector<uint8_t> dataOf(const Block& b) { return std::vector<uint8_t>(b.data, b.data + b.dataLength); }

void wakeSendsAddressAtFiveBaud() {
  Rig r = run(fresh(), T.preWakeIdleMs + T.wakeBitMs * 10);
  expectEq(r.ecu.wakeAddresses.size(), 1, "one wake-up sent");
  expectEq(firstOf(r.ecu.wakeAddresses), ECU_ADDRESS, "wake-up address");
}

void wakeHoldsLineIdleBeforeStartBit() {
  Rig r = fresh();
  bool allHigh = true;
  for (uint32_t i = 1; i < T.preWakeIdleMs; ++i) {
    r = tickOnce(r);
    allHigh = allHigh && r.s.out.driveLine && r.s.out.lineHigh;
  }
  expectTrue(allHigh, "line idle high before start bit");
  r = tickOnce(r);
  expectTrue(r.s.out.driveLine && !r.s.out.lineHigh, "start bit is low");
}

void handshakeRepliesWithInvertedThirdKeyword() {
  Rig r = connected();
  expectEq(r.ecu.keyReplies.size(), 1, "one key reply");
  expectEq(firstOf(r.ecu.keyReplies), 0x7A, "key reply is ~0x85");
}

void handshakeCollectsIdentBlocks() {
  Rig r = connected();
  expectTrue(r.s.identReady, "ident ready");
  expectEq(r.s.phase, PHASE_READY, "ready after ident");
  expectEq(r.s.ident.blockCount, 2, "two ident blocks");
  expectStr(identOf(r.s), "0261200721BOSCH MA17", "ident text");
}

void handshakeWorksWithSixKeywordBytes() {
  ecusim::EcuSim ecu;
  ecu.keywords = {0x55, 0x46, 0x85, 0x89, 0xBC, 0x10};
  Rig r = connected(ecu);
  expectTrue(r.s.identReady, "ident ready with six keyword bytes");
  expectEq(firstOf(r.ecu.keyReplies), 0x7A, "key reply still ~third byte");
}

void identTextMasksUnprintableBytes() {
  ecusim::EcuSim ecu;
  ecu.ident = std::string("AB\x01", 3) + "C";
  Rig r = connected(ecu);
  expectStr(identOf(r.s), "AB.C", "unprintable byte shown as dot");
}

void readErrorsCollectsEveryErrorBlock() {
  ecusim::EcuSim ecu;
  ecu.dtcs = {{0x12, 0x00, 0x1E}, {0x34, 0x00, 0x9E}};
  Rig r = ask(connected(ecu), readErrors());
  expectTrue(r.s.replyReady, "error reply ready");
  expectEq(r.s.reply.purpose, PURPOSE_READ_ERRORS, "reply purpose");
  expectEq(r.s.reply.blockCount, 2, "two error blocks");
  expectEq(r.s.reply.blocks[0].title, TITLE_ERROR_DATA, "error block title");
  expectTrue(dataOf(r.s.reply.blocks[1]) == std::vector<uint8_t>({0x34, 0x00, 0x9E}), "second error raw bytes");
}

void readErrorsWithNoStoredCodes() {
  Rig r = ask(connected(), readErrors());
  expectTrue(r.s.replyReady, "empty error reply ready");
  expectEq(r.s.reply.blockCount, 0, "no error blocks");
  expectTrue(!r.s.reply.rejected, "not rejected");
}

void readMemorySendsLengthAndAddress() {
  ecusim::EcuSim ecu;
  ecu.memory[0x40] = 0xAA;
  ecu.memory[0x41] = 0xBB;
  Rig r = ask(connected(ecu), readMemory(0x0040, 2));
  expectTrue(r.s.replyReady, "memory reply ready");
  expectEq(r.s.reply.blockCount, 1, "one memory block");
  expectEq(r.s.reply.blocks[0].title, TITLE_MEMORY_DATA, "memory block title");
  expectTrue(dataOf(r.s.reply.blocks[0]) == std::vector<uint8_t>({0xAA, 0xBB}), "memory bytes");
}

void readMemoryRejectsBadLengths() {
  expectTrue(!readMemory(0x0040, 0).valid, "length 0 invalid");
  expectTrue(!readMemory(0x0040, MAX_MEMORY_READ + 1).valid, "length 13 invalid");
  expectTrue(readMemory(0x0040, MAX_MEMORY_READ).valid, "length 12 valid");
  Rig r = connected();
  expectTrue(!canRequest(r.s, readMemory(0x0040, 0)), "invalid request refused");
  Session after = request(r.s, readMemory(0x0040, 0));
  expectTrue(!after.hasPending, "invalid request not queued");
}

void readSensorsReturnsCollection() {
  ecusim::EcuSim ecu;
  ecu.sensors = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
  Rig r = ask(connected(ecu), readSensors());
  expectTrue(r.s.replyReady, "sensor reply ready");
  expectEq(r.s.reply.blocks[0].title, TITLE_SENSOR_DATA, "sensor block title");
  expectEq(r.s.reply.blocks[0].dataLength, 10, "ten sensor bytes");
}

void requestIsRefusedBeforeConnection() {
  Rig r = fresh();
  expectTrue(!canRequest(r.s, readErrors()), "no request while waking");
  expectTrue(!request(r.s, readErrors()).hasPending, "request not queued while waking");
}

void secondRequestIsRefusedWhileOneIsPending() {
  Rig r = connected();
  r.s = request(r.s, readErrors());
  expectTrue(!canRequest(r.s, readSensors()), "second request refused");
}

void takeReplyClearsIt() {
  Rig r = ask(connected(), readErrors());
  expectTrue(!takeReply(r.s).replyReady, "reply cleared");
}

void nakMarksReplyRejectedAndKeepsLink() {
  ecusim::EcuSim ecu;
  ecu.faults.nakNextRequest = true;
  Rig r = ask(connected(ecu), readErrors());
  expectTrue(r.s.replyReady && r.s.reply.rejected, "reply rejected");
  r = run(taken(r), 2000);
  expectTrue(r.s.phase == PHASE_READY || r.s.phase == PHASE_LINK, "link kept after NAK");
  expectEq(r.ecu.drops, 0, "ECU did not drop link");
}

void keepAliveHoldsLinkWhileIdle() {
  Rig r = run(connected(), 5000);
  expectTrue(r.s.phase == PHASE_READY || r.s.phase == PHASE_LINK, "still connected after 5 s idle");
  expectEq(r.ecu.drops, 0, "ECU watchdog never fired");
  expectEq(r.s.reconnects, 0, "no reconnects");
  uint32_t widest = 0;
  for (size_t i = 1; i < r.ecu.ackTimesMs.size(); ++i)
    widest = std::max(widest, r.ecu.ackTimesMs[i] - r.ecu.ackTimesMs[i - 1]);
  expectTrue(r.ecu.ackTimesMs.size() > 5, "keep-alive ACKs sent");
  expectTrue(widest < ecusim::LINK_WATCHDOG_MS, "keep-alive gap under ECU watchdog");
}

void keepAliveStillShowsReady() {
  Rig r = connected();
  bool sawLink = false;
  bool shownOnlyReady = true;
  for (int i = 0; i < 3000; ++i) {
    r = tickOnce(r);
    sawLink = sawLink || r.s.phase == PHASE_LINK;
    shownOnlyReady = shownOnlyReady && displayPhase(r.s) == PHASE_READY;
  }
  expectTrue(sawLink, "keep-alive uses the link");
  expectTrue(shownOnlyReady, "display stays on ready during keep-alive");
}

void neverSendsClearOrActuatorTitles() {
  ecusim::EcuSim ecu;
  ecu.dtcs = {{0x12, 0x00, 0x1E}};
  Rig r = ask(connected(ecu), readErrors());
  r = ask(taken(r), readMemory(0x10, 4));
  r = ask(taken(r), readSensors());
  expectEq(r.ecu.titlesReceived.size() > 3, 1, "requests reached the ECU");
  for (uint8_t t : r.ecu.titlesReceived) {
    expectTrue(t != 0x04 && t != 0x05, "no actuator or clear title on the wire");
  }
  const Purpose all[] = {PURPOSE_IDENT, PURPOSE_READ_ERRORS, PURPOSE_READ_MEMORY, PURPOSE_READ_SENSORS,
                         PURPOSE_KEEP_ALIVE};
  for (Purpose p : all) {
    expectTrue(titleFor(p) != 0x04 && titleFor(p) != 0x05, "no purpose maps to actuator or clear");
  }
}

void silentEcuBacksOffAndRetries() {
  ecusim::EcuSim ecu;
  ecu.faults.silent = true;
  Rig r = runUntil(fresh(ecu), 10000, [](const Rig& x) { return x.s.phase == PHASE_BACKOFF; });
  expectEq(r.s.phase, PHASE_BACKOFF, "backoff after no sync");
  expectEq(r.s.fault, FAULT_NO_SYNC, "no-sync fault");
  r = run(r, T.backoffMs + T.preWakeIdleMs + T.wakeBitMs * 10);
  expectEq(r.ecu.wakeAddresses.size(), 2, "wake-up retried");
  expectEq(r.s.reconnects, 1, "one reconnect counted");
}

void wrongComplementFaultsThenReconnects() {
  Rig r = connected();
  r.ecu.faults.corruptNextComplement = true;
  r = ask(r, readErrors());
  expectEq(r.s.fault, FAULT_COMPLEMENT, "complement fault");
  expectTrue(!r.s.hasPending, "pending request dropped on fault");
  r = runUntil(r, 10000, [](const Rig& x) { return x.s.phase == PHASE_READY && x.s.reconnects == 1; });
  expectEq(r.s.phase, PHASE_READY, "reconnected after fault");
}

void badEndByteFaults() {
  Rig r = connected();
  r.ecu.faults.badEndOnce = true;
  r = ask(r, readErrors());
  expectEq(r.s.fault, FAULT_END_BYTE, "end byte fault");
}

void oversizeLengthFaults() {
  Rig r = connected();
  r.ecu.faults.oversizeOnce = true;
  r = ask(r, readErrors());
  expectEq(r.s.fault, FAULT_LENGTH, "length fault");
}

void stopReleasesLine() {
  Rig r = run(fresh(), 50);
  Session s = stop(r.s);
  expectEq(s.phase, PHASE_OFF, "off after stop");
  s = step(s, Inputs{r.nowMs + 1, false, 0}, T);
  expectTrue(!s.out.driveLine && !s.out.hasTx, "nothing driven when off");
}

}

int main() {
  wakeSendsAddressAtFiveBaud();
  wakeHoldsLineIdleBeforeStartBit();
  handshakeRepliesWithInvertedThirdKeyword();
  handshakeCollectsIdentBlocks();
  handshakeWorksWithSixKeywordBytes();
  identTextMasksUnprintableBytes();
  readErrorsCollectsEveryErrorBlock();
  readErrorsWithNoStoredCodes();
  readMemorySendsLengthAndAddress();
  readMemoryRejectsBadLengths();
  readSensorsReturnsCollection();
  requestIsRefusedBeforeConnection();
  secondRequestIsRefusedWhileOneIsPending();
  takeReplyClearsIt();
  nakMarksReplyRejectedAndKeepsLink();
  keepAliveHoldsLinkWhileIdle();
  keepAliveStillShowsReady();
  neverSendsClearOrActuatorTitles();
  silentEcuBacksOffAndRetries();
  wrongComplementFaultsThenReconnects();
  badEndByteFaults();
  oversizeLengthFaults();
  stopReleasesLine();
  std::printf("%d checks, %d failures\n", checks, failures);
  return failures == 0 ? 0 : 1;
}
