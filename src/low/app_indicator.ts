import "@sigma/deno-compat";
import { appIndicatorSymbols } from "./generated/app_indicator.ts";
import { LIB_PATHS } from "./paths/mod.ts";

export const app_indicator = Deno.dlopen(
  LIB_PATHS.app_indicator,
  appIndicatorSymbols,
);
