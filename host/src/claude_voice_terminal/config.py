from __future__ import annotations

import tomllib
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, fields, replace
from pathlib import Path
from typing import Any

DEFAULT_CONFIG_PATH = Path("~/.config/claude-voice-terminal/config.toml").expanduser()

SPOKEN_STYLE = (
    "Your reply will be read aloud by a text-to-speech voice. "
    "Answer in a few short sentences of plain prose. Avoid markdown, tables and code unless the user asks for them."
)


class ConfigError(Exception):
    pass


@dataclass(frozen=True)
class Config:
    port: str = ""
    baud: int = 115200
    project_dir: str = "."
    claude_command: str = "claude"
    continue_conversation: bool = True
    claude_timeout_s: float = 300.0
    spoken_style_prompt: str = SPOKEN_STYLE
    speak: bool = True
    voice: str = ""
    rate: int = 0
    max_spoken_chars: int = 600
    microphone: str = "0"
    max_recording_s: int = 120
    record_command: tuple[str, ...] = (
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "avfoundation", "-i", ":{microphone}",
        "-t", "{max_recording_s}", "-ac", "1", "-ar", "16000", "-y", "{wav}",
    )
    transcribe_command: tuple[str, ...] = (
        "whisper-cli", "-nt", "-np", "-l", "{language}", "-m", "{model}", "-f", "{wav}",
    )
    whisper_model: str = "~/.cache/whisper/ggml-base.bin"
    language: str = "auto"
    transcribe_timeout_s: float = 120.0
    keep_audio: bool = False


_FIELD_TYPES: dict[str, Any] = {f.name: type(getattr(Config(), f.name)) for f in fields(Config)}


def _coerce(key: str, value: Any) -> Any:
    expected = _FIELD_TYPES.get(key)
    if expected is None:
        raise ConfigError(f"unknown setting '{key}'")
    if expected is tuple:
        if not isinstance(value, Sequence) or isinstance(value, str) or not all(isinstance(v, str) for v in value):
            raise ConfigError(f"'{key}' must be a list of strings")
        return tuple(value)
    if expected is float and isinstance(value, int) and not isinstance(value, bool):
        return float(value)
    if expected is bool and not isinstance(value, bool):
        raise ConfigError(f"'{key}' must be true or false")
    if not isinstance(value, expected) or (expected is int and isinstance(value, bool)):
        raise ConfigError(f"'{key}' must be a {expected.__name__}")
    return value


def _read_toml(path: Path) -> dict[str, Any]:
    try:
        with path.open("rb") as f:
            return tomllib.load(f)
    except tomllib.TOMLDecodeError as e:
        raise ConfigError(f"{path}: {e}") from e


def load_config(path: Path | None = None, overrides: Mapping[str, Any] | None = None) -> Config:
    source = path or DEFAULT_CONFIG_PATH
    if path is not None and not path.exists():
        raise ConfigError(f"config file not found: {path}")
    from_file = _read_toml(source) if source.exists() else {}
    merged = {**from_file, **{k: v for k, v in (overrides or {}).items() if v is not None}}
    return replace(Config(), **{k: _coerce(k, v) for k, v in merged.items()})


def fill(template: Sequence[str], values: Mapping[str, str]) -> list[str]:
    try:
        return [part.format_map(values) for part in template]
    except (KeyError, ValueError) as e:
        raise ConfigError(f"bad placeholder in command {list(template)}: {e}") from e
