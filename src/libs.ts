// Internal module for FFI library loading
// This file contains all dlopen calls and should not be part of the public API

import "./bun-deno-compat.ts";

// Detect OS and set library paths
const OS = Deno.build.os;

function getLibPath(libName: string, soversion: string): string {
  if (OS === "linux") {
    // Try to load library - system linker will handle version resolution
    // It searches in standard locations: /usr/lib, /usr/local/lib, LD_LIBRARY_PATH
    return `${libName}.so.${soversion}`;
  }
  return `${libName}.so.${soversion}`;
}

// Helper to try multiple library paths
function tryOpenLib(paths: string[]): string {
  for (const path of paths) {
    try {
      // Try to open with a minimal symbol set to test
      const lib = Deno.dlopen(path, {});
      lib.close();
      return path;
    } catch {
      // Library not found at this path, try next one
      continue;
    }
  }
  // Return the first path as fallback
  return paths[0];
}

const LIB_PATHS = OS === "darwin"
  ? {
    // macOS: Try Homebrew paths first
    gtk: tryOpenLib([
      "/opt/homebrew/lib/libgtk-4.1.dylib",
      "/usr/local/lib/libgtk-4.1.dylib",
      "libgtk-4.1.dylib",
    ]),
    adwaita: tryOpenLib([
      "/opt/homebrew/lib/libadwaita-1.dylib",
      "/usr/local/lib/libadwaita-1.dylib",
      "libadwaita-1.dylib",
    ]),
    glib: tryOpenLib([
      "/opt/homebrew/lib/libglib-2.0.dylib",
      "/usr/local/lib/libglib-2.0.dylib",
      "libglib-2.0.dylib",
    ]),
    gobject: tryOpenLib([
      "/opt/homebrew/lib/libgobject-2.0.dylib",
      "/usr/local/lib/libgobject-2.0.dylib",
      "libgobject-2.0.dylib",
    ]),
    gio: tryOpenLib([
      "/opt/homebrew/lib/libgio-2.0.dylib",
      "/usr/local/lib/libgio-2.0.dylib",
      "libgio-2.0.dylib",
    ]),
    cairo: tryOpenLib([
      "/opt/homebrew/lib/libcairo.2.dylib",
      "/usr/local/lib/libcairo.2.dylib",
      "libcairo.2.dylib",
    ]),
  }
  : OS === "windows"
  ? {
    // Windows: MSYS2/MinGW64 keeps the "lib" prefix
    gtk: tryOpenLib([
      "C:\\tools\\msys64\\mingw64\\bin\\libgtk-4-1.dll",
      "libgtk-4-1.dll",
    ]),
    adwaita: tryOpenLib([
      "C:\\tools\\msys64\\mingw64\\bin\\libadwaita-1-0.dll",
      "libadwaita-1-0.dll",
    ]),
    glib: tryOpenLib([
      "C:\\tools\\msys64\\mingw64\\bin\\libglib-2.0-0.dll",
      "libglib-2.0-0.dll",
    ]),
    gobject: tryOpenLib([
      "C:\\tools\\msys64\\mingw64\\bin\\libgobject-2.0-0.dll",
      "libgobject-2.0-0.dll",
    ]),
    gio: tryOpenLib([
      "C:\\tools\\msys64\\mingw64\\bin\\libgio-2.0-0.dll",
      "libgio-2.0-0.dll",
    ]),
    cairo: tryOpenLib([
      "C:\\tools\\msys64\\mingw64\\bin\\libcairo-2.dll",
      "libcairo-2.dll",
    ]),
  }
  : {
    gtk: getLibPath("libgtk-4", "1"),
    adwaita: getLibPath("libadwaita-1", "0"),
    glib: getLibPath("libglib-2.0", "0"),
    gobject: getLibPath("libgobject-2.0", "0"),
    gio: getLibPath("libgio-2.0", "0"),
    cairo: getLibPath("libcairo", "2"),
  };

// Load GLib - Core utilities and main loop
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
  g_source_remove: { parameters: ["u32"], result: "bool" },
  g_free: { parameters: ["pointer"], result: "void" },
  g_strdup: { parameters: ["pointer"], result: "pointer" },
  g_malloc0: { parameters: ["usize"], result: "pointer" },
});

// Load Cairo - 2D Graphics Library
export const cairo = Deno.dlopen(LIB_PATHS.cairo, {
  cairo_set_source_rgb: {
    parameters: ["pointer", "f64", "f64", "f64"],
    result: "void",
  },
  cairo_set_source_rgba: {
    parameters: ["pointer", "f64", "f64", "f64", "f64"],
    result: "void",
  },
  cairo_set_line_width: { parameters: ["pointer", "f64"], result: "void" },
  cairo_move_to: {
    parameters: ["pointer", "f64", "f64"],
    result: "void",
  },
  cairo_line_to: {
    parameters: ["pointer", "f64", "f64"],
    result: "void",
  },
  cairo_stroke: { parameters: ["pointer"], result: "void" },
  cairo_fill: { parameters: ["pointer"], result: "void" },
  cairo_rectangle: {
    parameters: ["pointer", "f64", "f64", "f64", "f64"],
    result: "void",
  },
  cairo_arc: {
    parameters: ["pointer", "f64", "f64", "f64", "f64", "f64"],
    result: "void",
  },
  cairo_paint: { parameters: ["pointer"], result: "void" },
  cairo_scale: { parameters: ["pointer", "f64", "f64"], result: "void" },
  cairo_translate: { parameters: ["pointer", "f64", "f64"], result: "void" },
});

// Load GObject - Object system and type system
export const gobject = Deno.dlopen(LIB_PATHS.gobject, {
  g_object_new: {
    parameters: ["u64", "buffer"],
    result: "pointer",
    nonblocking: false,
  },
  g_object_ref: { parameters: ["pointer"], result: "pointer" },
  g_object_unref: { parameters: ["pointer"], result: "void" },
  g_object_set_property: {
    parameters: ["pointer", "buffer", "pointer"],
    result: "void",
  },
  g_object_get_property: {
    parameters: ["pointer", "buffer", "pointer"],
    result: "void",
  },
  g_signal_connect_data: {
    parameters: ["pointer", "buffer", "function", "pointer", "pointer", "u32"],
    result: "u64",
  },
  g_signal_handler_disconnect: {
    parameters: ["pointer", "u64"],
    result: "void",
  },
  g_signal_emit_by_name: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  g_type_from_name: { parameters: ["buffer"], result: "u64" },
  g_value_init: { parameters: ["pointer", "u64"], result: "pointer" },
  g_value_set_string: { parameters: ["pointer", "buffer"], result: "void" },
  g_value_set_boolean: { parameters: ["pointer", "bool"], result: "void" },
  g_value_set_int: { parameters: ["pointer", "i32"], result: "void" },
  g_value_set_uint: { parameters: ["pointer", "u32"], result: "void" },
  g_value_set_object: { parameters: ["pointer", "pointer"], result: "void" },
  g_value_get_string: { parameters: ["pointer"], result: "pointer" },
  g_value_get_boolean: { parameters: ["pointer"], result: "bool" },
  g_value_get_int: { parameters: ["pointer"], result: "i32" },
  g_value_get_uint: { parameters: ["pointer"], result: "u32" },
  g_value_get_object: { parameters: ["pointer"], result: "pointer" },
  g_value_unset: { parameters: ["pointer"], result: "void" },
});

// Load GIO - Application support and I/O
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
});

// Load GTK4 - Widget toolkit
export const gtk = Deno.dlopen(LIB_PATHS.gtk, {
  gtk_init: { parameters: [], result: "void" },
  gtk_application_new: { parameters: ["buffer", "i32"], result: "pointer" },
  gtk_application_window_new: { parameters: ["pointer"], result: "pointer" },
  gtk_builder_new: { parameters: [], result: "pointer" },
  gtk_builder_add_from_file: {
    parameters: ["pointer", "buffer", "pointer"],
    result: "bool",
  },
  gtk_builder_add_from_string: {
    parameters: ["pointer", "buffer", "i64", "pointer"],
    result: "bool",
  },
  gtk_builder_get_object: {
    parameters: ["pointer", "buffer"],
    result: "pointer",
  },
  gtk_box_new: { parameters: ["i32", "i32"], result: "pointer" },
  gtk_box_append: { parameters: ["pointer", "pointer"], result: "void" },
  gtk_box_remove: { parameters: ["pointer", "pointer"], result: "void" },
  gtk_label_new: { parameters: ["buffer"], result: "pointer" },
  gtk_label_set_text: { parameters: ["pointer", "buffer"], result: "void" },
  gtk_label_get_text: { parameters: ["pointer"], result: "pointer" },
  gtk_label_set_markup: { parameters: ["pointer", "buffer"], result: "void" },
  gtk_label_set_use_markup: { parameters: ["pointer", "bool"], result: "void" },
  gtk_button_new_with_label: { parameters: ["buffer"], result: "pointer" },
  gtk_button_set_label: { parameters: ["pointer", "buffer"], result: "void" },
  gtk_check_button_new: { parameters: [], result: "pointer" },
  gtk_check_button_new_with_label: {
    parameters: ["buffer"],
    result: "pointer",
  },
  gtk_check_button_get_active: { parameters: ["pointer"], result: "bool" },
  gtk_check_button_set_active: {
    parameters: ["pointer", "bool"],
    result: "void",
  },
  gtk_check_button_get_label: { parameters: ["pointer"], result: "pointer" },
  gtk_check_button_set_label: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_check_button_set_group: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_check_button_set_inconsistent: {
    parameters: ["pointer", "bool"],
    result: "void",
  },
  gtk_check_button_get_inconsistent: {
    parameters: ["pointer"],
    result: "bool",
  },
  gtk_picture_new: { parameters: [], result: "pointer" },
  gtk_picture_set_filename: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_picture_set_can_shrink: {
    parameters: ["pointer", "bool"],
    result: "void",
  },
  gtk_window_set_title: { parameters: ["pointer", "buffer"], result: "void" },
  gtk_window_set_default_size: {
    parameters: ["pointer", "i32", "i32"],
    result: "void",
  },
  gtk_window_set_titlebar: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_window_present: { parameters: ["pointer"], result: "void" },
  gtk_window_close: { parameters: ["pointer"], result: "void" },
  gtk_window_set_child: { parameters: ["pointer", "pointer"], result: "void" },
  gtk_window_get_child: { parameters: ["pointer"], result: "pointer" },
  gtk_scrolled_window_set_min_content_height: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  gtk_dialog_new: { parameters: [], result: "pointer" },
  gtk_window_set_transient_for: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_window_set_modal: { parameters: ["pointer", "bool"], result: "void" },
  gtk_window_destroy: { parameters: ["pointer"], result: "void" },
  gtk_widget_set_margin_top: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  gtk_widget_set_margin_bottom: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  gtk_widget_set_margin_start: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  gtk_widget_set_margin_end: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  gtk_widget_set_halign: { parameters: ["pointer", "i32"], result: "void" },
  gtk_widget_set_valign: { parameters: ["pointer", "i32"], result: "void" },
  gtk_widget_set_hexpand: { parameters: ["pointer", "bool"], result: "void" },
  gtk_widget_set_vexpand: { parameters: ["pointer", "bool"], result: "void" },
  gtk_widget_set_visible: { parameters: ["pointer", "bool"], result: "void" },
  gtk_widget_get_visible: { parameters: ["pointer"], result: "bool" },
  gtk_widget_set_size_request: {
    parameters: ["pointer", "i32", "i32"],
    result: "void",
  },
  gtk_widget_grab_focus: { parameters: ["pointer"], result: "bool" },
  gtk_widget_unparent: { parameters: ["pointer"], result: "void" },
  gtk_widget_get_first_child: { parameters: ["pointer"], result: "pointer" },
  gtk_widget_get_next_sibling: { parameters: ["pointer"], result: "pointer" },
  gtk_widget_queue_draw: { parameters: ["pointer"], result: "void" },
  gtk_drawing_area_new: { parameters: [], result: "pointer" },
  gtk_drawing_area_set_draw_func: {
    parameters: ["pointer", "function", "pointer", "pointer"],
    result: "void",
  },
  gtk_drawing_area_set_content_width: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  gtk_drawing_area_set_content_height: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  gtk_frame_new: { parameters: ["buffer"], result: "pointer" },
  gtk_frame_set_child: { parameters: ["pointer", "pointer"], result: "void" },
  gtk_scrolled_window_new: { parameters: [], result: "pointer" },
  gtk_scrolled_window_set_child: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_list_box_new: { parameters: [], result: "pointer" },
  gtk_list_box_append: { parameters: ["pointer", "pointer"], result: "void" },
  gtk_list_box_remove: { parameters: ["pointer", "pointer"], result: "void" },
  gtk_list_box_set_selection_mode: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  gtk_list_box_select_row: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_list_box_get_selected_row: { parameters: ["pointer"], result: "pointer" },
  gtk_list_box_row_new: { parameters: [], result: "pointer" },
  gtk_list_box_row_set_child: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_list_box_row_get_index: { parameters: ["pointer"], result: "i32" },
  gtk_spinner_new: { parameters: [], result: "pointer" },
  gtk_spinner_start: { parameters: ["pointer"], result: "void" },
  gtk_spinner_stop: { parameters: ["pointer"], result: "void" },
  gtk_image_new_from_icon_name: { parameters: ["buffer"], result: "pointer" },
  gtk_image_new_from_file: { parameters: ["buffer"], result: "pointer" },
  gtk_image_set_from_file: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_image_set_pixel_size: { parameters: ["pointer", "i32"], result: "void" },
  gtk_string_list_new: { parameters: ["pointer"], result: "pointer" },
  gtk_string_list_append: { parameters: ["pointer", "buffer"], result: "void" },
  gtk_string_list_get_string: {
    parameters: ["pointer", "u32"],
    result: "pointer",
  },
  gtk_drop_down_new: {
    parameters: ["pointer", "pointer"],
    result: "pointer",
  },
  gtk_drop_down_get_selected: { parameters: ["pointer"], result: "u32" },
  gtk_drop_down_set_selected: {
    parameters: ["pointer", "u32"],
    result: "void",
  },
  gtk_entry_new: { parameters: [], result: "pointer" },
  gtk_editable_get_text: { parameters: ["pointer"], result: "pointer" },
  gtk_editable_set_text: { parameters: ["pointer", "buffer"], result: "void" },
  gtk_application_inhibit: {
    parameters: ["pointer", "pointer", "i32", "buffer"],
    result: "u32",
  },
  gtk_application_uninhibit: {
    parameters: ["pointer", "u32"],
    result: "void",
  },
  gtk_application_set_accels_for_action: {
    parameters: ["pointer", "buffer", "pointer"],
    result: "void",
  },
});

// Load Adwaita - GNOME-style widgets
export const adwaita = Deno.dlopen(LIB_PATHS.adwaita, {
  adw_init: { parameters: [], result: "void" },
  adw_application_new: { parameters: ["buffer", "i32"], result: "pointer" },
  adw_window_new: { parameters: [], result: "pointer" },
  adw_window_set_content: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_application_window_new: { parameters: ["pointer"], result: "pointer" },
  adw_application_window_set_content: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_header_bar_new: { parameters: [], result: "pointer" },
  adw_header_bar_pack_end: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_header_bar_pack_start: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_about_dialog_new: { parameters: [], result: "pointer" },
  adw_about_dialog_set_application_name: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_about_dialog_set_version: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_about_dialog_set_developer_name: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_about_dialog_set_comments: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_toolbar_view_new: { parameters: [], result: "pointer" },
  adw_toolbar_view_set_content: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_toolbar_view_add_top_bar: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_toolbar_view_add_bottom_bar: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_style_manager_get_default: { parameters: [], result: "pointer" },
  adw_style_manager_set_color_scheme: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  adw_style_manager_get_color_scheme: {
    parameters: ["pointer"],
    result: "i32",
  },
  adw_preferences_window_new: { parameters: [], result: "pointer" },
  adw_preferences_window_add: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_preferences_page_new: { parameters: [], result: "pointer" },
  adw_preferences_page_add: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_preferences_group_new: { parameters: [], result: "pointer" },
  adw_preferences_group_add: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_message_dialog_new: {
    parameters: ["pointer", "buffer", "buffer"],
    result: "pointer",
  },
  adw_message_dialog_add_response: {
    parameters: ["pointer", "buffer", "buffer"],
    result: "void",
  },
  adw_message_dialog_set_response_appearance: {
    parameters: ["pointer", "buffer", "i32"],
    result: "void",
  },
  adw_message_dialog_set_default_response: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_message_dialog_set_close_response: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_message_dialog_choose: {
    parameters: ["pointer", "pointer", "function", "pointer"],
    result: "void",
  },
});
