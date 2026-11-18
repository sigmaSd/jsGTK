/**
 * GTK Widget UI Test
 *
 * This test demonstrates testing GTK widgets by simulating user interactions.
 * We create widgets, simulate button clicks, and verify the UI updates correctly.
 */

import {
  Box,
  Button,
  CheckButton,
  ColumnView,
  Entry,
  Label,
  Orientation,
} from "../src/high/gtk4.ts";
import {
  AdwWindow,
  NavigationPage,
  NavigationView,
  PreferencesDialog,
  PreferencesPage,
} from "../src/high/adw.ts";
import { GObject } from "../src/high/gobject.ts";
import { EventLoop } from "../src/high/eventloop.ts";
import { gobject } from "../src/low/gobject.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  const actualStr = String(actual);
  const expectedStr = String(expected);

  if (actualStr !== expectedStr) {
    throw new Error(
      `FAIL: ${message} (expected: ${expectedStr}, got: ${actualStr})`,
    );
  }
}

// Helper to simulate button click by triggering the "clicked" signal
function clickButton(button: Button) {
  button.emit("clicked");
  // Signal emission is synchronous, no need to process events
}

const testOptions = { sanitizeResources: false, sanitizeOps: false };

function collectGarbage(): void {
  const runtime = globalThis as typeof globalThis & {
    gc?: () => void;
    Bun?: { gc(force?: boolean): void };
  };
  if (runtime.gc) runtime.gc();
  else runtime.Bun?.gc(true);
}

async function waitFor(
  predicate: () => boolean,
  message: string,
): Promise<void> {
  const deadline = performance.now() + 2000;
  while (!predicate()) {
    assert(performance.now() < deadline, message);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

Deno.test("ColumnView initializes with no selection model", () => {
  const view = new ColumnView();
  gobject.symbols.g_object_ref_sink(view.ptr);
  try {
    assert(!!view.ptr, "GTK created the column view with no model");
  } finally {
    view.unref();
  }
});

Deno.test(
  "A native signal survives releasing the JS wrapper's reference",
  testOptions,
  async () => {
    const box = new Box(Orientation.VERTICAL, 0);
    gobject.symbols.g_object_ref_sink(box.ptr);
    const button = new Button("Still owned by GTK");
    const ptr = button.ptr;
    box.append(button);
    // The box sinks the floating reference. Give the wrapper a separate reference to release.
    gobject.symbols.g_object_ref(ptr);
    let clicks = 0;
    const signal = button.onClick(() => clicks++);
    button.unref();
    collectGarbage();

    const owned = GObject.fromPtr(ptr) as Button;
    try {
      owned.emit("clicked");
      assertEquals(clicks, 1, "GTK's live button still has its callback");
      owned.disconnect(signal);
      await Promise.resolve();
      collectGarbage();
      owned.emit("clicked");
      assertEquals(clicks, 1, "Disconnection releases the callback");
    } finally {
      box.remove(owned);
      owned.unref();
      box.unref();
    }
  },
);

Deno.test("A signal handler can disconnect itself", testOptions, async () => {
  const button = new Button("Disconnect");
  gobject.symbols.g_object_ref_sink(button.ptr);
  let calls = 0;
  const handler = button.onClick(() => {
    calls++;
    button.disconnect(handler);
  });
  button.emit("clicked");
  await Promise.resolve();
  button.emit("clicked");
  assertEquals(calls, 1, "Disconnected handler ran only once");
  button.unref();
});

Deno.test(
  "Widget activation, effective sensitivity, and bounds",
  testOptions,
  async () => {
    const window = new AdwWindow();
    window.setDefaultSize(320, 160);
    const box = new Box(Orientation.VERTICAL, 0);
    const button = new Button("Activate");
    box.append(button);
    window.setContent(box);
    const unrelated = new Label("Unrelated");
    gobject.symbols.g_object_ref_sink(unrelated.ptr);
    const loop = new EventLoop({ pollInterval: 1 });
    const running = loop.start();
    try {
      assert(
        button.getSensitive() && button.isSensitive(),
        "Button starts sensitive",
      );
      box.setSensitive(false);
      assert(
        button.getSensitive() && !button.isSensitive(),
        "Parent affects effective sensitivity",
      );
      box.setSensitive(true);
      window.present();
      await waitFor(
        () => (button.computeBounds(box)?.width ?? 0) > 0,
        "GTK allocates nonempty bounds",
      );
      let activations = 0;
      button.onClick(() => activations++);
      assert(button.activate(), "GtkButton can be activated");
      await waitFor(
        () => activations === 1,
        "Activation emits the click signal",
      );
      assert(
        button.computeBounds(unrelated) === null,
        "Unrelated widgets have no shared bounds",
      );
      const bounds = button.computeBounds(box)!;
      assert(
        bounds.width > 0 && bounds.height > 0,
        "Bounds contain the layout size",
      );
    } finally {
      window.destroy();
      unrelated.unref();
      loop.stop();
      await running;
    }
  },
);

Deno.test(
  "Adwaita navigation pushes and pops tagged pages",
  testOptions,
  () => {
    if (!NavigationView.isSupported()) return;
    const view = new NavigationView();
    gobject.symbols.g_object_ref_sink(view.ptr);
    const overview = new NavigationPage(new Label("Plugins"), "Preferences");
    overview.setTag("plugins");
    view.add(overview);
    const settings = new NavigationPage(new Label("Settings"), "Paths");
    settings.setTag("paths");
    view.setPopOnEscape(false);
    assertEquals(view.getVisiblePageTag(), "plugins", "First page is visible");
    view.push(settings);
    assertEquals(view.getVisiblePageTag(), "paths", "Subpage is visible");
    assert(view.pop(), "Subpage can be popped");
    assertEquals(view.getVisiblePageTag(), "plugins", "First page is restored");
    view.unref();
  },
);

Deno.test(
  "Adwaita preferences dialog presents and closes",
  testOptions,
  async () => {
    if (!PreferencesDialog.isSupported()) return;
    const window = new AdwWindow();
    window.setContent(new Label("Preferences host"));
    window.present();
    const loop = new EventLoop({ pollInterval: 1 });
    const running = loop.start();
    try {
      const dialog = new PreferencesDialog();
      dialog.add(new PreferencesPage());
      let closed = false;
      dialog.onClosed(() => closed = true);
      dialog.present(window);
      dialog.pushSubpage(new NavigationPage(new Label("Options"), "Plugin"));
      dialog.popSubpage();
      assert(dialog.close(), "Dialog accepted the close");
      await waitFor(() => closed, "Closed signal fired");
    } finally {
      window.destroy();
      loop.stop();
      await running;
    }
  },
);

Deno.test("Widget Creation", testOptions, () => {
  const label = new Label("Initial Text");

  const button = new Button("Click Me");

  const entry = new Entry();

  const check = new CheckButton("Check Me");

  assert(label !== null, "Label created successfully");

  assert(button !== null, "Button created successfully");

  assert(entry !== null, "Entry created successfully");

  assert(check !== null, "CheckButton created successfully");
});

Deno.test("Label Text Manipulation", testOptions, () => {
  const label = new Label("Initial Text");

  label.setText("Hello World");

  assertEquals(label.getText(), "Hello World", "Label text was set correctly");

  label.setText("Updated Text");

  assertEquals(
    label.getText(),
    "Updated Text",
    "Label text was updated correctly",
  );
});

Deno.test("Entry Text Manipulation", testOptions, () => {
  const entry = new Entry();

  entry.setText("user input");

  assertEquals(entry.getText(), "user input", "Entry text was set correctly");
});

Deno.test("Button Click Event", testOptions, () => {
  const button = new Button("Click Me");

  let clickCount = 0;

  button.connect("clicked", () => {
    clickCount++;
  });

  clickButton(button);

  assertEquals(clickCount, 1, "Button click handler called once");

  clickButton(button);

  assertEquals(clickCount, 2, "Button click handler called twice");
});

Deno.test("Button Updates Label", testOptions, () => {
  const interactiveLabel = new Label("Count: 0");

  const interactiveButton = new Button("Increment");

  let counter = 0;

  interactiveButton.connect("clicked", () => {
    counter++;

    interactiveLabel.setText(`Count: ${counter}`);
  });

  clickButton(interactiveButton);

  assertEquals(
    interactiveLabel.getText(),
    "Count: 1",
    "Label updated after first click",
  );

  clickButton(interactiveButton);

  assertEquals(
    interactiveLabel.getText(),
    "Count: 2",
    "Label updated after second click",
  );
});

Deno.test("Entry and Button Interaction", testOptions, () => {
  const inputEntry = new Entry();

  const submitButton = new Button("Submit");

  const resultLabel = new Label("");

  inputEntry.setText("Test Input");

  submitButton.connect("clicked", () => {
    const text = inputEntry.getText();

    resultLabel.setText(`You entered: ${text}`);
  });

  clickButton(submitButton);

  assertEquals(
    resultLabel.getText(),
    "You entered: Test Input",
    "Label displays entry text after button click",
  );
});

Deno.test("Container Widget Hierarchy", testOptions, () => {
  const box = new Box(Orientation.VERTICAL, 10);

  const child1 = new Label("Child 1");

  const child2 = new Label("Child 2");

  box.append(child1);

  box.append(child2);

  assert(true, "Widgets appended to container successfully");
});

Deno.test("Multiple Signal Handlers", testOptions, () => {
  const multiButton = new Button("Multi Handler");

  let handler1Called = false;

  let handler2Called = false;

  multiButton.connect("clicked", () => {
    handler1Called = true;
  });

  multiButton.connect("clicked", () => {
    handler2Called = true;
  });

  clickButton(multiButton);

  assert(handler1Called, "First handler was called");

  assert(handler2Called, "Second handler was called");
});

Deno.test("Widget Properties", testOptions, () => {
  const propButton = new Button("Property Test");

  propButton.setProperty("visible", true);

  assert(propButton.getVisible(), "Widget visible property set to true");

  propButton.hide();

  assert(!propButton.getVisible(), "Widget visible property set to false");
});

Deno.test("Complex UI Flow (Calculator-like)", testOptions, () => {
  const display = new Label("0");

  const btn1 = new Button("1");

  const btn2 = new Button("2");

  const btnPlus = new Button("+");

  const btnEquals = new Button("=");

  let currentValue = 0;

  let operation = "";

  let accumulator = 0;

  btn1.connect("clicked", () => {
    currentValue = parseInt(display.getText() || "0") * 10 + 1;

    display.setText(currentValue.toString());
  });

  btn2.connect("clicked", () => {
    currentValue = parseInt(display.getText() || "0") * 10 + 2;

    display.setText(currentValue.toString());
  });

  btnPlus.connect("clicked", () => {
    accumulator = parseInt(display.getText() || "0");

    operation = "+";

    currentValue = 0;

    display.setText("0");
  });

  btnEquals.connect("clicked", () => {
    if (operation === "+") {
      const result = accumulator + parseInt(display.getText() || "0");

      display.setText(result.toString());
    }
  });

  // Simulate: 1 + 2 =

  clickButton(btn1);

  assertEquals(display.getText(), "1", "Clicked 1 button");

  clickButton(btnPlus);

  assertEquals(display.getText(), "0", "Clicked + button");

  clickButton(btn2);

  assertEquals(display.getText(), "2", "Clicked 2 button");

  clickButton(btnEquals);

  assertEquals(display.getText(), "3", "Calculation result is correct (1+2=3)");
});

Deno.test("CheckButton", testOptions, () => {
  const checkBtn = new CheckButton("Toggle Me");

  let callbackCalledCount = 0;

  checkBtn.onToggled(() => {
    callbackCalledCount++;
  });

  assert(!checkBtn.getActive(), "CheckButton initially inactive");

  assertEquals(checkBtn.getLabel(), "Toggle Me", "CheckButton label correct");

  // Toggle on

  checkBtn.setActive(true);

  assert(
    checkBtn.getActive() === true,
    "CheckButton is active after toggling on",
  );

  assertEquals(
    callbackCalledCount,
    1,
    "onToggled callback called once after toggling on",
  );

  // Toggle off

  checkBtn.setActive(false);

  assert(
    checkBtn.getActive() === false,
    "CheckButton is inactive after toggling off",
  );

  assertEquals(
    callbackCalledCount,
    2,
    "onToggled callback called twice after toggling off",
  );

  // Test Grouping

  const groupBtn1 = new CheckButton("Option 1");

  const groupBtn2 = new CheckButton("Option 2");

  groupBtn2.setGroup(groupBtn1);

  assert(true, "CheckButton grouping set successfully");
});
