from __future__ import annotations

import subprocess
import threading
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any

Popen = Callable[..., Any]

STDERR_TAIL_CHARS = 300


class Cancelled(Exception):
    pass


class ProcessFailed(Exception):
    pass


@dataclass(frozen=True)
class Completed:
    stdout: str
    stderr: str


def _tail(text: str) -> str:
    lines = [line for line in text.strip().splitlines() if line.strip()]
    return lines[-1][:STDERR_TAIL_CHARS] if lines else "no error output"


class ProcessRunner:
    def __init__(self, popen: Popen = subprocess.Popen) -> None:
        self._popen = popen
        self._lock = threading.Lock()
        self._proc: Any = None
        self._cancelled = False

    @property
    def cancelled(self) -> bool:
        return self._cancelled

    def run(self, argv: Sequence[str], *, timeout_s: float, input_text: str | None = None, cwd: str | None = None) -> Completed:
        proc = self._start(argv, input_text is not None, cwd)
        try:
            out, err = proc.communicate(input_text, timeout=timeout_s)
        except subprocess.TimeoutExpired as e:
            proc.kill()
            proc.communicate()
            raise ProcessFailed(f"{argv[0]} took longer than {timeout_s:g}s") from e
        finally:
            with self._lock:
                self._proc = None
        if self._cancelled:
            raise Cancelled()
        if proc.returncode != 0:
            raise ProcessFailed(f"{argv[0]} exited with code {proc.returncode}: {_tail(err or '')}")
        return Completed(out or "", err or "")

    def _start(self, argv: Sequence[str], has_input: bool, cwd: str | None) -> Any:
        with self._lock:
            if self._cancelled:
                raise Cancelled()
            try:
                self._proc = self._popen(
                    list(argv),
                    stdin=subprocess.PIPE if has_input else subprocess.DEVNULL,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    cwd=cwd,
                )
            except FileNotFoundError as e:
                raise ProcessFailed(f"{argv[0]} not found; is it installed and on PATH?") from e
            return self._proc

    def cancel(self) -> None:
        with self._lock:
            self._cancelled = True
            if self._proc is not None:
                self._proc.terminate()
