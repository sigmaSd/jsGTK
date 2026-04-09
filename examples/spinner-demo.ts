#!/usr/bin/env -S deno run --allow-ffi

import {
  Application,
  ApplicationFlags,
  ApplicationWindow,
  Box,
  Label,
  Orientation,
} from "@sigmasd/gtk/gtk4";
import { Spinner } from "@sigmasd/gtk/adw";

const APP_ID = "com.example.SpinnerDemo";
const APP_FLAGS = ApplicationFlags.NONE;

class SpinnerApp {
  #app: Application;
  #win?: ApplicationWindow;

  constructor() {
    this.#app = new Application(APP_ID, APP_FLAGS);

    this.#app.onActivate(() => {
      if (!this.#win) {
        this.#win = new ApplicationWindow(this.#app);
        this.#win.setTitle("Spinner Demo");
        this.#win.setDefaultSize(200, 150);

        const box = new Box(Orientation.VERTICAL, 12);
        box.setMarginTop(24);
        box.setMarginBottom(24);
        box.setMarginStart(24);
        box.setMarginEnd(24);

        const spinner = new Spinner();
        box.append(spinner);

        const label = new Label("Spinning...");
        box.append(label);

        this.#win.setChild(box);
        this.#win.present();
      }
    });
  }

  run(): number {
    return this.#app.run([]);
  }
}

if (import.meta.main) {
  const app = new SpinnerApp();
  const exitCode = app.run();
  Deno.exit(exitCode);
}
