from __future__ import annotations

import logging
import threading
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any

from .config import Config
from .protocol import DEVICE_EVENTS, DeviceLine, LineAssembler, parse_device_line, state_line
from .state_machine import Event, State

log = logging.getLogger(__name__)

ESPRESSIF_VID = 0x303A
BRIDGE_VIDS = frozenset({0x1A86, 0x10C4})
RETRY_S = 1.0
READ_TIMEOUT_S = 0.2

OnEvent = Callable[[Event], None]
OnQuit = Callable[[], None]


@dataclass(frozen=True)
class PortInfo:
    device: str
    description: str
    vid: int | None


def list_ports() -> list[PortInfo]:
    from serial.tools import list_ports as tools

    return [PortInfo(p.device, p.description or "", p.vid) for p in tools.comports()]


def _rank(port: PortInfo) -> int:
    if port.vid == ESPRESSIF_VID:
        return 0
    if port.vid in BRIDGE_VIDS:
        return 1
    if "usbmodem" in port.device or "usbserial" in port.device:
        return 2
    return 3


def choose_port(ports: Sequence[PortInfo], wanted: str = "") -> str | None:
    if wanted:
        return wanted
    candidates = sorted((p for p in ports if _rank(p) < 3), key=_rank)
    return candidates[0].device if candidates else None


def open_port(device: str, baud: int) -> Any:
    import serial

    port = serial.Serial(timeout=READ_TIMEOUT_S, write_timeout=READ_TIMEOUT_S)
    port.port = device
    port.baudrate = baud
    port.dtr = False
    port.rts = False
    port.open()
    return port


class SerialLink:
    def __init__(
        self,
        config: Config,
        opener: Callable[[str, int], Any] = open_port,
        finder: Callable[[], list[PortInfo]] = list_ports,
    ) -> None:
        self._config = config
        self._opener = opener
        self._finder = finder
        self._lock = threading.Lock()
        self._stopped = threading.Event()
        self._port: Any = None
        self._on_event: OnEvent = lambda _e: None
        self._waiting_logged = False

    def start(self, on_event: OnEvent, on_quit: OnQuit) -> None:
        self._on_event = on_event
        threading.Thread(target=self._run, name="serial-link", daemon=True).start()

    def stop(self) -> None:
        self._stopped.set()

    def write_state(self, state: State) -> None:
        with self._lock:
            port = self._port
        if port is None:
            return
        try:
            port.write(state_line(state))
        except OSError as e:
            log.debug("could not send state: %s", e)

    def _run(self) -> None:
        while not self._stopped.is_set():
            port = self._connect()
            if port is None:
                self._stopped.wait(RETRY_S)
                continue
            self._serve(port)

    def _connect(self) -> Any:
        device = choose_port(self._finder(), self._config.port)
        if device is None:
            if not self._waiting_logged:
                log.info("waiting for the ESP32-S3 to be plugged in")
            self._waiting_logged = True
            return None
        try:
            port = self._opener(device, self._config.baud)
        except OSError as e:
            log.warning("could not open %s: %s", device, e)
            return None
        log.info("connected to %s", device)
        self._waiting_logged = False
        with self._lock:
            self._port = port
        return port

    def _serve(self, port: Any) -> None:
        assembler = LineAssembler()
        try:
            while not self._stopped.is_set():
                for raw in assembler.feed(port.read(port.in_waiting or 1)):
                    self._handle(raw)
        except OSError as e:
            log.warning("device disconnected: %s", e)
        finally:
            with self._lock:
                self._port = None
            self._close(port)
            self._on_event(Event.DISCONNECTED)

    def _handle(self, raw: bytes | None) -> None:
        line = parse_device_line(raw) if raw is not None else None
        if line is None:
            log.warning("ignored a malformed line from the device")
            return
        if line is DeviceLine.READY:
            log.info("device ready")
            return
        self._on_event(DEVICE_EVENTS[line])

    @staticmethod
    def _close(port: Any) -> None:
        try:
            port.close()
        except OSError:
            pass
