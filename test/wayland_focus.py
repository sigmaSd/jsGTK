"""Run the launch-context smoke test in a private Mutter session."""

import argparse
from contextlib import ExitStack, contextmanager
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time

from gi.repository import Gio, GLib


@contextmanager
def process(args, env, **options):
    child = subprocess.Popen(args, env=env, **options)
    try:
        yield child
    finally:
        if child.poll() is None:
            child.terminate()
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait(timeout=5)


def wait_for(predicate, description):
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(0.025)
    raise RuntimeError(f"Timed out waiting for {description}")


def report(path):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def test(runtime, directory):
    cache_home = Path(os.environ.get("XDG_CACHE_HOME") or Path.home() / ".cache")
    env = dict(os.environ, XDG_RUNTIME_DIR=str(directory), TMPDIR=str(directory),
               XDG_CONFIG_HOME=str(directory / "config"),
               XDG_CACHE_HOME=str(directory / "cache"),
               XDG_DATA_HOME=str(directory / "data"), GSETTINGS_BACKEND="memory",
               GIO_USE_VFS="local", GTK_A11Y="none", GDK_BACKEND="wayland", GTK_USE_PORTAL="0",
               DENO_DIR=os.environ.get("DENO_DIR") or str(cache_home / "deno"),
               WAYLAND_DISPLAY="jsgtk-test")
    entries = directory / "data/applications"
    entries.mkdir(parents=True)
    (entries / "io.github.jsgtk.FocusTarget.desktop").write_text(
        "[Desktop Entry]\nType=Application\nName=jsGTK Focus Target\n"
        "Exec=/bin/true\nStartupNotify=true\nDBusActivatable=true\n"
    )
    fixture = Path(__file__).with_suffix(".ts")
    commands = {
        "deno": ["deno", "run", "--node-modules-dir=none", "--allow-ffi",
                 "--allow-env", f"--allow-write={directory}"],
        "node": ["node", "--experimental-strip-types"],
        "bun": ["bun", "run"],
    }
    command = [*commands[runtime], str(fixture)]
    target_report = directory / "target.json"
    launcher_report = directory / "launcher.json"
    with ExitStack() as stack:
        bus_log = stack.enter_context((directory / "bus.log").open("w"))
        bus = stack.enter_context(process(
            ["dbus-daemon", "--session", "--nofork", "--print-address=1",
             f"--address=unix:tmpdir={directory}"],
            env, stdout=subprocess.PIPE, stderr=bus_log, text=True,
        ))
        address = bus.stdout.readline().strip()
        if not address:
            raise RuntimeError("Private D-Bus session did not start")
        env["DBUS_SESSION_BUS_ADDRESS"] = address
        mutter_log = stack.enter_context((directory / "mutter.log").open("w"))
        stack.enter_context(process([
            "mutter", "--headless", "--wayland", "--no-x11", "--virtual-monitor=800x600",
            "--wayland-display=jsgtk-test",
        ], env, stdout=mutter_log, stderr=subprocess.STDOUT))
        wait_for(lambda: (directory / "jsgtk-test").exists(), "Mutter's Wayland socket")

        connection = Gio.DBusConnection.new_for_address_sync(
            address, Gio.DBusConnectionFlags.AUTHENTICATION_CLIENT |
            Gio.DBusConnectionFlags.MESSAGE_BUS_CONNECTION, None, None,
        )
        service = "org.gnome.Mutter.RemoteDesktop"
        path = "/org/gnome/Mutter/RemoteDesktop"

        def call(destination, object_path, interface, method, parameters=None):
            return connection.call_sync(destination, object_path, interface, method,
                                        parameters, None, Gio.DBusCallFlags.NONE, 3000, None)

        def owns_service():
            return call("org.freedesktop.DBus", "/org/freedesktop/DBus", "org.freedesktop.DBus",
                        "NameHasOwner", GLib.Variant("(s)", (service,))).unpack()[0]

        wait_for(owns_service, "Mutter's isolated input service")
        session_path = call(service, path, service, "CreateSession").unpack()[0]
        session = service + ".Session"
        call(service, session_path, session, "Start")

        def stop_input_session():
            try:
                call(service, session_path, session, "Stop")
            except GLib.Error:
                pass

        stack.callback(stop_input_session)
        # The headless compositor creates the virtual keyboard on first use.
        for pressed in (True, False):
            call(service, session_path, session, "NotifyKeyboardKeycode",
                 GLib.Variant("(ub)", (42, pressed)))

        for role, receipt in (("target", target_report), ("launcher", launcher_report)):
            log = stack.enter_context((directory / f"{role}.log").open("w"))
            stack.enter_context(process([*command, role, str(receipt)], env,
                                        stdout=log, stderr=subprocess.STDOUT))
            wait_for(lambda: report(receipt).get("windows") == 1, f"{role} to create its window")
            if not report(receipt).get("active"):
                # Headless sessions may have no pointing device until we send input.
                for delta in ((-2000.0, -2000.0), (400.0, 300.0)):
                    call(service, session_path, session, "NotifyPointerMotionRelative", GLib.Variant("(dd)", delta))
                time.sleep(0.15)
                for pressed in (True, False):
                    call(service, session_path, session, "NotifyPointerButton", GLib.Variant("(ib)", (272, pressed)))
            wait_for(lambda: report(receipt).get("active"), f"{role} to get focus")

        wait_for(lambda: report(target_report).get("active") is False,
                 "the existing target to lose focus")
        # KEY_ENTER on the private compositor's virtual keyboard.
        for pressed in (True, False):
            call(service, session_path, session, "NotifyKeyboardKeycode",
                 GLib.Variant("(ub)", (28, pressed)))
        wait_for(lambda: report(target_report) == {"active": True, "activations": 2, "windows": 1},
                 "the already-open target to regain foreground focus")
        print(f"{runtime}: an existing Wayland window accepted a GIO launch and gained focus")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("runtime", choices=("deno", "node", "bun"))
    opts = parser.parse_args()
    with tempfile.TemporaryDirectory(prefix="jsgtk-wayland-") as work:
        directory = Path(work)
        try:
            test(opts.runtime, directory)
        except Exception:
            for log in sorted([*directory.glob("*.log"), *directory.glob("*.json")]):
                print(f"{log.name}\n{log.read_text()}", flush=True)
            raise
