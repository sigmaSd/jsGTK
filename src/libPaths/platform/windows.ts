import { findLib } from "../findLib.ts";
import type { LibPaths } from "../types.ts";

const SEARCH_DIRS = [
  "C:/tools/msys64/mingw64/bin", // MSYS2/MinGW64
];

export const windowsLibPaths: LibPaths = {
  gtk4: findLib("libgtk-4-1.dll", SEARCH_DIRS),
  gtk3: findLib("libgtk-3-0.dll", SEARCH_DIRS),
  app_indicator: findLib("libayatana-appindicator3-1.dll", SEARCH_DIRS),
  adwaita: findLib("libadwaita-1-0.dll", SEARCH_DIRS),
  glib: findLib("libglib-2.0-0.dll", SEARCH_DIRS),
  gobject: findLib("libgobject-2.0-0.dll", SEARCH_DIRS),
  gio: findLib("libgio-2.0-0.dll", SEARCH_DIRS),
  cairo: findLib("libcairo-2.dll", SEARCH_DIRS),
};
