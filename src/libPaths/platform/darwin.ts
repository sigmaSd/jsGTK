import { findLib } from "../findLib.ts";

const SEARCH_DIRS = [
  "/opt/homebrew/lib", // Homebrew
  "/usr/local/lib",
];

export const darwinLibPaths = {
  gtk4: findLib("libgtk-4.1.dylib", SEARCH_DIRS),
  gtk3: findLib("libgtk-3.0.dylib", SEARCH_DIRS),
  app_indicator: findLib("libayatana-appindicator3.1.dylib", SEARCH_DIRS),
  adwaita: findLib("libadwaita-1.dylib", SEARCH_DIRS),
  glib: findLib("libglib-2.0.dylib", SEARCH_DIRS),
  gobject: findLib("libgobject-2.0.dylib", SEARCH_DIRS),
  gio: findLib("libgio-2.0.dylib", SEARCH_DIRS),
  cairo: findLib("libcairo.2.dylib", SEARCH_DIRS),
};
