"""Read newline-delimited CSV samples from a serial-connected neural device."""

import csv
import math
import queue
import threading
from typing import Callable, List, Optional


class NeuralHardwareBridge(threading.Thread):
    """Read one CSV sample per serial line and place it on ``data_queue``.

    Each line must contain exactly ``channels`` finite numeric values, for
    example: ``0.12,-0.03,0.41,0.08,0.00,0.17,-0.09,0.22``.
    """

    def __init__(
        self,
        data_queue: queue.Queue,
        port: str,
        baudrate: int = 115200,
        channels: int = 8,
        read_timeout: float = 0.1,
        serial_factory: Optional[Callable] = None,
    ):
        super().__init__()
        if not port:
            raise ValueError("A serial port name is required.")
        if baudrate <= 0:
            raise ValueError("baudrate must be greater than zero.")
        if channels <= 0:
            raise ValueError("channels must be greater than zero.")
        if read_timeout <= 0:
            raise ValueError("read_timeout must be greater than zero.")

        self.data_queue = data_queue
        self.port = port
        self.baudrate = baudrate
        self.channels = channels
        self.read_timeout = read_timeout
        self._serial_factory = serial_factory
        self._stop_event = threading.Event()

    @staticmethod
    def parse_line(raw_line: bytes, channels: int) -> Optional[List[float]]:
        """Parse one newline-delimited CSV sample; return ``None`` for blanks."""
        if isinstance(raw_line, bytes):
            text = raw_line.decode("ascii").strip()
        else:
            text = str(raw_line).strip()

        if not text:
            return None

        values = next(csv.reader([text]))
        if len(values) != channels:
            raise ValueError(
                "Expected {} channel values, received {}.".format(
                    channels, len(values)
                )
            )

        try:
            sample = [float(value.strip()) for value in values]
        except ValueError as error:
            raise ValueError("Serial sample contains a non-numeric value.") from error

        if not all(math.isfinite(value) for value in sample):
            raise ValueError("Serial sample values must be finite.")

        return sample

    def _open_serial_connection(self):
        if self._serial_factory is not None:
            return self._serial_factory(
                port=self.port,
                baudrate=self.baudrate,
                timeout=self.read_timeout,
            )

        try:
            import serial
        except ImportError as error:
            raise RuntimeError(
                "pyserial is required for serial hardware; install it with "
                "'pip install pyserial'."
            ) from error

        return serial.Serial(
            port=self.port,
            baudrate=self.baudrate,
            timeout=self.read_timeout,
        )

    def run(self):
        if self._stop_event.is_set():
            return

        connection = self._open_serial_connection()
        try:
            while not self._stop_event.is_set():
                raw_line = connection.readline()
                if not raw_line:
                    continue

                sample = self.parse_line(raw_line, self.channels)
                if sample is not None:
                    self.data_queue.put(sample)
        finally:
            connection.close()

    def stop(self):
        """Request shutdown; the configured serial read timeout bounds waiting."""
        self._stop_event.set()
