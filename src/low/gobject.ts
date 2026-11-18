// GObject 2.0 - Object system and type system
import "@sigma/deno-compat";
import { gobjectSymbols } from "./generated/gobject.ts";
import { openGObjectLibrary } from "./gobject-library.ts";
import { LIB_PATHS } from "./paths/mod.ts";

export const gobject = openGObjectLibrary(LIB_PATHS.gobject, gobjectSymbols);
