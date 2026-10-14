#pragma once

#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "session.h"

namespace tempradiag {

const char FIRMWARE_NAME[] = "tempra_diag 2";
const char CMD_FAULTS_TEXT[] = "READ FAULTS";
const char CMD_SENSORS_TEXT[] = "READ SENSORS";
const size_t LINK_LINE_MAX = 512;
const size_t IDENT_MAX = 40;

const char* const PHASE_KEYS[] = {"off", "wake", "sync", "keywords", "link", "ready", "backoff"};
const char* const FAULT_KEYS[] = {"none", "no-sync", "timeout", "echo", "complement", "length", "end-byte", "unexpected-byte", "too-many-blocks"};

enum Command : uint8_t { CMD_NONE = 0, CMD_FAULTS = 1, CMD_SENSORS = 2 };

struct Wireless {
  const char* ssid;
  uint8_t wifiClients;
  uint8_t bleClients;
};

inline size_t trimmedLength(const char* line, size_t len) {
  while (len > 0 && (line[len - 1] == '\n' || line[len - 1] == '\r' || line[len - 1] == ' ')) --len;
  return len;
}

inline Command parseCommand(const char* line, size_t len) {
  size_t n = trimmedLength(line, len);
  if (n == strlen(CMD_FAULTS_TEXT) && memcmp(line, CMD_FAULTS_TEXT, n) == 0) return CMD_FAULTS;
  if (n == strlen(CMD_SENSORS_TEXT) && memcmp(line, CMD_SENSORS_TEXT, n) == 0) return CMD_SENSORS;
  return CMD_NONE;
}

inline int finish(int n, size_t cap) { return n < 0 || static_cast<size_t>(n) >= cap ? -1 : n; }

inline int helloJson(char* out, size_t cap) {
  return finish(snprintf(out, cap, "{\"t\":\"hello\",\"fw\":\"%s\"}", FIRMWARE_NAME), cap);
}

inline void safeIdent(const Session& s, char* out, size_t cap) {
  if (!s.identReady) {
    out[0] = '\0';
    return;
  }
  identText(s.ident, out, static_cast<uint16_t>(cap));
  for (char* c = out; *c; ++c) {
    if (*c == '"' || *c == '\\') *c = UNPRINTABLE;
  }
}

inline int stateJson(char* out, size_t cap, const Session& s, float batteryV, const Wireless& w) {
  char ident[IDENT_MAX + 1];
  safeIdent(s, ident, sizeof(ident));
  return finish(snprintf(out, cap,
                         "{\"t\":\"state\",\"ph\":\"%s\",\"f\":\"%s\",\"rc\":%u,\"id\":\"%s\",\"bat\":%.1f,\"ssid\":\"%s\",\"wc\":%u,\"bc\":%u}",
                         PHASE_KEYS[displayPhase(s)], FAULT_KEYS[s.fault], static_cast<unsigned>(s.reconnects), ident,
                         static_cast<double>(batteryV), w.ssid, static_cast<unsigned>(w.wifiClients), static_cast<unsigned>(w.bleClients)),
                cap);
}

inline int replyJson(char* out, size_t cap, const Reply& r) {
  const char* kind = r.purpose == PURPOSE_READ_ERRORS ? "faults" : "sensors";
  int n = snprintf(out, cap, "{\"t\":\"%s\",\"rej\":%d,\"b\":[", kind, r.rejected ? 1 : 0);
  for (uint8_t b = 0; b < r.blockCount && n > 0 && static_cast<size_t>(n) < cap; ++b) {
    n += snprintf(out + n, cap - n, "%s[", b == 0 ? "" : ",");
    for (uint8_t i = 0; i < r.blocks[b].dataLength && static_cast<size_t>(n) < cap; ++i) {
      n += snprintf(out + n, cap - n, "%s%u", i == 0 ? "" : ",", static_cast<unsigned>(r.blocks[b].data[i]));
    }
    if (static_cast<size_t>(n) < cap) n += snprintf(out + n, cap - n, "]");
  }
  if (n > 0 && static_cast<size_t>(n) < cap) n += snprintf(out + n, cap - n, "]}");
  return finish(n, cap);
}

}
