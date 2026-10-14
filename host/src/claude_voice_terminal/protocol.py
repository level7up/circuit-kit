from __future__ import annotations

from enum import Enum

from .state_machine import Event, State

MAX_LINE_BYTES = 32


class DeviceLine(Enum):
    PTT_DOWN = "BTN:PTT_DOWN"
    PTT_UP = "BTN:PTT_UP"
    CANCEL = "BTN:CANCEL"
    READY = "DEV:READY"


DEVICE_EVENTS: dict[DeviceLine, Event] = {
    DeviceLine.PTT_DOWN: Event.PTT_DOWN,
    DeviceLine.PTT_UP: Event.PTT_UP,
    DeviceLine.CANCEL: Event.CANCEL,
}

_WIRE_NAMES: dict[State, str] = {
    State.IDLE: "IDLE",
    State.LISTENING: "LISTENING",
    State.PROCESSING: "PROCESSING",
    State.SPEAKING: "SPEAKING",
    State.CANCELLED: "IDLE",
    State.ERROR: "ERROR",
}


def parse_device_line(raw: bytes) -> DeviceLine | None:
    body = raw.rstrip(b"\r\n")
    if not body or len(body) > MAX_LINE_BYTES:
        return None
    try:
        text = body.decode("ascii")
    except UnicodeDecodeError:
        return None
    if not text.isprintable():
        return None
    try:
        return DeviceLine(text)
    except ValueError:
        return None


def state_line(state: State) -> bytes:
    return f"STATE:{_WIRE_NAMES[state]}\n".encode("ascii")


class LineAssembler:
    def __init__(self) -> None:
        self._buffer = b""
        self._overflowed = False

    def feed(self, chunk: bytes) -> list[bytes | None]:
        lines: list[bytes | None] = []
        for byte in chunk:
            lines.extend(self._feed_byte(bytes([byte])))
        return lines

    def _feed_byte(self, byte: bytes) -> list[bytes | None]:
        if byte == b"\n":
            return self._end_line()
        if self._overflowed:
            return []
        if len(self._buffer) >= MAX_LINE_BYTES + 1:
            self._buffer = b""
            self._overflowed = True
            return []
        self._buffer += byte
        return []

    def _end_line(self) -> list[bytes | None]:
        line, overflowed = self._buffer, self._overflowed
        self._buffer, self._overflowed = b"", False
        if overflowed:
            return [None]
        return [line] if line.strip(b"\r") else []
