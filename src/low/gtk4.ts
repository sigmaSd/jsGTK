// GTK4 - Widget toolkit FFI bindings
import "@sigma/deno-compat";
import { gtk4Symbols } from "./generated/gtk4.ts";
import { openGObjectLibrary } from "./gobject-library.ts";
import { LIB_PATHS } from "./paths/mod.ts";

export const gtk4 = openGObjectLibrary(LIB_PATHS.gtk4, gtk4Symbols);
