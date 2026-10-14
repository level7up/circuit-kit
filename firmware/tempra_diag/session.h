#pragma once

#include <stdint.h>

#include "kline.h"

namespace tempradiag {

enum Phase : uint8_t {
  PHASE_OFF = 0,
  PHASE_WAKE = 1,
  PHASE_SYNC = 2,
  PHASE_KEYWORDS = 3,
  PHASE_LINK = 4,
  PHASE_READY = 5,
  PHASE_BACKOFF = 6
};

enum Fault : uint8_t {
  FAULT_NONE = 0,
  FAULT_NO_SYNC = 1,
  FAULT_TIMEOUT = 2,
  FAULT_ECHO = 3,
  FAULT_COMPLEMENT = 4,
  FAULT_LENGTH = 5,
  FAULT_END_BYTE = 6,
  FAULT_UNEXPECTED_BYTE = 7,
  FAULT_TOO_MANY_BLOCKS = 8
};

enum Await : uint8_t { AWAIT_SEND = 0, AWAIT_ECHO = 1, AWAIT_COMPLEMENT = 2, AWAIT_DATA = 3 };

struct Timing {
  uint16_t preWakeIdleMs;
  uint16_t wakeBitMs;
  uint16_t syncTimeoutMs;
  uint16_t keywordGapMs;
  uint16_t byteTimeoutMs;
  uint16_t byteDelayMs;
  uint16_t keepAliveMs;
  uint16_t backoffMs;
};

const Timing MA17_TIMING = {300, 200, 2000, 250, 1000, 2, 500, 2600};

struct Inputs {
  uint32_t nowMs;
  bool hasRx;
  uint8_t rx;
};

struct Outputs {
  bool driveLine;
  bool lineHigh;
  bool hasTx;
  uint8_t tx;
};

struct ByteLink {
  Await await;
  uint32_t sinceMs;
  uint8_t pending;
  bool sending;
  uint8_t bytes[MAX_WIRE];
  uint8_t length;
  uint8_t index;
};

struct Session {
  Phase phase;
  Fault fault;
  uint32_t phaseSinceMs;
  uint8_t keywords[MAX_KEYWORDS];
  uint8_t keywordCount;
  uint32_t lastKeywordMs;
  uint8_t counter;
  ByteLink wire;
  Purpose purpose;
  Reply collecting;
  bool hasPending;
  Request pending;
  uint32_t lastExchangeMs;
  bool identReady;
  Reply ident;
  bool replyReady;
  Reply reply;
  uint16_t reconnects;
  Outputs out;
};

inline Session enter(Session s, Phase phase, uint32_t nowMs) {
  s.phase = phase;
  s.phaseSinceMs = nowMs;
  return s;
}

inline Session start(Session s, uint32_t nowMs) {
  if (s.phase != PHASE_OFF) return s;
  s = Session();
  return enter(s, PHASE_WAKE, nowMs);
}

inline Session stop(Session s) {
  s.phase = PHASE_OFF;
  s.hasPending = false;
  return s;
}

inline bool isConnected(const Session& s) {
  return s.phase == PHASE_READY || (s.phase == PHASE_LINK && s.purpose != PURPOSE_IDENT);
}

inline Phase displayPhase(const Session& s) {
  return s.phase == PHASE_LINK && s.purpose == PURPOSE_KEEP_ALIVE ? PHASE_READY : s.phase;
}

inline bool canRequest(const Session& s, const Request& r) {
  return r.valid && isConnected(s) && !s.hasPending && !s.replyReady;
}

inline Session request(Session s, const Request& r) {
  if (!canRequest(s, r)) return s;
  s.hasPending = true;
  s.pending = r;
  return s;
}

inline Session takeReply(Session s) {
  s.replyReady = false;
  return s;
}

inline Session fail(Session s, Fault fault, uint32_t nowMs) {
  s.fault = fault;
  s.hasPending = false;
  return enter(s, PHASE_BACKOFF, nowMs);
}

inline Session awaitNext(Session s, Await await, uint8_t pending, uint32_t nowMs) {
  s.wire.await = await;
  s.wire.pending = pending;
  s.wire.sinceMs = nowMs;
  return s;
}

inline Session sendBlock(Session s, uint8_t title, const uint8_t* data, uint8_t dataLength, uint32_t nowMs) {
  s.counter = static_cast<uint8_t>(s.counter + 1);
  s.wire.bytes[0] = static_cast<uint8_t>(dataLength + HEADER_BYTES);
  s.wire.bytes[1] = s.counter;
  s.wire.bytes[2] = title;
  for (uint8_t i = 0; i < dataLength; ++i) s.wire.bytes[HEADER_BYTES + i] = data[i];
  s.wire.bytes[HEADER_BYTES + dataLength] = END_BYTE;
  s.wire.length = static_cast<uint8_t>(dataLength + HEADER_BYTES + 1);
  s.wire.index = 0;
  s.wire.sending = true;
  s = enter(s, PHASE_LINK, nowMs);
  return awaitNext(s, AWAIT_SEND, s.wire.bytes[0], nowMs);
}

inline Session receiveNextBlock(Session s, uint32_t nowMs) {
  s.wire.sending = false;
  s.wire.index = 0;
  return awaitNext(s, AWAIT_DATA, 0, nowMs);
}

inline Block decodeBlock(const ByteLink& w) {
  Block b = Block();
  b.counter = w.bytes[1];
  b.title = w.bytes[2];
  b.dataLength = static_cast<uint8_t>(w.bytes[0] - HEADER_BYTES);
  for (uint8_t i = 0; i < b.dataLength; ++i) b.data[i] = w.bytes[HEADER_BYTES + i];
  return b;
}

inline Session finishExchange(Session s, bool rejected, uint32_t nowMs) {
  s.collecting.rejected = rejected;
  if (s.purpose == PURPOSE_IDENT) {
    s.ident = s.collecting;
    s.identReady = true;
  } else if (s.purpose != PURPOSE_KEEP_ALIVE) {
    s.reply = s.collecting;
    s.replyReady = true;
  }
  s.lastExchangeMs = nowMs;
  return enter(s, PHASE_READY, nowMs);
}

inline Session blockReceived(Session s, uint32_t nowMs) {
  Block block = decodeBlock(s.wire);
  s.counter = block.counter;
  if (block.title == TITLE_ACK) return finishExchange(s, false, nowMs);
  if (block.title == TITLE_NAK) return finishExchange(s, true, nowMs);
  if (s.purpose != PURPOSE_KEEP_ALIVE) {
    if (s.collecting.blockCount >= MAX_BLOCKS) return fail(s, FAULT_TOO_MANY_BLOCKS, nowMs);
    s.collecting.blocks[s.collecting.blockCount] = block;
    s.collecting.blockCount = static_cast<uint8_t>(s.collecting.blockCount + 1);
  }
  return sendBlock(s, TITLE_ACK, 0, 0, nowMs);
}

inline Session byteReceived(Session s, uint8_t b, uint32_t nowMs) {
  uint8_t index = s.wire.index;
  if (index == 0 && (b < MIN_LENGTH || b > MAX_LENGTH)) return fail(s, FAULT_LENGTH, nowMs);
  s.wire.bytes[index] = b;
  s.wire.index = static_cast<uint8_t>(index + 1);
  if (index < s.wire.bytes[0]) return awaitNext(s, AWAIT_SEND, complement(b), nowMs);
  if (b != END_BYTE) return fail(s, FAULT_END_BYTE, nowMs);
  return blockReceived(s, nowMs);
}

inline Session echoed(Session s, uint32_t nowMs) {
  if (!s.wire.sending) return awaitNext(s, AWAIT_DATA, 0, nowMs);
  if (s.wire.index + 1 == s.wire.length) return receiveNextBlock(s, nowMs);
  return awaitNext(s, AWAIT_COMPLEMENT, complement(s.wire.bytes[s.wire.index]), nowMs);
}

inline Session stepLink(Session s, const Inputs& in, const Timing& t) {
  if (s.wire.await == AWAIT_SEND) {
    if (in.hasRx) return fail(s, FAULT_UNEXPECTED_BYTE, in.nowMs);
    if (in.nowMs - s.wire.sinceMs < t.byteDelayMs) return s;
    s.out.hasTx = true;
    s.out.tx = s.wire.pending;
    return awaitNext(s, AWAIT_ECHO, s.wire.pending, in.nowMs);
  }
  if (!in.hasRx) {
    if (in.nowMs - s.wire.sinceMs > t.byteTimeoutMs) return fail(s, FAULT_TIMEOUT, in.nowMs);
    return s;
  }
  if (s.wire.await == AWAIT_ECHO) {
    if (in.rx != s.wire.pending) return fail(s, FAULT_ECHO, in.nowMs);
    return echoed(s, in.nowMs);
  }
  if (s.wire.await == AWAIT_COMPLEMENT) {
    if (in.rx != s.wire.pending) return fail(s, FAULT_COMPLEMENT, in.nowMs);
    s.wire.index = static_cast<uint8_t>(s.wire.index + 1);
    return awaitNext(s, AWAIT_SEND, s.wire.bytes[s.wire.index], in.nowMs);
  }
  return byteReceived(s, in.rx, in.nowMs);
}

inline Session stepWake(Session s, const Inputs& in, const Timing& t) {
  uint32_t elapsed = in.nowMs - s.phaseSinceMs;
  s.out.driveLine = true;
  s.out.lineHigh = true;
  if (elapsed < t.preWakeIdleMs) return s;
  uint32_t bit = (elapsed - t.preWakeIdleMs) / t.wakeBitMs;
  if (bit <= WAKE_DATA_BITS) {
    s.out.lineHigh = wakeBitHigh(ECU_ADDRESS, static_cast<uint8_t>(bit));
    return s;
  }
  s.out.driveLine = false;
  return enter(s, PHASE_SYNC, in.nowMs);
}

inline Session stepSync(Session s, const Inputs& in, const Timing& t) {
  if (in.hasRx && in.rx == SYNC_BYTE) {
    s.keywords[0] = SYNC_BYTE;
    s.keywordCount = 1;
    s.lastKeywordMs = in.nowMs;
    return enter(s, PHASE_KEYWORDS, in.nowMs);
  }
  if (in.nowMs - s.phaseSinceMs > t.syncTimeoutMs) return fail(s, FAULT_NO_SYNC, in.nowMs);
  return s;
}

inline Session replyToKeywords(Session s, uint32_t nowMs) {
  s.purpose = PURPOSE_IDENT;
  s.collecting = Reply();
  s.collecting.purpose = PURPOSE_IDENT;
  s.counter = 0;
  s.wire.sending = false;
  s.wire.index = 0;
  s = enter(s, PHASE_LINK, nowMs);
  return awaitNext(s, AWAIT_SEND, complement(s.keywords[KEY_BYTE_INDEX]), nowMs);
}

inline Session stepKeywords(Session s, const Inputs& in, const Timing& t) {
  if (in.hasRx) {
    if (s.keywordCount < MAX_KEYWORDS) s.keywords[s.keywordCount++] = in.rx;
    s.lastKeywordMs = in.nowMs;
    return s;
  }
  if (in.nowMs - s.lastKeywordMs < t.keywordGapMs) return s;
  if (s.keywordCount <= KEY_BYTE_INDEX) return fail(s, FAULT_NO_SYNC, in.nowMs);
  return replyToKeywords(s, in.nowMs);
}

inline Session stepReady(Session s, const Inputs& in, const Timing& t) {
  if (in.hasRx) return fail(s, FAULT_UNEXPECTED_BYTE, in.nowMs);
  if (s.hasPending) {
    s.hasPending = false;
    s.purpose = s.pending.purpose;
    s.collecting = Reply();
    s.collecting.purpose = s.purpose;
    return sendBlock(s, titleFor(s.purpose), s.pending.data, s.pending.dataLength, in.nowMs);
  }
  if (in.nowMs - s.lastExchangeMs < t.keepAliveMs) return s;
  s.purpose = PURPOSE_KEEP_ALIVE;
  return sendBlock(s, TITLE_ACK, 0, 0, in.nowMs);
}

inline Session stepBackoff(Session s, const Inputs& in, const Timing& t) {
  if (in.nowMs - s.phaseSinceMs < t.backoffMs) return s;
  s.reconnects = static_cast<uint16_t>(s.reconnects + 1);
  s.identReady = false;
  return enter(s, PHASE_WAKE, in.nowMs);
}

inline Session step(Session s, const Inputs& in, const Timing& t) {
  s.out = Outputs();
  s.out.lineHigh = true;
  switch (s.phase) {
    case PHASE_WAKE:
      return stepWake(s, in, t);
    case PHASE_SYNC:
      return stepSync(s, in, t);
    case PHASE_KEYWORDS:
      return stepKeywords(s, in, t);
    case PHASE_LINK:
      return stepLink(s, in, t);
    case PHASE_READY:
      return stepReady(s, in, t);
    case PHASE_BACKOFF:
      return stepBackoff(s, in, t);
    default:
      return s;
  }
}

}
