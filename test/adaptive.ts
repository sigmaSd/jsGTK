/**
 * Tests for list sorting, revealers, toasts, split views, spin rows and the
 * other widgets used to build adaptive libadwaita layouts.
 */

import {
  Button,
  EventControllerMotion,
  Label,
  ListBox,
  ListBoxRow,
  PackType,
  Revealer,
  RevealerTransitionType,
  SearchEntry,
  ToggleButton,
} from "../src/high/gtk4.ts";
import {
  ActionRow,
  ButtonContent,
  OverlaySplitView,
  SpinRow,
  StatusPage,
  StyleManager,
  Toast,
  ToastOverlay,
  WindowTitle,
} from "../src/high/adw.ts";
import { AppInfo, DesktopAppInfo } from "../src/high/gio.ts";
import { G_TYPE_STRING, GObject } from "../src/high/gobject.ts";
import { gobject } from "../src/low/gobject.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (String(actual) !== String(expected)) {
    throw new Error(
      `FAIL: ${message} (expected: ${expected}, got: ${actual})`,
    );
  }
}

const testOptions = { sanitizeResources: false, sanitizeOps: false };

/** Own a widget for the duration of a test, then release it. */
function owned<T extends GObject>(widget: T, body: (widget: T) => void) {
  gobject.symbols.g_object_ref_sink(widget.ptr);
  try {
    body(widget);
  } finally {
    widget.unref();
  }
}

class NamedRow extends ListBoxRow {
  readonly name: string;
  weight: number;

  constructor(name: string, weight: number) {
    super();
    this.name = name;
    this.weight = weight;
    this.setChild(new Label(name));
  }
}

Deno.test(
  "ListBox sorts rows with their original wrappers",
  testOptions,
  () => {
    owned(new ListBox(), (list) => {
      const rows = [
        new NamedRow("b", 2),
        new NamedRow("a", 3),
        new NamedRow("c", 1),
      ];
      for (const row of rows) list.append(row);
      let sawPlainRow = false;
      list.setSortFunc((a, b) => {
        if (!(a instanceof NamedRow) || !(b instanceof NamedRow)) {
          sawPlainRow = true;
          return 0;
        }
        return b.weight - a.weight;
      });
      assert(!sawPlainRow, "Sort callback receives the appended wrappers");
      const order = () =>
        rows.slice().sort((x, y) => x.getIndex() - y.getIndex()).map((r) =>
          r.name
        ).join("");
      assertEquals(order(), "abc", "Rows follow the comparison function");

      rows[2].weight = 10;
      rows[2].changed();
      assertEquals(order(), "cab", "A changed row moves to its new place");

      for (const row of rows) row.weight = 0;
      list.invalidateSort();
      assertEquals(order(), "cab", "Equal rows keep their order");

      list.setFilterFunc((row) => row instanceof NamedRow && row.name !== "a");
      assert(
        rows[0] instanceof NamedRow && GObject.lookup(rows[0].ptr) === rows[0],
        "Filtering keeps the registered wrapper",
      );
      list.setPlaceholder(new Label("Nothing here"));
    });
  },
);

Deno.test("Motion controller tracks the pointer", testOptions, () => {
  owned(new Label("Hover me"), (label) => {
    const motion = new EventControllerMotion();
    let entered = 0;
    let left = 0;
    motion.onEnter(() => entered++);
    motion.onLeave(() => left++);
    label.addController(motion);
    assert(!motion.containsPointer(), "Pointer starts outside");
    motion.emit("leave");
    assertEquals(left, 1, "Leave handler runs");
    assertEquals(entered, 0, "Enter handler waits for the pointer");
  });
});

Deno.test("SearchEntry sets its placeholder", testOptions, () => {
  owned(new SearchEntry(), (entry) => {
    entry.setPlaceholderText("Search apps");
    let changes = 0;
    entry.onSearchChanged(() => changes++);
    entry.emit("search-changed");
    assertEquals(changes, 1, "Search change handler runs");
    assertEquals(
      entry.getProperty("placeholder-text", G_TYPE_STRING),
      "Search apps",
      "Placeholder is stored",
    );
  });
});

Deno.test("Revealer toggles its child", testOptions, () => {
  owned(new Revealer(), (revealer) => {
    revealer.setChild(new Label("Hidden"));
    revealer.setTransitionType(RevealerTransitionType.SLIDE_DOWN);
    revealer.setTransitionDuration(0);
    assert(!revealer.getRevealChild(), "Revealer starts hidden");
    revealer.setRevealChild(true);
    assert(revealer.getRevealChild(), "Revealer shows its child");
  });
});

Deno.test("Grouped toggle buttons are exclusive", testOptions, () => {
  const first = new ToggleButton();
  const second = new ToggleButton();
  gobject.symbols.g_object_ref_sink(first.ptr);
  gobject.symbols.g_object_ref_sink(second.ptr);
  try {
    second.setGroup(first);
    first.setActive(true);
    second.setActive(true);
    assert(!first.getActive(), "Activating one button deactivates the other");
  } finally {
    second.unref();
    first.unref();
  }
});

Deno.test("Toasts report their button and dismissal", testOptions, () => {
  owned(new ToastOverlay(), (overlay) => {
    overlay.setChild(new Label("Content"));
    const toast = new Toast("Limit applied");
    toast.setButtonLabel("Undo");
    toast.setTimeout(0);
    let clicked = 0;
    let dismissed = 0;
    toast.onButtonClicked(() => clicked++);
    toast.onDismissed(() => dismissed++);
    // Keep our own reference: the overlay owns the toast once added.
    gobject.symbols.g_object_ref(toast.ptr);
    overlay.addToast(toast);
    toast.emit("button-clicked");
    assertEquals(clicked, 1, "Button handler runs");
    toast.dismiss();
    assertEquals(dismissed, 1, "Dismissal handler runs");
    toast.unref();
  });
});

Deno.test("OverlaySplitView shows and hides its sidebar", testOptions, () => {
  owned(new OverlaySplitView(), (split) => {
    split.setContent(new Label("Content"));
    split.setSidebar(new Label("Sidebar"));
    split.setCollapsed(true);
    split.setSidebarPosition(PackType.END);
    split.setMaxSidebarWidth(360);
    split.setMinSidebarWidth(280);
    split.setSidebarWidthFraction(0.35);
    const seen: boolean[] = [];
    split.onShowSidebarChanged((shown) => seen.push(shown));
    split.setShowSidebar(true);
    assert(split.getShowSidebar(), "Sidebar is shown");
    split.setShowSidebar(false);
    assertEquals(seen.join(), "true,false", "Changes are reported");
  });
});

Deno.test("SpinRow keeps its value in range", testOptions, () => {
  owned(new SpinRow(1, 100, 1), (row) => {
    row.setDigits(1);
    const values: number[] = [];
    row.onValueChanged((value) => values.push(value));
    row.setValue(42.5);
    assertEquals(row.getValue(), 42.5, "Value is stored");
    row.setValue(500);
    assertEquals(row.getValue(), 100, "Value is clamped to the range");
    row.setRange(1, 1000);
    row.setValue(500);
    assertEquals(values.join(), "42.5,100,500", "Changes are reported");
  });
});

Deno.test("Header and status helpers", testOptions, () => {
  owned(new WindowTitle("Title", "Subtitle"), (title) => {
    title.setTitle("Bandito");
    title.setSubtitle("wlp3s0");
  });
  owned(new ButtonContent(), (content) => {
    content.setIconName("network-wireless-symbolic");
    content.setLabel("Wi-Fi");
  });
  owned(new StatusPage(), (page) => page.setChild(new Label("Child")));
  owned(new Button(), (button) => button.setChild(new Label("Custom")));
  owned(new ActionRow(), (row) => {
    const toggle = new ToggleButton();
    row.addPrefix(new Label("Prefix"));
    row.addSuffix(toggle);
    row.setActivatableWidget(toggle);
  });
});

Deno.test("StyleManager reports the dark style", testOptions, () => {
  const manager = StyleManager.getDefault();
  assert(
    StyleManager.getDefault() === manager,
    "The default style manager has one wrapper",
  );
  assertEquals(typeof manager.getDark(), "boolean", "Dark state is boolean");
});

Deno.test("AppInfo exposes executable and window class", testOptions, () => {
  for (const app of AppInfo.getAll().slice(0, 20)) {
    assertEquals(typeof app.getExecutable(), "string", "Executable is text");
    if (app instanceof DesktopAppInfo) {
      const wmClass = app.getStartupWmClass();
      assert(wmClass === null || typeof wmClass === "string", "Class or null");
    }
  }
});
