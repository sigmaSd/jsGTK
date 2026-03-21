// GLib 2.0 - Core utilities and main loop
import "@sigma/deno-compat";
import { LIB_PATHS } from "./paths/mod.ts";

interface GlibSymbols {
  g_main_loop_new: (context: Deno.PointerValue, isRunning: boolean) => Deno.PointerValue;
  g_main_loop_run: (loop: Deno.PointerValue) => void;
  g_main_loop_quit: (loop: Deno.PointerValue) => void;
  g_main_context_default: () => Deno.PointerValue;
  g_main_context_pending: (context: Deno.PointerValue) => boolean;
  g_main_context_iteration: (context: Deno.PointerValue, mayBlock: boolean) => boolean;
  g_timeout_add: (interval: number, callback: Deno.PointerValue, data: Deno.PointerValue) => number;
  g_timeout_add_seconds: (interval: number, callback: Deno.PointerValue, data: Deno.PointerValue) => number;
  g_idle_add: (callback: Deno.PointerValue, data: Deno.PointerValue) => number;
  g_source_remove: (tag: number) => boolean;
  g_free: (mem: Deno.PointerValue) => void;
  g_free_ptr: Deno.PointerValue;
  g_strdup: (str: BufferSource) => Deno.PointerValue;
  g_malloc0: (n: bigint) => Deno.PointerValue;
  g_unix_signal_add?: ((signum: number, callback: Deno.PointerValue, data: Deno.PointerValue) => number) | null;
  g_bytes_new: (data: BufferSource, len: bigint) => Deno.PointerValue;
  g_bytes_get_data: (bytes: Deno.PointerValue, len: Deno.PointerValue) => Deno.PointerValue;
  g_bytes_get_size: (bytes: Deno.PointerValue) => bigint;
  g_bytes_unref: (bytes: Deno.PointerValue) => void;
  g_variant_new_string: (str: BufferSource) => Deno.PointerValue;
  g_variant_new_uint32: (value: number) => Deno.PointerValue;
  g_variant_new_tuple: (children: Deno.PointerValue, nChildren: bigint) => Deno.PointerValue;
  g_variant_get_child_value: (variant: Deno.PointerValue, index: bigint) => Deno.PointerValue;
  g_variant_get_string: (variant: Deno.PointerValue, len: Deno.PointerValue) => Deno.PointerValue;
  g_variant_get_uint32: (variant: Deno.PointerValue) => number;
  g_variant_get_int32: (variant: Deno.PointerValue) => number;
  g_variant_get_uint16: (variant: Deno.PointerValue) => number;
  g_variant_get_type_string: (variant: Deno.PointerValue) => Deno.PointerValue;
  g_variant_n_children: (variant: Deno.PointerValue) => bigint;
  g_variant_type_hash: (type: Deno.PointerValue) => Deno.PointerValue;
  g_variant_is_of_type: (variant: Deno.PointerValue, type: Deno.PointerValue) => boolean;
  g_variant_unref: (variant: Deno.PointerValue) => void;
  g_variant_ref: (variant: Deno.PointerValue) => Deno.PointerValue;
  g_variant_ref_sink: (variant: Deno.PointerValue) => Deno.PointerValue;
  g_set_prgname: (name: BufferSource) => void;
  g_set_application_name: (name: BufferSource) => void;
}

interface GlibLib {
  symbols: GlibSymbols;
  close: () => void;
}

export const glib: GlibLib = Deno.dlopen(LIB_PATHS.glib, {
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
  g_free_ptr: { name: "g_free", type: "pointer" },
  g_strdup: { parameters: ["buffer"], result: "pointer" },
  g_malloc0: { parameters: ["usize"], result: "pointer" },
  g_unix_signal_add: {
    parameters: ["i32", "function", "pointer"],
    result: "u32",
    optional: true,
  },
  g_bytes_new: {
    parameters: ["buffer", "usize"],
    result: "pointer",
  },
  g_bytes_get_data: {
    parameters: ["pointer", "pointer"],
    result: "pointer",
  },
  g_bytes_get_size: {
    parameters: ["pointer"],
    result: "usize",
  },
  g_bytes_unref: {
    parameters: ["pointer"],
    result: "void",
  },
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
  g_variant_get_uint16: {
    parameters: ["pointer"],
    result: "u16",
  },
  g_variant_get_type_string: {
    parameters: ["pointer"],
    result: "pointer",
  },
  g_variant_n_children: {
    parameters: ["pointer"],
    result: "usize",
  },
  g_variant_type_hash: {
    parameters: ["pointer"],
    result: "pointer",
  },
  g_variant_is_of_type: {
    parameters: ["pointer", "pointer"],
    result: "bool",
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
  g_set_prgname: {
    parameters: ["buffer"],
    result: "void",
  },
  g_set_application_name: {
    parameters: ["buffer"],
    result: "void",
  },
});
