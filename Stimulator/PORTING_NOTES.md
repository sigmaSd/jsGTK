# Porting Notes: deno-gtk-py to gtk-ffi.ts

This document describes the changes made to port Stimulator from `deno-gtk-py` (Python-based GTK bindings) to `gtk-ffi.ts` (native FFI-based GTK bindings).

## Summary

The main application files have been ported to use native FFI bindings instead of Python-based GTK bindings. This provides better performance and removes the Python dependency.

## Files Modified

### 1. `src/main.ts`
**Major Changes:**
- Removed Python imports (`python`, `gi`, etc.)
- Replaced with direct FFI imports from `gtk-ffi.ts`
- Replaced `Gtk.Builder` UI loading with programmatic UI construction
- Updated all GTK method calls to use FFI-based API:
  - `widget.set_property()` → `widget.setProperty()`
  - `widget.get_property()` → `widget.getProperty()`
  - `widget.connect()` → `widget.connect()` (same API)
- Replaced GLib timer functions:
  - `GLib.timeout_add_seconds()` → `setInterval()`
  - `GLib.source_remove()` → `clearInterval()`
- Updated notification API to use FFI-based gio functions
- Removed UI file loading (stimulator.ui) in favor of programmatic construction

**Key API Differences:**
```typescript
// Old (deno-gtk-py)
const button = builder.get_object("button");
button.set_active(true);
button.connect("clicked", callback);

// New (gtk-ffi.ts)
const button = new Widget(gobject.g_object_new(...));
button.setProperty("active", true);
button.connect("clicked", callback);
```

### 2. `src/pref-win.ts`
**Major Changes:**
- Removed Python imports
- Replaced UI file loading with programmatic construction
- Created AdwPreferencesWindow, AdwPreferencesPage, and AdwPreferencesGroup manually
- Updated AdwComboRow usage to work with FFI API
- Converted from using builder pattern to direct object creation

**Key Changes:**
```typescript
// Old (deno-gtk-py)
const builder = Gtk.Builder();
builder.add_from_string(preferencesUi);
const row = builder.get_object("themeRow");

// New (gtk-ffi.ts)
const row = new Widget(
  gobject.g_object_new(
    gobject.g_type_from_name(new TextEncoder().encode("AdwComboRow\0"))!,
    null,
  )
);
```

### 3. `src/indicator/indicator_api.ts`
**Major Changes:**
- Simplified to a stub implementation
- Full indicator/tray icon support requires additional FFI bindings
- Added warnings to inform users that tray icon is not yet supported
- Preserved API surface for compatibility

## Features Implemented

✅ Main window with GTK4/Adwaita styling
✅ Suspend inhibition
✅ Idle inhibition  
✅ Timer functionality for auto-disable
✅ Preferences window
✅ Theme switching (System/Light/Dark)
✅ Behavior settings
✅ Timer duration settings
✅ State persistence (localStorage)
✅ About dialog
✅ Menu and actions

## Features Not Yet Implemented

❌ **UI Builder Support**: The FFI version doesn't load .ui files yet
  - Workaround: UI is constructed programmatically
  - Impact: More verbose code, but same functionality

❌ **System Tray/Indicator Support**: AppIndicator3 or StatusNotifier FFI bindings needed
  - Workaround: Stub implementation that logs warnings
  - Impact: "Run in Background" mode won't show tray icon

❌ **Keyboard Shortcuts Window**: Requires GtkShortcutsWindow construction
  - Workaround: Menu item logs a message
  - Impact: Shortcuts still work, but help window doesn't display

❌ **DBus ScreenSaver Proxy**: Requires additional DBus FFI bindings
  - Workaround: Uses GApplication inhibit instead
  - Impact: May not work perfectly on all desktop environments (especially KDE)

❌ **CSS Provider for Display**: Partially implemented
  - Workaround: CSS loading code present but needs display attachment
  - Impact: Custom CSS styling may not apply

❌ **Unix Signal Handling**: SIGINT handling not implemented
  - Workaround: Use Ctrl+C or close window normally
  - Impact: Signal-based shutdown not available

## API Mapping Reference

### Widget Creation
```typescript
// deno-gtk-py
const widget = Gtk.SomeWidget()

// gtk-ffi.ts
const widget = new Widget(
  gobject.g_object_new(
    gobject.g_type_from_name(new TextEncoder().encode("GtkSomeWidget\0"))!,
    null
  )
)
```

### Property Access
```typescript
// deno-gtk-py
widget.set_property("name", value)
const val = widget.get_property("name").valueOf()

// gtk-ffi.ts  
widget.setProperty("name", value)
const val = widget.getProperty("name")
```

### Signal Connection
```typescript
// deno-gtk-py (similar in both)
widget.connect("signal-name", callback)

// gtk-ffi.ts
widget.connect("signal-name", callback)
```

### String Encoding
All C strings must be null-terminated:
```typescript
// gtk-ffi.ts
new TextEncoder().encode("string\0")
```

## Testing Checklist

- [ ] Application starts without errors
- [ ] Main window displays correctly
- [ ] Suspend toggle works and inhibits system suspend
- [ ] Idle toggle works and inhibits screen blanking
- [ ] Timers countdown and auto-disable at zero
- [ ] Preferences window opens and settings persist
- [ ] Theme changes apply immediately
- [ ] Behavior changes take effect
- [ ] Timer duration changes work
- [ ] About dialog displays correctly
- [ ] Application quits cleanly

## Future Work

1. **Implement UI Builder Support**: Add GTK builder FFI functions to load .ui files
2. **Add Indicator Support**: Implement AppIndicator3 or StatusNotifier FFI bindings
3. **Complete DBus Support**: Add ScreenSaver proxy for better KDE compatibility
4. **Implement Shortcuts Window**: Build GtkShortcutsWindow programmatically
5. **Complete CSS Loading**: Attach CSS provider to display
6. **Add Signal Handling**: Implement unix signal handlers for graceful shutdown

## Known Issues

1. Indicator/"Run in Background" mode doesn't show tray icon (logs warning instead)
2. Shortcuts window shows console message instead of opening
3. Some Adwaita-specific features may need additional FFI function definitions
4. DBus ScreenSaver proxy not available (may affect idle inhibit on some DEs)

## Notes for Developers

- All C function calls require null-terminated strings
- Memory management is handled by GObject reference counting
- Widget pointers must be kept alive while in use
- Use `gobject.g_object_new()` for creating GObject instances
- Check function symbol availability before calling (many are optional)
- FFI callbacks must match the exact signature expected by GTK

## Performance Considerations

The FFI version should be:
- Faster startup (no Python initialization)
- Lower memory usage (no Python runtime)
- More responsive (direct C calls vs Python bridge)

## Migration Path for Other Projects

To port another deno-gtk-py project to gtk-ffi.ts:

1. Replace imports: `deno-gtk-py` → `gtk-ffi.ts`
2. Remove Python-specific code (`python.import()`, `gi.require_version()`)
3. Update widget creation to use `gobject.g_object_new()`
4. Convert property access to `setProperty()`/`getProperty()`
5. Replace timer functions with JavaScript equivalents
6. Add null terminators to all C strings
7. Replace UI builder with programmatic construction (or add builder support)
8. Test thoroughly - some APIs have subtle differences

## Resources

- GTK4 Documentation: https://docs.gtk.org/gtk4/
- Libadwaita Documentation: https://gnome.pages.gitlab.gnome.org/libadwaita/doc/
- GObject API Reference: https://docs.gtk.org/gobject/
- Deno FFI Documentation: https://deno.land/manual/runtime/ffi_api