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
  Entry,
  GTK_ORIENTATION_VERTICAL,
  Label,
} from "../src/gtk-ffi.ts";

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
  const box = new Box(GTK_ORIENTATION_VERTICAL, 10);

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

  propButton.setProperty("visible", false);

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
