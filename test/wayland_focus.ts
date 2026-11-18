import { writeFileSync } from "node:fs";
import { argv } from "node:process";
import { AdwApplicationWindow } from "../src/high/adw.ts";
import { EventLoop } from "../src/high/eventloop.ts";
import { DesktopAppInfo } from "../src/high/gio.ts";
import {
  Application,
  ApplicationFlags,
  EventControllerKey,
  Key,
  Label,
} from "../src/high/gtk4.ts";

const [role, reportPath] = argv.slice(2);
if ((role !== "target" && role !== "launcher") || !reportPath) {
  throw new Error("Expected target or launcher and a report path");
}
const targetId = "io.github.jsgtk.FocusTarget";
const app = new Application(
  role === "target" ? targetId : "io.github.jsgtk.FocusLauncher",
  ApplicationFlags.NONE,
);
const loop = new EventLoop({ pollInterval: 1 });
let window: AdwApplicationWindow | undefined;
let activations = 0;
let windows = 0;

function report() {
  writeFileSync(
    reportPath,
    JSON.stringify({ active: window?.isActive(), activations, windows }),
  );
}

app.onActivate(() => {
  activations++;
  if (!window) {
    windows++;
    const current = window = new AdwApplicationWindow(app);
    current.setTitle(role === "target" ? "Focus target" : "Focus launcher");
    current.setDefaultSize(320, 160);
    current.maximize();
    current.setContent(
      new Label(
        role === "target" ? "Already running" : "Press Enter to launch",
      ),
    );
    current.onNotify("is-active", report);

    if (role === "launcher") {
      const keys = new EventControllerKey();
      keys.onKeyPressed((key) => {
        if (key !== Key.Return) return false;
        if (!current.isActive()) {
          throw new Error(
            "Launcher must own keyboard focus before requesting activation",
          );
        }
        const target = DesktopAppInfo.fromId(`${targetId}.desktop`);
        if (!target) throw new Error("Test desktop entry not found");
        const context = current.getDisplay().getAppLaunchContext();
        try {
          target.launch([], context);
        } finally {
          context.unref();
          target.unref();
        }
        return true;
      });
      current.addController(keys);
    }
  }

  window.present();
  report();
});

await loop.start(app);
