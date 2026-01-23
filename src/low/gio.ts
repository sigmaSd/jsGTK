// GIO 2.0 - Application support and I/O
import "@sigma/deno-compat";
import { LIB_PATHS } from "./paths/mod.ts";

export const gio = Deno.dlopen(LIB_PATHS.gio, {
  g_application_run: {
    parameters: ["pointer", "i32", "pointer"],
    result: "i32",
  },
  g_application_quit: { parameters: ["pointer"], result: "void" },
  g_application_register: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "bool",
  },
  g_application_activate: { parameters: ["pointer"], result: "void" },
  g_application_get_is_remote: { parameters: ["pointer"], result: "bool" },
  g_simple_action_new: {
    parameters: ["buffer", "pointer"],
    result: "pointer",
  },
  g_action_map_add_action: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  g_menu_new: { parameters: [], result: "pointer" },
  g_menu_append: {
    parameters: ["pointer", "buffer", "buffer"],
    result: "void",
  },
  g_notification_new: { parameters: ["buffer"], result: "pointer" },
  g_notification_set_body: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  g_application_send_notification: {
    parameters: ["pointer", "buffer", "pointer"],
    result: "void",
  },
  g_application_withdraw_notification: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  g_list_store_new: { parameters: ["u64"], result: "pointer" },
  g_list_store_append: { parameters: ["pointer", "pointer"], result: "void" },
  g_task_propagate_pointer: {
    parameters: ["pointer", "pointer"],
    result: "pointer",
  },
  g_file_new_for_path: { parameters: ["buffer"], result: "pointer" },
  g_file_get_path: { parameters: ["pointer"], result: "buffer" },
  g_file_load_contents: {
    parameters: ["pointer", "pointer", "pointer", "pointer", "pointer"],
    result: "bool",
  },
  g_file_get_type: { parameters: [], result: "u64" },
  // Subprocess
  g_subprocess_new: {
    parameters: ["i32", "pointer", "pointer"],
    result: "pointer",
    optional: true,
  },
  g_subprocess_newv: {
    parameters: ["pointer", "i32", "pointer"],
    result: "pointer",
  },
  g_subprocess_get_stdin_pipe: {
    parameters: ["pointer"],
    result: "pointer",
  },
  g_subprocess_get_stdout_pipe: {
    parameters: ["pointer"],
    result: "pointer",
  },
  g_subprocess_get_stderr_pipe: {
    parameters: ["pointer"],
    result: "pointer",
  },
  g_subprocess_wait: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "bool",
  },
  g_subprocess_wait_async: {
    parameters: ["pointer", "pointer", "function", "pointer"],
    result: "void",
  },
  g_subprocess_wait_finish: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "bool",
  },
  g_subprocess_get_successful: {
    parameters: ["pointer"],
    result: "bool",
  },
  g_subprocess_get_exit_status: {
    parameters: ["pointer"],
    result: "i32",
  },
  g_subprocess_force_exit: {
    parameters: ["pointer"],
    result: "void",
  },
  // OutputStream (for stdin pipe)
  g_output_stream_write_all_async: {
    parameters: [
      "pointer",
      "pointer",
      "usize",
      "i32",
      "pointer",
      "function",
      "pointer",
    ],
    result: "void",
  },
  g_output_stream_write_all_finish: {
    parameters: ["pointer", "pointer", "pointer", "pointer"],
    result: "bool",
  },
  g_output_stream_write: {
    parameters: ["pointer", "pointer", "usize", "pointer", "pointer"],
    result: "isize",
  },
  g_output_stream_flush: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "bool",
  },
  g_output_stream_close: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "bool",
  },
  // InputStream (for stdout/stderr pipe)
  g_input_stream_read_bytes_async: {
    parameters: ["pointer", "usize", "i32", "pointer", "function", "pointer"],
    result: "void",
  },
  g_input_stream_read_bytes_finish: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "pointer",
  },
  g_input_stream_read: {
    parameters: ["pointer", "pointer", "usize", "pointer", "pointer"],
    result: "isize",
  },
  g_input_stream_close: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "bool",
  },
  // GBytes
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
  // DBus (optional - not available on Windows)
  g_bus_get_sync: {
    parameters: ["i32", "pointer", "pointer"],
    result: "pointer",
    optional: true,
  },
  g_dbus_proxy_new_sync: {
    parameters: [
      "pointer",
      "i32",
      "pointer",
      "buffer",
      "buffer",
      "buffer",
      "pointer",
      "pointer",
    ],
    result: "pointer",
    optional: true,
  },
  g_dbus_proxy_new_for_bus_sync: {
    parameters: [
      "i32",
      "i32",
      "pointer",
      "buffer",
      "buffer",
      "buffer",
      "pointer",
      "pointer",
    ],
    result: "pointer",
    optional: true,
  },
  g_dbus_proxy_call_sync: {
    parameters: [
      "pointer",
      "buffer",
      "pointer",
      "i32",
      "i32",
      "pointer",
      "pointer",
    ],
    result: "pointer",
    optional: true,
  },
  g_dbus_proxy_call: {
    parameters: [
      "pointer",
      "buffer",
      "pointer",
      "i32",
      "i32",
      "pointer",
      "function",
      "pointer",
    ],
    result: "void",
    optional: true,
  },
  g_dbus_proxy_call_finish: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "pointer",
    optional: true,
  },
});
