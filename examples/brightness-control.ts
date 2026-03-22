#!/usr/bin/env -S deno run --allow-ffi --allow-read

import {
  Adjustment,
  Application,
  ApplicationFlags,
  ApplicationWindow,
  Box,
  Button,
  EventControllerKey,
  Key,
  Label,
  ModifierType,
  Orientation,
  Scale,
} from "@sigmasd/gtk/gtk4";
import { HeaderBar, ToolbarView } from "@sigmasd/gtk/adw";
import { BusType, DBusProxy, DBusProxyFlags } from "@sigmasd/gtk/gio";
import { EventLoop } from "@sigmasd/gtk/eventloop";

const APP_ID = "com.example.BrightnessControl";
const DDC_BUS = "ddccontrol.DDCControl";
const DDC_PATH = "/ddccontrol/DDCControl";
const DDC_IFACE = "ddccontrol.DDCControl";

const DDC_BRIGHTNESS = 0x10;

interface DDCMonitor {
  device: string;
  name: string;
}

function getDBusProxy(): Promise<DBusProxy> {
  const proxy = DBusProxy.newForBusSync(
    BusType.SYSTEM,
    DBusProxyFlags.NONE,
    null,
    DDC_BUS,
    DDC_PATH,
    DDC_IFACE,
  );
  if (!proxy) throw new Error("Failed to create D-Bus proxy");
  return Promise.resolve(proxy);
}

async function getMonitors(proxy: DBusProxy): Promise<DDCMonitor[]> {
  const result = await proxy.callAsyncWithStrings("GetMonitors");
  if (!result) return [];

  const devices = result.getChildValue(0);
  if (!devices) return [];

  const devicesList = devices.getStrv();
  const monitors: DDCMonitor[] = [];

  for (const device of devicesList) {
    if (device.startsWith("dev:")) {
      let name = `Monitor (${device})`;
      try {
        const openResult = await proxy.callAsyncWithStrings(
          "OpenMonitor",
          device,
        );
        if (openResult && openResult.getChildrenCount() >= 1) {
          const pnpid = openResult.getChildValue(0)?.getString();
          if (pnpid && pnpid.trim()) {
            name = pnpid.trim();
            const caps = openResult.getChildValue(1)?.getString() || "";
            const modelMatch = caps.match(/model\(([^)]+)\)/);
            if (modelMatch) {
              name = modelMatch[1];
            }
          }
        }
      } catch {
        // OpenMonitor failed, use default name
      }

      monitors.push({ device, name });
    }
  }

  return monitors;
}

async function getBrightness(
  proxy: DBusProxy,
  device: string,
): Promise<{ result: number; value: number; max: number }> {
  const result = await proxy.callAsyncWithMixed(
    "GetControl",
    device,
    DDC_BRIGHTNESS,
  );
  if (!result) return { result: -1, value: 0, max: 100 };

  const resultCode = result.getChildValue(0)?.getInt32() ?? -1;
  const value = result.getChildValue(1)?.getUint16() ?? 0;
  const max = result.getChildValue(2)?.getUint16() ?? 100;
  return { result: resultCode, value, max };
}

function setBrightness(
  proxy: DBusProxy,
  device: string,
  value: number,
): void {
  proxy.callSyncWithMixed("SetControl", device, DDC_BRIGHTNESS, value);
}

class BrightnessControlWindow {
  #win: ApplicationWindow;
  #monitors: DDCMonitor[] = [];
  #currentIndex = 0;
  #brightnessLabel!: Label;
  #adjustment!: Adjustment;
  #deviceLabel!: Label;
  #statusLabel!: Label;
  #navBox!: Box;
  #slider!: Scale;
  #mainBox!: Box;
  #proxy!: DBusProxy;
  #onClose!: () => void;
  #closing = false;
  #debounceTimeout: number | null = null;
  #generation = 0;

  #doClose() {
    this.#closing = true;
    this.#generation++;
    if (this.#debounceTimeout !== null) {
      clearTimeout(this.#debounceTimeout);
      this.#debounceTimeout = null;
    }
    this.#onClose();
  }

  constructor(app: Application, onClose: () => void) {
    this.#onClose = onClose;
    this.#win = new ApplicationWindow(app);
    this.#win.setTitle("Brightness Control");
    this.#win.setDefaultSize(450, 200);
    this.#win.setResizable(false);
    this.#win.onCloseRequest(() => {
      this.#doClose();
      return true;
    });

    const keyController = new EventControllerKey();
    keyController.onKeyPressed((keyval, _keycode, state) => {
      if (keyval === Key.q && (state & ModifierType.CONTROL_MASK) !== 0) {
        this.#doClose();
        return true;
      }
      return false;
    });
    this.#win.addController(keyController);

    this.#buildUI();
    this.#loadMonitors();
  }

  #buildUI() {
    this.#win.setTitlebar(new HeaderBar());

    this.#mainBox = new Box(Orientation.VERTICAL, 16);
    this.#mainBox.setMarginTop(24);
    this.#mainBox.setMarginBottom(24);
    this.#mainBox.setMarginStart(24);
    this.#mainBox.setMarginEnd(24);
    this.#mainBox.setVisible(false);

    this.#deviceLabel = new Label("Detecting displays...");
    this.#deviceLabel.setXalign(0);
    this.#mainBox.append(this.#deviceLabel);

    this.#statusLabel = new Label("");
    this.#statusLabel.setXalign(0);
    this.#statusLabel.setWrap(true);
    this.#mainBox.append(this.#statusLabel);

    this.#adjustment = new Adjustment(0, 0, 100, 1, 10, 0);
    this.#slider = new Scale(Orientation.HORIZONTAL, this.#adjustment);
    this.#slider.setDigits(0);
    this.#slider.setDrawValue(false);
    this.#slider.setHexpand(true);
    this.#slider.onValueChanged(() => {
      if (this.#monitors.length === 0) return;
      this.#onBrightnessChanged();
    });

    const sliderBox = new Box(Orientation.HORIZONTAL, 12);
    sliderBox.setHexpand(true);
    sliderBox.append(new Label("☀️"));
    sliderBox.append(this.#slider);
    sliderBox.append(new Label("🌞"));
    this.#mainBox.append(sliderBox);

    const percentBox = new Box(Orientation.HORIZONTAL, 8);
    percentBox.setHexpand(true);
    percentBox.append(new Label("Brightness:"));
    this.#brightnessLabel = new Label("--%");
    percentBox.append(this.#brightnessLabel);
    this.#mainBox.append(percentBox);

    this.#navBox = new Box(Orientation.HORIZONTAL, 8);
    this.#navBox.setHexpand(true);
    this.#navBox.setVisible(false);

    const prevBtn = new Button("< Prev");
    prevBtn.onClick(() => this.#selectPrev());
    this.#navBox.append(prevBtn);

    const nextBtn = new Button("Next >");
    nextBtn.onClick(() => this.#selectNext());
    this.#navBox.append(nextBtn);

    this.#mainBox.append(this.#navBox);

    const toolbarView = new ToolbarView();
    toolbarView.setContent(this.#mainBox);
    this.#win.setChild(toolbarView);
  }

  async #loadMonitors() {
    try {
      this.#proxy = await getDBusProxy();
      const allMonitors = await getMonitors(this.#proxy);

      this.#monitors = [];
      for (const monitor of allMonitors) {
        const { result, max } = await getBrightness(
          this.#proxy,
          monitor.device,
        );
        if (result >= 0 && max > 0 && max <= 1000) {
          this.#monitors.push(monitor);
        }
      }
    } catch {
      // Failed to load monitors
    }

    if (this.#monitors.length === 0) {
      this.#deviceLabel.setText("No displays found.");
      this.#statusLabel.setText(
        "Make sure ddccontrol service is running:\nsudo systemctl restart ddccontrol",
      );
      this.#mainBox.setVisible(true);
      return;
    }

    this.#mainBox.setVisible(true);
    await this.#updateUI();
  }

  #selectNext() {
    if (this.#monitors.length <= 1) return;
    this.#currentIndex = (this.#currentIndex + 1) % this.#monitors.length;
    this.#updateUI();
  }

  #selectPrev() {
    if (this.#monitors.length <= 1) return;
    this.#currentIndex = (this.#currentIndex - 1 + this.#monitors.length) %
      this.#monitors.length;
    this.#updateUI();
  }

  async #updateUI() {
    const monitor = this.#monitors[this.#currentIndex];
    this.#deviceLabel.setText(`Display: ${monitor.name}`);
    this.#navBox.setVisible(this.#monitors.length > 1);

    const { value, max } = await getBrightness(this.#proxy, monitor.device);
    const percent = max > 0 ? Math.round((value / max) * 100) : 0;

    this.#adjustment.setValue(percent);
    this.#brightnessLabel.setText(`${percent}%`);
  }

  #onBrightnessChanged() {
    if (this.#closing) return;
    const monitor = this.#monitors[this.#currentIndex];
    const percent = Math.round(this.#adjustment.getValue());
    this.#brightnessLabel.setText(`${percent}%`);
    const gen = this.#generation;

    if (this.#debounceTimeout !== null) {
      clearTimeout(this.#debounceTimeout);
    }
    this.#debounceTimeout = setTimeout(() => {
      this.#debounceTimeout = null;
      if (gen === this.#generation && !this.#closing) {
        setBrightness(this.#proxy, monitor.device, percent);
      }
    }, 50);
  }

  present() {
    this.#win.setVisible(true);
  }
}

class BrightnessControlApp {
  #app = new Application(APP_ID, ApplicationFlags.NONE);
  #eventLoop = new EventLoop();

  constructor() {
    this.#app.onActivate(() => {
      const win = new BrightnessControlWindow(this.#app, () => {
        this.#eventLoop.stop();
      });
      win.present();
    });
  }

  run() {
    this.#eventLoop.start(this.#app);
  }
}

if (import.meta.main) {
  new BrightnessControlApp().run();
}
