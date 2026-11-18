// GIO 2.0 - Application support and I/O.
import "@sigma/deno-compat";
import { gioSymbols } from "./generated/gio.ts";
import { LIB_PATHS } from "./paths/mod.ts";

export const gio = Deno.dlopen(LIB_PATHS.gio, gioSymbols);
