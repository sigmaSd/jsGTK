/**
 * Native symbols are bound the first time they are used (see
 * src/low/gobject-library.ts), so a required symbol missing from a library
 * would otherwise only fail when an app first calls it. Binding every symbol
 * here catches that in CI, on each platform.
 */

import { adw } from "../src/low/adw.ts";
import { gio } from "../src/low/gio.ts";
import { glib } from "../src/low/glib.ts";
import { gobject } from "../src/low/gobject.ts";
import { gtk4 } from "../src/low/gtk4.ts";
import { openGObjectLibrary } from "../src/low/gobject-library.ts";
import { LIB_PATHS } from "../src/low/paths/mod.ts";
import { adwSymbols } from "../src/low/generated/adw.ts";
import { gioSymbols } from "../src/low/generated/gio.ts";
import { glibSymbols } from "../src/low/generated/glib.ts";
import { gobjectSymbols } from "../src/low/generated/gobject.ts";
import { gtk4Symbols } from "../src/low/generated/gtk4.ts";

// GTK 3 and the app indicator are left out: GTK 3 can't be loaded into a
// process that runs GTK 4.
const LIBRARIES: [string, { symbols: object }, object][] = [
  ["glib", glib, glibSymbols],
  ["gobject", gobject, gobjectSymbols],
  ["gio", gio, gioSymbols],
  ["gtk4", gtk4, gtk4Symbols],
  ["adw", adw, adwSymbols],
];

Deno.test("every required native symbol binds", () => {
  const failures: string[] = [];
  let bound = 0;
  for (const [label, library, definitions] of LIBRARIES) {
    const optional = definitions as Record<string, { optional?: boolean }>;
    const symbols = library.symbols as Record<string, unknown>;
    for (const name of Object.keys(symbols)) {
      let value: unknown;
      try {
        value = symbols[name];
      } catch (error) {
        failures.push(`${label}.${name}: ${(error as Error).message}`);
        continue;
      }
      if (value != null) bound++;
      else if (!optional[name]?.optional) failures.push(`${label}.${name}`);
    }
  }
  if (failures.length) {
    throw new Error(
      `Required symbols that don't bind:\n${failures.join("\n")}`,
    );
  }
  if (bound < 1000) throw new Error(`Only ${bound} symbols bound`);
});

Deno.test("a symbol is bound once and then reused", () => {
  if (gtk4.symbols.gtk_box_new !== gtk4.symbols.gtk_box_new) {
    throw new Error("gtk_box_new was bound twice");
  }
});

Deno.test("a missing symbol fails when used, unless it is optional", () => {
  const library = openGObjectLibrary(LIB_PATHS.glib, {
    jsgtk_no_such_function: { parameters: [], result: "void" },
    jsgtk_no_such_optional_function: {
      parameters: [],
      result: "void",
      optional: true,
    },
  });
  try {
    if (library.symbols.jsgtk_no_such_optional_function != null) {
      throw new Error("a missing optional symbol should read as null");
    }
    let threw = false;
    try {
      library.symbols.jsgtk_no_such_function;
    } catch {
      threw = true;
    }
    if (!threw) throw new Error("a missing required symbol should throw");
  } finally {
    library.close();
  }
});
