import { findLib } from "../findLib.ts";
import type { LibPaths } from "../types.ts";

const SEARCH_DIRS = [
  "C:/tools/msys64/mingw64/bin", // MSYS2/MinGW64
];

export const windowsLibPaths: LibPaths = {
  gtk: findLib("libgtk-4-1.dll", SEARCH_DIRS),
  adwaita: findLib("libadwaita-1-0.dll", SEARCH_DIRS),
  glib: findLib("libglib-2.0-0.dll", SEARCH_DIRS),
  gobject: findLib("libgobject-2.0-0.dll", SEARCH_DIRS),
  gio: findLib("libgio-2.0-0.dll", SEARCH_DIRS),
  cairo: findLib("libcairo-2.dll", SEARCH_DIRS),
};
