# visionai-enhanced
Enhanced VisionAI with code analysis, runtime detection, and intelligent extraction capabilities

## Serial neural hardware bridge

`src/neural_hardware_bridge.py` provides an optional Python bridge for devices
that emit one newline-delimited CSV sample per serial line. Install `pyserial`
with `pip install pyserial`, then pass the bridge the queue consumed by your
signal-processing loop and the device port:

```python
import queue

from src.neural_hardware_bridge import NeuralHardwareBridge

samples = queue.Queue()
bridge = NeuralHardwareBridge(samples, port="COM3", baudrate=115200, channels=8)
bridge.start()

try:
    sample = samples.get()
finally:
    bridge.stop()
    bridge.join()
```

Each serial line must contain exactly the configured number of finite numeric
values, for example `0.12,-0.03,0.41,0.08,0.00,0.17,-0.09,0.22`. The bridge
uses a finite read timeout so `stop()` can shut down without closing the serial
port from another thread. Malformed samples and connection errors are surfaced
by the bridge thread rather than silently discarded.
