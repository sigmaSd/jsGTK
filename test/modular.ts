/**
 * GTK Modular Import Test
 *
 * This test verifies that we can import components from their specific modules
 * instead of the main entry point.
 */

import { Button, Label } from "../src/gtk.ts";
import { AdwWindow } from "../src/adw.ts";
import { Orientation } from "../src/enums.ts";
import { cstr } from "../src/utils.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

Deno.test("Utils module: cstr returns Uint8Array", () => {
  const testStr = "Hello World";
  const buffer = cstr(testStr);
  assert(buffer instanceof Uint8Array, "buffer is Uint8Array");
});

Deno.test("Enums module: Constants are correct", () => {
  assert(
    Orientation.VERTICAL === 1,
    "Orientation.VERTICAL from enums.ts is correct",
  );
  assert(
    Orientation.HORIZONTAL === 0,
    "Orientation.HORIZONTAL from enums.ts is correct",
  );
});

Deno.test("GTK Widgets module: creation and usage", () => {
  const label = new Label("Test Label");
  assert(label !== null, "Label created from src/gtk.ts");
  assert(label.getText() === "Test Label", "Label text correct");

  const button = new Button("Test Button");
  assert(button !== null, "Button created from src/gtk.ts");
});

Deno.test("Adwaita Widgets module: creation", () => {
  // We can create an AdwWindow (even without an app for this simple test)
  const win = new AdwWindow();
  assert(win !== null, "AdwWindow created from src/adw.ts");
});
