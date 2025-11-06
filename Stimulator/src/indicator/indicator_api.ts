// Simplified indicator API stub for FFI version
// Full indicator support requires additional subprocess and DBus FFI bindings

import type { MainWindow } from "../main.ts";

export class Indicator {
  #mainWindow: MainWindow;
  #active = false;

  constructor(mainWindow: MainWindow) {
    this.#mainWindow = mainWindow;
    console.warn(
      "Indicator/tray icon support is not yet fully implemented in the FFI version.",
    );
    console.warn(
      "The application will work but won't show a system tray icon.",
    );
  }

  activate() {
    this.#active = true;
    // TODO: Implement actual indicator activation
    // This requires AppIndicator3 FFI bindings or StatusNotifier support
  }

  deactivate() {
    this.#active = false;
    // TODO: Implement actual indicator deactivation
  }

  hide() {
    // TODO: Implement hiding the indicator
  }

  close() {
    // TODO: Implement closing the indicator
  }

  showShowButton() {
    // TODO: Implement showing the show button in indicator menu
  }

  hideShowButton() {
    // TODO: Implement hiding the show button in indicator menu
  }

  isActive(): boolean {
    return this.#active;
  }
}
