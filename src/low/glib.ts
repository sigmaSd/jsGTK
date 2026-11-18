// GLib 2.0 - Core utilities and main loop
import "@sigma/deno-compat";
import { glibSymbols } from "./generated/glib.ts";
import { LIB_PATHS } from "./paths/mod.ts";

export const glib = Deno.dlopen(LIB_PATHS.glib, {
  ...glibSymbols,
  // GLib's generated g_free is callable. This alias exposes its native address.
  g_free_ptr: { name: "g_free", type: "pointer" },
});
