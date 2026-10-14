import sys
import tempfile
import threading
import unittest
from dataclasses import replace
from pathlib import Path

from claude_voice_terminal.app import App
from claude_voice_terminal.audio_input import Recording
from claude_voice_terminal.claude_adapter import ClaudeError
from claude_voice_terminal.config import Config
from claude_voice_terminal.keyboard_device import KeyboardLink
from claude_voice_terminal.processes import Cancelled, ProcessFailed, ProcessRunner
from claude_voice_terminal.state_machine import Event, State


class FakeLink:
    def __init__(self):
        self.sent = []

    def start(self, on_event, on_quit):
        pass

    def stop(self):
        pass

    def write_state(self, state):
        self.sent.append(state)


class FakeRecorder:
    def __init__(self, fail_start=False):
        self.fail_start = fail_start
        self.discarded = []
        self.folders = []

    def start(self):
        if self.fail_start:
            raise ProcessFailed("ffmpeg not found")
        folder = Path(tempfile.mkdtemp(prefix="claude-voice-test-"))
        wav = folder / "utterance.wav"
        wav.write_bytes(b"0" * 100)
        self.folders.append(folder)
        return Recording(folder, wav, None)

    def finish(self, recording):
        return recording.wav

    def discard(self, recording):
        self.discarded.append(recording)


class FakeTranscriber:
    def __init__(self, text="what changed today?"):
        self.text = text

    def transcribe(self, wav, runner):
        if runner.cancelled:
            raise Cancelled()
        return self.text


class FakeClaude:
    def __init__(self, reply="Two files changed.", error=None):
        self.reply = reply
        self.error = error
        self.prompts = []

    def ask(self, prompt, runner):
        self.prompts.append(prompt)
        if self.error:
            raise self.error
        return self.reply


class FakeSpeaker:
    def __init__(self):
        self.spoken = []
        self.stops = 0

    def speak(self, text):
        self.spoken.append(text)

    def stop(self):
        self.stops += 1


class Harness:
    def __init__(self, config=None, recorder=None, transcriber=None, claude=None):
        self.now = [0.0]
        self.deferred = []
        self.lines = []
        self.link = FakeLink()
        self.recorder = recorder or FakeRecorder()
        self.claude = claude or FakeClaude()
        self.speaker = FakeSpeaker()
        self.app = App(
            config=config or Config(),
            link=self.link,
            recorder=self.recorder,
            transcriber=transcriber or FakeTranscriber(),
            claude=self.claude,
            speaker=self.speaker,
            out=self.lines.append,
            clock=lambda: self.now[0],
            spawn=lambda fn, *args: self.deferred.append((fn, args)),
        )

    def press(self, *events):
        for e in events:
            self.app.post(e)
            self.app.run_pending()

    def work(self):
        while self.deferred:
            fn, args = self.deferred.pop(0)
            fn(*args)
            self.app.run_pending()

    def wait(self, seconds):
        self.now[0] += seconds
        self.app.tick(0)


class AppTest(unittest.TestCase):
    def test_full_turn_speaks_the_reply_and_returns_to_idle(self):
        h = Harness()
        h.press(Event.PTT_DOWN)
        self.assertIs(h.app.state, State.LISTENING)
        h.press(Event.PTT_UP)
        self.assertIs(h.app.state, State.PROCESSING)
        h.work()
        self.assertEqual(h.claude.prompts, ["what changed today?"])
        self.assertEqual(h.speaker.spoken, ["Two files changed."])
        self.assertIs(h.app.state, State.IDLE)
        self.assertEqual(h.link.sent[:4], [State.LISTENING, State.PROCESSING, State.SPEAKING, State.IDLE])

    def test_recording_is_deleted_after_transcription(self):
        h = Harness()
        h.press(Event.PTT_DOWN, Event.PTT_UP)
        h.work()
        self.assertFalse(h.recorder.folders[0].exists())

    def test_recording_is_kept_when_asked(self):
        h = Harness(config=replace(Config(), keep_audio=True))
        h.press(Event.PTT_DOWN, Event.PTT_UP)
        h.work()
        self.assertTrue(h.recorder.folders[0].exists())

    def test_cancel_while_thinking_never_speaks(self):
        h = Harness()
        h.press(Event.PTT_DOWN, Event.PTT_UP, Event.CANCEL)
        self.assertIs(h.app.state, State.CANCELLED)
        h.work()
        self.assertEqual(h.speaker.spoken, [])
        self.assertEqual(h.claude.prompts, [])
        h.wait(1.0)
        self.assertIs(h.app.state, State.IDLE)

    def test_reply_from_an_older_turn_is_dropped(self):
        h = Harness()
        h.press(Event.PTT_DOWN, Event.PTT_UP, Event.CANCEL, Event.PTT_DOWN)
        stale = h.deferred.pop(0)
        h.app.post(Event.REPLY, 1, "old answer")
        h.app.run_pending()
        self.assertIs(h.app.state, State.LISTENING)
        self.assertIsNotNone(stale)

    def test_cancel_while_listening_discards_the_recording(self):
        h = Harness()
        h.press(Event.PTT_DOWN, Event.CANCEL)
        self.assertEqual(len(h.recorder.discarded), 1)

    def test_empty_transcript_is_an_error_that_settles(self):
        h = Harness(transcriber=FakeTranscriber(""))
        h.press(Event.PTT_DOWN, Event.PTT_UP)
        h.work()
        self.assertIs(h.app.state, State.ERROR)
        self.assertIn("Error: didn't hear anything", h.lines)
        h.wait(2.9)
        self.assertIs(h.app.state, State.ERROR)
        h.wait(0.2)
        self.assertIs(h.app.state, State.IDLE)

    def test_claude_error_is_reported_without_speaking(self):
        h = Harness(claude=FakeClaude(error=ClaudeError("Claude Code reported an error (error_max_turns)")))
        h.press(Event.PTT_DOWN, Event.PTT_UP)
        h.work()
        self.assertIs(h.app.state, State.ERROR)
        self.assertEqual(h.speaker.spoken, [])

    def test_recorder_that_cannot_start_does_not_get_stuck(self):
        h = Harness(recorder=FakeRecorder(fail_start=True))
        h.press(Event.PTT_DOWN)
        self.assertIs(h.app.state, State.ERROR)

    def test_new_press_while_speaking_stops_speech(self):
        h = Harness()
        h.press(Event.PTT_DOWN, Event.PTT_UP)
        fn, args = h.deferred.pop(0)
        fn(*args)
        h.app.run_pending()
        self.assertIs(h.app.state, State.SPEAKING)
        h.press(Event.PTT_DOWN)
        self.assertEqual(h.speaker.stops, 1)
        self.assertIs(h.app.state, State.LISTENING)

    def test_unplugging_mid_turn_aborts(self):
        h = Harness()
        h.press(Event.PTT_DOWN, Event.PTT_UP, Event.DISCONNECTED)
        self.assertIs(h.app.state, State.IDLE)
        h.work()
        self.assertEqual(h.speaker.spoken, [])

    def test_no_speech_mode_prints_only(self):
        h = Harness(config=replace(Config(), speak=False))
        h.press(Event.PTT_DOWN, Event.PTT_UP)
        h.work()
        self.assertEqual(h.speaker.spoken, [])
        self.assertIn("Claude: Two files changed.", h.lines)
        self.assertIs(h.app.state, State.IDLE)

    def test_heartbeat_repeats_the_state(self):
        h = Harness()
        h.wait(0)
        h.wait(1.0)
        self.assertEqual(h.link.sent, [State.IDLE, State.IDLE])

    def test_shutdown_leaves_the_device_idle(self):
        h = Harness()
        h.press(Event.PTT_DOWN)
        h.app.shutdown()
        self.assertEqual(h.link.sent[-1], State.IDLE)
        self.assertEqual(len(h.recorder.discarded), 1)


class ProcessRunnerTest(unittest.TestCase):
    def test_returns_output(self):
        out = ProcessRunner().run([sys.executable, "-c", "import sys; print(sys.stdin.read().upper())"], input_text="hi", timeout_s=10)
        self.assertEqual(out.stdout.strip(), "HI")

    def test_reports_failures_and_missing_programs(self):
        with self.assertRaises(ProcessFailed):
            ProcessRunner().run([sys.executable, "-c", "import sys; sys.exit(3)"], timeout_s=10)
        with self.assertRaises(ProcessFailed):
            ProcessRunner().run(["definitely-not-a-real-program"], timeout_s=10)

    def test_times_out(self):
        with self.assertRaises(ProcessFailed):
            ProcessRunner().run([sys.executable, "-c", "import time; time.sleep(5)"], timeout_s=0.2)

    def test_cancel_stops_a_running_process(self):
        runner = ProcessRunner()
        threading.Timer(0.2, runner.cancel).start()
        with self.assertRaises(Cancelled):
            runner.run([sys.executable, "-c", "import time; time.sleep(5)"], timeout_s=10)
        with self.assertRaises(Cancelled):
            runner.run([sys.executable, "-c", "print(1)"], timeout_s=10)


class KeyboardLinkTest(unittest.TestCase):
    def test_enter_toggles_talk_and_c_cancels(self):
        commands = iter(["", "", "c", "q"])
        events = []
        quit_called = threading.Event()
        link = KeyboardLink(read_line=lambda: next(commands), out=lambda _s: None)
        link.start(events.append, quit_called.set)
        self.assertTrue(quit_called.wait(2))
        self.assertEqual(events, [Event.PTT_DOWN, Event.PTT_UP, Event.CANCEL])


if __name__ == "__main__":
    unittest.main()
