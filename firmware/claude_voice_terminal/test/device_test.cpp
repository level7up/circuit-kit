#include <cstdio>
#include <string>
#include <vector>

#include "../device.h"

using namespace voiceterm;

namespace {

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

std::vector<ButtonEvent> pressTrace(const std::vector<bool>& rawPerMs) {
  Debounce d = releasedButton(0);
  std::vector<ButtonEvent> events;
  for (uint32_t ms = 0; ms < rawPerMs.size(); ++ms) {
    DebounceStep s = debounce(d, rawPerMs[ms], ms + 1);
    d = s.next;
    if (s.event != EVENT_NONE) events.push_back(s.event);
  }
  return events;
}

std::vector<bool> held(size_t ms, bool down) { return std::vector<bool>(ms, down); }

std::vector<bool> join(std::vector<std::vector<bool>> parts) {
  std::vector<bool> all;
  for (const auto& p : parts) all.insert(all.end(), p.begin(), p.end());
  return all;
}

std::vector<bool> bouncing(size_t ms) {
  std::vector<bool> raw;
  for (size_t i = 0; i < ms; ++i) raw.push_back(i % 2 == 0);
  return raw;
}

void testCleanPressGivesOneDownAndOneUp() {
  auto events = pressTrace(join({held(10, false), held(200, true), held(100, false)}));
  expectEq((long)events.size(), 2, "clean press event count");
  expectEq(events[0], EVENT_DOWN, "clean press first event");
  expectEq(events[1], EVENT_UP, "clean press second event");
}

void testBounceIsFiltered() {
  auto events = pressTrace(join({bouncing(12), held(200, true), bouncing(12), held(100, false)}));
  expectEq((long)events.size(), 2, "bouncy press event count");
}

void testTapShorterThanDebounceIsIgnored() {
  auto events = pressTrace(join({held(10, false), held(DEBOUNCE_MS - 5, true), held(100, false)}));
  expectEq((long)events.size(), 0, "short tap ignored");
}

void testHoldNeverRepeatsDown() {
  auto events = pressTrace(join({held(5000, true)}));
  expectEq((long)events.size(), 1, "long hold sends one down");
}

struct Fed {
  std::vector<std::string> lines;
  int rejected;
};

Fed feedAll(const std::string& text) {
  LineReader r = emptyReader();
  Fed out{{}, 0};
  for (char c : text) {
    FeedStep s = feed(r, c);
    r = s.next;
    if (s.result == FEED_LINE) out.lines.push_back(r.buf);
    if (s.result == FEED_REJECTED) ++out.rejected;
  }
  return out;
}

void testReaderSplitsLines() {
  Fed f = feedAll("STATE:IDLE\r\nSTATE:SPEAKING\n");
  expectEq((long)f.lines.size(), 2, "two lines");
  expectStr(f.lines[0], "STATE:IDLE", "first line without CR");
  expectStr(f.lines[1], "STATE:SPEAKING", "second line");
}

void testReaderRejectsLongAndBinaryLines() {
  Fed f = feedAll(std::string(MAX_LINE_CHARS + 5, 'A') + "\nSTATE:ERROR\nST\x01TE\n");
  expectEq((long)f.lines.size(), 1, "only the valid line survives");
  expectStr(f.lines[0], "STATE:ERROR", "line after overflow is read");
  expectEq(f.rejected, 2, "overflow and binary rejected");
}

void testReaderIgnoresEmptyLines() {
  Fed f = feedAll("\n\n\r\n");
  expectEq((long)f.lines.size(), 0, "empty lines ignored");
  expectEq(f.rejected, 0, "empty lines are not errors");
}

void testParseStateLine() {
  expectEq(parseStateLine("STATE:IDLE"), HOST_IDLE, "idle");
  expectEq(parseStateLine("STATE:LISTENING"), HOST_LISTENING, "listening");
  expectEq(parseStateLine("STATE:PROCESSING"), HOST_PROCESSING, "processing");
  expectEq(parseStateLine("STATE:SPEAKING"), HOST_SPEAKING, "speaking");
  expectEq(parseStateLine("STATE:ERROR"), HOST_ERROR, "error");
  expectEq(parseStateLine("STATE:idle"), HOST_UNKNOWN, "case sensitive");
  expectEq(parseStateLine("STATE:IDLE "), HOST_UNKNOWN, "no trailing junk");
  expectEq(parseStateLine("rm -rf /"), HOST_UNKNOWN, "never a command");
}

void testHostTimeout() {
  expectEq(shownState(HOST_SPEAKING, 1000, 1000 + HOST_TIMEOUT_MS), HOST_SPEAKING, "fresh state kept");
  expectEq(shownState(HOST_SPEAKING, 1000, 1001 + HOST_TIMEOUT_MS), HOST_UNKNOWN, "stale state dropped");
}

int litMs(HostState s, uint32_t periodMs) {
  int lit = 0;
  for (uint32_t t = 0; t < periodMs; ++t) lit += ledOn(s, t) ? 1 : 0;
  return lit;
}

void testLedPatterns() {
  expectEq(litMs(HOST_IDLE, 2000), 0, "idle dark");
  expectEq(litMs(HOST_LISTENING, 2000), 2000, "listening solid");
  expectEq(litMs(HOST_PROCESSING, 2000), 1000, "processing half lit");
  expectEq(litMs(HOST_SPEAKING, 2000), 1000, "speaking half lit");
  expectEq(litMs(HOST_ERROR, 1000), 200, "error double flash");
  expectEq(litMs(HOST_UNKNOWN, 2000), 60, "no host blip");
  expectEq(ledOn(HOST_PROCESSING, 0) != ledOn(HOST_PROCESSING, FAST_BLINK_MS), 1, "processing toggles fast");
}

void testLabels() {
  expectStr(stateLabel(HOST_IDLE), "READY", "idle label");
  expectStr(stateLabel(HOST_PROCESSING), "THINKING", "processing label");
  expectStr(stateLabel(HOST_UNKNOWN), "NO HOST", "unknown label");
}

}

int main() {
  testCleanPressGivesOneDownAndOneUp();
  testBounceIsFiltered();
  testTapShorterThanDebounceIsIgnored();
  testHoldNeverRepeatsDown();
  testReaderSplitsLines();
  testReaderRejectsLongAndBinaryLines();
  testReaderIgnoresEmptyLines();
  testParseStateLine();
  testHostTimeout();
  testLedPatterns();
  testLabels();
  std::printf("%d checks, %d failures\n", checks, failures);
  return failures == 0 ? 0 : 1;
}
