// Windows-only: diagnose which libadwaita symbols fail to load
import "@sigma/deno-compat";
import { LIB_PATHS } from "../src/low/paths/mod.ts";

console.log(`LIB_PATHS.adwaita = ${LIB_PATHS.adwaita}`);
console.log(`LIB_PATHS.gtk4 = ${LIB_PATHS.gtk4}`);

// First test: try with gtk4 (which should work)
try {
  const lib = Deno.dlopen(LIB_PATHS.gtk4, {});
  console.log("GTK4 empty dlopen: OK");
  lib.close();
} catch (e) {
  console.log(`GTK4 empty dlopen: FAIL — ${(e as Error).message}`);
}

// Test adwaita with empty symbols
try {
  const lib = Deno.dlopen(LIB_PATHS.adwaita, {});
  console.log("Adwaita empty dlopen: OK");
  lib.close();
} catch (e) {
  console.log(`Adwaita empty dlopen: FAIL — ${(e as Error).message}`);
}

const groups = {
  about_window: {
    adw_about_window_new: {
      parameters: [] as const,
      result: "pointer" as const,
    },
    adw_about_window_set_application_name: {
      parameters: ["pointer" as const, "buffer" as const],
      result: "void" as const,
    },
    adw_about_window_set_version: {
      parameters: ["pointer" as const, "buffer" as const],
      result: "void" as const,
    },
    adw_about_window_set_developer_name: {
      parameters: ["pointer" as const, "buffer" as const],
      result: "void" as const,
    },
    adw_about_window_set_developers: {
      parameters: ["pointer" as const, "pointer" as const],
      result: "void" as const,
    },
    adw_about_window_set_designers: {
      parameters: ["pointer" as const, "pointer" as const],
      result: "void" as const,
    },
    adw_about_window_set_translator_credits: {
      parameters: ["pointer" as const, "buffer" as const],
      result: "void" as const,
    },
    adw_about_window_set_license_type: {
      parameters: ["pointer" as const, "i32" as const],
      result: "void" as const,
    },
    adw_about_window_set_website: {
      parameters: ["pointer" as const, "buffer" as const],
      result: "void" as const,
    },
    adw_about_window_set_issue_url: {
      parameters: ["pointer" as const, "buffer" as const],
      result: "void" as const,
    },
    adw_about_window_set_application_icon: {
      parameters: ["pointer" as const, "buffer" as const],
      result: "void" as const,
    },
  },
  carousel_extra: {
    adw_carousel_set_scroll_params: {
      parameters: ["pointer" as const, "pointer" as const],
      result: "void" as const,
    },
    adw_carousel_get_scroll_params: {
      parameters: ["pointer" as const],
      result: "pointer" as const,
    },
    adw_carousel_set_allow_mouse_drag: {
      parameters: ["pointer" as const, "bool" as const],
      result: "void" as const,
    },
    adw_carousel_get_allow_mouse_drag: {
      parameters: ["pointer" as const],
      result: "bool" as const,
    },
    adw_carousel_set_allow_scroll_wheel: {
      parameters: ["pointer" as const, "bool" as const],
      result: "void" as const,
    },
    adw_carousel_get_allow_scroll_wheel: {
      parameters: ["pointer" as const],
      result: "bool" as const,
    },
    adw_carousel_set_allow_long_swipes: {
      parameters: ["pointer" as const, "bool" as const],
      result: "void" as const,
    },
    adw_carousel_get_allow_long_swipes: {
      parameters: ["pointer" as const],
      result: "bool" as const,
    },
  },
  dialog: {
    adw_dialog_present: {
      parameters: ["pointer" as const, "pointer" as const],
      result: "void" as const,
    },
    adw_is_initialized: { parameters: [] as const, result: "bool" as const },
  },
  message_dialog: {
    adw_message_dialog_choose: {
      parameters: [
        "pointer" as const,
        "pointer" as const,
        "function" as const,
        "pointer" as const,
      ],
      result: "void" as const,
    },
  },
  alert_dialog: {
    adw_alert_dialog_choose_finish: {
      parameters: ["pointer" as const, "pointer" as const],
      result: "pointer" as const,
    },
  },
};

for (const [groupName, symbols] of Object.entries(groups)) {
  try {
    Deno.dlopen(LIB_PATHS.adwaita, symbols);
    console.log(`OK: ${groupName}`);
  } catch (e) {
    console.log(`FAIL: ${groupName} — ${(e as Error).message}`);
  }
}
