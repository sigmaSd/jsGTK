import { findLib } from "../findLib.ts";
import type { LibPaths } from "../types.ts";

const SEARCH_DIRS = [
  "/usr/lib",
  "/usr/local/lib",
  "/run/current-system/sw/lib", // NixOS
];

export const unixLibPaths: LibPaths = {
  gtk4: findLib("libgtk-4.so.1", SEARCH_DIRS),
  gtk3: findLib("libgtk-3.so.0", SEARCH_DIRS),
  app_indicator: findLib("libayatana-appindicator3.so.1", SEARCH_DIRS),
  adwaita: findLib("libadwaita-1.so.0", SEARCH_DIRS),
  glib: findLib("libglib-2.0.so.0", SEARCH_DIRS),
  gobject: findLib("libgobject-2.0.so.0", SEARCH_DIRS),
  gio: findLib("libgio-2.0.so.0", SEARCH_DIRS),
  cairo: findLib("libcairo.so.2", SEARCH_DIRS),
};
