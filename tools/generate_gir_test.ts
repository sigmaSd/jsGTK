import { strict as assert } from "node:assert";
import { build, parse, type Profile } from "./generate_gir.ts";
import { generateClasses } from "./generate_classes.ts";
import config from "./gir/bindings.json" with { type: "json" };

const inputs = new Map(
  await Promise.all(
    Object.entries(config.sources).map(async ([file, source]) =>
      [
        file,
        parse(
          await Deno.readTextFile(new URL(`./gir/${file}`, import.meta.url)),
          source,
        ),
      ] as const
    ),
  ),
);
const profiles: Record<string, Profile> = config.libraries as Record<
  string,
  Profile
>;
function entry(name: string, symbol: string, profile = profiles[name]) {
  const match = build(profile, inputs).find((value) => value.symbol === symbol);
  assert.ok(match, `${symbol} should be generated`);
  return match;
}

Deno.test("GIR throws adds the trailing native error argument", () => {
  const file = entry("gio", "g_file_load_contents");
  assert.deepEqual(file.binding, {
    parameters: Array(6).fill("pointer"),
    result: "gboolean",
  });
  assert.ok(file.notes.includes("Trailing GError**"));
});

Deno.test("GIR passes callbacks as pointers and notes their scope", () => {
  // Pointers, not "function": Bun rejects NULL for "function" parameters.
  const launch = entry("gio", "g_app_info_launch_default_for_uri_async");
  assert.equal(launch.binding.parameters[3], "pointer");
  assert.ok(launch.notes.includes("callback has async scope"));
  assert.equal(
    entry("glib", "g_timeout_add").binding.parameters[1],
    "pointer",
  );
  const connect = entry("gobject", "g_signal_connect_data");
  assert.equal(connect.binding.parameters[2], "pointer");
  assert.equal(connect.binding.parameters[3], "pointer");
});

Deno.test("GIR availability follows versions, Unix inputs, and deliberate policy", () => {
  const launch = "g_app_info_launch_default_for_uri_async";
  assert.equal(entry("gio", launch).binding.optional, undefined);
  const older = { ...profiles.gio, minimumVersion: "2.49" };
  assert.equal(entry("gio", launch, older).binding.optional, true);
  assert.equal(entry("gio", "g_desktop_app_info_new").binding.optional, true);
  assert.equal(entry("gio", "g_bus_get_sync").binding.optional, true);
  assert.equal(entry("adw", "adw_spinner_new").binding.optional, true);
});

Deno.test("GIR handles independent GTK versions and GDK's shared library", () => {
  assert.deepEqual(entry("gtk3", "gtk_init").binding.parameters, [
    "pointer",
    "pointer",
  ]);
  assert.deepEqual(entry("gtk4", "gtk_init").binding.parameters, []);
  assert.deepEqual(entry("gtk4", "gtk_column_view_new").binding.parameters, [
    "pointer",
  ]);
  assert.deepEqual(
    entry("adw", "adw_spinner_paintable_new").binding.parameters,
    ["pointer"],
  );
  assert.equal(
    entry("gtk4", "gdk_clipboard_read_text_finish").binding.result,
    "pointer",
  );
});

Deno.test("GIR reports unresolved allowlist symbols and variadic calls", () => {
  const unknown = {
    ...profiles.gio,
    symbols: [...profiles.gio.symbols, "g_jsgtk_missing"],
  };
  assert.throws(
    () => build(unknown, inputs),
    /No GIR declarations for g_jsgtk_missing/,
  );
  const { g_subprocess_new: _, ...overrides } = profiles.gio.overrides!;
  assert.throws(
    () => build({ ...profiles.gio, overrides }, inputs),
    /g_subprocess_new: variadic declaration/,
  );
});

Deno.test("GIR resolves relocated aliases and inherits library versions", () => {
  const source = parse(
    `<repository xmlns="http://www.gtk.org/introspection/core/1.0"
                  xmlns:c="http://www.gtk.org/introspection/c/1.0">
      <namespace name="Example" version="2.0">
        <function name="old" c:identifier="test_item" moved-to="Thing.item"/>
        <class name="Thing" version="1.1">
          <function name="item" c:identifier="test_item">
            <return-value><type name="none" c:type="void"/></return-value>
          </function>
        </class>
      </namespace>
    </repository>`,
    { namespace: "Example", package: "Test" },
  );
  const spec = {
    exportName: "example",
    inputs: ["test.gir"],
    minimumVersion: "1.2",
    symbols: ["test_item"],
  };
  const [result] = build(spec, new Map([["test.gir", source]]));
  assert.deepEqual(result.binding, { parameters: [], result: "void" });
  assert.deepEqual(result.notes, ["Since 1.1"]);
});

Deno.test("A method consuming its GObject instance gets a reference of its own", () => {
  const gir = `<?xml version="1.0"?>
<repository version="1.2" xmlns="http://www.gtk.org/introspection/core/1.0"
    xmlns:c="http://www.gtk.org/introspection/c/1.0"
    xmlns:glib="http://www.gtk.org/introspection/glib/1.0">
  <namespace name="Gtk" version="4.0">
    <class name="Recorder" c:type="GtkRecorder" glib:type-name="GtkRecorder"
        glib:get-type="gtk_recorder_get_type">
      <method name="finish" c:identifier="gtk_recorder_finish">
        <return-value transfer-ownership="full"><type name="utf8" c:type="char*"/></return-value>
        <parameters>
          <instance-parameter name="self" transfer-ownership="full">
            <type name="Recorder" c:type="GtkRecorder*"/>
          </instance-parameter>
        </parameters>
      </method>
      <method name="peek" c:identifier="gtk_recorder_peek">
        <return-value transfer-ownership="full"><type name="utf8" c:type="char*"/></return-value>
        <parameters>
          <instance-parameter name="self" transfer-ownership="none">
            <type name="Recorder" c:type="GtkRecorder*"/>
          </instance-parameter>
        </parameters>
      </method>
    </class>
  </namespace>
</repository>`;
  const { namespace } = parse(gir, { namespace: "Gtk", package: "test" });
  const code = generateClasses(
    new Map([["Gtk", { name: "Gtk", node: namespace }]]),
    {
      namespace: "Gtk",
      library: "gtk4",
      libraryModule: "../../low/gtk4.ts",
      classes: { Recorder: {} },
      listed: new Set(),
    },
    new Map([["gtk4.ts:Recorder", {
      module: "gtk4.ts",
      methods: new Set<string>(),
      parent: null,
    }]]),
  );
  // The wrapper keeps its reference; the call consumes a new one.
  assert.match(
    code,
    /gtk_recorder_finish[^;]*\(\s*newObjectRef\(this\.ptr\),?\s*\)/,
  );
  assert.match(code, /gtk_recorder_peek[^;]*\(\s*this\.ptr,?\s*\)/);
  assert.match(
    code,
    /import \{[^}]*newObjectRef[^}]*\} from "\.\.\/wrappers\.ts"/,
  );
});
