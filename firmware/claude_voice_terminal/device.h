#pragma once

#include <stdint.h>
#include <string.h>

namespace voiceterm {

const uint32_t DEBOUNCE_MS = 25;
const uint32_t HOST_TIMEOUT_MS = 3000;
const uint8_t MAX_LINE_CHARS = 24;
const uint32_t FAST_BLINK_MS = 125;
const uint32_t SLOW_BLINK_MS = 500;
const uint32_t ERROR_PERIOD_MS = 1000;
const uint32_t FLASH_MS = 100;
const uint32_t NO_HOST_PERIOD_MS = 2000;
const uint32_t NO_HOST_BLIP_MS = 60;

const char LINE_PTT_DOWN[] = "BTN:PTT_DOWN";
const char LINE_PTT_UP[] = "BTN:PTT_UP";
const char LINE_CANCEL[] = "BTN:CANCEL";
const char LINE_READY[] = "DEV:READY";

enum ButtonEvent : uint8_t { EVENT_NONE, EVENT_DOWN, EVENT_UP };

enum HostState : int8_t { HOST_UNKNOWN = -1, HOST_IDLE, HOST_LISTENING, HOST_PROCESSING, HOST_SPEAKING, HOST_ERROR };

const uint8_t HOST_STATE_COUNT = 5;

const char* const STATE_LINES[HOST_STATE_COUNT] = {
  "STATE:IDLE", "STATE:LISTENING", "STATE:PROCESSING", "STATE:SPEAKING", "STATE:ERROR"
};

const char* const STATE_LABELS[HOST_STATE_COUNT] = { "READY", "LISTENING", "THINKING", "SPEAKING", "ERROR" };

struct Debounce {
  bool stable;
  bool raw;
  uint32_t changedAtMs;
};

struct DebounceStep {
  Debounce next;
  ButtonEvent event;
};

inline Debounce releasedButton(uint32_t nowMs) { return Debounce{false, false, nowMs}; }

inline DebounceStep debounce(const Debounce& d, bool rawDown, uint32_t nowMs) {
  if (rawDown != d.raw) return DebounceStep{Debounce{d.stable, rawDown, nowMs}, EVENT_NONE};
  if (rawDown == d.stable || nowMs - d.changedAtMs < DEBOUNCE_MS) return DebounceStep{d, EVENT_NONE};
  return DebounceStep{Debounce{rawDown, rawDown, d.changedAtMs}, rawDown ? EVENT_DOWN : EVENT_UP};
}

struct LineReader {
  char buf[MAX_LINE_CHARS + 1];
  uint8_t len;
  bool rejected;
  bool done;
};

enum FeedResult : uint8_t { FEED_PENDING, FEED_LINE, FEED_REJECTED };

struct FeedStep {
  LineReader next;
  FeedResult result;
};

inline LineReader emptyReader() {
  LineReader r;
  memset(&r, 0, sizeof(r));
  return r;
}

inline bool isPrintable(char c) { return c >= 0x20 && c <= 0x7e; }

inline FeedStep endLine(const LineReader& r) {
  if (r.rejected || r.len == 0) return FeedStep{emptyReader(), r.rejected ? FEED_REJECTED : FEED_PENDING};
  LineReader next = r;
  next.buf[next.len] = '\0';
  next.done = true;
  return FeedStep{next, FEED_LINE};
}

inline FeedStep feed(const LineReader& current, char c) {
  LineReader r = current.done ? emptyReader() : current;
  if (c == '\r') return FeedStep{r, FEED_PENDING};
  if (c == '\n') return endLine(r);
  if (r.rejected) return FeedStep{r, FEED_PENDING};
  if (!isPrintable(c) || r.len >= MAX_LINE_CHARS) {
    r.rejected = true;
    return FeedStep{r, FEED_PENDING};
  }
  r.buf[r.len++] = c;
  return FeedStep{r, FEED_PENDING};
}

inline HostState parseStateLine(const char* line) {
  for (uint8_t i = 0; i < HOST_STATE_COUNT; ++i) {
    if (strcmp(line, STATE_LINES[i]) == 0) return (HostState)i;
  }
  return HOST_UNKNOWN;
}

inline HostState shownState(HostState last, uint32_t lastAtMs, uint32_t nowMs) {
  return nowMs - lastAtMs > HOST_TIMEOUT_MS ? HOST_UNKNOWN : last;
}

inline bool isBlinkOn(uint32_t nowMs, uint32_t halfPeriodMs) { return (nowMs / halfPeriodMs) % 2 == 0; }

inline bool isErrorFlashOn(uint32_t nowMs) {
  uint32_t phase = nowMs % ERROR_PERIOD_MS;
  return phase < FLASH_MS || (phase >= 2 * FLASH_MS && phase < 3 * FLASH_MS);
}

inline bool ledOn(HostState s, uint32_t nowMs) {
  switch (s) {
    case HOST_IDLE: return false;
    case HOST_LISTENING: return true;
    case HOST_PROCESSING: return isBlinkOn(nowMs, FAST_BLINK_MS);
    case HOST_SPEAKING: return isBlinkOn(nowMs, SLOW_BLINK_MS);
    case HOST_ERROR: return isErrorFlashOn(nowMs);
    default: return nowMs % NO_HOST_PERIOD_MS < NO_HOST_BLIP_MS;
  }
}

inline const char* stateLabel(HostState s) { return s == HOST_UNKNOWN ? "NO HOST" : STATE_LABELS[s]; }

}
