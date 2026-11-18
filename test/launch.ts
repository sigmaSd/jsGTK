import { AppInfo, Cancellable, DesktopAppInfo, File } from "../src/high/gio.ts";
import { Display } from "../src/high/gtk4.ts";
import { EventLoop } from "../src/high/eventloop.ts";

const testOptions = { sanitizeResources: false, sanitizeOps: false };

Deno.test(
  "GIO app discovery returns application metadata and icons",
  testOptions,
  () => {
    const apps = AppInfo.getAll();
    try {
      for (const app of apps) {
        if (!app.getName() || !app.getDisplayName()) {
          throw new Error(
            "Missing application name",
          );
        }
        const icon = app.getIcon();
        if (icon?.kind === "file" && !icon.path) {
          throw new Error(
            "Missing icon path",
          );
        }
        if (icon?.kind === "themed" && !icon.names.length) {
          throw new Error(
            "Missing theme names",
          );
        }
      }
      if (AppInfo.getDefaultForUriScheme("x-jsgtk-unregistered-test-scheme")) {
        throw new Error(
          "An unregistered scheme unexpectedly has a default application",
        );
      }
      if (DesktopAppInfo.fromId("io.github.jsgtk.Unregistered.desktop")) {
        throw new Error("An unregistered desktop entry unexpectedly exists");
      }
    } finally {
      for (const app of apps) app.unref();
    }
  },
);

Deno.test("GFile URIs round-trip without exposing native pointers", () => {
  const uri = "https://example.test/file%20name";
  const file = File.newForUri(uri);
  try {
    if (file.getUri() !== uri || file.getPath() !== null) {
      throw new Error("Unexpected URI or path for a remote file");
    }
  } finally {
    file.unref();
  }
});

Deno.test("Loading a missing file returns an empty failure result", () => {
  const file = File.newForUri(
    new URL("./__jsgtk_missing_fixture__/contents.txt", import.meta.url).href,
  );
  try {
    const [success, bytes] = file.loadContents();
    if (success || bytes.length !== 0) {
      throw new Error("A missing file should fail without contents");
    }
  } finally {
    file.unref();
  }
});

Deno.test(
  "A cancelled GIO launch rejects while the GTK event loop runs",
  testOptions,
  async () => {
    const display = Display.getDefault();
    if (!display) throw new Error("GTK did not provide a display");
    const context = display.getAppLaunchContext();
    const cancellable = new Cancellable();
    const loop = new EventLoop({ pollInterval: 1 });
    const running = loop.start();
    try {
      context.setTimestamp(0);
      context.setEnv("JSGTK_LAUNCH_TEST", "present");
      cancellable.cancel();
      const error = await AppInfo.launchDefaultForUriAsync(
        "x-jsgtk-unregistered-test-scheme:test",
        context,
        cancellable,
      )
        .then(() => null, (error: unknown) => error);
      if (!(error instanceof Error) || !error.message) {
        throw new Error(
          "Expected a native launch error",
        );
      }
    } finally {
      cancellable.unref();
      context.unref();
      loop.stop();
      await running;
    }
  },
);
