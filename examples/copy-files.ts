#!/usr/bin/env -S deno run --allow-ffi --allow-read

import {
  Application,
  ApplicationFlags,
  ApplicationWindow,
  ContentProvider,
  Display,
  G_TYPE_BOOLEAN,
  Label,
} from "@sigmasd/gtk/gtk4";
// deno-lint-ignore no-import-prefix
import { resolve } from "jsr:@std/path@1.1.4";
// deno-lint-ignore no-import-prefix
import { readAll } from "jsr:@std/io@0.225.3";

const app = new Application("org.gtk.copyfiles", ApplicationFlags.NONE);

let input: string[] = [];
if (Deno.args.length > 0) {
  input = Deno.args;
} else if (!Deno.stdin.isTerminal()) {
  const decoder = new TextDecoder();
  const buffer = await readAll(Deno.stdin);
  input = decoder.decode(buffer)
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

app.onActivate(() => {
  if (input.length === 0) {
    console.error("No files provided.");
    console.log(
      "Usage: deno run --allow-ffi --allow-read examples/copy-files.ts file1 file2 ...",
    );
    console.log(
      "   or: ls | deno run --allow-ffi --allow-read examples/copy-files.ts",
    );
    app.quit();
    return;
  }

  const uris = input.map((f) => {
    try {
      const absolutePath = resolve(f);
      return `file://${absolutePath}`;
    } catch (e) {
      console.error(`Could not resolve path: ${f}`, e);
      return null;
    }
  }).filter((u) => u !== null) as string[];

  if (uris.length === 0) {
    console.error("No valid files found.");
    app.quit();
    return;
  }

  const win = new ApplicationWindow(app);
  win.setTitle("Copy Files");
  win.setDefaultSize(300, 100);

  const label = new Label(`Copying ${uris.length} files...`);
  win.setChild(label);

  let copied = false;

  // Wait for window to be active (focused) before writing to clipboard
  // This is often required by Wayland compositors to allow clipboard write
  win.onNotify("is-active", () => {
    const isActive = win.getProperty("is-active", G_TYPE_BOOLEAN);
    if (isActive && !copied) {
      const display = Display.getDefault();
      const clipboard = display?.getClipboard();
      if (!clipboard) {
        console.error("No clipboard available");
        return;
      }

      // Standard URI list: separated by \r\n
      const uriList = uris.join("\r\n") + "\r\n";
      const uriListBytes = new TextEncoder().encode(uriList);

      // GNOME specific: "copy\n" or "cut\n" followed by \n separated URIs
      const gnomeFiles = "copy\n" + uris.join("\n") + "\n";
      const gnomeFilesBytes = new TextEncoder().encode(gnomeFiles);

      const providers = [
        ContentProvider.newForBytes("text/uri-list", uriListBytes),
        ContentProvider.newForBytes(
          "x-special/gnome-copied-files",
          gnomeFilesBytes,
        ),
        ContentProvider.newForBytes(
          "application/vnd.portal.files",
          uriListBytes,
        ),
        ContentProvider.newForBytes(
          "application/vnd.portal.filetransfer",
          uriListBytes,
        ),
        ContentProvider.newForBytes(
          "text/plain",
          new TextEncoder().encode(uris.join("\n")),
        ),
      ];

      const content = ContentProvider.newUnion(providers);

      clipboard.setContent(content);
      copied = true;

      label.setText("Copied! Keep window open.");
      console.log("Content automatically set to clipboard.");
    }
  });

  win.present();
});

app.run([]);
