import "@sigma/deno-compat";
import { LIB_PATHS } from "./paths/mod.ts";

export const gtk3 = Deno.dlopen(LIB_PATHS.gtk3, {
  gtk_init: { parameters: ["pointer", "pointer"], result: "void" },
  gtk_main: { parameters: [], result: "void" },
  gtk_main_quit: { parameters: [], result: "void" },
  gtk_menu_new: { parameters: [], result: "pointer" },
  gtk_menu_item_new_with_label: { parameters: ["buffer"], result: "pointer" },
  gtk_menu_shell_append: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_menu_shell_prepend: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_container_remove: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_container_get_children: {
    parameters: ["pointer"],
    result: "pointer",
  },
  gtk_widget_show_all: { parameters: ["pointer"], result: "void" },
  gtk_widget_show: { parameters: ["pointer"], result: "void" },
  gtk_widget_hide: { parameters: ["pointer"], result: "void" },
});
