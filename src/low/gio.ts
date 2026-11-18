// GIO 2.0 - Application support and I/O.
import "@sigma/deno-compat";
import { gioSymbols } from "./generated/gio.ts";
import { openGObjectLibrary } from "./gobject-library.ts";
import { LIB_PATHS } from "./paths/mod.ts";

export const gio = openGObjectLibrary(LIB_PATHS.gio, gioSymbols);
