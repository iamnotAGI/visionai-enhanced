import queue
import time
import unittest

from src.neural_hardware_bridge import NeuralHardwareBridge


class FakeSerial:
    def __init__(self, lines):
        self.lines = list(lines)
        self.closed = False

    def readline(self):
        if self.lines:
            return self.lines.pop(0)
        time.sleep(0.005)
        return b""

    def close(self):
        self.closed = True


class NeuralHardwareBridgeTests(unittest.TestCase):
    def test_parse_csv_sample(self):
        self.assertEqual(
            NeuralHardwareBridge.parse_line(b"0.5, -1, 2.25\r\n", channels=3),
            [0.5, -1.0, 2.25],
        )

    def test_parse_blank_line(self):
        self.assertIsNone(NeuralHardwareBridge.parse_line(b"\r\n", channels=2))

    def test_reject_wrong_channel_count(self):
        with self.assertRaisesRegex(ValueError, "Expected 2 channel values"):
            NeuralHardwareBridge.parse_line(b"1,2,3\n", channels=2)

    def test_reject_invalid_or_non_finite_values(self):
        for line in (b"1,nope\n", b"1,nan\n", b"1,inf\n"):
            with self.subTest(line=line), self.assertRaises(ValueError):
                NeuralHardwareBridge.parse_line(line, channels=2)

    def test_reads_samples_and_closes_connection_on_stop(self):
        serial_connection = FakeSerial([b"1.25,-0.5\n"])
        data_queue = queue.Queue()
        bridge = NeuralHardwareBridge(
            data_queue,
            port="COM1",
            channels=2,
            serial_factory=lambda **kwargs: serial_connection,
        )

        bridge.start()
        self.assertEqual(data_queue.get(timeout=1), [1.25, -0.5])
        bridge.stop()
        bridge.join(timeout=1)

        self.assertFalse(bridge.is_alive())
        self.assertTrue(serial_connection.closed)


if __name__ == "__main__":
    unittest.main()
