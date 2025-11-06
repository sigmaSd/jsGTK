#!/usr/bin/env -S deno run --allow-read=./src/locales --allow-ffi --allow-env --unstable-ffi

import {
  AboutDialog,
  ADW_RESPONSE_DESTRUCTIVE,
  Application,
  Builder,
  GTK_APPLICATION_INHIBIT_IDLE,
  GTK_APPLICATION_INHIBIT_SUSPEND,
  HeaderBar,
  initAdwaita,
  Menu,
  MenuButton,
  MessageDialog,
  SimpleAction,
  Widget,
  Window,
} from "../../gtk-ffi.ts";

import { APP_ID, APP_NAME, UI_LABELS, VERSION } from "./consts.ts";
import { Indicator } from "./indicator/indicator_api.ts";
import { PreferencesMenu, type Theme } from "./pref-win.ts";
import type { Behavior } from "./pref-win.ts";

import stimulatorUi from "./ui/stimulator.ui" with { type: "text" };
import shortcutsUi from "./ui/shortcuts.ui" with { type: "text" };
import _mainCss from "./main.css" with { type: "text" };

type Flags = "logout" | "switch" | "suspend" | "idle";
export type TimerDuration =
  | "5"
  | "15"
  | "30"
  | "60"
  | "120"
  | "240"
  | "Never";

interface State {
  logout: boolean;
  switch: boolean;
  suspend: boolean;
  idle: boolean | "active_disabled";
  themeV2: Theme;
  exitBehaviorV2: Behavior;
  suspendTimer: TimerDuration;
  idleTimer: TimerDuration;
  version: number;
}

export class MainWindow {
  #app: Application;
  #win?: Widget;
  #mainIcon?: Widget;
  #suspendRow?: Widget;
  #idleRow?: Widget;
  #preferencesMenu?: PreferencesMenu;
  #indicator?: Indicator;
  #suspendTimerId?: number;
  #idleTimerId?: number;
  #suspendRemainingMinutes?: number;
  #idleRemainingMinutes?: number;
  #suspendCookie?: number;
  #idleCookie?: number;
  #shortcutsWindow?: Widget;
  #updatingInternally = false;

  get state() {
    return this.#state;
  }
  get indicator() {
    return this.#indicator;
  }
  set indicator(value) {
    this.#indicator = value;
  }

  #state: State = {
    logout: false,
    switch: false,
    suspend: false,
    idle: false,
    themeV2: "System Theme",
    exitBehaviorV2: "Ask Confirmation",
    suspendTimer: "Never",
    idleTimer: "Never",
    version: 1,
  };

  constructor(app: Application) {
    localStorage.clear();
    const savedState = localStorage.getItem("state");
    if (savedState) {
      const parsedSavedState = JSON.parse(savedState);
      if (parsedSavedState.version === this.#state.version) {
        this.#state = { ...this.#state, ...parsedSavedState };
      }
    }

    // Set theme using createGObject for style manager
    const _colorScheme = this.#state.themeV2 === "System Theme"
      ? 0
      : this.#state.themeV2 === "Light"
      ? 1
      : 2;
    // TODO: Implement style manager color scheme setting

    if (this.#state.exitBehaviorV2 === "Run in Background") {
      this.#indicator = new Indicator(this);
    }

    this.#app = app;

    // Build UI from file
    this.#buildUI();

    console.log("Window created with title:", APP_NAME);

    // Setup actions
    this.#createAction("preferences", this.#showPreferences);
    this.#createAction("about", this.#showAbout);
    this.#createAction("shortcuts", this.#showShortcuts);
    this.#createAction("quit", () => {
      if (!this.#onCloseRequest()) this.#app.quit();
    });
    this.#createAction("close", () => {
      if (!this.#onCloseRequest()) this.#app.quit();
    });

    // Set up keyboard shortcuts
    this.#setupAccelerators();

    // Restore state - skip toggle methods during initialization
    console.log("Restoring state...");

    // Initialize idle row sensitivity based on suspend state
    if (this.#idleRow) {
      console.log("Initializing idle row sensitive to:", this.#state.suspend);
      this.#idleRow.setProperty("sensitive", this.#state.suspend);
    }

    if (this.#state.idle === "active_disabled") {
      if (this.#idleRow) {
        this.#idleRow.setProperty("active", true);
      }
    } else {
      if (this.#idleRow) {
        this.#idleRow.setProperty("active", this.#state.idle);
      }
    }
    // Don't call toggle methods here - they'll be triggered by property changes

    if (this.#suspendRow) {
      this.#suspendRow.setProperty("active", this.#state.suspend);
    }
    // Don't call toggle methods here - they'll be triggered by property changes

    this.#preferencesMenu = new PreferencesMenu(this);
    const win = this.getWindow();
    if (win) {
      this.#preferencesMenu.setTransientFor(win);
    }
    console.log("MainWindow constructor completed");
  }

  #buildUI() {
    console.log("Building UI from file...");

    // Create builder and load UI
    const builder = new Builder();
    const success = builder.addFromString(stimulatorUi);

    if (!success) {
      console.error("Failed to load UI from stimulator.ui");
      return;
    }

    console.log("UI file loaded successfully");

    // Get the main window from builder
    const win = builder.getWidget("mainWindow");
    if (!win) {
      console.error("Could not find mainWindow in UI file");
      return;
    }
    this.#win = win;
    this.#win.setApplication(this.#app);
    this.#win.setProperty("title", APP_NAME);

    // Connect close-request signal
    this.#win.connect("close-request", () => {
      return this.#onCloseRequest() ? 1 : 0;
    });

    // Get the main icon
    this.#mainIcon = builder.getWidget("mainIcon") ?? undefined;
    if (this.#mainIcon) {
      console.log("Main icon loaded");
    }

    // Get the suspend row
    this.#suspendRow = builder.getWidget("suspendRow") ?? undefined;
    if (this.#suspendRow) {
      this.#suspendRow.setProperty(
        "title",
        UI_LABELS["Disable Automatic Suspending"],
      );
      this.#suspendRow.setProperty(
        "subtitle",
        UI_LABELS["Current state: System default"],
      );
      this.#suspendRow.connect("notify::active", () => {
        console.log("Suspend row notify::active signal triggered");
        const active = this.#suspendRow!.getProperty("active") as boolean;
        console.log("Suspend row active state:", active);
        this.#toggleSuspend(active);
      });
      console.log("Suspend row loaded");
    }

    // Get the idle row
    this.#idleRow = builder.getWidget("idleRow") ?? undefined;
    if (this.#idleRow) {
      this.#idleRow.setProperty(
        "title",
        UI_LABELS["Disable Screen Blanking and Locking"],
      );
      this.#idleRow.setProperty(
        "subtitle",
        UI_LABELS["Current state: System default"],
      );
      this.#idleRow.connect("notify::active", () => {
        console.log("Idle row notify::active signal triggered");
        const active = this.#idleRow!.getProperty("active") as boolean;
        console.log("Idle row active state:", active);
        this.#toggleIdle(active);
      });
      console.log("Idle row loaded");
    }

    // Add header bar with menu
    this.#buildHeaderBar();

    console.log("UI building complete");
  }

  #buildHeaderBar() {
    // Create header bar
    const headerBar = new HeaderBar();

    // Create menu
    const menu = new Menu();
    menu.append(UI_LABELS.Preferences, "app.preferences");
    menu.append(
      UI_LABELS["Keyboard Shortcuts"] || "Keyboard Shortcuts",
      "app.shortcuts",
    );
    menu.append(UI_LABELS["About Stimulator"], "app.about");

    // Create menu button
    const menuButton = new MenuButton();
    menuButton.setIconName("open-menu-symbolic");
    menuButton.setMenuModel(menu);
    menuButton.setPrimary(true);

    // Pack menu button into header
    headerBar.packStart(menuButton);

    // Set as window titlebar
    if (this.#win) {
      this.#win.setTitlebar(headerBar);
    }
  }

  present() {
    console.log("MainWindow.present() called");
    if (this.#win) {
      this.#win.setProperty("visible", true);
      console.log("Window visibility set to true");
    }
  }

  updateState(state: Partial<State>) {
    this.#state = { ...this.#state, ...state };
    localStorage.setItem("state", JSON.stringify(this.#state));

    if (
      state.suspendTimer !== undefined &&
      this.#suspendRow &&
      (this.#suspendRow!.getProperty("active") as boolean)
    ) {
      this.#restartSuspendTimer();
    }
    if (
      state.idleTimer !== undefined &&
      this.#idleRow &&
      (this.#idleRow!.getProperty("active") as boolean)
    ) {
      this.#restartIdleTimer();
    }
  }

  quit() {
    this.#app.quit();
  }

  getWindow(): Widget | undefined {
    return this.#win;
  }

  #updateIcon() {
    if (!this.#mainIcon) return;

    const suspendActive = this.#state.suspend;
    const idleActive = this.#state.idle === true;
    const isActive = suspendActive || idleActive;

    const iconName = isActive
      ? "io.github.sigmasd.stimulator_active"
      : "io.github.sigmasd.stimulator_inactive";

    this.#mainIcon.setProperty("icon-name", iconName);
    console.log("Icon updated to:", iconName);
  }

  #showPreferences = () => {
    if (this.#preferencesMenu) {
      this.#preferencesMenu.present();
    }
  };

  #showShortcuts = () => {
    if (!this.#shortcutsWindow) {
      const builder = new Builder();
      const success = builder.addFromString(shortcutsUi);
      if (success) {
        this.#shortcutsWindow = builder.getWidget("shortcutsWin") ?? undefined;
        if (this.#shortcutsWindow) {
          this.#shortcutsWindow.setTransientForWidget(this.#win!);
        }
      }
    }
    if (this.#shortcutsWindow) {
      this.#shortcutsWindow.setProperty("visible", true);
    }
  };

  #onCloseRequest = (): boolean => {
    // Simple implementation - just check if we should run in background
    if (
      this.#state.exitBehaviorV2 === "Run in Background" &&
      this.#state.suspend
    ) {
      console.log("Running in background mode (tray icon not yet implemented)");
      return true;
    }

    if (
      this.#state.exitBehaviorV2 === "Ask Confirmation" &&
      this.#state.suspend
    ) {
      this.#showCloseConfirmation();
      return true; // Prevent close, let dialog handle it
    }

    return false;
  };

  #showCloseConfirmation = () => {
    const dialog = new MessageDialog(
      this.#win as unknown as Window,
      UI_LABELS["Stimulator is active"] || "Stimulator is active",
      "Closing will deactivate Stimulator",
    );

    dialog.addResponse("cancel", UI_LABELS.Cancel || "Cancel");
    dialog.addResponse("close", "Close Stimulator");

    dialog.setResponseAppearance("close", ADW_RESPONSE_DESTRUCTIVE);
    dialog.setDefaultResponse("cancel");
    dialog.setCloseResponse("cancel");

    dialog.onResponse((response: string) => {
      console.log("Dialog response:", response);
      if (response === "close") {
        // User confirmed, quit the app
        this.#app.quit();
      }
      // If cancel, do nothing (window stays open)
    });

    dialog.setProperty("visible", true);
  };

  #createAction(name: string, callback: () => void) {
    const action = new SimpleAction(name);
    action.connect("activate", callback);
    this.#app.addAction(action);
    console.log(`Action ${name} registered`);
  }

  #setupAccelerators() {
    // Set keyboard shortcuts for actions
    this.#app.setAccelsForAction("app.preferences", ["<Ctrl>comma"]);
    this.#app.setAccelsForAction("app.shortcuts", ["<Ctrl>question", "F1"]);
    this.#app.setAccelsForAction("app.quit", ["<Ctrl>q"]);
    console.log("Keyboard accelerators registered");
  }

  #toggleSuspend(active: boolean) {
    console.log("toggleSuspend called with:", active);
    if (!this.#suspendRow || this.#updatingInternally) {
      console.log(
        "toggleSuspend: suspend row not available yet or updating internally",
      );
      return;
    }

    // Enable/disable idle row based on suspend state
    if (this.#idleRow) {
      console.log("Setting idle row sensitive to:", active);
      this.#idleRow.setProperty("sensitive", active);
      const isSensitive = this.#idleRow.getProperty("sensitive") as boolean;
      console.log("Idle row sensitive after setting:", isSensitive);

      // If suspend is being disabled, also disable idle
      if (!active) {
        const idleActive = this.#idleRow.getProperty("active") as boolean;
        if (idleActive) {
          this.#updatingInternally = true;
          this.#idleRow.setProperty("active", false);
          this.#updatingInternally = false;
        }
      }
    }

    if (active) {
      const totalMinutes = this.#state.suspendTimer === "Never"
        ? 0
        : parseInt(this.#state.suspendTimer);

      // Inhibit suspend
      this.#suspendCookie = this.#app.inhibit(
        this.#win ?? null,
        GTK_APPLICATION_INHIBIT_SUSPEND,
        "Stimulator is preventing the system from suspending",
      );
      console.log("Suspend inhibit: ON, cookie:", this.#suspendCookie);

      const subtitle = "Active";
      console.log("Setting suspend row subtitle to:", subtitle);
      if (this.#suspendRow) {
        this.#suspendRow.setProperty(
          "subtitle",
          subtitle,
        );
        const actualSubtitle = this.#suspendRow.getProperty("subtitle");
        console.log("Suspend row subtitle after setting:", actualSubtitle);
      }

      if (totalMinutes > 0) {
        this.#suspendRemainingMinutes = totalMinutes;
        this.#suspendTimerId = setInterval(() => {
          if (this.#suspendRemainingMinutes !== undefined) {
            this.#suspendRemainingMinutes--;
            this.#updateSuspendSubtitle();
            if (this.#suspendRemainingMinutes <= 0) {
              if (this.#suspendRow) {
                this.#suspendRow.setProperty("active", false);
              }
            }
          }
        }, 60000);
        this.#updateSuspendSubtitle();
      }

      this.updateState({ suspend: true });
      this.#updateIcon();

      if (this.#state.exitBehaviorV2 === "Run in Background") {
        this.#indicator?.activate();
      }
    } else {
      // Uninhibit suspend
      if (this.#suspendCookie !== undefined) {
        this.#app.uninhibit(this.#suspendCookie);
        this.#suspendCookie = undefined;
      }
      console.log("Suspend inhibit: OFF");

      if (this.#suspendTimerId !== undefined) {
        clearInterval(this.#suspendTimerId);
        this.#suspendTimerId = undefined;
      }

      const subtitle = UI_LABELS["Current state: System default"] ||
        "Current state: System default";
      console.log("Resetting suspend row subtitle to:", subtitle);
      if (this.#suspendRow) {
        this.#suspendRow.setProperty(
          "subtitle",
          subtitle,
        );
        const actualSubtitle = this.#suspendRow.getProperty("subtitle");
        console.log("Suspend row subtitle after reset:", actualSubtitle);
      }

      this.updateState({ suspend: false });
      this.#updateIcon();
      this.#indicator?.deactivate();
    }
  }

  #updateSuspendSubtitle() {
    if (!this.#suspendRow) return;

    const totalMins = this.#suspendRemainingMinutes ?? 0;
    if (totalMins > 0) {
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;

      const hourText = hours > 0
        ? hours === 1
          ? `${hours} ${UI_LABELS.hour || "hour"}`
          : `${hours} ${UI_LABELS.hours || "hours"}`
        : "";
      const minText = mins > 0
        ? `${mins} ${UI_LABELS.minutes || "minutes"}`
        : "";

      const timeText = [hourText, minText].filter((t) => t).join(" ");
      const subtitle = `Active - ${timeText} remaining`;
      this.#suspendRow.setProperty("subtitle", subtitle);
    }
  }

  #restartSuspendTimer() {
    if (this.#suspendTimerId !== undefined) {
      clearInterval(this.#suspendTimerId);
    }

    const totalMinutes = this.#state.suspendTimer === "Never"
      ? 0
      : parseInt(this.#state.suspendTimer);

    if (totalMinutes > 0) {
      this.#suspendRemainingMinutes = totalMinutes;
      this.#suspendTimerId = setInterval(() => {
        if (this.#suspendRemainingMinutes !== undefined) {
          this.#suspendRemainingMinutes--;
          this.#updateSuspendSubtitle();
          if (this.#suspendRemainingMinutes <= 0) {
            if (this.#suspendRow) {
              this.#suspendRow.setProperty("active", false);
            }
          }
        }
      }, 60000);
      this.#updateSuspendSubtitle();
    }
  }

  #toggleIdle(active: boolean) {
    console.log("toggleIdle called with:", active);
    if (!this.#idleRow || this.#updatingInternally) {
      console.log(
        "toggleIdle: idle row not available yet or updating internally",
      );
      return;
    }

    if (active) {
      const totalMinutes = this.#state.idleTimer === "Never"
        ? 0
        : parseInt(this.#state.idleTimer);

      // Inhibit idle
      this.#idleCookie = this.#app.inhibit(
        this.#win ?? null,
        GTK_APPLICATION_INHIBIT_IDLE,
        "Stimulator is preventing the system from going idle",
      );
      console.log("Idle inhibit: ON, cookie:", this.#idleCookie);

      if (this.#idleRow) {
        this.#idleRow.setProperty(
          "subtitle",
          "Active",
        );
      }

      if (totalMinutes > 0) {
        this.#idleRemainingMinutes = totalMinutes;
        this.#idleTimerId = setInterval(() => {
          if (this.#idleRemainingMinutes !== undefined) {
            this.#idleRemainingMinutes--;
            this.#updateIdleSubtitle();
            if (this.#idleRemainingMinutes <= 0) {
              if (this.#idleRow) {
                this.#idleRow.setProperty("active", false);
              }
            }
          }
        }, 60000);
        this.#updateIdleSubtitle();
      }

      this.updateState({ idle: true });
      this.#updateIcon();
    } else {
      // Uninhibit idle
      if (this.#idleCookie !== undefined) {
        this.#app.uninhibit(this.#idleCookie);
        this.#idleCookie = undefined;
      }
      console.log("Idle inhibit: OFF");

      if (this.#idleTimerId !== undefined) {
        clearInterval(this.#idleTimerId);
        this.#idleTimerId = undefined;
      }

      if (this.#idleRow) {
        this.#idleRow.setProperty(
          "subtitle",
          UI_LABELS["Current state: System default"] ||
            "Current state: System default",
        );
      }

      this.updateState({ idle: false });
      this.#updateIcon();
    }
  }

  #updateIdleSubtitle() {
    if (!this.#idleRow) return;

    const totalMins = this.#idleRemainingMinutes ?? 0;
    if (totalMins > 0) {
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;

      const hourText = hours > 0
        ? hours === 1
          ? `${hours} ${UI_LABELS.hour || "hour"}`
          : `${hours} ${UI_LABELS.hours || "hours"}`
        : "";
      const minText = mins > 0
        ? `${mins} ${UI_LABELS.minutes || "minutes"}`
        : "";

      const timeText = [hourText, minText].filter((t) => t).join(" ");
      const subtitle = `Active - ${timeText} remaining`;
      this.#idleRow.setProperty("subtitle", subtitle);
    }
  }

  #restartIdleTimer() {
    if (this.#idleTimerId !== undefined) {
      clearInterval(this.#idleTimerId);
    }

    const totalMinutes = this.#state.idleTimer === "Never"
      ? 0
      : parseInt(this.#state.idleTimer);

    if (totalMinutes > 0) {
      this.#idleRemainingMinutes = totalMinutes;
      this.#idleTimerId = setInterval(() => {
        if (this.#idleRemainingMinutes !== undefined) {
          this.#idleRemainingMinutes--;
          this.#updateIdleSubtitle();
          if (this.#idleRemainingMinutes <= 0) {
            if (this.#idleRow) {
              this.#idleRow.setProperty("active", false);
            }
          }
        }
      }, 60000);
      this.#updateIdleSubtitle();
    }
  }

  #showAbout = () => {
    const aboutDialog = new AboutDialog();
    aboutDialog.setApplicationName(APP_NAME);
    aboutDialog.setVersion(VERSION);
    aboutDialog.setDeveloperName("Bedis Nbiba");
    aboutDialog.setComments("Prevent your computer from going to sleep");
    if (this.#win) {
      aboutDialog.setTransientFor(this.#win);
    }
    aboutDialog.setModal(true);
    aboutDialog.show();
  };
}

class App {
  #app: Application;
  #win?: MainWindow;

  constructor(applicationId: string) {
    initAdwaita();
    this.#app = new Application(applicationId, 0);

    this.#app.connect("activate", () => {
      console.log("Application activated");
      if (!this.#win) {
        console.log("Creating main window");
        try {
          this.#win = new MainWindow(this.#app);
          console.log("Main window constructed successfully");
        } catch (e) {
          console.error("ERROR creating main window:", e);
          throw e;
        }
      }
      console.log("About to call present(), window exists:", !!this.#win);
      console.log("Window has present method:", typeof this.#win.present);
      if (this.#win && this.#win.present) {
        this.#win.present();
      } else {
        console.error("ERROR: Window or present method not available!");
      }
      this.#win.indicator?.hideShowButton();
    });
  }

  run() {
    console.log("Running application...");
    const result = this.#app.run([]);
    console.log("Application exited with code:", result);
    return result;
  }
}

if (import.meta.main) {
  console.log("Starting Stimulator...");
  const app = new App(APP_ID);
  const exitCode = app.run();
  console.log("Stimulator exited with code:", exitCode);
}
