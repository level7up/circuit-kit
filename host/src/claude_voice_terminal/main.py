from __future__ import annotations

import argparse
import logging
import sys
from collections.abc import Sequence
from pathlib import Path

from .app import App, Link
from .audio_input import Recorder, Transcriber
from .claude_adapter import ClaudeCodeAdapter, ClaudeError
from .config import Config, ConfigError, load_config
from .keyboard_device import KeyboardLink
from .serial_device import SerialLink, list_ports
from .speech_output import Speaker

EXIT_OK = 0
EXIT_CONFIG = 2


def parse_args(argv: Sequence[str] | None) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="claude-voice-terminal", description="Push-to-talk voice front end for Claude Code.")
    p.add_argument("--config", type=Path, help="TOML settings file (default ~/.config/claude-voice-terminal/config.toml)")
    p.add_argument("--project", help="folder Claude Code works in")
    p.add_argument("--port", help="serial port of the ESP32-S3 (found automatically when omitted)")
    p.add_argument("--keyboard", action="store_true", help="use the Enter key instead of the hardware button")
    p.add_argument("--list-ports", action="store_true", help="show serial ports and exit")
    p.add_argument("--no-speech", action="store_true", help="print replies without reading them aloud")
    p.add_argument("--voice", help="macOS voice for replies, see 'say -v ?'")
    p.add_argument("--language", help="speech language for whisper, e.g. en, ar or auto")
    p.add_argument("-v", "--verbose", action="store_true", help="debug logging")
    return p.parse_args(argv)


def _overrides(args: argparse.Namespace) -> dict[str, object]:
    return {
        "port": args.port,
        "project_dir": args.project,
        "speak": False if args.no_speech else None,
        "voice": args.voice,
        "language": args.language,
    }


def _print_ports() -> int:
    for port in list_ports():
        vid = f"{port.vid:04x}" if port.vid is not None else "----"
        print(f"{port.device}  vid={vid}  {port.description}")
    return EXIT_OK


def _build_app(config: Config, use_keyboard: bool) -> App:
    link: Link = KeyboardLink() if use_keyboard else SerialLink(config)
    return App(
        config=config,
        link=link,
        recorder=Recorder(config),
        transcriber=Transcriber(config),
        claude=ClaudeCodeAdapter(config),
        speaker=Speaker(config),
    )


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if args.list_ports:
        return _print_ports()
    try:
        config = load_config(args.config, _overrides(args))
        app = _build_app(config, args.keyboard)
    except (ConfigError, ClaudeError) as e:
        print(f"error: {e}", file=sys.stderr)
        return EXIT_CONFIG
    print(f"Claude Code project: {Path(config.project_dir).expanduser().resolve()}")
    try:
        app.run()
    except KeyboardInterrupt:
        print()
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
