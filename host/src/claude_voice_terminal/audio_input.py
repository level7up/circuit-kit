from __future__ import annotations

import re
import shutil
import signal
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import Config, fill
from .processes import Popen, ProcessFailed, ProcessRunner

TEMP_PREFIX = "claude-voice-"
WAV_HEADER_BYTES = 44
STOP_WAIT_S = 3.0
NON_SPEECH = re.compile(r"\[[^\]]*\]|\([^)]*\)")


@dataclass(frozen=True)
class Recording:
    folder: Path
    wav: Path
    proc: Any


def _stop(proc: Any) -> None:
    if proc.poll() is not None:
        return
    proc.send_signal(signal.SIGINT)
    try:
        proc.wait(timeout=STOP_WAIT_S)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait()


def remove_recording(recording: Recording, keep: bool) -> None:
    if not keep:
        shutil.rmtree(recording.folder, ignore_errors=True)


class Recorder:
    def __init__(self, config: Config, popen: Popen = subprocess.Popen, temp_root: str | None = None) -> None:
        self._config = config
        self._popen = popen
        self._temp_root = temp_root

    def start(self) -> Recording:
        folder = Path(tempfile.mkdtemp(prefix=TEMP_PREFIX, dir=self._temp_root))
        wav = folder / "utterance.wav"
        argv = fill(self._config.record_command, {
            "microphone": self._config.microphone,
            "max_recording_s": str(self._config.max_recording_s),
            "wav": str(wav),
        })
        try:
            proc = self._popen(argv, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except FileNotFoundError as e:
            shutil.rmtree(folder, ignore_errors=True)
            raise ProcessFailed(f"{argv[0]} not found; install it with 'brew install ffmpeg'") from e
        return Recording(folder, wav, proc)

    def finish(self, recording: Recording) -> Path:
        _stop(recording.proc)
        if not recording.wav.exists() or recording.wav.stat().st_size <= WAV_HEADER_BYTES:
            raise ProcessFailed("nothing was recorded; check the microphone permission and the 'microphone' setting")
        return recording.wav

    def discard(self, recording: Recording) -> None:
        _stop(recording.proc)
        remove_recording(recording, keep=False)


def clean_transcript(raw: str) -> str:
    without_tags = NON_SPEECH.sub(" ", raw)
    return " ".join(without_tags.split())


class Transcriber:
    def __init__(self, config: Config) -> None:
        self._config = config

    def transcribe(self, wav: Path, runner: ProcessRunner) -> str:
        argv = fill(self._config.transcribe_command, {
            "language": self._config.language,
            "model": str(Path(self._config.whisper_model).expanduser()),
            "wav": str(wav),
        })
        completed = runner.run(argv, timeout_s=self._config.transcribe_timeout_s)
        return clean_transcript(completed.stdout)
