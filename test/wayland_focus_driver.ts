import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { glib } from "../src/low/glib.ts";
import { gobject } from "../src/low/gobject.ts";
import { LIB_PATHS } from "../src/low/paths/mod.ts";
import { cstr, readCStr } from "../src/low/utils.ts";

const remote = "org.gnome.Mutter.RemoteDesktop";
const remotePath = "/org/gnome/Mutter/RemoteDesktop";
const targetId = "io.github.jsgtk.FocusTarget";
const decoder = new TextDecoder();

type Report = { active?: boolean; activations?: number; windows?: number };
type Process = {
  name: string;
  child: Deno.ChildProcess;
  output: Promise<Deno.CommandOutput>;
};

async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  description: string,
): Promise<void> {
  const deadline = performance.now() + 8000;
  while (performance.now() < deadline) {
    if (await predicate()) return;
    await delay(25);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

async function report(path: string): Promise<Report> {
  try {
    return JSON.parse(await Deno.readTextFile(path));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound || error instanceof SyntaxError) {
      return {};
    }
    throw error;
  }
}

function signal(child: Deno.ChildProcess, name: Deno.Signal): void {
  try {
    child.kill(name);
  } catch (error) {
    // The process may exit on its own before cleanup.
    if (
      !(error instanceof TypeError || error instanceof Deno.errors.NotFound)
    ) throw error;
  }
}

async function stop({ child, output }: Process): Promise<Deno.CommandOutput> {
  signal(child, "SIGTERM");
  const force = setTimeout(() => signal(child, "SIGKILL"), 5000);
  try {
    return await output;
  } finally {
    clearTimeout(force);
  }
}

async function removeDirectory(directory: string): Promise<void> {
  const deadline = performance.now() + 5000;
  while (true) {
    try {
      await Deno.remove(directory, { recursive: true });
      return;
    } catch (error) {
      // The document portal can take a moment to unmount after the private bus exits.
      if (
        performance.now() >= deadline ||
        !(error instanceof Deno.errors.NotConnected ||
          error instanceof Deno.errors.Busy)
      ) throw error;
      await delay(100);
    }
  }
}

async function run(
  runtime: "deno" | "bun" | "node",
  directory: string,
): Promise<void> {
  const busSocket = join(directory, "bus");
  const busAddress = `unix:path=${encodeURIComponent(busSocket)}`;
  const display = "jsgtk-test";
  const cache = Deno.env.get("XDG_CACHE_HOME") || join(homedir(), ".cache");
  const env = {
    ...Deno.env.toObject(),
    DBUS_SESSION_BUS_ADDRESS: busAddress,
    XDG_RUNTIME_DIR: directory,
    TMPDIR: directory,
    XDG_CONFIG_HOME: join(directory, "config"),
    XDG_CACHE_HOME: join(directory, "cache"),
    XDG_DATA_HOME: join(directory, "data"),
    DENO_DIR: Deno.env.get("DENO_DIR") || join(cache, "deno"),
    GSETTINGS_BACKEND: "memory",
    GIO_USE_VFS: "local",
    GTK_A11Y: "none",
    GDK_BACKEND: "wayland",
    GTK_USE_PORTAL: "0",
    WAYLAND_DISPLAY: display,
  };
  const apps = join(env.XDG_DATA_HOME, "applications");
  await Deno.mkdir(apps, { recursive: true });
  await Deno.writeTextFile(
    join(apps, `${targetId}.desktop`),
    "[Desktop Entry]\nType=Application\nName=jsGTK Focus Target\n" +
      "Exec=/bin/true\nStartupNotify=true\nDBusActivatable=true\n",
  );

  const processes: Process[] = [];
  function start(name: string, command: string, args: string[]) {
    const child = new Deno.Command(command, {
      args,
      env,
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    processes.push({ name, child, output: child.output() });
  }

  // Connect explicitly to this test's bus. Every Mutter call must use the same connection.
  const busApi = Deno.dlopen(LIB_PATHS.gio, {
    g_dbus_connection_new_for_address_sync: {
      parameters: ["buffer", "u32", "pointer", "pointer", "pointer"],
      result: "pointer",
    },
    g_dbus_connection_call_sync: {
      parameters: [
        "pointer",
        "buffer",
        "buffer",
        "buffer",
        "buffer",
        "pointer",
        "pointer",
        "u32",
        "i32",
        "pointer",
        "pointer",
      ],
      result: "pointer",
    },
  });
  const variantApi = Deno.dlopen(LIB_PATHS.glib, {
    g_variant_parse: {
      parameters: ["pointer", "buffer", "pointer", "pointer", "pointer"],
      result: "pointer",
    },
    g_variant_print: { parameters: ["pointer", "bool"], result: "pointer" },
  });
  const bus = busApi.symbols;
  const variant = variantApi.symbols;
  let connection: Deno.PointerValue = null;

  function call(
    destination: string,
    path: string,
    interfaceName: string,
    member: string,
    tuple?: string,
  ): string {
    const args = tuple
      ? variant.g_variant_parse(null, cstr(tuple), null, null, null)
      : null;
    if (tuple && !args) {
      throw new Error(`Invalid D-Bus argument tuple: ${tuple}`);
    }
    try {
      const reply = bus.g_dbus_connection_call_sync(
        connection,
        cstr(destination),
        cstr(path),
        cstr(interfaceName),
        cstr(member),
        args,
        null,
        0,
        3000,
        null,
        null,
      );
      if (!reply) {
        throw new Error(`D-Bus call failed: ${interfaceName}.${member}`);
      }
      const printed = variant.g_variant_print(reply, true);
      try {
        return readCStr(printed);
      } finally {
        glib.symbols.g_free(printed);
        glib.symbols.g_variant_unref(reply);
      }
    } finally {
      if (args) glib.symbols.g_variant_unref(args);
    }
  }

  const target = join(directory, "target.json");
  const launcher = join(directory, "launcher.json");
  const fixture = join(import.meta.dirname!, "wayland_focus.ts");
  const runtimeArgs = {
    deno: [
      "run",
      "--node-modules-dir=none",
      "--allow-ffi",
      "--allow-env",
      `--allow-write=${directory}`,
    ],
    bun: ["run"],
    node: ["--experimental-strip-types"],
  };
  let passed = false;
  try {
    start("D-Bus", "dbus-daemon", [
      "--session",
      "--nofork",
      `--address=${busAddress}`,
    ]);
    await waitFor(() => exists(busSocket), "the private D-Bus socket");
    start("Mutter", "mutter", [
      "--headless",
      "--wayland",
      "--no-x11",
      "--virtual-monitor=800x600",
      `--wayland-display=${display}`,
    ]);
    await waitFor(
      () => exists(join(directory, display)),
      "Mutter's Wayland socket",
    );
    // AUTHENTICATION_CLIENT | MESSAGE_BUS_CONNECTION
    connection = bus.g_dbus_connection_new_for_address_sync(
      cstr(busAddress),
      9,
      null,
      null,
      null,
    );
    if (!connection) {
      throw new Error("Could not connect to the private D-Bus session");
    }
    await waitFor(
      () =>
        call(
          "org.freedesktop.DBus",
          "/org/freedesktop/DBus",
          "org.freedesktop.DBus",
          "NameHasOwner",
          `('${remote}',)`,
        ) === "(true,)",
      "Mutter's isolated input service",
    );
    const created = call(remote, remotePath, remote, "CreateSession");
    const sessionPath = /^\(objectpath '(\/[\w/]+)',\)$/.exec(created)?.[1];
    if (!sessionPath) {
      throw new Error(`Mutter did not return a session path: ${created}`);
    }
    const session = (member: string, tuple?: string) =>
      call(remote, sessionPath, `${remote}.Session`, member, tuple);
    session("Start");
    try {
      const key = (code: number) => {
        for (const pressed of [true, false]) {
          session("NotifyKeyboardKeycode", `(uint32 ${code}, ${pressed})`);
        }
      };
      // Mutter creates the virtual keyboard on the first event.
      key(42);
      for (
        const [role, receipt] of [["target", target], ["launcher", launcher]]
      ) {
        start(role, runtime, [...runtimeArgs[runtime], fixture, role, receipt]);
        await waitFor(
          async () => (await report(receipt)).windows === 1,
          `${role} to create its window`,
        );
        if (!(await report(receipt)).active) {
          session("NotifyPointerMotionRelative", "(-2000.0, -2000.0)");
          session("NotifyPointerMotionRelative", "(400.0, 300.0)");
          await delay(150);
          for (const pressed of [true, false]) {
            session("NotifyPointerButton", `(272, ${pressed})`);
          }
        }
        await waitFor(
          async () => (await report(receipt)).active === true,
          `${role} to get focus`,
        );
      }
      await waitFor(
        async () => (await report(target)).active === false,
        "the target to lose focus",
      );
      key(28); // Enter in the focused launcher.
      await waitFor(async () => {
        const current = await report(target);
        return current.active === true && current.activations === 2 &&
          current.windows === 1;
      }, "the existing target to regain focus without opening another window");
      passed = true;
    } finally {
      session("Stop");
    }
  } finally {
    if (connection) gobject.symbols.g_object_unref(connection);
    variantApi.close();
    busApi.close();
    for (const process of processes.reverse()) {
      const { stdout, stderr } = await stop(process);
      if (!passed) {
        const log = decoder.decode(stdout) + decoder.decode(stderr);
        if (log.trim()) console.error(`${process.name}\n${log.trimEnd()}`);
      }
    }
    if (!passed) {
      console.error({
        target: await report(target),
        launcher: await report(launcher),
      });
    }
  }
}

const [runtime = "deno", ...extra] = Deno.args;
if (Deno.build.os !== "linux") {
  throw new Error("The Wayland smoke test requires Linux and Mutter");
}
if (
  extra.length ||
  (runtime !== "deno" && runtime !== "bun" && runtime !== "node")
) {
  throw new Error("Usage: deno task test:wayland [deno|bun|node]");
}
const scratch = Deno.env.get("TMPDIR") || Deno.env.get("XDG_RUNTIME_DIR") ||
  join(homedir(), ".cache");
await Deno.mkdir(scratch, { recursive: true });
const directory = await Deno.makeTempDir({
  dir: scratch,
  prefix: "jsgtk-wayland-",
});
try {
  await run(runtime, directory);
} finally {
  await removeDirectory(directory);
}
console.log(
  `${runtime}: the existing Wayland window regained focus without opening another window`,
);
