import "@sigma/deno-compat";
import { gtk3Symbols } from "./generated/gtk3.ts";
import { LIB_PATHS } from "./paths/mod.ts";

export const gtk3 = Deno.dlopen(LIB_PATHS.gtk3, gtk3Symbols);
