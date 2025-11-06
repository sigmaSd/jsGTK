import {
  ADW_COLOR_SCHEME_DEFAULT,
  ADW_COLOR_SCHEME_FORCE_DARK,
  ADW_COLOR_SCHEME_FORCE_LIGHT,
  ComboRow,
  PreferencesGroup,
  PreferencesPage,
  PreferencesWindow,
  StringList,
  StyleManager,
  Widget,
} from "../../gtk-ffi.ts";
import { UI_LABELS } from "./consts.ts";
import { Indicator } from "./indicator/indicator_api.ts";
import type { MainWindow, TimerDuration } from "./main.ts";

export type Theme = "System Theme" | "Light" | "Dark";
export type Behavior = "Ask Confirmation" | "Run in Background" | "Quit";

export class PreferencesMenu {
  #preferencesWin: PreferencesWindow;
  #mainWindow: MainWindow;

  constructor(mainWindow: MainWindow) {
    this.#mainWindow = mainWindow;

    // Create preferences window
    this.#preferencesWin = new PreferencesWindow();
    this.#preferencesWin.setProperty("hide-on-close", true);
    this.#preferencesWin.setProperty("modal", true);
    this.buildUI();
  }

  buildUI() {
    // Timer durations and labels used by both suspend and idle timers
    const timerDurations = [
      "5",
      "15",
      "30",
      "60",
      "120",
      "240",
      "Never",
    ] as TimerDuration[];
    const timerLabels: Record<TimerDuration, string> = {
      "5": `5 ${UI_LABELS.minutes || "minutes"}`,
      "15": `15 ${UI_LABELS.minutes || "minutes"}`,
      "30": `30 ${UI_LABELS.minutes || "minutes"}`,
      "60": `1 ${UI_LABELS.hour || "hour"}`,
      "120": `2 ${UI_LABELS.hours || "hours"}`,
      "240": `4 ${UI_LABELS.hours || "hours"}`,
      "Never": UI_LABELS.Never || "Never",
    };

    // Create preferences page
    const page = new PreferencesPage();

    // Create appearance group
    const appearanceGroup = new PreferencesGroup();
    appearanceGroup.setProperty(
      "title",
      "Appearance",
    );

    // Theme row
    const themeRow = new ComboRow();
    themeRow.setProperty("title", "Theme");

    const themeItems = ["System Theme", "Light", "Dark"] as Theme[];
    const themeStringList = new StringList();
    for (const item of themeItems) {
      themeStringList.append(item);
    }
    themeRow.setModel(themeStringList);

    const initialThemeIndex = themeItems.indexOf(
      this.#mainWindow.state.themeV2,
    );
    themeRow.setProperty("selected", initialThemeIndex);

    themeRow.connect("notify::selected", () => {
      const selected = themeRow.getProperty("selected") as number;
      const theme = themeItems[selected];
      console.log("Theme changed to:", theme, "selected index:", selected);

      // Update color scheme via Adw.StyleManager
      const styleManager = StyleManager.getDefault();
      console.log("StyleManager obtained:", styleManager);
      if (theme === "System Theme") {
        console.log("Setting color scheme to DEFAULT");
        styleManager.setColorScheme(ADW_COLOR_SCHEME_DEFAULT);
      } else if (theme === "Light") {
        console.log("Setting color scheme to FORCE_LIGHT");
        styleManager.setColorScheme(ADW_COLOR_SCHEME_FORCE_LIGHT);
      } else if (theme === "Dark") {
        console.log("Setting color scheme to FORCE_DARK");
        styleManager.setColorScheme(ADW_COLOR_SCHEME_FORCE_DARK);
      }

      this.#mainWindow.updateState({ themeV2: theme });
    });

    // Add theme row to appearance group
    appearanceGroup.add(themeRow);

    // Add appearance group to page
    page.add(appearanceGroup);

    // Create behavior group
    const behaviorGroup = new PreferencesGroup();
    behaviorGroup.setProperty("title", "Behavior");

    // Behavior on exit row
    const behaviorRow = new ComboRow();
    behaviorRow.setProperty(
      "title",
      "Behavior on Closing",
    );
    behaviorRow.setProperty(
      "subtitle",
      "Applies only while active",
    );

    const behaviorItems = [
      "Ask Confirmation",
      "Run in Background",
      "Quit",
    ] as Behavior[];
    const behaviorStringList = new StringList();
    for (const item of behaviorItems) {
      behaviorStringList.append(item);
    }
    behaviorRow.setModel(behaviorStringList);

    const initialBehaviorIndex = behaviorItems.indexOf(
      this.#mainWindow.state.exitBehaviorV2,
    );
    behaviorRow.setProperty("selected", initialBehaviorIndex);

    behaviorRow.connect("notify::selected", () => {
      const selected = behaviorRow.getProperty("selected") as number;
      const behavior = behaviorItems[selected];
      console.log(
        "Behavior changed to:",
        behavior,
        "selected index:",
        selected,
      );

      if (behavior === "Run in Background") {
        if (this.#mainWindow.indicator === undefined) {
          this.#mainWindow.indicator = new Indicator(this.#mainWindow);
        }
        if (this.#mainWindow.state.suspend) {
          this.#mainWindow.indicator.activate();
        } else {
          this.#mainWindow.indicator.deactivate();
        }
      } else {
        setTimeout(() => {
          this.#mainWindow.indicator?.hide();
        }, 500);
      }

      this.#mainWindow.updateState({ exitBehaviorV2: behavior });
    });

    // Add behavior row to behavior group
    behaviorGroup.add(behaviorRow);

    // Add behavior group to page
    page.add(behaviorGroup);

    // Create timers group
    const timersGroup = new PreferencesGroup();
    timersGroup.setProperty("title", "Timers");
    timersGroup.setProperty(
      "description",
      "Automatic deactivation after a specified period",
    );

    // Suspend timer row
    const suspendTimerRow = new ComboRow();
    suspendTimerRow.setProperty(
      "title",
      "Disable Automatic Suspending",
    );

    const suspendTimerStringList = new StringList();
    for (const duration of timerDurations) {
      suspendTimerStringList.append(timerLabels[duration]);
    }
    suspendTimerRow.setModel(suspendTimerStringList);

    const initialSuspendTimerIndex = timerDurations.indexOf(
      this.#mainWindow.state.suspendTimer,
    );
    suspendTimerRow.setProperty("selected", initialSuspendTimerIndex);

    suspendTimerRow.connect("notify::selected", () => {
      const selected = suspendTimerRow.getProperty("selected") as number;
      const timer = timerDurations[selected];
      console.log(
        "Suspend timer changed to:",
        timer,
        "selected index:",
        selected,
      );
      this.#mainWindow.updateState({ suspendTimer: timer });
    });

    // Add suspend timer row to timers group
    timersGroup.add(suspendTimerRow);

    // Idle timer row
    const idleTimerRow = new ComboRow();
    idleTimerRow.setProperty(
      "title",
      "Disable Screen Blanking and Locking",
    );

    const idleTimerStringList = new StringList();
    for (const duration of timerDurations) {
      idleTimerStringList.append(timerLabels[duration]);
    }
    idleTimerRow.setModel(idleTimerStringList);

    const initialIdleTimerIndex = timerDurations.indexOf(
      this.#mainWindow.state.idleTimer,
    );
    idleTimerRow.setProperty("selected", initialIdleTimerIndex);

    idleTimerRow.connect("notify::selected", () => {
      const selected = idleTimerRow.getProperty("selected") as number;
      const timer = timerDurations[selected];
      console.log("Idle timer changed to:", timer, "selected index:", selected);
      this.#mainWindow.updateState({ idleTimer: timer });
    });

    // Add idle timer row to timers group
    timersGroup.add(idleTimerRow);

    // Add timers group to page
    page.add(timersGroup);

    // Add page to preferences window
    this.#preferencesWin.add(page);

    console.log("Preferences UI fully assembled");
  }

  present() {
    this.#preferencesWin.setProperty("visible", true);
  }

  setTransientFor(parent: Widget) {
    this.#preferencesWin.setTransientForWidget(parent);
  }
}
