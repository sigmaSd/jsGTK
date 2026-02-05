// GTK4 - Widget toolkit FFI bindings
import "@sigma/deno-compat";
import { LIB_PATHS } from "./paths/mod.ts";

export const gtk4 = Deno.dlopen(LIB_PATHS.gtk4, {
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
  gtk_label_set_ellipsize: { parameters: ["pointer", "i32"], result: "void" },
  gtk_label_set_use_markup: { parameters: ["pointer", "bool"], result: "void" },
  gtk_label_set_wrap: { parameters: ["pointer", "bool"], result: "void" },
  gtk_label_set_xalign: { parameters: ["pointer", "f32"], result: "void" },
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
  gtk_list_box_prepend: { parameters: ["pointer", "pointer"], result: "void" },
  gtk_list_box_remove: { parameters: ["pointer", "pointer"], result: "void" },
  gtk_list_box_remove_all: { parameters: ["pointer"], result: "void" },
  gtk_list_box_set_selection_mode: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  gtk_list_box_set_show_separators: {
    parameters: ["pointer", "bool"],
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
  gtk_entry_set_placeholder_text: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
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
  gtk_css_provider_new: { parameters: [], result: "pointer" },
  gtk_css_provider_load_from_data: {
    parameters: ["pointer", "buffer", "i64"],
    result: "void",
  },
  gtk_style_context_add_provider_for_display: {
    parameters: ["pointer", "pointer", "u32"],
    result: "void",
  },
  gtk_widget_get_style_context: { parameters: ["pointer"], result: "pointer" },
  gtk_style_context_add_class: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_style_context_remove_class: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_drop_target_new: { parameters: ["u64", "i32"], result: "pointer" },
  gtk_event_controller_key_new: { parameters: [], result: "pointer" },
  gtk_widget_add_controller: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_file_dialog_new: { parameters: [], result: "pointer" },
  gtk_file_dialog_set_title: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_file_dialog_set_filters: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_file_dialog_set_default_filter: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_file_dialog_open: {
    parameters: ["pointer", "pointer", "pointer", "function", "pointer"],
    result: "void",
  },
  gtk_file_dialog_open_finish: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "pointer",
  },
  gtk_file_dialog_select_folder: {
    parameters: ["pointer", "pointer", "pointer", "function", "pointer"],
    result: "void",
  },
  gtk_file_dialog_select_folder_finish: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "pointer",
  },
  gtk_file_filter_new: { parameters: [], result: "pointer" },
  gtk_file_filter_get_type: { parameters: [], result: "u64" },
  gtk_file_filter_set_name: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_file_filter_add_pattern: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_file_filter_add_mime_type: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_popover_menu_new_from_model: {
    parameters: ["pointer"],
    result: "pointer",
  },
  gtk_popover_menu_set_menu_model: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_menu_button_set_popover: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_gesture_click_new: { parameters: [], result: "pointer" },
  gtk_widget_set_tooltip_text: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_box_set_spacing: { parameters: ["pointer", "i32"], result: "void" },
  gtk_window_set_resizable: { parameters: ["pointer", "bool"], result: "void" },
  gtk_widget_set_cursor: { parameters: ["pointer", "pointer"], result: "void" },
  gtk_widget_set_cursor_from_name: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_widget_add_css_class: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_widget_remove_css_class: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_button_set_icon_name: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gdk_display_get_default: {
    parameters: [],
    result: "pointer",
  },
  gtk_widget_get_display: {
    parameters: ["pointer"],
    result: "pointer",
  },
  gdk_display_get_clipboard: {
    parameters: ["pointer"],
    result: "pointer",
  },
  gdk_clipboard_set_text: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gdk_clipboard_read_async: {
    parameters: ["pointer", "pointer", "i32", "pointer", "function", "pointer"],
    result: "void",
  },
  gdk_clipboard_read_finish: {
    parameters: ["pointer", "pointer", "pointer", "pointer"],
    result: "pointer",
  },
  gdk_clipboard_read_text_async: {
    parameters: ["pointer", "pointer", "function", "pointer"],
    result: "void",
  },
  gdk_clipboard_read_text_finish: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "buffer",
  },
  gdk_clipboard_read_texture_async: {
    parameters: ["pointer", "pointer", "function", "pointer"],
    result: "void",
  },
  gdk_clipboard_read_texture_finish: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "pointer",
  },
  gdk_texture_save_to_png: {
    parameters: ["pointer", "buffer"],
    result: "bool",
  },
  gdk_cursor_new_from_name: {
    parameters: ["buffer", "pointer"],
    result: "pointer",
  },
  // Additional bindings
  gtk_application_get_active_window: {
    parameters: ["pointer"],
    result: "pointer",
  },
  gtk_image_set_from_icon_name: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_widget_set_sensitive: {
    parameters: ["pointer", "bool"],
    result: "void",
  },
  gtk_widget_get_sensitive: {
    parameters: ["pointer"],
    result: "bool",
  },
  gtk_header_bar_new: {
    parameters: [],
    result: "pointer",
  },
  gtk_header_bar_pack_start: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_header_bar_pack_end: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_menu_button_set_primary: {
    parameters: ["pointer", "bool"],
    result: "void",
  },
  gtk_menu_button_set_icon_name: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_widget_is_visible: {
    parameters: ["pointer"],
    result: "bool",
  },
  gtk_progress_bar_new: { parameters: [], result: "pointer" },
  gtk_progress_bar_set_fraction: {
    parameters: ["pointer", "f64"],
    result: "void",
  },
  gtk_progress_bar_get_fraction: { parameters: ["pointer"], result: "f64" },
  gtk_progress_bar_set_text: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_progress_bar_set_show_text: {
    parameters: ["pointer", "bool"],
    result: "void",
  },
  gtk_progress_bar_pulse: { parameters: ["pointer"], result: "void" },
  gtk_grid_new: { parameters: [], result: "pointer" },
  gtk_grid_attach: {
    parameters: ["pointer", "pointer", "i32", "i32", "i32", "i32"],
    result: "void",
  },
  gtk_grid_set_column_spacing: {
    parameters: ["pointer", "u32"],
    result: "void",
  },
  gtk_grid_set_row_spacing: { parameters: ["pointer", "u32"], result: "void" },
  gtk_size_group_new: { parameters: ["i32"], result: "pointer" },
  gtk_size_group_add_widget: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_switch_new: { parameters: [], result: "pointer" },
  gtk_switch_set_active: { parameters: ["pointer", "bool"], result: "void" },
  gtk_switch_get_active: { parameters: ["pointer"], result: "bool" },
  gtk_text_view_new: { parameters: [], result: "pointer" },
  gtk_text_view_get_buffer: { parameters: ["pointer"], result: "pointer" },
  gtk_text_view_set_monospace: {
    parameters: ["pointer", "bool"],
    result: "void",
  },
  gtk_text_buffer_set_text: {
    parameters: ["pointer", "buffer", "i32"],
    result: "void",
  },
  gtk_text_buffer_get_text: {
    parameters: ["pointer", "pointer", "pointer", "i32"],
    result: "pointer",
  },
  gtk_text_buffer_get_start_iter: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_text_buffer_get_end_iter: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_text_buffer_get_bounds: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "void",
  },
  gtk_text_buffer_get_iter_at_offset: {
    parameters: ["pointer", "pointer", "i32"],
    result: "void",
  },
  gtk_text_buffer_get_iter_at_line: {
    parameters: ["pointer", "pointer", "i32"],
    result: "void",
  },
  gtk_text_iter_set_line_offset: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  gtk_text_buffer_create_tag: {
    parameters: ["pointer", "buffer", "buffer", "buffer", "pointer"],
    result: "pointer",
  },
  gtk_text_buffer_apply_tag_by_name: {
    parameters: ["pointer", "buffer", "pointer", "pointer"],
    result: "void",
  },
  gtk_text_buffer_remove_tag_by_name: {
    parameters: ["pointer", "buffer", "pointer", "pointer"],
    result: "void",
  },
  gtk_text_buffer_remove_all_tags: {
    parameters: ["pointer", "pointer", "pointer"],
    result: "void",
  },
  gtk_text_buffer_begin_user_action: {
    parameters: ["pointer"],
    result: "void",
  },
  gtk_text_buffer_end_user_action: {
    parameters: ["pointer"],
    result: "void",
  },
  gtk_text_iter_forward_search: {
    parameters: ["pointer", "buffer", "i32", "pointer", "pointer", "pointer"],
    result: "bool",
  },
  gtk_text_iter_get_offset: {
    parameters: ["pointer"],
    result: "i32",
  },
  gtk_text_iter_assign: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
});
