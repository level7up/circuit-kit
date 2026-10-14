#pragma once

#include <stdint.h>

#include "kline.h"

namespace tempradiag {

const uint8_t FAULT_STATUS_PRESENT = 0x1E;
const uint8_t FAULT_MIN_BYTES = 3;

struct FaultName {
  uint16_t code;
  const char* name;
};

const FaultName FAULT_NAMES[] = {
    {0x1A01, "IDLE ACTUATOR"},
    {0x0302, "CRANK SENSOR"},
    {0x0402, "IDLE SWITCH"},
    {0x0602, "TPS"},
    {0x0A02, "COOLANT TEMP"},
    {0x0B02, "AIR TEMP"},
    {0x0D02, "LAMBDA"},
    {0x3102, "MIXTURE"},
    {0x0303, "CRANK SYNC"},
    {0x3A46, "IMMOBILIZER"},
    {0xFFFF, "ECU / LINK"},
};

inline bool faultCode(const Block& b, uint16_t& code) {
  if (b.title != TITLE_ERROR_DATA || b.dataLength < FAULT_MIN_BYTES) return false;
  code = static_cast<uint16_t>(b.data[0] | (b.data[1] << 8));
  return true;
}

inline const char* faultName(uint16_t code) {
  for (const FaultName& f : FAULT_NAMES) {
    if (f.code == code) return f.name;
  }
  return "?";
}

}
