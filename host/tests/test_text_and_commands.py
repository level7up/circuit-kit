import json
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

from claude_voice_terminal.audio_input import clean_transcript
from claude_voice_terminal.claude_adapter import ClaudeError, build_command, parse_reply
from claude_voice_terminal.config import Config, ConfigError, fill, load_config
from claude_voice_terminal.speech_output import TRUNCATED_SUFFIX, say_command, speakable


class SpeakableTest(unittest.TestCase):
    def test_strips_markdown_and_code(self):
        text = "## Fix\nUse `step()` in **simulate.ts**:\n```ts\nconst x = 1\n```\nSee [docs](https://x.y)."
        spoken = speakable(text, 600)
        self.assertNotIn("```", spoken)
        self.assertNotIn("const x", spoken)
        self.assertNotIn("**", spoken)
        self.assertIn("step()", spoken)
        self.assertIn("See docs.", spoken)

    def test_short_text_is_unchanged(self):
        self.assertEqual(speakable("It works.", 600), "It works.")

    def test_long_text_is_cut_at_a_sentence(self):
        text = " ".join(["This is sentence number %d." % i for i in range(100)])
        spoken = speakable(text, 200)
        self.assertTrue(spoken.endswith("." + TRUNCATED_SUFFIX))
        self.assertLessEqual(len(spoken), 200 + len(TRUNCATED_SUFFIX))

    def test_unclosed_code_block_is_dropped(self):
        self.assertNotIn("secret", speakable("Here:\n```\nsecret code", 600))


class TranscriptTest(unittest.TestCase):
    def test_removes_non_speech_tags(self):
        self.assertEqual(clean_transcript(" [BLANK_AUDIO]\n hello  there (music)\n"), "hello there")
        self.assertEqual(clean_transcript("[BLANK_AUDIO]\n"), "")


class ClaudeCommandTest(unittest.TestCase):
    def test_print_mode_without_permission_flags(self):
        cmd = build_command(Config())
        self.assertEqual(cmd[:4], ["claude", "-p", "--output-format", "json"])
        joined = " ".join(cmd)
        for flag in ("--dangerously-skip-permissions", "--permission-mode", "--allowedTools", "--allowed-tools"):
            self.assertNotIn(flag, joined)

    def test_resumes_its_own_session_only(self):
        self.assertNotIn("--resume", build_command(Config()))
        self.assertNotIn("--continue", build_command(Config(), "abc"))
        cmd = build_command(Config(), "abc")
        self.assertEqual(cmd[cmd.index("--resume") + 1], "abc")
        self.assertNotIn("--resume", build_command(replace(Config(), continue_conversation=False), "abc"))

    def test_parses_a_successful_reply(self):
        reply = parse_reply(json.dumps({"type": "result", "subtype": "success", "is_error": False, "result": " Done. ", "session_id": "s1"}))
        self.assertEqual((reply.text, reply.session_id), ("Done.", "s1"))

    def test_rejects_errors_and_garbage(self):
        for stdout in ["not json", "[]", json.dumps({"subtype": "error_max_turns", "is_error": True}), json.dumps({"subtype": "success", "result": "  "})]:
            with self.assertRaises(ClaudeError, msg=stdout):
                parse_reply(stdout)

    def test_say_reads_text_from_stdin(self):
        self.assertEqual(say_command(Config()), ["say", "-f", "-"])
        self.assertEqual(say_command(replace(Config(), voice="Majed", rate=180)), ["say", "-v", "Majed", "-r", "180", "-f", "-"])


class ConfigTest(unittest.TestCase):
    def write(self, text: str) -> Path:
        folder = Path(tempfile.mkdtemp())
        path = folder / "config.toml"
        path.write_text(text)
        return path

    def test_defaults_without_a_file(self):
        self.assertEqual(load_config(None, {}).baud, 115200)

    def test_file_and_overrides(self):
        path = self.write('speak = false\nmax_spoken_chars = 300\nclaude_timeout_s = 60\nrecord_command = ["rec", "{wav}"]\n')
        config = load_config(path, {"project_dir": "/tmp", "voice": None})
        self.assertFalse(config.speak)
        self.assertEqual(config.max_spoken_chars, 300)
        self.assertEqual(config.claude_timeout_s, 60.0)
        self.assertEqual(config.record_command, ("rec", "{wav}"))
        self.assertEqual(config.project_dir, "/tmp")

    def test_rejects_unknown_and_badly_typed_settings(self):
        for text in ['nope = 1\n', 'speak = "yes"\n', 'baud = true\n', 'record_command = "ffmpeg"\n', 'speak = \n']:
            with self.assertRaises(ConfigError, msg=text):
                load_config(self.write(text))

    def test_missing_explicit_file_is_an_error(self):
        with self.assertRaises(ConfigError):
            load_config(Path("/nonexistent/config.toml"))

    def test_fill_placeholders(self):
        self.assertEqual(fill(["-i", ":{microphone}", "{wav}"], {"microphone": "0", "wav": "/t/a.wav"}), ["-i", ":0", "/t/a.wav"])
        with self.assertRaises(ConfigError):
            fill(["{nope}"], {})


if __name__ == "__main__":
    unittest.main()
