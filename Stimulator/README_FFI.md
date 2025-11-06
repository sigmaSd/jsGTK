# Stimulator - FFI Version

This is a port of Stimulator to use native FFI GTK bindings (`gtk-ffi.ts`) instead of Python-based bindings (`deno-gtk-py`).

## What Changed?

The application has been ported from using `deno-gtk-py` (Python GTK bindings) to `gtk-ffi.ts` (native FFI bindings). This provides:

- ✅ Better performance (no Python runtime)
- ✅ Lower memory usage
- ✅ Faster startup time
- ✅ Native Deno FFI integration
- ⚠️ Some features not yet implemented (see below)

## Requirements

- Deno 1.38+ with `--unstable-ffi` support
- GTK4 (libgtk-4.so.1)
- Libadwaita (libadwaita-1.so.0)
- GLib (libglib-2.0.so.0)
- GObject (libgobject-2.0.so.0)
- GIO (libgio-2.0.so.0)

On Ubuntu/Debian:
```bash
sudo apt install libgtk-4-1 libadwaita-1-0 libglib2.0-0
```

On Fedora:
```bash
sudo dnf install gtk4 libadwaita glib2
```

On Arch:
```bash
sudo pacman -S gtk4 libadwaita glib2
```

## Running

```bash
cd Stimulator
deno run --allow-ffi --allow-env --allow-read=./src/locales --unstable-ffi src/main.ts
```

Or make it executable:
```bash
chmod +x src/main.ts
./src/main.ts
```

## Features Status

### ✅ Implemented
- Main application window with Adwaita styling
- Suspend inhibition (prevent system sleep)
- Idle inhibition (prevent screen blanking/locking)
- Auto-disable timers (5min, 15min, 30min, 1hr, 2hr, 4hr, Never)
- Preferences window with:
  - Theme selection (System/Light/Dark)
  - Behavior on closing
  - Timer duration settings
- State persistence using localStorage
- About dialog
- Menu system with actions
- Keyboard shortcuts (Ctrl+Q quit, Ctrl+W close, Ctrl+, preferences)

### ⚠️ Partially Implemented
- CSS styling (code present but needs full integration)
- Color scheme management (works but may need refinement)

### ❌ Not Yet Implemented
- **System Tray/Indicator**: The "Run in Background" mode doesn't show a tray icon
  - Workaround: A warning is logged, app works but won't minimize to tray
  - Requires AppIndicator3 or StatusNotifier FFI bindings
- **Keyboard Shortcuts Window**: Help dialog doesn't display
  - Workaround: Console message shown instead
  - Requires GtkShortcutsWindow construction
- **DBus ScreenSaver Proxy**: May not work perfectly on all desktop environments
  - Workaround: Uses standard GApplication inhibit API
  - May have issues on KDE (KDE requires specific DBus API)
- **Unix Signal Handling**: SIGINT (Ctrl+C) handling
  - Workaround: Close window normally or use system methods

## Known Issues

1. **No Tray Icon**: If you set "Run in Background" behavior, the app won't show in the system tray. It will still prevent sleep/idle, but you won't see an indicator. You'll need to launch the app again to show the window.

2. **KDE Compatibility**: The idle inhibition may not work as expected on KDE Plasma because it requires a specific DBus interface (`org.freedesktop.ScreenSaver`) that isn't fully implemented yet.

3. **UI Files Not Loaded**: The `.ui` files in `src/ui/` are not used in this version. The UI is constructed programmatically instead.

4. **Shortcuts Window**: Pressing the "Keyboard Shortcuts" menu item shows a console message instead of opening a help window.

## Differences from Python Version

### Architecture
- **Before**: Python GTK bindings via `deno-gtk-py`
- **After**: Direct FFI calls to GTK C libraries

### UI Construction
- **Before**: Loaded from `.ui` XML files using GtkBuilder
- **After**: Constructed programmatically using FFI

### Timers
- **Before**: `GLib.timeout_add_seconds()`
- **After**: JavaScript `setInterval()`

### String Handling
- **Before**: Automatic string conversion
- **After**: Manual null-terminated string encoding: `new TextEncoder().encode("text\0")`

### Widget Creation
```typescript
// Before (deno-gtk-py)
const button = Gtk.Button.new_with_label("Click me");

// After (gtk-ffi.ts)
const button = new Button("Click me");
```

## Development

### Project Structure
```
Stimulator/
├── src/
│   ├── main.ts           # Main application (PORTED)
│   ├── pref-win.ts       # Preferences window (PORTED)
│   ├── consts.ts         # Constants and i18n
│   ├── i18n.ts           # Internationalization
│   ├── indicator/
│   │   ├── indicator_api.ts  # Tray icon API (STUB)
│   │   └── ...
│   └── ui/               # UI files (not used in FFI version)
├── ../../gtk-ffi.ts      # FFI bindings (in parent directory)
└── PORTING_NOTES.md      # Detailed porting documentation
```

### Adding Missing Features

See `PORTING_NOTES.md` for detailed information on:
- What was changed during porting
- API mapping reference
- Future work needed
- Implementation notes

## Testing

Basic testing checklist:
```bash
# Start the app
deno run --allow-ffi --allow-env --allow-read=./src/locales --unstable-ffi src/main.ts

# Test suspend inhibition
1. Toggle "Disable Automatic Suspending" ON
2. Check that timer appears (if set)
3. Leave computer idle - it should not suspend
4. Toggle OFF - normal suspend behavior should resume

# Test idle inhibition  
1. Toggle "Disable Screen Blanking and Locking" ON
2. Leave computer idle - screen should not blank or lock
3. Toggle OFF - normal idle behavior should resume

# Test preferences
1. Open menu → Preferences
2. Change theme - should apply immediately
3. Change timers - should take effect on next toggle
4. Close and reopen app - settings should persist

# Test about dialog
1. Open menu → About Stimulator
2. Should show version, developer info, etc.
```

## Contributing

If you'd like to help complete the FFI port:

1. **Add Indicator Support**: Implement AppIndicator3 FFI bindings
2. **Implement Shortcuts Window**: Build GtkShortcutsWindow
3. **Add DBus Support**: Implement ScreenSaver proxy
4. **Complete CSS Loading**: Attach CSS provider to display
5. **Add Signal Handling**: Unix signal support for clean shutdown

See `PORTING_NOTES.md` for detailed guidance.

## Troubleshooting

### App won't start
```
Error: Could not open library
```
**Solution**: Install GTK4 and Libadwaita libraries (see Requirements)

### Timer doesn't update
The timer uses JavaScript `setInterval()` which updates every minute. Wait up to 60 seconds to see the first update.

### Settings don't persist
The app uses `localStorage` which requires a working Deno environment. Make sure you're running with proper permissions.

### Idle inhibition doesn't work
Try toggling suspend inhibition as well. Some desktop environments require both to be active.

## License

Same as original Stimulator (MIT)

## Credits

- Original Stimulator: [Bedis Nbiba](https://github.com/sigmaSd/stimulator)
- FFI Port: Ported to use native Deno FFI bindings
- GTK FFI Bindings: Based on `gtk-ffi.ts`
