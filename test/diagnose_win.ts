// Windows-only: diagnose which libadwaita symbols fail to load
import "@sigma/deno-compat";
import { LIB_PATHS } from "../src/low/paths/mod.ts";

const groups: Record<string, Record<string, unknown>> = {
  about_window: {
    adw_about_window_new: { parameters: [], result: "pointer" },
    adw_about_window_set_application_name: { parameters: ["pointer", "buffer"], result: "void" },
    adw_about_window_set_version: { parameters: ["pointer", "buffer"], result: "void" },
    adw_about_window_set_developer_name: { parameters: ["pointer", "buffer"], result: "void" },
    adw_about_window_set_developers: { parameters: ["pointer", "pointer"], result: "void" },
    adw_about_window_set_designers: { parameters: ["pointer", "pointer"], result: "void" },
    adw_about_window_set_translator_credits: { parameters: ["pointer", "buffer"], result: "void" },
    adw_about_window_set_license_type: { parameters: ["pointer", "i32"], result: "void" },
    adw_about_window_set_website: { parameters: ["pointer", "buffer"], result: "void" },
    adw_about_window_set_issue_url: { parameters: ["pointer", "buffer"], result: "void" },
    adw_about_window_set_application_icon: { parameters: ["pointer", "buffer"], result: "void" },
  },
  carousel_extra: {
    adw_carousel_set_scroll_params: { parameters: ["pointer", "pointer"], result: "void" },
    adw_carousel_get_scroll_params: { parameters: ["pointer"], result: "pointer" },
    adw_carousel_set_allow_mouse_drag: { parameters: ["pointer", "bool"], result: "void" },
    adw_carousel_get_allow_mouse_drag: { parameters: ["pointer"], result: "bool" },
    adw_carousel_set_allow_scroll_wheel: { parameters: ["pointer", "bool"], result: "void" },
    adw_carousel_get_allow_scroll_wheel: { parameters: ["pointer"], result: "bool" },
    adw_carousel_set_allow_long_swipes: { parameters: ["pointer", "bool"], result: "void" },
    adw_carousel_get_allow_long_swipes: { parameters: ["pointer", "bool"], result: "bool" },
  },
  dialog: {
    adw_dialog_present: { parameters: ["pointer", "pointer"], result: "void" },
    adw_is_initialized: { parameters: [], result: "bool" },
  },
  message_dialog: {
    adw_message_dialog_choose: { parameters: ["pointer", "pointer", "function", "pointer"], result: "void" },
  },
  alert_dialog: {
    adw_alert_dialog_choose_finish: { parameters: ["pointer", "pointer"], result: "pointer" },
  },
};

for (const [groupName, symbols] of Object.entries(groups)) {
  try {
    Deno.dlopen(LIB_PATHS.adwaita, symbols);
    console.log(`OK: ${groupName}`);
  } catch (e) {
    console.log(`FAIL: ${groupName} — ${e.message}`);
  }
}
