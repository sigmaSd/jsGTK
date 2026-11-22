# jsGTK

High-level TypeScript bindings for GTK4 and libadwaita using Deno/Bun/Node.js's
FFI (Foreign Function Interface).

**Available on JSR:** `@sigmasd/gtk`

<img width="850" height="750" alt="image" src="https://github.com/user-attachments/assets/30b186c9-6e1e-4c29-978f-50d11afff6c1" />

## Overview

This project provides idiomatic TypeScript wrappers around GTK4, GLib, GIO,
GObject, and libadwaita, allowing you to build native desktop applications using
Deno, Bun or Node.js. The library abstracts away low-level pointer manipulation
and provides a clean, object-oriented API similar to native GTK bindings in
other languages.

**Cross-platform support:** Works on Linux, macOS, and Windows (via MSYS2/GTK
for Windows).

## Installation

### Deno

In Deno you can import directly.

### Bun

For bun you need to install it first using `bunx jsr add @sigmasd/gtk`

### Node.js

For Node.js you need to install it using `npx jsr add @sigmasd/gtk`.
Additionally, you must install **koffi** as it is used for FFI in Node.js:
`npm install koffi@3`

Import from JSR in your project:

```typescript
// GTK4 widgets and enums
import {
  Align,
  Application,
  ApplicationFlags,
  ApplicationWindow,
  Box,
  Button,
  Label,
  Orientation,
} from "@sigmasd/gtk/gtk4";

// Adwaita widgets and enums
import {
  AboutDialog,
  AdwWindow,
  ColorScheme,
  HeaderBar,
} from "@sigmasd/gtk/adw";

// Event loop for async/await support
import { EventLoop } from "@sigmasd/gtk/eventloop";
```

## Quick Start

### Simple Example

```typescript
import {
  Application,
  ApplicationFlags,
  ApplicationWindow,
  Box,
  Button,
  Label,
  Orientation,
} from "@sigmasd/gtk/gtk4";

const app = new Application("com.example.HelloWorld", ApplicationFlags.NONE);

app.onActivate(() => {
  const win = new ApplicationWindow(app);
  win.setTitle("Hello World");
  win.setDefaultSize(400, 300);

  const box = new Box(Orientation.VERTICAL, 12);
  box.setMarginTop(24);
  box.setMarginBottom(24);
  box.setMarginStart(24);
  box.setMarginEnd(24);

  const label = new Label("Hello, GTK! 👋");
  box.append(label);

  const button = new Button("Click Me!");
  button.onClick(() => {
    label.setText("Button clicked! 🎉");
  });
  box.append(button);

  win.setChild(box);
  win.present();
});

app.run([]);
```

### Run the Example

```bash
# Using JSR
deno run --allow-ffi your-app.ts # or bun your-app.ts or node your-app.js

# Or from the repository
deno run --allow-ffi examples/simple.ts # or bun examples/simple.ts or node examples/simple.ts
```

## Examples

The repository's `examples/` directory contains sample applications:

- **`simple.ts`**: Minimal hello world example with button
- **`widgets-demo.ts`**: Comprehensive demo showing various widgets:
  - Buttons and event handling
  - Text entry fields
  - Dropdown menus
  - List boxes
  - Scrolled windows
  - Frames and containers
- **`async-demo.ts`**: Demonstrates async/await with EventLoop:
  - Fetching data from APIs
  - Using setTimeout and Promises
  - Running multiple async operations in parallel

Run examples: (can be run with Bun or Node.js as well)

```bash
# Simple example
deno run --allow-ffi examples/simple.ts

# Widgets demo
deno run --allow-ffi examples/widgets-demo.ts

# Async/await demo (requires network permission)
deno run --allow-ffi --allow-net examples/async-demo.ts
```

## Reusable Components

Since `@sigmasd/gtk` is a standard JSR package, you can build your own reusable
GTK components on top of it and publish them to JSR as well. These components
will automatically work across Deno, Bun, and Node.js.

### Example: `@sigmasd/gtk-editor`

A real-world example of a reusable component is the
[GtkEditor](https://jsr.io/@sigmasd/gtk-editor), which provides a full-featured
text editor with LSP support.

```typescript
import { GtkEditor } from "@sigmasd/gtk-editor";

const editor = new GtkEditor({
  lspEnabled: true,
  rootUri: "file:///path/to/project",
  fileUri: "file:///path/to/project/file.ts",
  initialText: "console.log('Hello GTK!');",
});
```

## Available Widgets

### Containers

- `Box` - Horizontal/vertical container
- `Frame` - Container with border and optional label
- `ScrolledWindow` - Scrollable container
- `ListBox` - Vertical list container, with sorting, filtering and a placeholder
- `Revealer` - Animated show/hide container
- `ToolbarView` - Adwaita toolbar view
- `OverlaySplitView` - Adwaita sidebar that overlays the content when narrow
- `ToastOverlay` - Adwaita container that shows `Toast` notifications

### Basic Widgets

- `Label` - Text display
- `Button` - Clickable button
- `Entry` - Text input field
- `DropDown` - Dropdown selection menu
- `MenuButton` - Button that opens a menu or popover
- `ToggleButton` - Button that stays pressed, optionally grouped like radios
- `SearchEntry` - Search field

### Windows

- `Window` - Basic window
- `ApplicationWindow` - Main application window
- `PreferencesWindow` - Adwaita preferences dialog
- `MessageDialog` - Adwaita message/confirmation dialog
- `AboutDialog` - About dialog

### Adwaita Widgets

- `HeaderBar` - Modern GNOME header bar
- `WindowTitle` - Header bar title with a subtitle
- `ButtonContent` - Button child with an icon and a label
- `ActionRow` - List row with title/subtitle
- `SpinRow` - Number input row
- `StatusPage` - Empty, loading or error page
- `Toast` - Short notification with an optional action button
- `ComboRow` - Combo box row for preferences
- `PreferencesPage` - Page for preferences window
- `PreferencesGroup` - Group within preferences page

### Other

- `Builder` - Load UI from XML files
- `Menu` - Application menu
- `SimpleAction` - Application action
- `StyleManager` - Theme and appearance management, including dark mode changes
- `EventControllerMotion` - Pointer enter and leave events

## Usage

```typescript
// Import GTK4 widgets and enums
import {
  Align,
  Application,
  ApplicationFlags,
  ApplicationWindow,
  Box,
  Button,
  Entry,
  Label,
  Orientation,
} from "@sigmasd/gtk/gtk4";

// Import Adwaita widgets and enums
import {
  ColorScheme,
  HeaderBar,
  PreferencesWindow,
  StyleManager,
} from "@sigmasd/gtk/adw";

// Import event loop utilities (optional)
import { EventLoop } from "@sigmasd/gtk/eventloop";
```

## Event Loop Integration

By default, GTK's `app.run()` blocks JavaScript's event loop, preventing
`async/await` from working. The `EventLoop` class provides a solution by
integrating GLib's MainContext with Deno/Bun/Node.js's event loop.

### Using EventLoop

```typescript
import {
  Application,
  ApplicationFlags,
  ApplicationWindow,
  Button,
} from "@sigmasd/gtk/gtk4";
import { EventLoop } from "@sigmasd/gtk/eventloop";

const app = new Application("com.example.App", ApplicationFlags.NONE);
const eventLoop = new EventLoop();

app.onActivate(() => {
  const win = new ApplicationWindow(app);
  win.setTitle("Async Example");
  win.setDefaultSize(400, 300);

  const button = new Button("Fetch Data");
  button.onClick(async () => {
    // Now you can use async/await!
    const response = await fetch("https://api.github.com/repos/denoland/deno");
    const data = await response.json();
    console.log("Fetched repo:", data.name, "Stars:", data.stargazers_count);
  });

  win.setChild(button);
  win.present();
});

// Use eventLoop.start() instead of app.run()
await eventLoop.start(app);
```

### How EventLoop Waits

The EventLoop runs GLib's main context one step at a time. GLib says which file
descriptors to watch and how long to wait, the wait happens on a worker thread,
and ready GLib sources are dispatched on the main thread. JavaScript keeps
running during the wait, and GLib work added from JavaScript (a redraw, an idle
callback, a timeout) wakes the wait at once. Nothing wakes up while the app is
idle.

This needs off-thread FFI calls (Deno, and Node with `@sigma/deno-compat` 0.25.0
or later) and GLib 2.72 or later. Otherwise, as on Bun, the loop checks GLib on
a timer instead. `eventLoop.mode` says which one is running: `"driven"` or
`"polling"`.

```typescript
// Only used in "polling" mode (default: 16ms)
const eventLoop = new EventLoop({
  pollInterval: 16, // Backs off from 16ms up to 250ms while idle
});
```

### When to Use EventLoop

Use `EventLoop` when you need:

- ✅ `async/await` and Promises in your GTK app
- ✅ `fetch()` or other async Deno/Bun/Node.js APIs
- ✅ `setTimeout()`, `setInterval()` to work properly
- ✅ Integration with async libraries

Use standard `app.run()` when:

- ✅ You only need synchronous GTK event handling
- ✅ Simple applications without async operations

### Important: Window Close Handling

When using `EventLoop`, you **must** handle the window `close-request` signal to
stop the event loop, otherwise the application will continue running in the
terminal after the window closes:

```typescript
win.connect("close-request", () => {
  eventLoop.stop(); // Stop the event loop
  return false; // Allow window to close
});
```

With standard `app.run()`, the window close is handled automatically by GTK.

## API Highlights

### Creating Widgets

```typescript
// Create widgets
const label = new Label("Hello");
const button = new Button("Click");
const entry = new Entry();
```

### Setting Properties

```typescript
// Type-safe property setting
widget.setVisible(true);
widget.setMarginTop(12);
widget.setHalign(Align.CENTER);
```

### Connecting Signals

```typescript
button.onClick(() => {
  console.log("Button clicked!");
});

window.onCloseRequest(() => {
  console.log("Window closing");
  return false; // Allow close
});
```

Selected `Button` and `Entry` signals and properties have types generated from
GIR. For example, `entry.connect("delete-text", (start, end) => ...)` receives
numeric positions and `button.setProperty("label", "Open")` expects a string.
Dynamic names continue to work through the generic API.

### Container Management

```typescript
const box = new Box(Orientation.VERTICAL, 12);
box.append(label);
box.append(button);
box.remove(button);
```

### Application Lifecycle

```typescript
const app = new Application("com.example.App", ApplicationFlags.NONE);

app.onActivate(() => {
  // Create and show your main window
});

const exitCode = app.run([]);
Deno.exit(exitCode);
```

### Desktop application launches

Use `AppInfo.getAll()` to list installed applications and `getIcon()` to read
their file icons or icon-theme names. `DesktopAppInfo.fromId()` opens a specific
Freedesktop desktop entry when the platform supports it. These lookups return
owned objects. Call `unref()` when you finish using them.

Create a display launch context from the user action that opens the app or URL.
GTK uses it to send the startup notification to the desktop.

```typescript
import { AppInfo } from "@sigmasd/gtk/gio";

openButton.onClick(() => {
  const context = window.getDisplay().getAppLaunchContext();
  try {
    AppInfo.launchDefaultForUri("https://example.org", context);
  } finally {
    context.unref();
  }
});
```

`AppInfo.launchDefaultForUriAsync()` reports GIO's result through a promise
while `EventLoop` runs. For an explicit application, pass `File` objects and the
context to `app.launch(files, context)`.

### Native preferences

`PreferencesDialog` presents `PreferencesPage` groups inside a parent window.
Use `NavigationPage` for a subpage and `NavigationView` for a navigation stack
outside a preferences dialog. The `isSupported()` methods check availability
before constructing these widgets.

```typescript
import {
  NavigationPage,
  PreferencesDialog,
  PreferencesGroup,
  PreferencesPage,
} from "@sigmasd/gtk/adw";
import { Label } from "@sigmasd/gtk/gtk4";

const dialog = new PreferencesDialog();
const page = new PreferencesPage();
page.add(new PreferencesGroup());
dialog.add(page);
dialog.present(window);
dialog.pushSubpage(new NavigationPage(new Label("Path actions"), "Paths"));
```

## Architecture

### Low-Level FFI (`src/low/`)

The FFI layer (`src/low/*.ts`) handles:

- Dynamic library loading (`dlopen`)
- FFI symbol definitions
- Raw GTK/GLib C function bindings
- Platform-specific library path resolution (`src/low/paths/`)

### High-Level Wrappers (`src/high/`)

Object-oriented classes that:

- Wrap raw pointers in TypeScript classes
- Provide idiomatic methods
- Handle C string conversions
- Manage GValue conversions for properties
- Register and manage signal callbacks
- Memory management (GObject reference counting)

## Development

### Project Structure

```
gtk/
├── src/
│   ├── high/              # High-level wrappers (Public API)
│   │   ├── gtk4.ts        # GTK4 wrapper classes
│   │   ├── gtk3.ts        # GTK3 wrapper classes
│   │   ├── adw.ts         # Libadwaita wrappers
│   │   ├── gio.ts         # GIO wrappers (Menu, SimpleAction)
│   │   ├── glib.ts        # GLib wrappers (MainLoop)
│   │   ├── gobject.ts     # GObject base class
│   │   ├── cairo.ts       # Cairo graphics wrapper
│   │   ├── eventloop.ts   # Event loop for async/await
│   │   └── app_indicator.ts # App indicator wrapper
│   ├── low/               # Low-level FFI layer (Internal)
│   │   ├── gtk4.ts        # GTK4 FFI bindings
│   │   ├── gtk3.ts        # GTK3 FFI bindings
│   │   ├── adw.ts         # Libadwaita FFI bindings
│   │   ├── gio.ts         # GIO FFI bindings
│   │   ├── glib.ts        # GLib FFI bindings
│   │   ├── gobject.ts     # GObject FFI bindings
│   │   ├── cairo.ts       # Cairo FFI bindings
│   │   ├── app_indicator.ts # App indicator FFI
│   │   ├── utils.ts       # Utility functions (cstr, readCStr)
│   │   └── paths/         # Platform-specific library loading
│   │       ├── mod.ts     # Main export
│   │       ├── findLib.ts # Library search utility
│   │       ├── types.ts   # Type definitions
│   │       └── platform/  # Linux, macOS, Windows paths
├── examples/
│   ├── simple.ts          # Simple hello world
│   ├── widgets-demo.ts    # Comprehensive widget demo
│   ├── async-demo.ts      # Async/await demo
│   └── checkbutton-demo.ts # Checkbox demo
├── test/                  # Headless widget tests
├── deno.json              # Package configuration
└── README.md
```

### Event Loop Module

The `eventloop.ts` module provides:

**`EventLoop` class**: Integrates GLib's MainContext with the JavaScript event
loop of Deno, Node or Bun

- `start(app)` - Start the event loop with your application
- `stop()` - Stop the event loop and quit the application
- `isRunning` - Check if the event loop is running
- `mode` - `"driven"` or `"polling"`, see
  [How EventLoop Waits](#how-eventloop-waits)
- `pollInterval` - Get the poll interval used in `"polling"` mode

**Options**:

- `pollInterval` - Milliseconds to sleep when idle in `"polling"` mode (default:
  16)

### Adding New Widgets

1. Add FFI symbol definitions in `src/low/gtk4.ts` (or appropriate low-level
   module)
2. Create a high-level wrapper class in `src/high/gtk4.ts` extending `Widget` or
   `GObject`
3. Implement constructor and common methods
4. Export the class

Example:

```gtk/src/low/gtk4.ts
// 1. Add FFI binding in src/low/gtk4.ts
export const gtk4 = Deno.dlopen(LIB_PATHS.gtk4, {
  // ... existing symbols ...
  gtk_my_widget_new: { parameters: [], result: "pointer" },
  gtk_my_widget_set_text: { parameters: ["pointer", "buffer"], result: "void" },
});
```

```gtk/src/high/gtk4.ts
// 2. Create wrapper class in src/high/gtk4.ts
import { gtk4 } from "../low/gtk4.ts";
import { cstr } from "../low/utils.ts";

export class MyWidget extends Widget {
  constructor() {
    const ptr = gtk4.symbols.gtk_my_widget_new();
    super(ptr);
  }

  setText(text: string): void {
    const textCStr = cstr(text);
    gtk4.symbols.gtk_my_widget_set_text(this.ptr, textCStr);
  }
}
```

### Regenerating the native bindings

The TypeScript GIR generator produces the low-level FFI tables for GLib,
GObject, GIO, GTK 3, GTK 4 with GDK, libadwaita, and Ayatana AppIndicator. The
checked-in tables in `src/low/generated` load directly at runtime. The wrappers
in `src/high` implement the TypeScript API and handle native ownership and
callback lifetimes.

`tools/gir/bindings.json` lists the symbols, library version baselines, and
exceptions such as the fixed calling signatures used for variadic functions. The
generator reads the pinned signature snapshots alongside the manifest. Add a
symbol when a wrapper or test needs it. The shared loader passes `gboolean` as a
C integer and presents a boolean to JavaScript.

Cairo's GIR describes cairo-gobject types, so the libcairo drawing calls live in
`src/low/cairo.ts`. The GLib loader declares `g_free_ptr`, a jsGTK alias for
taking the address of `g_free`.

```sh
deno task gir
deno task gir:check
deno task gir:test
```

When adding a symbol or updating a library, collect the upstream GIR files
listed under `sources` in one directory and update the package versions in the
manifest. Refresh the snapshots and review the generated signatures with the
metadata changes.

```sh
deno task gir:refresh /path/to/upstream-gir
```

### Release dependency checks

Run these checks from the repository root before publishing. On a fresh
checkout, run `deno install` to generate the local Deno lockfile.

```sh
deno outdated --frozen
deno audit --frozen
npm outdated
npm audit --package-lock-only
```

Review available updates against the supported dependency ranges and investigate
security advisories. After changing dependencies, rerun `deno task test` and
commit any changes to `package-lock.json`.

## Known Limitations

- **Limited widgets**: Not all GTK widgets are wrapped yet
- **No CSS provider**: Custom styling via CSS not yet supported
- **Signal lifetime**: Callbacks remain valid for process lifetime (no explicit
  disconnect/cleanup yet)
- **Platform testing**: While cross-platform library loading is implemented,
  primary testing has been on Linux

## License

MIT License - See LICENSE file for details
