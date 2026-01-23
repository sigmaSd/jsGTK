// GLib 2.0 - Core utilities and main loop
import "@sigma/deno-compat";
import { LIB_PATHS } from "./paths/mod.ts";

export const glib = Deno.dlopen(LIB_PATHS.glib, {
  g_main_loop_new: { parameters: ["pointer", "bool"], result: "pointer" },
  g_main_loop_run: { parameters: ["pointer"], result: "void" },
  g_main_loop_quit: { parameters: ["pointer"], result: "void" },
  g_main_context_default: { parameters: [], result: "pointer" },
  g_main_context_pending: { parameters: ["pointer"], result: "bool" },
  g_main_context_iteration: {
    parameters: ["pointer", "bool"],
    result: "bool",
  },
  g_timeout_add: {
    parameters: ["u32", "function", "pointer"],
    result: "u32",
  },
  g_timeout_add_seconds: {
    parameters: ["u32", "function", "pointer"],
    result: "u32",
  },
  g_idle_add: {
    parameters: ["function", "pointer"],
    result: "u32",
  },
  g_source_remove: { parameters: ["u32"], result: "bool" },
  g_free: { parameters: ["pointer"], result: "void" },
  g_strdup: { parameters: ["pointer"], result: "pointer" },
  g_malloc0: { parameters: ["usize"], result: "pointer" },
  g_unix_signal_add: {
    parameters: ["i32", "function", "pointer"],
    result: "u32",
    optional: true,
  },
  // GVariant
  g_variant_new_string: {
    parameters: ["buffer"],
    result: "pointer",
  },
  g_variant_new_uint32: {
    parameters: ["u32"],
    result: "pointer",
  },
  g_variant_new_tuple: {
    parameters: ["pointer", "usize"],
    result: "pointer",
  },
  g_variant_get_child_value: {
    parameters: ["pointer", "usize"],
    result: "pointer",
  },
  g_variant_get_string: {
    parameters: ["pointer", "pointer"],
    result: "pointer",
  },
  g_variant_get_uint32: {
    parameters: ["pointer"],
    result: "u32",
  },
  g_variant_get_int32: {
    parameters: ["pointer"],
    result: "i32",
  },
  g_variant_unref: {
    parameters: ["pointer"],
    result: "void",
  },
  g_variant_ref: {
    parameters: ["pointer"],
    result: "pointer",
  },
  g_variant_ref_sink: {
    parameters: ["pointer"],
    result: "pointer",
  },
});
