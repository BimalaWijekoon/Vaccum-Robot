# VacBot Firmware (PlatformIO)

This is the proper PlatformIO project structure for the VacBot ESP32-S3 firmware.

## Project Structure

```
firmware/
├── platformio.ini       # PlatformIO configuration (board, libraries, settings)
├── src/
│   └── main.cpp        # Main firmware code (formerly vacbot_firmware.ino)
├── include/            # Header files (if needed)
├── lib/                # Custom libraries (if needed)
└── README.md           # This file
```

## Why This Structure?

PlatformIO **requires** this specific folder layout to work properly:
- `src/` — Must contain the main sketch file (`main.cpp`)
- `platformio.ini` — Configuration file with board settings and dependencies
- `include/` — For C/C++ header files
- `lib/` — For custom libraries

**Arduino IDE doesn't care about this structure**, which is why it worked fine before but PlatformIO was struggling.

## Building & Uploading

### Using VS Code with PlatformIO extension:

1. **Open the `firmware` folder** in VS Code (or the entire Vaccum-Robot workspace)
2. **Build:** `Ctrl+Alt+B` or click "Build" in the PlatformIO toolbar
3. **Upload:** `Ctrl+Alt+U` or click "Upload"
4. **Monitor:** `Ctrl+Alt+J` or click "Monitor" to see serial output

### Using command line:

```bash
cd firmware/

# Build
platformio run -e esp32-s3-devkitc-1

# Upload
platformio run -e esp32-s3-devkitc-1 --target upload

# Monitor serial output
platformio device monitor

# Clean build
platformio run -e esp32-s3-devkitc-1 --target clean
```

## Configuration

Edit `platformio.ini` to:
- Change **upload port**: Uncomment and set `upload_port = COM3` (or your port)
- Change **monitor port**: Uncomment and set `monitor_port = COM3`
- Adjust **upload speed**: Modify `upload_speed = 921600`

## Troubleshooting

### Board not detected?
```bash
platformio device list
```

### Still getting errors?
- Ensure the ESP32-S3 board drivers are installed
- Try: `platformio update`
- Check USB cable and port selection

### Arduino IDE still works but PlatformIO fails?
- This is usually a port or board selection issue
- Run `platformio device list` and update `platformio.ini` with your port

## More Info

- [PlatformIO Documentation](https://docs.platformio.org/)
- [ESP32-S3 Board Info](https://docs.platformio.org/en/latest/boards/espressif32/esp32-s3-devkitc-1.html)
