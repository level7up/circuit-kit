from __future__ import annotations

import logging
import queue
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Protocol

from .audio_input import Recorder, Recording, Transcriber, remove_recording
from .claude_adapter import ClaudeCodeAdapter, ClaudeError
from .config import Config, ConfigError
from .processes import Cancelled, ProcessFailed, ProcessRunner
from .serial_device import OnEvent, OnQuit
from .speech_output import Speaker, speakable
from .state_machine import SETTLE_S, Action, Event, State, transition

log = logging.getLogger(__name__)

HEARTBEAT_S = 1.0
POLL_S = 0.1

TurnErrors = (ProcessFailed, ClaudeError, ConfigError, OSError)


class Link(Protocol):
    def start(self, on_event: OnEvent, on_quit: OnQuit) -> None: ...
    def stop(self) -> None: ...
    def write_state(self, state: State) -> None: ...


@dataclass(frozen=True)
class Message:
    event: Event
    turn: int | None = None
    text: str = ""


def spawn_thread(target: Callable[..., Any], *args: Any) -> None:
    threading.Thread(target=target, args=args, daemon=True).start()


class App:
    def __init__(
        self,
        *,
        config: Config,
        link: Link,
        recorder: Recorder,
        transcriber: Transcriber,
        claude: ClaudeCodeAdapter,
        speaker: Speaker,
        out: Callable[[str], None] = print,
        clock: Callable[[], float] = time.monotonic,
        spawn: Callable[..., None] = spawn_thread,
    ) -> None:
        self._config = config
        self._link = link
        self._recorder = recorder
        self._transcriber = transcriber
        self._claude = claude
        self._speaker = speaker
        self._out = out
        self._clock = clock
        self._spawn = spawn
        self._queue: queue.Queue[Message] = queue.Queue()
        self._stopped = threading.Event()
        self.state = State.IDLE
        self._since = clock()
        self._last_beat = float("-inf")
        self._turn = 0
        self._recording: Recording | None = None
        self._runner: ProcessRunner | None = None

    def post(self, event: Event, turn: int | None = None, text: str = "") -> None:
        self._queue.put(Message(event, turn, text))

    def stop(self) -> None:
        self._stopped.set()

    def run(self) -> None:
        self._link.start(self.post, self.stop)
        try:
            while not self._stopped.is_set():
                self.tick(POLL_S)
        finally:
            self.shutdown()

    def tick(self, timeout_s: float) -> None:
        try:
            self.handle(self._queue.get(timeout=timeout_s) if timeout_s > 0 else self._queue.get_nowait())
        except queue.Empty:
            pass
        self._settle()
        self._heartbeat()

    def run_pending(self) -> None:
        while not self._queue.empty():
            self.tick(0)

    def handle(self, msg: Message) -> None:
        if msg.turn is not None and msg.turn != self._turn:
            log.debug("dropped %s from an old turn", msg.event.value)
            return
        step = transition(self.state, msg.event)
        if step.state is self.state and not step.actions:
            return
        if msg.event is Event.FAILED:
            self._out(f"Error: {msg.text}")
        for action in step.actions:
            self._act(action, msg)
        self._enter(step.state, msg.event)

    def shutdown(self) -> None:
        self._discard_recording(None)
        self._abort_request(None)
        self._speaker.stop()
        self._link.write_state(State.IDLE)
        self._link.stop()

    def _enter(self, state: State, cause: Event) -> None:
        if state is self.state:
            return
        log.info("%s -> %s (%s)", self.state.value, state.value, cause.value)
        self.state = state
        self._since = self._clock()
        self._out(f"[{state.value}]")
        self._send_state()

    def _send_state(self) -> None:
        self._link.write_state(self.state)
        self._last_beat = self._clock()

    def _settle(self) -> None:
        settle = SETTLE_S.get(self.state)
        if settle is not None and self._clock() - self._since >= settle:
            self.handle(Message(Event.SETTLED))

    def _heartbeat(self) -> None:
        if self._clock() - self._last_beat >= HEARTBEAT_S:
            self._send_state()

    def _act(self, action: Action, msg: Message) -> None:
        handlers: dict[Action, Callable[[Message], None]] = {
            Action.START_RECORDING: self._start_recording,
            Action.FINISH_RECORDING: self._finish_recording,
            Action.DISCARD_RECORDING: self._discard_recording,
            Action.ABORT_REQUEST: self._abort_request,
            Action.SPEAK: self._speak,
            Action.STOP_SPEAKING: self._stop_speaking,
        }
        handlers[action](msg)

    def _start_recording(self, _msg: Message | None) -> None:
        self._turn += 1
        try:
            self._recording = self._recorder.start()
        except TurnErrors as e:
            self._recording = None
            self.post(Event.FAILED, self._turn, str(e))

    def _finish_recording(self, _msg: Message | None) -> None:
        recording, self._recording = self._recording, None
        self._runner = ProcessRunner()
        self._spawn(self._work, self._turn, recording, self._runner)

    def _discard_recording(self, _msg: Message | None) -> None:
        recording, self._recording = self._recording, None
        if recording is not None:
            self._recorder.discard(recording)

    def _abort_request(self, _msg: Message | None) -> None:
        if self._runner is not None:
            self._runner.cancel()

    def _speak(self, msg: Message) -> None:
        self._out(f"Claude: {msg.text}")
        text = speakable(msg.text, self._config.max_spoken_chars)
        if not self._config.speak or not text:
            self.post(Event.SPOKEN, self._turn)
            return
        self._spawn(self._say, self._turn, text)

    def _stop_speaking(self, _msg: Message | None) -> None:
        self._speaker.stop()

    def _work(self, turn: int, recording: Recording | None, runner: ProcessRunner) -> None:
        try:
            self.post(Event.REPLY, turn, self._answer(recording, runner))
        except Cancelled:
            log.info("request cancelled")
        except TurnErrors as e:
            self.post(Event.FAILED, turn, str(e))

    def _answer(self, recording: Recording | None, runner: ProcessRunner) -> str:
        if recording is None:
            raise ProcessFailed("the recording never started")
        try:
            prompt = self._transcriber.transcribe(self._recorder.finish(recording), runner)
        finally:
            remove_recording(recording, self._config.keep_audio)
        if not prompt:
            raise ProcessFailed("didn't hear anything")
        self._out(f"You: {prompt}")
        log.info("sending a %d-character prompt to Claude Code", len(prompt))
        return self._claude.ask(prompt, runner)

    def _say(self, turn: int, text: str) -> None:
        try:
            self._speaker.speak(text)
        except OSError as e:
            log.warning("speech failed: %s", e)
        finally:
            self.post(Event.SPOKEN, turn)
