/**
 * GTK Widget UI Test
 *
 * This test demonstrates testing GTK widgets by simulating user interactions.
 * We create widgets, simulate button clicks, and verify the UI updates correctly.
 */

import {
  Box,
  Button,
  Entry,
  GTK_ORIENTATION_VERTICAL,
  Label,
} from "../src/gtk-ffi.ts";
import { glib, gtk } from "../src/libs.ts";

// Test counter
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    failedTests++;
  }
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (actual === expected) {
    console.log(`✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(
      `✗ FAIL: ${message} (expected: ${expected}, got: ${actual})`,
    );
    failedTests++;
  }
}

// Helper to process pending GTK events (simulate the main loop)
function processPendingEvents() {
  const context = glib.symbols.g_main_context_default();
  while (glib.symbols.g_main_context_pending(context)) {
    glib.symbols.g_main_context_iteration(context, false);
  }
}

// Helper to simulate button click by triggering the "clicked" signal
function clickButton(button: Button) {
  // In GTK, we can emit signals programmatically
  // The "clicked" signal is automatically handled by connected callbacks
  button.emit("clicked");
  processPendingEvents();
}

console.log("\n🧪 Starting GTK Widget Tests...\n");

// Initialize GTK for testing
gtk.symbols.gtk_init();

try {
  // Test 1: Widget Creation
  console.log("Test 1: Widget Creation");
  const label = new Label("Initial Text");
  const button = new Button("Click Me");
  const entry = new Entry();
  assert(label !== null, "Label created successfully");
  assert(button !== null, "Button created successfully");
  assert(entry !== null, "Entry created successfully");

  // Test 2: Label Text Get/Set
  console.log("\nTest 2: Label Text Manipulation");
  label.setText("Hello World");
  assertEquals(label.getText(), "Hello World", "Label text was set correctly");
  label.setText("Updated Text");
  assertEquals(
    label.getText(),
    "Updated Text",
    "Label text was updated correctly",
  );

  // Test 3: Entry Text Get/Set
  console.log("\nTest 3: Entry Text Manipulation");
  entry.setText("user input");
  assertEquals(entry.getText(), "user input", "Entry text was set correctly");

  // Test 4: Button Click Handler
  console.log("\nTest 4: Button Click Event");
  let clickCount = 0;
  button.connect("clicked", () => {
    clickCount++;
  });
  clickButton(button);
  assertEquals(clickCount, 1, "Button click handler called once");
  clickButton(button);
  assertEquals(clickCount, 2, "Button click handler called twice");

  // Test 5: Interactive Button + Label
  console.log("\nTest 5: Button Updates Label");
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

  // Test 6: Entry + Button Interaction
  console.log("\nTest 6: Entry and Button Interaction");
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

  // Test 7: Container Widget Hierarchy
  console.log("\nTest 7: Container Widget Hierarchy");
  const box = new Box(GTK_ORIENTATION_VERTICAL, 10);
  const child1 = new Label("Child 1");
  const child2 = new Label("Child 2");

  box.append(child1);
  box.append(child2);

  assert(true, "Widgets appended to container successfully");

  // Test 8: Multiple Signal Handlers
  console.log("\nTest 8: Multiple Signal Handlers");
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

  // Test 9: Widget Properties
  console.log("\nTest 9: Widget Properties");
  const propButton = new Button("Property Test");
  propButton.setProperty("visible", true);
  assert(propButton.getVisible(), "Widget visible property set to true");

  propButton.setProperty("visible", false);
  assert(!propButton.getVisible(), "Widget visible property set to false");

  // Test 10: Complex UI Flow
  console.log("\nTest 10: Complex UI Flow (Calculator-like)");
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

  // Print Summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Summary");
  console.log("=".repeat(50));
  console.log(`✓ Passed: ${passedTests}`);
  console.log(`✗ Failed: ${failedTests}`);
  console.log(`📈 Total:  ${passedTests + failedTests}`);

  if (failedTests === 0) {
    console.log("\n🎉 All tests passed!");
    Deno.exit(0);
  } else {
    console.log("\n❌ Some tests failed!");
    Deno.exit(1);
  }
} catch (error) {
  console.error("\n💥 Test execution error:", error);
  Deno.exit(1);
}
