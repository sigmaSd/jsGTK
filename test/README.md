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

GTK provides a signal emission system that allows us to trigger UI events
programmatically without needing a display server or actual mouse/keyboard
input. This is done using:

1. **`emit()` method** - Programmatically fires GTK signals (like "clicked")
2. **`g_signal_emit_by_name()`** - The underlying GObject function that makes it
   possible
3. **Event processing** - Pumping the GLib main context to process pending
   events

## Running Tests

```bash
# Run all tests
deno run --allow-ffi test/widget_test.ts

# Or with Bun
bun test/widget_test.ts
```

**Note:** These tests run **headless** - no GUI window appears! They test the
widget logic and signal handling without requiring a display.

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
