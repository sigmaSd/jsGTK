/**
 * Tests for the methods generated from GIR (src/high/generated): enums,
 * nullable strings, borrowed objects, callbacks and version-guarded symbols.
 */

import { Justification, Label, ListBox, ListBoxRow } from "../src/high/gtk4.ts";
import { Toast, ToastPriority } from "../src/high/adw.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

const testOptions = { sanitizeResources: false, sanitizeOps: false };

Deno.test("Generated methods keep hand-written ones", testOptions, () => {
  const label = new Label("Hello");
  label.setJustify(Justification.CENTER);
  assertEquals(label.getJustify(), Justification.CENTER, "Enum round trip");
  assertEquals(label.getLabel(), "Hello", "Generated getter");
  label.setText("Bye");
  assertEquals(label.getText(), "Bye", "Hand-written setter still works");
  assert(
    Object.hasOwn(Label.prototype, "getLines"),
    "Generated methods live on the class prototype",
  );
});

Deno.test("Generated nullable strings and enums", testOptions, () => {
  const toast = new Toast("Saved");
  toast.setPriority(ToastPriority.HIGH);
  assertEquals(toast.getPriority(), ToastPriority.HIGH, "Priority");
  assertEquals(toast.getButtonLabel(), null, "No button label is null");
  toast.setActionName("app.undo");
  assertEquals(toast.getActionName(), "app.undo", "Action name");
  toast.setActionName(null);
  assertEquals(toast.getActionName(), null, "Null clears the action");
});

Deno.test(
  "Generated methods return the wrappers already in use",
  testOptions,
  () => {
    const list = new ListBox();
    const rows = ["b", "a", "c"].map((name) => {
      const row = new ListBoxRow();
      row.setChild(new Label(name));
      list.append(row);
      return row;
    });
    assert(list.getRowAtIndex(1) === rows[1], "Same wrapper for a known row");
    assertEquals(list.getRowAtIndex(9), null, "Out of range is null");
  },
);

Deno.test(
  "Generated callbacks receive nullable and borrowed rows",
  testOptions,
  () => {
    const list = new ListBox();
    for (let i = 0; i < 3; i++) list.append(new ListBoxRow());
    const before: (ListBoxRow | null)[] = [];
    list.setHeaderFunc((_row, previous) => before.push(previous));
    list.invalidateHeaders();
    assert(before.includes(null), "The first row has no row before it");
    assert(
      before.some((row) => row instanceof ListBoxRow),
      "Later rows get the row before them",
    );
    list.setHeaderFunc(null);

    list.setSelectionMode(3);
    list.selectAll();
    let selected = 0;
    list.selectedForeach((box, row) => {
      assert(box === list, "The list itself is passed back");
      assert(row instanceof ListBoxRow, "Rows are wrapped");
      selected++;
    });
    assertEquals(selected, 3, "Every selected row is visited");
  },
);
