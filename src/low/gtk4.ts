// GTK4 - Widget toolkit FFI bindings
import "@sigma/deno-compat";
import { gtk4Symbols } from "./generated/gtk4.ts";
import { LIB_PATHS } from "./paths/mod.ts";

export const gtk4 = Deno.dlopen(LIB_PATHS.gtk4, gtk4Symbols);
