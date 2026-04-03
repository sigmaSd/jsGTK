#!/usr/bin/env -S deno run --allow-ffi --allow-run --allow-net --allow-read --allow-write

import {
  Adjustment,
  Align,
  Application,
  ApplicationFlags,
  ApplicationWindow,
  Box,
  Button,
  FileDialog,
  Label,
  Orientation,
  Scale,
} from "../src/high/gtk4.ts";
import { HeaderBar, ToolbarView } from "../src/high/adw.ts";
import { EventLoop } from "../src/high/eventloop.ts";

if (typeof Deno.connect !== "function") {
  console.error("Currently this example is Deno only");
  Deno.exit(1);
}

const MPV_SOCKET = `/tmp/mpv-jsgtk-${Date.now()}.sock`;

class MpvIpc {
  private conn?: Deno.UnixConn;
  private requestId = 0;
  private pendingRequests = new Map<number, (res: unknown) => void>();
  private eventHandlers = new Map<string, (data: unknown) => void>();
  private propertyHandlers = new Map<string, (data: unknown) => void>();

  async connect() {
    try {
      this.conn = await Deno.connect({ transport: "unix", path: MPV_SOCKET });
      this.readLoop();
    } catch (e) {
      console.error("Failed to connect to MPV socket:", e);
    }
  }

  private async readLoop() {
    if (!this.conn) return;
    const reader = this.conn.readable.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value);
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line);
            this.handleMessage(msg);
          } catch (e) {
            console.error("Failed to parse MPV message:", line, e);
          }
        }
      }
    } catch (_e) {
      // IPC closed
    }
  }

  private handleMessage(msg: unknown) {
    if (typeof msg !== "object" || msg === null) return;
    const m = msg as Record<string, unknown>;

    if (m.request_id !== undefined && typeof m.request_id === "number") {
      const resolve = this.pendingRequests.get(m.request_id);
      if (resolve) {
        this.pendingRequests.delete(m.request_id);
        resolve(m);
      }
    } else if (m.event === "property-change") {
      const handler = this.propertyHandlers.get(m.name as string);
      if (handler) handler(m.data);
    } else if (m.event && typeof m.event === "string") {
      const handler = this.eventHandlers.get(m.event);
      if (handler) handler(m);
    }
  }

  async sendCommand(command: unknown[]) {
    if (!this.conn) return;
    const id = this.requestId++;
    const payload = JSON.stringify({ command, request_id: id }) + "\n";
    await this.conn.write(new TextEncoder().encode(payload));
    return new Promise((resolve) => this.pendingRequests.set(id, resolve));
  }

  async observeProperty(name: string, handler: (data: unknown) => void) {
    this.propertyHandlers.set(name, handler);
    await this.sendCommand(["observe_property", 1, name]);
  }

  onEvent(event: string, handler: (msg: unknown) => void) {
    this.eventHandlers.set(event, handler);
  }

  async setProperty(name: string, value: unknown) {
    await this.sendCommand(["set_property", name, value]);
  }

  close() {
    this.conn?.close();
  }
}

class MpvFrontend {
  private app = new Application(
    "com.sigmasd.mpv-frontend",
    ApplicationFlags.NONE,
  );
  private eventLoop = new EventLoop();
  private ipc = new MpvIpc();
  private mpvProcess?: Deno.ChildProcess;

  private win!: ApplicationWindow;
  private timeLabel!: Label;
  private durationLabel!: Label;
  private titleLabel!: Label;
  private progressScale!: Scale;
  private progressAdjustment!: Adjustment;
  private playButton!: Button;
  private volumeAdjustment!: Adjustment;

  private updatingFromIpc = false;
  private duration = 0;

  constructor() {
    this.app.onActivate(() => this.buildUI());
  }

  private buildUI() {
    this.win = new ApplicationWindow(this.app);
    this.win.setTitle("JSGTK MPV Frontend");
    this.win.setDefaultSize(500, 200);

    const header = new HeaderBar();
    this.win.setTitlebar(header);

    const openBtn = new Button("Open File");
    openBtn.onClick(() => this.openFile());
    header.packStart(openBtn);

    const mainBox = new Box(Orientation.VERTICAL, 16);
    mainBox.setMarginTop(24);
    mainBox.setMarginBottom(24);
    mainBox.setMarginStart(24);
    mainBox.setMarginEnd(24);

    this.titleLabel = new Label("No file loaded");
    this.titleLabel.setEllipsize(3); // End
    this.titleLabel.setHalign(Align.CENTER);
    mainBox.append(this.titleLabel);

    // Progress
    const progressBox = new Box(Orientation.HORIZONTAL, 12);
    this.timeLabel = new Label("00:00");
    this.durationLabel = new Label("00:00");

    this.progressAdjustment = new Adjustment(0, 0, 100, 1, 10, 0);
    this.progressScale = new Scale(
      Orientation.HORIZONTAL,
      this.progressAdjustment,
    );
    this.progressScale.setHexpand(true);
    this.progressScale.setDrawValue(false);

    this.progressScale.onValueChanged(() => {
      if (!this.updatingFromIpc) {
        const val = this.progressAdjustment.getValue();
        this.ipc.setProperty("time-pos", val);
      }
    });

    progressBox.append(this.timeLabel);
    progressBox.append(this.progressScale);
    progressBox.append(this.durationLabel);
    mainBox.append(progressBox);

    // Controls
    const controlsBox = new Box(Orientation.HORIZONTAL, 16);
    controlsBox.setHalign(Align.CENTER);

    const prevBtn = new Button();
    prevBtn.setIconName("media-skip-backward-symbolic");
    prevBtn.onClick(() => {
      this.ipc.sendCommand(["playlist-prev"]).catch(console.error);
    });

    this.playButton = new Button();
    this.playButton.setIconName("media-playback-start-symbolic");
    this.playButton.setHalign(Align.CENTER);
    this.playButton.setSizeRequest(48, 48);
    this.playButton.onClick(() => {
      this.ipc.sendCommand(["cycle", "pause"]).catch(console.error);
    });

    const nextBtn = new Button();
    nextBtn.setIconName("media-skip-forward-symbolic");
    nextBtn.onClick(() => {
      this.ipc.sendCommand(["playlist-next"]).catch(console.error);
    });

    controlsBox.append(prevBtn);
    controlsBox.append(this.playButton);
    controlsBox.append(nextBtn);
    mainBox.append(controlsBox);

    // Volume
    const volumeBox = new Box(Orientation.HORIZONTAL, 8);
    volumeBox.setHalign(Align.END);
    volumeBox.append(new Label("Vol:"));
    this.volumeAdjustment = new Adjustment(100, 0, 130, 1, 10, 0);
    const volumeScale = new Scale(
      Orientation.HORIZONTAL,
      this.volumeAdjustment,
    );
    volumeScale.setSizeRequest(100, -1);
    volumeScale.onValueChanged(() => {
      this.ipc.setProperty("volume", this.volumeAdjustment.getValue()).catch(
        console.error,
      );
    });
    volumeBox.append(volumeScale);
    mainBox.append(volumeBox);

    const toolbarView = new ToolbarView();
    toolbarView.setContent(mainBox);
    this.win.setChild(toolbarView);

    this.win.present();
    this.startMpv().catch(console.error);

    this.win.onCloseRequest(() => {
      this.cleanup();
      this.eventLoop.stop();
      return false;
    });
  }

  private async startMpv() {
    console.log("Starting MPV...");
    const cmd = new Deno.Command("mpv", {
      args: [
        "--idle",
        `--input-ipc-server=${MPV_SOCKET}`,
        "--no-osc",
        "--no-osd-bar",
        "--osd-level=0",
        "--input-default-bindings=no",
        "--no-config",
        "--keep-open=yes",
        "--title=MPV (JSGTK Frontend)",
      ],
      stdout: "null",
      stderr: "null",
    });
    this.mpvProcess = cmd.spawn();

    // Wait for socket
    let connected = false;
    for (let i = 0; i < 20; i++) {
      try {
        await Deno.stat(MPV_SOCKET);
        await this.ipc.connect();
        connected = true;
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    if (!connected) {
      console.error("Could not connect to MPV IPC socket.");
      return;
    }

    console.log("Connected to MPV IPC.");
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    this.ipc.observeProperty("time-pos", (val) => {
      if (typeof val === "number") {
        this.timeLabel.setText(this.formatTime(val));
        this.updatingFromIpc = true;
        this.progressAdjustment.setValue(val);
        this.updatingFromIpc = false;
      }
    }).catch(console.error);

    this.ipc.observeProperty("duration", (val) => {
      if (typeof val === "number") {
        this.duration = val;
        this.durationLabel.setText(this.formatTime(val));
        this.progressAdjustment.setProperty("upper", val);
      }
    }).catch(console.error);

    this.ipc.observeProperty("pause", (val) => {
      this.playButton.setIconName(
        val ? "media-playback-start-symbolic" : "media-playback-pause-symbolic",
      );
    }).catch(console.error);

    this.ipc.observeProperty("media-title", (val) => {
      const title = typeof val === "string" ? val : "No file loaded";
      this.titleLabel.setText(title);
      if (typeof val === "string") this.win.setTitle(`${val} - JSGTK MPV`);
    }).catch(console.error);

    this.ipc.observeProperty("volume", (val) => {
      if (typeof val === "number") {
        this.volumeAdjustment.setValue(val);
      }
    }).catch(console.error);

    this.ipc.onEvent("end-file", () => {
      this.titleLabel.setText("Playback finished");
      this.timeLabel.setText("00:00");
      this.progressAdjustment.setValue(0);
    });
  }

  private formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${
        s.toString().padStart(2, "0")
      }`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  private async openFile() {
    const dialog = new FileDialog();
    dialog.setTitle("Open Video File");
    const file = await dialog.openFile(this.win);
    if (file) {
      const path = file.getPath();
      if (path) {
        console.log("Loading file:", path);
        this.ipc.sendCommand(["loadfile", path]).catch(console.error);
      }
    }
  }

  private cleanup() {
    try {
      this.ipc.close();
      this.mpvProcess?.kill();
      Deno.removeSync(MPV_SOCKET);
    } catch (_e) {
      // Cleanup failed or already cleaned up
    }
  }

  run() {
    this.eventLoop.start(this.app);
  }
}

new MpvFrontend().run();
