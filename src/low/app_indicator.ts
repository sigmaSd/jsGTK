import "@sigma/deno-compat";
import { appIndicatorSymbols } from "./generated/app_indicator.ts";
import { openGObjectLibrary } from "./gobject-library.ts";
import { LIB_PATHS } from "./paths/mod.ts";

export const app_indicator = openGObjectLibrary(
  LIB_PATHS.app_indicator,
  appIndicatorSymbols,
);
