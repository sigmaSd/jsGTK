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
`npm install koffi@2`

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
- `ListBox` - Vertical list container
- `ToolbarView` - Adwaita toolbar view

### Basic Widgets

- `Label` - Text display
- `Button` - Clickable button
- `Entry` - Text input field
- `DropDown` - Dropdown selection menu
- `MenuButton` - Button that opens a menu

### Windows

- `Window` - Basic window
- `ApplicationWindow` - Main application window
- `PreferencesWindow` - Adwaita preferences dialog
- `MessageDialog` - Adwaita message/confirmation dialog
- `AboutDialog` - About dialog

### Adwaita Widgets

- `HeaderBar` - Modern GNOME header bar
- `ActionRow` - List row with title/subtitle
- `ComboRow` - Combo box row for preferences
- `PreferencesPage` - Page for preferences window
- `PreferencesGroup` - Group within preferences page

### Other

- `Builder` - Load UI from XML files
- `Menu` - Application menu
- `SimpleAction` - Application action
- `StyleManager` - Theme and appearance management

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

### EventLoop Options

```typescript
// Configure poll interval (default: 16ms)
const eventLoop = new EventLoop({
  pollInterval: 16, // Check for events every 16ms when idle
});
```

The EventLoop uses a hybrid approach:

- **When active**: Sub-millisecond latency using microtasks
- **When idle**: Sleeps to conserve CPU resources

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

**`EventLoop` class**: Integrates GLib's MainContext with Deno/Bun's event loop

- `start(app)` - Start the event loop with your application
- `stop()` - Stop the event loop and quit the application
- `isRunning` - Check if the event loop is running
- `pollInterval` - Get the current poll interval

**Options**:

- `pollInterval` - Milliseconds to sleep when idle (default: 16)

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

## Known Limitations

- **Limited widgets**: Not all GTK widgets are wrapped yet
- **No CSS provider**: Custom styling via CSS not yet supported
- **Signal lifetime**: Callbacks remain valid for process lifetime (no explicit
  disconnect/cleanup yet)
- **Platform testing**: While cross-platform library loading is implemented,
  primary testing has been on Linux

## License

MIT License - See LICENSE file for details
