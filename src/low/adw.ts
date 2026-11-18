// Adwaita 1 - GNOME-style widgets FFI bindings
import "@sigma/deno-compat";
import { adwSymbols } from "./generated/adw.ts";
import { openGObjectLibrary } from "./gobject-library.ts";
import { LIB_PATHS } from "./paths/mod.ts";

export const adw = openGObjectLibrary(LIB_PATHS.adwaita, adwSymbols);

// Initialize adw (and GTK) automatically when the library is loaded
// Guard against double initialization which can happen when running multiple test files in the same process
if (!adw.symbols.adw_is_initialized()) {
  adw.symbols.adw_init();
}
