import { findLib } from "../findLib.ts";
import type { LibPaths } from "../types.ts";

const SEARCH_DIRS = [
  "C:/gtk4/bin", // gvsbuild (MSVC, modern)
  "C:/tools/msys64/ucrt64/bin", // MSYS2/UCRT64
  "C:/tools/msys64/mingw64/bin", // MSYS2/MinGW64 (legacy)
];

export const windowsLibPaths: LibPaths = {
  gtk4: findLib(["gtk-4-1.dll", "libgtk-4-1.dll"], SEARCH_DIRS),
  gtk3: findLib("libgtk-3-0.dll", SEARCH_DIRS),
  app_indicator: findLib("libayatana-appindicator3-1.dll", SEARCH_DIRS),
  adwaita: findLib(["adwaita-1-0.dll", "libadwaita-1-0.dll"], SEARCH_DIRS),
  glib: findLib(["glib-2.0-0.dll", "libglib-2.0-0.dll"], SEARCH_DIRS),
  gobject: findLib(["gobject-2.0-0.dll", "libgobject-2.0-0.dll"], SEARCH_DIRS),
  gio: findLib(["gio-2.0-0.dll", "libgio-2.0-0.dll"], SEARCH_DIRS),
  cairo: findLib(["cairo-2.dll", "libcairo-2.dll"], SEARCH_DIRS),
};
