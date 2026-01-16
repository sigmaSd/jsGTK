// Internal module for FFI library loading
// This file contains all dlopen calls and should not be part of the public API

import "./bun-deno-compat.ts";
import { LIB_PATHS } from "./libPaths/mod.ts";

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
  gtk_icon_theme_get_for_display: {
    parameters: ["pointer"],
    result: "pointer",
  },
  gtk_icon_theme_has_icon: {
    parameters: ["pointer", "buffer"],
    result: "bool",
  },
  gtk_menu_button_new: { parameters: [], result: "pointer" },
  gtk_is_initialized: { parameters: [], result: "bool" },
  gdk_display_get_default: {
    parameters: [],
    result: "pointer",
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
  adw_header_bar_set_title_widget: {
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
  adw_action_row_new: { parameters: [], result: "pointer" },
  adw_combo_row_new: { parameters: [], result: "pointer" },
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

// Initialize Adwaita (and GTK) automatically when the library is loaded
// Guard against double initialization which can happen when running multiple test files in the same process
const defaultDisplay = gtk.symbols.gdk_display_get_default();
const isInitialized = defaultDisplay !== null && Deno.UnsafePointer.value(defaultDisplay) !== 0n;

console.log(`[libs.ts] Checking gdk_display_get_default: ${isInitialized}`);

if (!isInitialized) {
  console.log("[libs.ts] Initializing Adwaita...");
  adwaita.symbols.adw_init();
  console.log("[libs.ts] Adwaita initialized.");
} else {
  console.log("[libs.ts] Adwaita/GTK already initialized, skipping.");
}
