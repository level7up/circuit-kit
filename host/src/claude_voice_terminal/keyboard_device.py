from __future__ import annotations

import threading
from collections.abc import Callable

from .serial_device import OnEvent, OnQuit
from .state_machine import Event, State

HELP = "Enter = start/stop talking · c + Enter = cancel · q + Enter = quit"


class KeyboardLink:
    def __init__(self, read_line: Callable[[], str] = input, out: Callable[[str], None] = print) -> None:
        self._read_line = read_line
        self._out = out
        self._holding = False

    def start(self, on_event: OnEvent, on_quit: OnQuit) -> None:
        threading.Thread(target=self._run, args=(on_event, on_quit), name="keyboard", daemon=True).start()

    def stop(self) -> None:
        pass

    def write_state(self, state: State) -> None:
        if state is not State.LISTENING:
            self._holding = False

    def _run(self, on_event: OnEvent, on_quit: OnQuit) -> None:
        self._out(HELP)
        while True:
            try:
                command = self._read_line().strip().lower()
            except EOFError:
                on_quit()
                return
            if command == "q":
                on_quit()
                return
            self._handle(command, on_event)

    def _handle(self, command: str, on_event: OnEvent) -> None:
        if command == "c":
            on_event(Event.CANCEL)
            return
        if command:
            self._out(HELP)
            return
        self._holding = not self._holding
        on_event(Event.PTT_DOWN if self._holding else Event.PTT_UP)
