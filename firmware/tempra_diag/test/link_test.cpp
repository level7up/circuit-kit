#include <cstdio>
#include <cstring>
#include <fstream>
#include <map>
#include <string>

#include "../link.h"

using namespace tempradiag;

namespace {

const char FIXTURES[] = "firmware/tempra_diag/test/link_fixtures.txt";

int failures = 0;
int checks = 0;

void expectStr(const std::string& actual, const std::string& expected, const char* what) {
  ++checks;
  if (actual == expected) return;
  ++failures;
  std::printf("FAIL %s:\n  expected %s\n  got      %s\n", what, expected.c_str(), actual.c_str());
}

void expectEq(long actual, long expected, const char* what) {
  ++checks;
  if (actual == expected) return;
  ++failures;
  std::printf("FAIL %s: expected %ld, got %ld\n", what, expected, actual);
}

std::map<std::string, std::string> loadFixtures() {
  std::map<std::string, std::string> out;
  std::ifstream in(FIXTURES);
  std::string line;
  while (std::getline(in, line)) {
    size_t tab = line.find('\t');
    if (tab != std::string::npos) out[line.substr(0, tab)] = line.substr(tab + 1);
  }
  return out;
}

Block block(uint8_t title, std::initializer_list<uint8_t> bytes) {
  Block b = Block();
  b.title = title;
  for (uint8_t v : bytes) b.data[b.dataLength++] = v;
  return b;
}

Block textBlock(const char* text) {
  Block b = Block();
  b.title = TITLE_IDENT;
  for (const char* c = text; *c; ++c) b.data[b.dataLength++] = static_cast<uint8_t>(*c);
  return b;
}

std::string render(int (*fn)(char*, size_t)) {
  char buf[LINK_LINE_MAX];
  return fn(buf, sizeof(buf)) < 0 ? "<truncated>" : buf;
}

std::string state(const Session& s, float bat, const Wireless& w) {
  char buf[LINK_LINE_MAX];
  return stateJson(buf, sizeof(buf), s, bat, w) < 0 ? "<truncated>" : buf;
}

std::string reply(const Reply& r) {
  char buf[LINK_LINE_MAX];
  return replyJson(buf, sizeof(buf), r) < 0 ? "<truncated>" : buf;
}

void matchesSharedFixtures() {
  std::map<std::string, std::string> f = loadFixtures();
  expectEq(static_cast<long>(f.size()), 6, "fixture file loaded");

  expectStr(render(helloJson), f["hello"], "hello");

  Session ready = Session();
  ready.phase = PHASE_READY;
  ready.identReady = true;
  ready.ident.blockCount = 2;
  ready.ident.blocks[0] = textBlock("0261200721");
  ready.ident.blocks[1] = textBlock("BOSCH MA17");
  expectStr(state(ready, 12.4f, Wireless{"TEMPRA-1A2B", 1, 0}), f["state_ready"], "state ready");

  Session retry = Session();
  retry.phase = PHASE_BACKOFF;
  retry.fault = FAULT_NO_SYNC;
  retry.reconnects = 3;
  expectStr(state(retry, 11.9f, Wireless{"TEMPRA-1A2B", 0, 1}), f["state_retry"], "state retry");

  Reply faults = Reply();
  faults.purpose = PURPOSE_READ_ERRORS;
  faults.blockCount = 2;
  faults.blocks[0] = block(TITLE_ERROR_DATA, {2, 10, 30});
  faults.blocks[1] = block(TITLE_ERROR_DATA, {2, 3, 30});
  expectStr(reply(faults), f["faults"], "faults");

  Reply sensors = Reply();
  sensors.purpose = PURPOSE_READ_SENSORS;
  sensors.blockCount = 1;
  sensors.blocks[0] = block(TITLE_SENSOR_DATA, {81, 96, 13, 154, 128, 127, 128, 34, 164, 0});
  expectStr(reply(sensors), f["sensors"], "sensors");

  Reply rejected = Reply();
  rejected.purpose = PURPOSE_READ_ERRORS;
  rejected.rejected = true;
  expectStr(reply(rejected), f["faults_rejected"], "rejected faults");
}

void keepAliveShowsReady() {
  Session s = Session();
  s.phase = PHASE_LINK;
  s.purpose = PURPOSE_KEEP_ALIVE;
  expectEq(state(s, 12.0f, Wireless{"T", 0, 0}).find("\"ph\":\"ready\"") != std::string::npos, 1, "keep-alive reported as ready");
}

void identCannotBreakTheJson() {
  Session s = Session();
  s.identReady = true;
  s.ident.blockCount = 1;
  s.ident.blocks[0] = textBlock("A\"B\\C");
  expectEq(state(s, 12.0f, Wireless{"T", 0, 0}).find("\"id\":\"A.B.C\"") != std::string::npos, 1, "quote and backslash masked");
}

void acceptsOnlyTheTwoReadCommands() {
  struct Case { const char* line; Command expected; };
  const Case cases[] = {
    {"READ FAULTS\n", CMD_FAULTS}, {"READ FAULTS\r\n", CMD_FAULTS}, {"READ SENSORS", CMD_SENSORS},
    {"read faults", CMD_NONE}, {"READ FAULTS X", CMD_NONE}, {"CLEAR FAULTS", CMD_NONE}, {"", CMD_NONE}, {"READ", CMD_NONE}
  };
  for (const Case& c : cases) expectEq(parseCommand(c.line, strlen(c.line)), c.expected, c.line);
}

void refusesToTruncate() {
  Reply big = Reply();
  big.purpose = PURPOSE_READ_SENSORS;
  big.blockCount = MAX_BLOCKS;
  for (uint8_t b = 0; b < MAX_BLOCKS; ++b) {
    big.blocks[b].dataLength = MAX_DATA;
    for (uint8_t i = 0; i < MAX_DATA; ++i) big.blocks[b].data[i] = 255;
  }
  char small[32];
  expectEq(replyJson(small, sizeof(small), big), -1, "too small a buffer is refused");
  char full[LINK_LINE_MAX];
  expectEq(replyJson(full, sizeof(full), big) > 0, 1, "largest reply fits the line buffer");
}

}

int main() {
  matchesSharedFixtures();
  keepAliveShowsReady();
  identCannotBreakTheJson();
  acceptsOnlyTheTwoReadCommands();
  refusesToTruncate();
  std::printf("%d checks, %d failures\n", checks, failures);
  return failures == 0 ? 0 : 1;
}
