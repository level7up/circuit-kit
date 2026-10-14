# Claude Voice Terminal — macOS host

Push-to-talk front end for Claude Code. Hold the button on the ESP32-S3 (or press Enter in `--keyboard` mode), speak, release: the Mac records, transcribes locally, sends the text to `claude -p`, prints the reply and reads it aloud.

The firmware is in `../firmware/claude_voice_terminal/`; the build guide is the `claude-voice` kit in the web app (`?circuit=claude-voice`).

## Install

```bash
brew install ffmpeg whisper-cpp
mkdir -p ~/.cache/whisper
curl -L -o ~/.cache/whisper/ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
cd host
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
```

Claude Code must already be installed and signed in (`claude --version`, then `claude` once).

## Run

```bash
claude-voice-terminal --keyboard --project ~/code/my-project   # no hardware: Enter to talk
claude-voice-terminal --list-ports                              # find the board
claude-voice-terminal --project ~/code/my-project               # with the ESP32-S3
```

| Flag | Meaning |
|---|---|
| `--project DIR` | folder Claude Code works in |
| `--port PORT` | serial port; found automatically (Espressif VID `303a` first, then CH343/CP210x bridges) |
| `--keyboard` | Enter starts/stops talking, `c` cancels, `q` quits |
| `--no-speech` | print replies only |
| `--voice NAME` | macOS voice (`say -v ?`) |
| `--language CODE` | whisper language: `en`, `ar`, `auto` |
| `--config FILE` | settings file (default `~/.config/claude-voice-terminal/config.toml`) |
| `-v` | debug logging |

## Settings

Copy `config.example.toml` to `~/.config/claude-voice-terminal/config.toml`. Unknown keys and wrong types are rejected at start-up.

| Key | Default | |
|---|---|---|
| `project_dir` | `.` | |
| `port`, `baud` | auto, `115200` | |
| `continue_conversation` | `true` | later turns `--resume` the session this app started; your own Claude Code sessions are never touched |
| `claude_timeout_s` | `300` | |
| `spoken_style_prompt` | short plain-prose instruction | passed with `--append-system-prompt`; empty string disables it |
| `speak`, `voice`, `rate` | `true`, system, system | |
| `max_spoken_chars` | `600` | longer replies are cut at a sentence; the full reply is always printed |
| `microphone` | `0` | avfoundation audio index, see `ffmpeg -f avfoundation -list_devices true -i ""` |
| `max_recording_s` | `120` | ffmpeg stops by itself after this |
| `record_command`, `transcribe_command` | ffmpeg, whisper-cli | lists of arguments with `{wav}`, `{microphone}`, `{max_recording_s}`, `{model}`, `{language}` placeholders; no shell is involved |
| `whisper_model`, `language` | `~/.cache/whisper/ggml-base.bin`, `auto` | |
| `keep_audio` | `false` | recordings live in `$TMPDIR/claude-voice-*` and are deleted after transcription |

## Serial protocol

Newline-terminated ASCII at 115200 baud.

| Direction | Line |
|---|---|
| device → Mac | `BTN:PTT_DOWN`, `BTN:PTT_UP`, `BTN:CANCEL`, `DEV:READY` |
| Mac → device | `STATE:IDLE`, `STATE:LISTENING`, `STATE:PROCESSING`, `STATE:SPEAKING`, `STATE:ERROR` |

The Mac sends the state on every change and once a second. The device shows `NO HOST` (a short blink every 2 s) when nothing valid arrived for 3 s. Each side accepts only these exact lines, drops anything longer than 24 (device) / 32 (Mac) bytes or containing non-printable bytes, and never treats a line as a command.

## States

```
IDLE --PTT_DOWN--> LISTENING --PTT_UP--> PROCESSING --REPLY--> SPEAKING --SPOKEN--> IDLE
LISTENING / PROCESSING / SPEAKING --CANCEL--> CANCELLED --1 s--> IDLE
LISTENING / PROCESSING --FAILED--> ERROR --3 s--> IDLE
SPEAKING --PTT_DOWN--> LISTENING   (interrupts the reply)
any busy state --DISCONNECTED--> IDLE
```

Results from a cancelled turn carry an old turn number and are dropped.

## Safety and privacy

- Recording happens only while the button is held.
- `claude -p` runs with no permission flags. Tools that need approval are refused in print mode until you allow them in Claude Code's own settings; the voice path cannot grant anything.
- Logs contain state changes and prompt lengths, never prompts or replies. The terminal shows both so you can read what was heard and answered.
- No API key is used or stored; the firmware holds no secrets.

## Tests

```bash
npm run test:host            # from the repo root
npm run test:firmware:voice  # device.h on the Mac's compiler
```
