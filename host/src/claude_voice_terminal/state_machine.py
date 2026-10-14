from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class State(Enum):
    IDLE = "IDLE"
    LISTENING = "LISTENING"
    PROCESSING = "PROCESSING"
    SPEAKING = "SPEAKING"
    CANCELLED = "CANCELLED"
    ERROR = "ERROR"


class Event(Enum):
    PTT_DOWN = "PTT_DOWN"
    PTT_UP = "PTT_UP"
    CANCEL = "CANCEL"
    REPLY = "REPLY"
    FAILED = "FAILED"
    SPOKEN = "SPOKEN"
    SETTLED = "SETTLED"
    DISCONNECTED = "DISCONNECTED"


class Action(Enum):
    START_RECORDING = "START_RECORDING"
    FINISH_RECORDING = "FINISH_RECORDING"
    DISCARD_RECORDING = "DISCARD_RECORDING"
    ABORT_REQUEST = "ABORT_REQUEST"
    SPEAK = "SPEAK"
    STOP_SPEAKING = "STOP_SPEAKING"


@dataclass(frozen=True)
class Transition:
    state: State
    actions: tuple[Action, ...] = ()


def _to(state: State, *actions: Action) -> Transition:
    return Transition(state, actions)


_LISTEN_AGAIN = _to(State.LISTENING, Action.START_RECORDING)

TRANSITIONS: dict[State, dict[Event, Transition]] = {
    State.IDLE: {Event.PTT_DOWN: _LISTEN_AGAIN},
    State.LISTENING: {
        Event.PTT_UP: _to(State.PROCESSING, Action.FINISH_RECORDING),
        Event.CANCEL: _to(State.CANCELLED, Action.DISCARD_RECORDING),
        Event.FAILED: _to(State.ERROR, Action.DISCARD_RECORDING),
        Event.DISCONNECTED: _to(State.IDLE, Action.DISCARD_RECORDING),
    },
    State.PROCESSING: {
        Event.REPLY: _to(State.SPEAKING, Action.SPEAK),
        Event.FAILED: _to(State.ERROR),
        Event.CANCEL: _to(State.CANCELLED, Action.ABORT_REQUEST),
        Event.DISCONNECTED: _to(State.IDLE, Action.ABORT_REQUEST),
    },
    State.SPEAKING: {
        Event.SPOKEN: _to(State.IDLE),
        Event.CANCEL: _to(State.CANCELLED, Action.STOP_SPEAKING),
        Event.PTT_DOWN: _to(State.LISTENING, Action.STOP_SPEAKING, Action.START_RECORDING),
        Event.DISCONNECTED: _to(State.IDLE, Action.STOP_SPEAKING),
    },
    State.CANCELLED: {Event.SETTLED: _to(State.IDLE), Event.PTT_DOWN: _LISTEN_AGAIN},
    State.ERROR: {Event.SETTLED: _to(State.IDLE), Event.PTT_DOWN: _LISTEN_AGAIN},
}

SETTLE_S: dict[State, float] = {State.CANCELLED: 1.0, State.ERROR: 3.0}


def transition(state: State, event: Event) -> Transition:
    return TRANSITIONS.get(state, {}).get(event, Transition(state))
