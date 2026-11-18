import "@sigma/deno-compat";
import { gtk3Symbols } from "./generated/gtk3.ts";
import { openGObjectLibrary } from "./gobject-library.ts";
import { LIB_PATHS } from "./paths/mod.ts";

export const gtk3 = openGObjectLibrary(LIB_PATHS.gtk3, gtk3Symbols);
