/**
 * GTK Test Runner
 *
 * We import all test modules here to run them in a single process.
 * This is necessary because Deno's test runner isolates test files, but
 * loading the GTK library multiple times in the same process (which happens
 * when running `deno test` on multiple files) causes crashes on Windows
 * due to double initialization of the library.
 *
 * By importing them here, we ensure FFI modules are evaluated only once,
 * and GTK is initialized exactly once.
 */
import "./modular.ts";
import "./widget.ts";
import "./adaptive.ts";
import "./dbus.ts";
import "./launch.ts";
import "./generated.ts";
import "./symbols.ts";
import "./render.ts";
