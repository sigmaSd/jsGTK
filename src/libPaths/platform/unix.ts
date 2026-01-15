import { findLib } from "../findLib.ts";
import type { LibPaths } from "../types.ts";

const SEARCH_DIRS = [
  "/usr/lib",
  "/usr/local/lib",
  "/run/current-system/sw/lib", // NixOS
];

export const unixLibPaths: LibPaths = {
  gtk: findLib("libgtk-4.so.1", SEARCH_DIRS),
  adwaita: findLib("libadwaita-1.so.0", SEARCH_DIRS),
  glib: findLib("libglib-2.0.so.0", SEARCH_DIRS),
  gobject: findLib("libgobject-2.0.so.0", SEARCH_DIRS),
  gio: findLib("libgio-2.0.so.0", SEARCH_DIRS),
  cairo: findLib("libcairo.so.2", SEARCH_DIRS),
};
