// Adwaita 1 - GNOME-style widgets FFI bindings
import "@sigma/deno-compat";
import { LIB_PATHS } from "./paths/mod.ts";

export const adw = Deno.dlopen(LIB_PATHS.adwaita, {
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
  // AboutDialog
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
  adw_about_dialog_set_website: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_about_dialog_set_issue_url: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_about_dialog_set_developers: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_about_dialog_set_license_type: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  adw_about_dialog_set_application_icon: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  // AboutWindow (older API, still used in some apps)
  adw_about_window_new: { parameters: [], result: "pointer" },
  adw_about_window_set_application_name: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_about_window_set_version: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_about_window_set_developer_name: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_about_window_set_developers: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_about_window_set_designers: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_about_window_set_translator_credits: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_about_window_set_license_type: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  adw_about_window_set_website: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_about_window_set_issue_url: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_about_window_set_application_icon: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  // ToolbarView
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
  // StyleManager
  adw_style_manager_get_default: { parameters: [], result: "pointer" },
  adw_style_manager_set_color_scheme: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  adw_style_manager_get_color_scheme: {
    parameters: ["pointer"],
    result: "i32",
  },
  // PreferencesWindow
  adw_preferences_window_new: { parameters: [], result: "pointer" },
  adw_preferences_window_add: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_preferences_window_set_visible_page: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  // PreferencesPage
  adw_preferences_page_new: { parameters: [], result: "pointer" },
  adw_preferences_page_add: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  // PreferencesGroup
  adw_preferences_group_new: { parameters: [], result: "pointer" },
  adw_preferences_group_add: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_preferences_group_set_title: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_preferences_group_set_description: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  // ActionRow
  adw_action_row_new: { parameters: [], result: "pointer" },
  adw_action_row_add_suffix: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  // PreferencesRow (parent of ActionRow)
  adw_preferences_row_set_title: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_preferences_row_get_title: {
    parameters: ["pointer"],
    result: "pointer",
  },
  adw_preferences_row_set_use_markup: {
    parameters: ["pointer", "bool"],
    result: "void",
  },
  // ActionRow additional methods
  adw_action_row_set_subtitle: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_action_row_get_subtitle: {
    parameters: ["pointer"],
    result: "pointer",
  },
  // ComboRow
  adw_combo_row_new: { parameters: [], result: "pointer" },
  adw_combo_row_set_model: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_combo_row_get_model: {
    parameters: ["pointer"],
    result: "pointer",
  },
  adw_combo_row_set_selected: {
    parameters: ["pointer", "u32"],
    result: "void",
  },
  adw_combo_row_get_selected: {
    parameters: ["pointer"],
    result: "u32",
  },
  // SwitchRow
  adw_switch_row_new: { parameters: [], result: "pointer" },
  adw_switch_row_set_active: {
    parameters: ["pointer", "bool"],
    result: "void",
  },
  adw_switch_row_get_active: { parameters: ["pointer"], result: "bool" },
  // MessageDialog
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
  // Clamp
  adw_clamp_new: { parameters: [], result: "pointer" },
  adw_clamp_set_maximum_size: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  adw_clamp_set_child: { parameters: ["pointer", "pointer"], result: "void" },
  adw_about_dialog_set_website: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_about_dialog_set_issue_url: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_about_dialog_set_developers: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  adw_about_dialog_set_license_type: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  adw_about_dialog_set_application_icon: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_is_initialized: { parameters: [], result: "bool" },
  adw_dialog_present: { parameters: ["pointer", "pointer"], result: "void" },
});

// Initialize adw (and GTK) automatically when the library is loaded
// Guard against double initialization which can happen when running multiple test files in the same process
if (!adw.symbols.adw_is_initialized()) {
  adw.symbols.adw_init();
}
