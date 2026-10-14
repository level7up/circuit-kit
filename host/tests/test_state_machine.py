import unittest

from claude_voice_terminal.state_machine import TRANSITIONS, Action, Event, State, transition


class StateMachineTest(unittest.TestCase):
    def test_full_turn(self):
        state = State.IDLE
        for event, expected in [
            (Event.PTT_DOWN, State.LISTENING),
            (Event.PTT_UP, State.PROCESSING),
            (Event.REPLY, State.SPEAKING),
            (Event.SPOKEN, State.IDLE),
        ]:
            state = transition(state, event).state
            self.assertIs(state, expected, event)

    def test_cancel_stops_the_running_work(self):
        self.assertEqual(transition(State.LISTENING, Event.CANCEL).actions, (Action.DISCARD_RECORDING,))
        self.assertEqual(transition(State.PROCESSING, Event.CANCEL).actions, (Action.ABORT_REQUEST,))
        self.assertEqual(transition(State.SPEAKING, Event.CANCEL).actions, (Action.STOP_SPEAKING,))
        for busy in (State.LISTENING, State.PROCESSING, State.SPEAKING):
            self.assertIs(transition(busy, Event.CANCEL).state, State.CANCELLED)

    def test_new_press_interrupts_speech(self):
        step = transition(State.SPEAKING, Event.PTT_DOWN)
        self.assertIs(step.state, State.LISTENING)
        self.assertEqual(step.actions, (Action.STOP_SPEAKING, Action.START_RECORDING))

    def test_disconnect_never_leaves_a_busy_state(self):
        for busy in (State.LISTENING, State.PROCESSING, State.SPEAKING):
            self.assertIs(transition(busy, Event.DISCONNECTED).state, State.IDLE)

    def test_failed_recording_start_goes_to_error(self):
        self.assertIs(transition(State.LISTENING, Event.FAILED).state, State.ERROR)

    def test_unrelated_events_are_ignored(self):
        self.assertEqual(transition(State.IDLE, Event.REPLY).actions, ())
        self.assertIs(transition(State.IDLE, Event.REPLY).state, State.IDLE)
        self.assertIs(transition(State.CANCELLED, Event.PTT_UP).state, State.CANCELLED)

    def test_every_state_has_a_way_out(self):
        for state in State:
            exits = {t.state for t in TRANSITIONS.get(state, {}).values()}
            self.assertTrue(exits - {state}, state)


if __name__ == "__main__":
    unittest.main()
