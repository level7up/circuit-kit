from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import Config
from .processes import ProcessRunner


class ClaudeError(Exception):
    pass


@dataclass(frozen=True)
class Reply:
    text: str
    session_id: str | None


def build_command(config: Config, session_id: str | None = None) -> list[str]:
    resume = ["--resume", session_id] if config.continue_conversation and session_id else []
    style = ["--append-system-prompt", config.spoken_style_prompt] if config.spoken_style_prompt else []
    return [config.claude_command, "-p", "--output-format", "json", *resume, *style]


def _as_object(stdout: str) -> dict[str, Any]:
    try:
        data = json.loads(stdout)
    except ValueError as e:
        raise ClaudeError("Claude Code did not return JSON") from e
    if not isinstance(data, dict):
        raise ClaudeError("Claude Code returned an unexpected JSON shape")
    return data


def parse_reply(stdout: str) -> Reply:
    data = _as_object(stdout)
    if data.get("is_error") or data.get("subtype", "success") != "success":
        raise ClaudeError(f"Claude Code reported an error ({data.get('subtype', 'unknown')})")
    result = data.get("result")
    if not isinstance(result, str) or not result.strip():
        raise ClaudeError("Claude Code returned an empty reply")
    session_id = data.get("session_id")
    return Reply(result.strip(), session_id if isinstance(session_id, str) and session_id else None)


class ClaudeCodeAdapter:
    def __init__(self, config: Config) -> None:
        self._config = config
        self._project = Path(config.project_dir).expanduser()
        self._session_id: str | None = None
        if not self._project.is_dir():
            raise ClaudeError(f"project folder not found: {self._project}")

    def ask(self, prompt: str, runner: ProcessRunner) -> str:
        completed = runner.run(
            build_command(self._config, self._session_id),
            input_text=prompt,
            cwd=str(self._project),
            timeout_s=self._config.claude_timeout_s,
        )
        reply = parse_reply(completed.stdout)
        self._session_id = reply.session_id or self._session_id
        return reply.text
