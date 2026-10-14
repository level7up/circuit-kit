from __future__ import annotations

import re
import subprocess
import threading
from typing import Any

from .config import Config
from .processes import Popen

CODE_BLOCK = re.compile(r"```.*?(```|$)", re.DOTALL)
INLINE_CODE = re.compile(r"`([^`]*)`")
LINK = re.compile(r"\[([^\]]+)\]\([^)]*\)")
MARKUP = re.compile(r"[*_#>|]+")
SENTENCE_END = re.compile(r"[.!?](\s|$)")
CODE_PLACEHOLDER = " (code on screen) "
TRUNCATED_SUFFIX = " The rest is on screen."


def _plain(text: str) -> str:
    no_code = CODE_BLOCK.sub(CODE_PLACEHOLDER, text)
    unlinked = LINK.sub(r"\1", INLINE_CODE.sub(r"\1", no_code))
    return " ".join(MARKUP.sub(" ", unlinked).split())


def _cut_at_sentence(text: str, max_chars: int) -> str:
    head = text[:max_chars]
    ends = [m.end() for m in SENTENCE_END.finditer(head)]
    best = ends[-1] if ends and ends[-1] > max_chars // 2 else max_chars
    return head[:best].rstrip()


def speakable(text: str, max_chars: int) -> str:
    plain = _plain(text)
    if len(plain) <= max_chars:
        return plain
    return _cut_at_sentence(plain, max_chars) + TRUNCATED_SUFFIX


def say_command(config: Config) -> list[str]:
    voice = ["-v", config.voice] if config.voice else []
    rate = ["-r", str(config.rate)] if config.rate > 0 else []
    return ["say", *voice, *rate, "-f", "-"]


class Speaker:
    def __init__(self, config: Config, popen: Popen = subprocess.Popen) -> None:
        self._config = config
        self._popen = popen
        self._lock = threading.Lock()
        self._proc: Any = None

    def speak(self, text: str) -> None:
        with self._lock:
            self._proc = self._popen(
                say_command(self._config), stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, text=True
            )
            proc = self._proc
        try:
            proc.communicate(text)
        finally:
            with self._lock:
                if self._proc is proc:
                    self._proc = None

    def stop(self) -> None:
        with self._lock:
            if self._proc is not None:
                self._proc.terminate()
