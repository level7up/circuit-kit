#pragma once

#include <stdint.h>

namespace tempradiag {

const uint8_t ECU_ADDRESS = 0x10;
const uint32_t SESSION_BAUD = 4800;
const uint8_t SYNC_BYTE = 0x55;
const uint8_t END_BYTE = 0x03;
const uint8_t KEY_BYTE_INDEX = 2;
const uint8_t MAX_KEYWORDS = 6;
const uint8_t WAKE_DATA_BITS = 8;
const uint8_t HEADER_BYTES = 3;
const uint8_t MAX_DATA = 12;
const uint8_t MIN_LENGTH = HEADER_BYTES;
const uint8_t MAX_LENGTH = HEADER_BYTES + MAX_DATA;
const uint8_t MAX_WIRE = MAX_LENGTH + 1;
const uint8_t MAX_BLOCKS = 8;
const uint8_t MAX_MEMORY_READ = 12;
const char UNPRINTABLE = '.';

enum Title : uint8_t {
  TITLE_MEMORY_READ = 0x01,
  TITLE_READ_ERRORS = 0x07,
  TITLE_ACK = 0x09,
  TITLE_NAK = 0x0A,
  TITLE_SENSOR_COLLECTION = 0x12,
  TITLE_SENSOR_DATA = 0xF4,
  TITLE_IDENT = 0xF6,
  TITLE_ERROR_DATA = 0xFC,
  TITLE_MEMORY_DATA = 0xFE
};

enum Purpose : uint8_t {
  PURPOSE_IDENT = 0,
  PURPOSE_READ_ERRORS = 1,
  PURPOSE_READ_MEMORY = 2,
  PURPOSE_READ_SENSORS = 3,
  PURPOSE_KEEP_ALIVE = 4
};

struct Block {
  uint8_t counter;
  uint8_t title;
  uint8_t dataLength;
  uint8_t data[MAX_DATA];
};

struct Request {
  Purpose purpose;
  bool valid;
  uint8_t dataLength;
  uint8_t data[MAX_DATA];
};

struct Reply {
  Purpose purpose;
  bool rejected;
  uint8_t blockCount;
  Block blocks[MAX_BLOCKS];
};

inline uint8_t complement(uint8_t b) { return static_cast<uint8_t>(~b); }

inline uint8_t titleFor(Purpose p) {
  switch (p) {
    case PURPOSE_READ_ERRORS:
      return TITLE_READ_ERRORS;
    case PURPOSE_READ_MEMORY:
      return TITLE_MEMORY_READ;
    case PURPOSE_READ_SENSORS:
      return TITLE_SENSOR_COLLECTION;
    default:
      return TITLE_ACK;
  }
}

inline bool wakeBitHigh(uint8_t address, uint8_t bitIndex) {
  if (bitIndex == 0) return false;
  if (bitIndex > WAKE_DATA_BITS) return true;
  return ((address >> (bitIndex - 1)) & 1) != 0;
}

inline Request requestFor(Purpose p) {
  Request r = Request();
  r.purpose = p;
  r.valid = true;
  return r;
}

inline Request readErrors() { return requestFor(PURPOSE_READ_ERRORS); }

inline Request readSensors() { return requestFor(PURPOSE_READ_SENSORS); }

inline Request readMemory(uint16_t address, uint8_t length) {
  Request r = requestFor(PURPOSE_READ_MEMORY);
  r.valid = length >= 1 && length <= MAX_MEMORY_READ;
  r.dataLength = 3;
  r.data[0] = length;
  r.data[1] = static_cast<uint8_t>(address >> 8);
  r.data[2] = static_cast<uint8_t>(address & 0xFF);
  return r;
}

inline bool isPrintable(uint8_t c) { return c >= 0x20 && c < 0x7F; }

inline uint16_t identText(const Reply& ident, char* out, uint16_t capacity) {
  if (capacity == 0) return 0;
  uint16_t n = 0;
  for (uint8_t b = 0; b < ident.blockCount; ++b) {
    const Block& block = ident.blocks[b];
    for (uint8_t i = 0; i < block.dataLength && n + 1 < capacity; ++i) {
      out[n++] = isPrintable(block.data[i]) ? static_cast<char>(block.data[i]) : UNPRINTABLE;
    }
  }
  out[n] = '\0';
  return n;
}

}
