# AGENTS.md - Project Context & Findings

## Architecture Decisions

- **High-level wrapper philosophy**: The library provides TypeScript wrappers
  around GTK4/libadwaita FFI calls. User-facing code should never interact with
  raw pointers (`Deno.PointerValue`) or low-level FFI details.

- **Signal handling approach**: Instead of exposing raw FFI callback arguments,
  we provide type-safe helper methods like `onClick()`, `onRowActivated()`,
  `onSelectedChanged()`, etc. These methods convert raw pointers to proper
  wrapper objects and extract relevant data (like indices) before passing to
  callbacks.

- **GObject.ptr marked as internal**: While `ptr` needs to be public for
  internal use between classes, it's documented with `@internal` JSDoc to
  indicate it's not part of the public API.

- **Module naming convention**: Following established GTK binding conventions
  (gtk-rs, PyGObject):
  - GTK versions are in module names (`gtk3.ts`, `gtk4.ts`) - incompatible APIs
  - Foundational libraries have no version (`adw.ts`, `gio.ts`, `glib.ts`,
    `gobject.ts`, `cairo.ts`) - stable APIs that rarely break

- **Enums colocated with widgets**: Enums and constants are exported from the
  same module as the widgets that use them (no separate enums module):
  - `gtk4.ts` exports `Orientation`, `Align`, `SelectionMode`,
    `ApplicationFlags`, `License`, etc.
  - `adw.ts` exports `ColorScheme`, `ResponseAppearance`
  - `glib.ts` exports `Priority`, `UnixSignal`
  - `gobject.ts` exports `G_TYPE_*` constants

## Key File Locations

### High-Level Wrappers (Public API)

- `src/high/gtk4.ts` - GTK4 wrapper classes (GObject, Widget, Application,
  Window, Button, Label, Box, Entry, ListBox, etc.)
- `src/high/gtk3.ts` - GTK3 wrapper classes (for legacy/app indicator support)
- `src/high/adw.ts` - Libadwaita wrappers (AdwWindow, HeaderBar, AboutDialog,
  PreferencesWindow, ActionRow, MessageDialog, StyleManager, etc.)
- `src/high/gio.ts` - GIO wrappers (Menu, SimpleAction, etc.)
- `src/high/glib.ts` - GLib wrappers (MainLoop, etc.)
- `src/high/gobject.ts` - GObject base class with signal handling
- `src/high/cairo.ts` - Cairo graphics context wrapper
- `src/high/eventloop.ts` - Event loop for async/await integration
- `src/high/app_indicator.ts` - App indicator wrapper (Linux system tray)

### Low-Level FFI Layer (Internal)

- `src/low/gtk4.ts` - GTK4 FFI symbol definitions
- `src/low/gtk3.ts` - GTK3 FFI symbol definitions
- `src/low/adw.ts` - Libadwaita FFI symbol definitions
- `src/low/gio.ts` - GIO FFI symbol definitions
- `src/low/glib.ts` - GLib FFI symbol definitions
- `src/low/gobject.ts` - GObject FFI symbol definitions
- `src/low/cairo.ts` - Cairo FFI symbol definitions
- `src/low/app_indicator.ts` - App indicator FFI (Linux system tray)
- `src/low/utils.ts` - Utility functions (cstr, readCStr)

### Library Loading

- `src/low/paths/mod.ts` - Platform detection and library path export
- `src/low/paths/findLib.ts` - Library search utility
- `src/low/paths/types.ts` - Type definitions for library paths
- `src/low/paths/platform/unix.ts` - Linux library paths
- `src/low/paths/platform/darwin.ts` - macOS library paths
- `src/low/paths/platform/windows.ts` - Windows library paths

### Examples

- `examples/simple.ts` - Minimal hello world example
- `examples/widgets-demo.ts` - Comprehensive widget demo
- `examples/async-demo.ts` - Async/await with EventLoop
- `examples/checkbutton-demo.ts` - Checkbox widget demo

## Library Version Suffixes

The library loading uses these soname versions:

| Library | Linux (.so)         | macOS (.dylib)       | Windows (.dll)       |
| ------- | ------------------- | -------------------- | -------------------- |
| GTK4    | libgtk-4.so.1       | libgtk-4.1.dylib     | libgtk-4-1.dll       |
| GTK3    | libgtk-3.so.0       | libgtk-3.0.dylib     | libgtk-3-0.dll       |
| Adwaita | libadwaita-1.so.0   | libadwaita-1.dylib   | libadwaita-1-0.dll   |
| GLib    | libglib-2.0.so.0    | libglib-2.0.dylib    | libglib-2.0-0.dll    |
| GObject | libgobject-2.0.so.0 | libgobject-2.0.dylib | libgobject-2.0-0.dll |
| GIO     | libgio-2.0.so.0     | libgio-2.0.dylib     | libgio-2.0-0.dll     |
| Cairo   | libcairo.so.2       | libcairo.2.dylib     | libcairo-2.dll       |

## Widget-Specific Signal Helpers

- `Button.onClick()` - Clean callback with no arguments
- `ListBox.onRowActivated(row, index)` - Provides both row object and index
- `DropDown.onSelectedChanged(index)` - Provides selected index directly
- `Entry.onActivate()` and `onChanged()` - Simple event handlers
- `Application.onActivate()`, `onShutdown()`, `onStartup()` - Lifecycle events
- `Window.onCloseRequest()`, `onDestroy()` - Window lifecycle

## Non-obvious Behaviors

- **Signal callback parameters**: GTK signal callbacks receive the object
  pointer as the first argument, followed by signal-specific arguments. The
  wrapper's `connect()` method needs to accept multiple pointer parameters even
  if not all are used.

- **Button constructor**: Made label optional (defaults to null) to support
  creating buttons without labels initially.

- **MessageDialog inheritance**: Fixed to extend `Window` (not `Widget`) since
  AdwMessageDialog extends GtkWindow.

- **Adwaita auto-initialization**: The `src/low/adw.ts` FFI module calls
  `adw_init()` automatically when loaded, with a guard against double
  initialization.

## Current State

✅ Working:

- High-level signal connections for common widgets
- Type-safe callbacks without pointer exposure
- ListBox row activation with automatic index resolution
- All major GTK4 and Adwaita widgets wrapped
- Cross-platform library loading (Linux, macOS, Windows)
- EventLoop for async/await integration
- Headless widget testing via signal emission

## Integration Points

- FFI symbols are defined in `src/low/*.ts` and accessed via `gtk4.symbols.*`,
  `gobject.symbols.*`, etc.
- All wrapper classes extend either `GObject` or one of its subclasses
  (`Widget`, `Window`, `Application`)
- The `connect()` method is the foundation for all signal handling, with
  convenience methods built on top
- Platform-specific library paths are resolved at module load time via
  `src/low/paths/mod.ts`
