import unittest

from claude_voice_terminal.protocol import MAX_LINE_BYTES, DeviceLine, LineAssembler, parse_device_line, state_line
from claude_voice_terminal.serial_device import ESPRESSIF_VID, PortInfo, choose_port
from claude_voice_terminal.state_machine import State


class ParseDeviceLineTest(unittest.TestCase):
    def test_accepts_known_lines(self):
        self.assertIs(parse_device_line(b"BTN:PTT_DOWN\n"), DeviceLine.PTT_DOWN)
        self.assertIs(parse_device_line(b"BTN:PTT_UP\r\n"), DeviceLine.PTT_UP)
        self.assertIs(parse_device_line(b"BTN:CANCEL"), DeviceLine.CANCEL)
        self.assertIs(parse_device_line(b"DEV:READY\n"), DeviceLine.READY)

    def test_rejects_everything_else(self):
        for raw in [b"", b"\n", b"btn:ptt_down\n", b"BTN:PTT_DOWN \n", b"rm -rf /\n", b"\xff\xfe\n", b"BTN:\x00\n", b"A" * (MAX_LINE_BYTES + 1)]:
            self.assertIsNone(parse_device_line(raw), raw)

    def test_state_lines(self):
        self.assertEqual(state_line(State.LISTENING), b"STATE:LISTENING\n")
        self.assertEqual(state_line(State.CANCELLED), b"STATE:IDLE\n")
        for state in State:
            self.assertLessEqual(len(state_line(state)), 24 + 1)


class LineAssemblerTest(unittest.TestCase):
    def test_joins_chunks_into_lines(self):
        a = LineAssembler()
        self.assertEqual(a.feed(b"BTN:PT"), [])
        self.assertEqual(a.feed(b"T_DOWN\nBTN:PTT_UP\n"), [b"BTN:PTT_DOWN", b"BTN:PTT_UP"])

    def test_flags_overlong_lines_and_recovers(self):
        a = LineAssembler()
        self.assertEqual(a.feed(b"X" * 200 + b"\nDEV:READY\n"), [None, b"DEV:READY"])

    def test_skips_blank_lines(self):
        self.assertEqual(LineAssembler().feed(b"\n\r\n\n"), [])


class ChoosePortTest(unittest.TestCase):
    def test_explicit_port_wins(self):
        self.assertEqual(choose_port([], "/dev/cu.mine"), "/dev/cu.mine")

    def test_prefers_espressif_native_usb(self):
        ports = [
            PortInfo("/dev/cu.Bluetooth-Incoming-Port", "", None),
            PortInfo("/dev/cu.usbserial-1", "CP2102", 0x10C4),
            PortInfo("/dev/cu.usbmodem1101", "USB JTAG/serial debug unit", ESPRESSIF_VID),
        ]
        self.assertEqual(choose_port(ports), "/dev/cu.usbmodem1101")

    def test_ignores_unrelated_ports(self):
        self.assertIsNone(choose_port([PortInfo("/dev/cu.Bluetooth-Incoming-Port", "", None)]))


if __name__ == "__main__":
    unittest.main()
