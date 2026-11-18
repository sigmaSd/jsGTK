# GTK Widget Tests

This directory contains automated tests for the GTK FFI bindings that verify
widget behavior through programmatic UI interactions.

## What Makes This Special

Unlike traditional unit tests that just check if functions exist, these tests
actually **simulate user interactions** with the GTK UI:

- ✅ **Button clicks** - Programmatically trigger button "clicked" signals
- ✅ **Text entry** - Set and verify text in input fields
- ✅ **Label updates** - Verify UI elements respond to events
- ✅ **Event handlers** - Ensure callbacks fire correctly
- ✅ **Widget properties** - Test visibility and other properties
- ✅ **Complex flows** - Chain multiple interactions (like a calculator)

## How It Works

GTK lets the suite trigger actions and signals programmatically. Run the suite
with a GTK display available. The layout and dialog tests briefly present
windows, so use Xvfb if you want to run the suite in the background on Linux.

1. **`emit()` method** - Programmatically fires GTK signals (like "clicked")
2. **`g_signal_emit_by_name()`** - The underlying GObject function that makes it
   possible
3. **Event processing** - Pumping the GLib main context to process pending
   events

## Running Tests

```bash
deno task test
```

On Linux, `xvfb-run -a deno task test` runs the Deno, Bun, and Node tests on an
isolated X11 display.

The Node command uses `--test-force-exit` because native GTK tests can finish
their assertions while the runner remains in shutdown.

## Wayland foreground focus

The optional smoke test starts a private D-Bus session and headless Mutter
compositor. It sends Enter to a focused launcher window and checks that an
already-running target window becomes active without opening a second window. It
requires Linux, Mutter, and D-Bus. Deno runs the TypeScript driver. Pass `deno`,
`node`, or `bun` to choose the runtime for the two GTK test apps. The driver
uses `TMPDIR` when set.

```bash
deno task test:wayland deno
```

## Test Structure

Each test follows this pattern:

1. **Create widgets** - Instantiate buttons, labels, entries, etc.
2. **Connect signals** - Attach event handlers
3. **Simulate interaction** - Use `emit()` to trigger events
4. **Verify results** - Assert that widgets updated correctly

## Example Test

```typescript
// Create UI elements
const button = new Button("Click Me");
const label = new Label("Count: 0");
let count = 0;

// Connect event handler
button.connect("clicked", () => {
  count++;
  label.setText(`Count: ${count}`);
});

// Simulate user clicking the button
button.emit("clicked");

// Verify the label updated
assert(label.getText() === "Count: 1", "Label should show count");
```

## Current Test Coverage

- ✅ Widget creation (Label, Button, Entry, Box)
- ✅ Label text get/set
- ✅ Entry text manipulation
- ✅ Button click events
- ✅ Multiple signal handlers
- ✅ Widget properties (visibility)
- ✅ Container hierarchy
- ✅ Complex UI flows (calculator logic)

## Adding New Tests

To add a new test:

1. Create widgets you want to test
2. Use `connect()` to attach handlers
3. Use `emit()` to trigger signals
4. Use `assert()` or `assertEquals()` to verify behavior

```typescript
// Test a new widget
const myWidget = new MyWidget();
let eventFired = false;

myWidget.connect("my-signal", () => {
  eventFired = true;
});

myWidget.emit("my-signal");
assert(eventFired, "My signal should have fired");
```

## Why This Matters

This testing approach proves that:

- The FFI bindings are working correctly
- Signal connections work as expected
- Memory management is stable
- Widgets can communicate with each other
- Event handlers execute in the right context

All without needing to manually click buttons in a GUI!
