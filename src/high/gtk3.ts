import { gtk3 } from "../low/gtk3.ts";
import { cstr } from "../low/utils.ts";
import { GObject } from "./gobject.ts";

export class Widget extends GObject {
  show(): void {
    gtk3.symbols.gtk_widget_show(this.ptr);
  }
  showAll(): void {
    gtk3.symbols.gtk_widget_show_all(this.ptr);
  }
  hide(): void {
    gtk3.symbols.gtk_widget_hide(this.ptr);
  }
}

export class Container extends Widget {
  remove(widget: Widget): void {
    gtk3.symbols.gtk_container_remove(this.ptr, widget.ptr);
  }
}

export class MenuShell extends Container {
  append(child: Widget): void {
    gtk3.symbols.gtk_menu_shell_append(this.ptr, child.ptr);
  }
  prepend(child: Widget): void {
    gtk3.symbols.gtk_menu_shell_prepend(this.ptr, child.ptr);
  }
}

export class Menu extends MenuShell {
  constructor() {
    const ptr = gtk3.symbols.gtk_menu_new();
    super(ptr);
  }
}

export class MenuItem extends Container {
  constructor(label?: string) {
    const ptr = gtk3.symbols.gtk_menu_item_new_with_label(cstr(label ?? ""));
    super(ptr);
  }
}

/**
 * Initialize GTK3. Must be called before creating any GTK3 widgets
 * (e.g. when building a tray icon app with the appindicator module).
 */
export function init(): void {
  gtk3.symbols.gtk_init(null, null);
}

export function main(): void {
  gtk3.symbols.gtk_main();
}

export function mainQuit(): void {
  gtk3.symbols.gtk_main_quit();
}
