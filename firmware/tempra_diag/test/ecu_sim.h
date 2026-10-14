#pragma once

#include <cstdint>
#include <string>
#include <vector>

#include "../kline.h"

namespace ecusim {

using tempradiag::complement;

const uint32_t BYTE_GAP_MS = 3;
const uint32_t KEYWORD_GAP_MS = 20;
const uint32_t WAKE_TO_SYNC_MS = 40;
const uint32_t LINK_WATCHDOG_MS = 1000;
const uint8_t IDENT_CHUNK = 10;
const uint8_t SENSOR_BYTES = 10;

enum State : uint8_t { ASLEEP, AWAIT_KEY, SENDING, RECEIVING };

struct Scheduled {
  uint32_t atMs;
  uint8_t byte;
};

struct Faults {
  bool silent = false;
  bool corruptNextComplement = false;
  bool badEndOnce = false;
  bool oversizeOnce = false;
  bool nakNextRequest = false;
};

struct EcuSim {
  std::vector<uint8_t> keywords{0x55, 0x46, 0x85, 0x89, 0xBC};
  std::string ident = "0261200721BOSCH MA17";
  std::vector<std::vector<uint8_t>> dtcs;
  std::vector<uint8_t> memory = std::vector<uint8_t>(0x100, 0);
  std::vector<uint8_t> sensors = std::vector<uint8_t>(SENSOR_BYTES, 0);
  Faults faults;

  State state = ASLEEP;
  uint8_t counter = 0;
  std::vector<std::vector<uint8_t>> queue;
  std::vector<uint8_t> out;
  size_t outIndex = 0;
  std::vector<uint8_t> in;
  uint32_t lastActivityMs = 0;

  bool driving = false;
  std::vector<std::pair<uint32_t, bool>> levels;
  std::vector<uint8_t> wakeAddresses;
  std::vector<uint8_t> keyReplies;
  std::vector<uint8_t> titlesReceived;
  std::vector<uint32_t> ackTimesMs;
  int drops = 0;

  std::vector<Scheduled> outbox;
};

inline void emit(EcuSim& e, uint32_t atMs, uint8_t b) { e.outbox.push_back(Scheduled{atMs, b}); }

inline std::vector<uint8_t> frame(EcuSim& e, uint8_t title, const std::vector<uint8_t>& data) {
  std::vector<uint8_t> f;
  f.push_back(static_cast<uint8_t>(data.size() + 3));
  f.push_back(++e.counter);
  f.push_back(title);
  f.insert(f.end(), data.begin(), data.end());
  f.push_back(tempradiag::END_BYTE);
  return f;
}

inline void sendFrame(EcuSim& e, uint32_t nowMs, std::vector<uint8_t> f) {
  if (e.faults.badEndOnce) {
    e.faults.badEndOnce = false;
    f.back() = 0x04;
  }
  if (e.faults.oversizeOnce) {
    e.faults.oversizeOnce = false;
    f[0] = 0x20;
  }
  e.out = f;
  e.outIndex = 0;
  e.state = SENDING;
  emit(e, nowMs + BYTE_GAP_MS, e.out[0]);
}

inline void sendNext(EcuSim& e, uint32_t nowMs) {
  if (e.queue.empty()) {
    sendFrame(e, nowMs, frame(e, tempradiag::TITLE_ACK, {}));
    return;
  }
  std::vector<uint8_t> f = e.queue.front();
  e.queue.erase(e.queue.begin());
  sendFrame(e, nowMs, f);
}

inline void queueIdent(EcuSim& e) {
  for (size_t i = 0; i < e.ident.size(); i += IDENT_CHUNK) {
    std::string part = e.ident.substr(i, IDENT_CHUNK);
    e.queue.push_back(frame(e, tempradiag::TITLE_IDENT, std::vector<uint8_t>(part.begin(), part.end())));
  }
}

inline void answer(EcuSim& e, uint32_t nowMs) {
  uint8_t title = e.in[2];
  std::vector<uint8_t> data(e.in.begin() + 3, e.in.end() - 1);
  e.titlesReceived.push_back(title);
  if (title == tempradiag::TITLE_ACK) {
    e.ackTimesMs.push_back(nowMs);
    sendNext(e, nowMs);
    return;
  }
  if (e.faults.nakNextRequest) {
    e.faults.nakNextRequest = false;
    sendFrame(e, nowMs, frame(e, tempradiag::TITLE_NAK, {}));
    return;
  }
  if (title == tempradiag::TITLE_READ_ERRORS) {
    for (const std::vector<uint8_t>& dtc : e.dtcs) e.queue.push_back(frame(e, tempradiag::TITLE_ERROR_DATA, dtc));
    sendNext(e, nowMs);
    return;
  }
  if (title == tempradiag::TITLE_MEMORY_READ && data.size() == 3) {
    size_t start = (static_cast<size_t>(data[1]) << 8 | data[2]) & 0xFF;
    std::vector<uint8_t> bytes(e.memory.begin() + start, e.memory.begin() + start + data[0]);
    sendFrame(e, nowMs, frame(e, tempradiag::TITLE_MEMORY_DATA, bytes));
    return;
  }
  if (title == tempradiag::TITLE_SENSOR_COLLECTION) {
    sendFrame(e, nowMs, frame(e, tempradiag::TITLE_SENSOR_DATA, e.sensors));
    return;
  }
  sendFrame(e, nowMs, frame(e, tempradiag::TITLE_NAK, {}));
}

inline void dropLink(EcuSim& e) {
  e.state = ASLEEP;
  e.queue.clear();
  ++e.drops;
}

inline uint8_t decodeWake(const std::vector<std::pair<uint32_t, bool>>& levels, uint32_t bitMs) {
  uint32_t startMs = 0;
  bool found = false;
  for (const std::pair<uint32_t, bool>& l : levels) {
    if (!l.second) {
      startMs = l.first;
      found = true;
      break;
    }
  }
  if (!found) return 0xFF;
  uint8_t address = 0;
  for (uint8_t bit = 0; bit < 8; ++bit) {
    uint32_t sampleMs = startMs + bitMs * (bit + 1) + bitMs / 2;
    bool high = true;
    for (const std::pair<uint32_t, bool>& l : levels) {
      if (l.first <= sampleMs) high = l.second;
    }
    if (high) address = static_cast<uint8_t>(address | (1u << bit));
  }
  return address;
}

inline void line(EcuSim& e, uint32_t nowMs, bool driven, bool high, uint32_t bitMs) {
  if (driven) {
    e.driving = true;
    e.levels.push_back(std::make_pair(nowMs, high));
    return;
  }
  if (!e.driving) return;
  e.driving = false;
  uint8_t address = decodeWake(e.levels, bitMs);
  e.levels.clear();
  e.wakeAddresses.push_back(address);
  if (address != tempradiag::ECU_ADDRESS || e.faults.silent) return;
  e.state = AWAIT_KEY;
  e.counter = 0;
  e.queue.clear();
  e.lastActivityMs = nowMs;
  for (size_t i = 0; i < e.keywords.size(); ++i) emit(e, nowMs + WAKE_TO_SYNC_MS + KEYWORD_GAP_MS * i, e.keywords[i]);
}

inline void receive(EcuSim& e, uint32_t nowMs, uint8_t b) {
  e.lastActivityMs = nowMs;
  if (e.state == AWAIT_KEY) {
    e.keyReplies.push_back(b);
    if (b != complement(e.keywords[2])) {
      dropLink(e);
      return;
    }
    queueIdent(e);
    sendNext(e, nowMs);
    return;
  }
  if (e.state == SENDING) {
    if (b != complement(e.out[e.outIndex])) {
      dropLink(e);
      return;
    }
    ++e.outIndex;
    emit(e, nowMs + BYTE_GAP_MS, e.out[e.outIndex]);
    if (e.outIndex == e.out.size() - 1) {
      e.state = RECEIVING;
      e.in.clear();
    }
    return;
  }
  if (e.state != RECEIVING) return;
  e.in.push_back(b);
  if (e.in.size() == static_cast<size_t>(e.in[0]) + 1) {
    answer(e, nowMs);
    return;
  }
  uint8_t ack = complement(b);
  if (e.faults.corruptNextComplement) {
    e.faults.corruptNextComplement = false;
    ack = static_cast<uint8_t>(ack ^ 0x01);
  }
  emit(e, nowMs + BYTE_GAP_MS, ack);
}

inline void tick(EcuSim& e, uint32_t nowMs) {
  if (e.state == RECEIVING && e.in.empty() && nowMs - e.lastActivityMs > LINK_WATCHDOG_MS) dropLink(e);
}

}
