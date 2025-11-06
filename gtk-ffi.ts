// GTK4 FFI bindings for Deno
// This module provides direct FFI bindings to GTK4, Adwaita, and GLib libraries

// Detect OS and set library paths
// On Linux, the dynamic linker can resolve library versions if we provide the soname
const OS = Deno.build.os;

function getLibPath(libName: string, soversion: string): string {
  if (OS === "linux") {
    // Try to load library - system linker will handle version resolution
    // It searches in standard locations: /usr/lib, /usr/local/lib, LD_LIBRARY_PATH
    return `${libName}.so.${soversion}`;
  } else if (OS === "darwin") {
    // macOS uses .dylib and typically doesn't use version numbers in the same way
    return `${libName}.${soversion}.dylib`;
  } else if (OS === "windows") {
    // Windows uses .dll (GTK4 on Windows is uncommon but possible via MSYS2)
    const baseName = libName.replace("lib", "");
    return `${baseName}-${soversion}.dll`;
  }
  return `${libName}.so.${soversion}`;
}

const LINUX_LIB_PATHS = {
  gtk: getLibPath("libgtk-4", "1"),
  adwaita: getLibPath("libadwaita-1", "0"),
  glib: getLibPath("libglib-2.0", "0"),
  gobject: getLibPath("libgobject-2.0", "0"),
  gio: getLibPath("libgio-2.0", "0"),
};

// GType fundamental types
export const G_TYPE_INVALID = 0 << 2;
export const G_TYPE_NONE = 1 << 2;
export const G_TYPE_INTERFACE = 2 << 2;
export const G_TYPE_CHAR = 3 << 2;
export const G_TYPE_UCHAR = 4 << 2;
export const G_TYPE_BOOLEAN = 5 << 2;
export const G_TYPE_INT = 6 << 2;
export const G_TYPE_UINT = 7 << 2;
export const G_TYPE_LONG = 8 << 2;
export const G_TYPE_ULONG = 9 << 2;
export const G_TYPE_INT64 = 10 << 2;
export const G_TYPE_UINT64 = 11 << 2;
export const G_TYPE_ENUM = 12 << 2;
export const G_TYPE_FLAGS = 13 << 2;
export const G_TYPE_FLOAT = 14 << 2;
export const G_TYPE_DOUBLE = 15 << 2;
export const G_TYPE_STRING = 16 << 2;
export const G_TYPE_POINTER = 17 << 2;
export const G_TYPE_BOXED = 18 << 2;
export const G_TYPE_PARAM = 19 << 2;
export const G_TYPE_OBJECT = 20 << 2;
export const G_TYPE_VARIANT = 21 << 2;

// GTK Orientation enum
export const GTK_ORIENTATION_HORIZONTAL = 0;
export const GTK_ORIENTATION_VERTICAL = 1;

// Adwaita color scheme enum
export const ADW_COLOR_SCHEME_DEFAULT = 0;
export const ADW_COLOR_SCHEME_FORCE_LIGHT = 1;
export const ADW_COLOR_SCHEME_FORCE_DARK = 2;

// GTK Align enum
export const GTK_ALIGN_FILL = 0;
export const GTK_ALIGN_START = 1;
export const GTK_ALIGN_END = 2;
export const GTK_ALIGN_CENTER = 3;
export const GTK_ALIGN_BASELINE = 4;

// GTK SelectionMode enum
export const GTK_SELECTION_NONE = 0;
export const GTK_SELECTION_SINGLE = 1;
export const GTK_SELECTION_BROWSE = 2;
export const GTK_SELECTION_MULTIPLE = 3;

// Load libraries
const glib = Deno.dlopen(LINUX_LIB_PATHS.glib, {
  g_main_loop_new: { parameters: ["pointer", "bool"], result: "pointer" },
  g_main_loop_run: { parameters: ["pointer"], result: "void" },
  g_main_loop_quit: { parameters: ["pointer"], result: "void" },
  g_main_context_default: { parameters: [], result: "pointer" },
  g_timeout_add: {
    parameters: ["u32", "function", "pointer"],
    result: "u32",
  },
  g_source_remove: { parameters: ["u32"], result: "bool" },
  g_free: { parameters: ["pointer"], result: "void" },
  g_strdup: { parameters: ["pointer"], result: "pointer" },
  g_malloc0: { parameters: ["usize"], result: "pointer" },
});

const gobject = Deno.dlopen(LINUX_LIB_PATHS.gobject, {
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

const gio = Deno.dlopen(LINUX_LIB_PATHS.gio, {
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

const gtk = Deno.dlopen(LINUX_LIB_PATHS.gtk, {
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
  gtk_window_set_title: { parameters: ["pointer", "buffer"], result: "void" },
  gtk_window_set_titlebar: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_window_set_default_size: {
    parameters: ["pointer", "i32", "i32"],
    result: "void",
  },
  gtk_window_present: { parameters: ["pointer"], result: "void" },
  gtk_window_close: { parameters: ["pointer"], result: "void" },
  gtk_box_new: { parameters: ["i32", "i32"], result: "pointer" },
  gtk_box_append: { parameters: ["pointer", "pointer"], result: "void" },
  gtk_box_remove: { parameters: ["pointer", "pointer"], result: "void" },
  gtk_label_new: { parameters: ["buffer"], result: "pointer" },
  gtk_label_set_text: { parameters: ["pointer", "buffer"], result: "void" },
  gtk_label_set_markup: { parameters: ["pointer", "buffer"], result: "void" },
  gtk_label_set_use_markup: { parameters: ["pointer", "bool"], result: "void" },
  gtk_button_new_with_label: { parameters: ["buffer"], result: "pointer" },
  gtk_button_set_label: { parameters: ["pointer", "buffer"], result: "void" },
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
  gtk_list_box_row_new: { parameters: [], result: "pointer" },
  gtk_list_box_row_set_child: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
  gtk_string_list_new: { parameters: ["pointer"], result: "pointer" },
  gtk_string_list_append: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  gtk_string_list_get_string: {
    parameters: ["pointer", "u32"],
    result: "pointer",
  },
  gtk_drop_down_new: { parameters: ["pointer", "pointer"], result: "pointer" },
  gtk_drop_down_get_selected: { parameters: ["pointer"], result: "u32" },
  gtk_drop_down_set_selected: {
    parameters: ["pointer", "u32"],
    result: "void",
  },
  gtk_entry_new: { parameters: [], result: "pointer" },
  gtk_editable_get_text: { parameters: ["pointer"], result: "pointer" },
  gtk_editable_set_text: { parameters: ["pointer", "buffer"], result: "void" },
  gtk_widget_set_margin_top: { parameters: ["pointer", "i32"], result: "void" },
  gtk_widget_set_margin_bottom: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  gtk_widget_set_margin_start: {
    parameters: ["pointer", "i32"],
    result: "void",
  },
  gtk_widget_set_margin_end: { parameters: ["pointer", "i32"], result: "void" },
  gtk_widget_set_halign: { parameters: ["pointer", "i32"], result: "void" },
  gtk_widget_set_valign: { parameters: ["pointer", "i32"], result: "void" },
  gtk_widget_set_hexpand: { parameters: ["pointer", "bool"], result: "void" },
  gtk_widget_set_vexpand: { parameters: ["pointer", "bool"], result: "void" },
  gtk_widget_set_visible: { parameters: ["pointer", "bool"], result: "void" },
  gtk_widget_get_visible: { parameters: ["pointer"], result: "bool" },
  gtk_widget_unparent: { parameters: ["pointer"], result: "void" },
  gtk_application_inhibit: {
    parameters: ["pointer", "pointer", "u32", "buffer"],
    result: "u32",
  },
  gtk_application_uninhibit: { parameters: ["pointer", "u32"], result: "void" },
  gtk_application_set_accels_for_action: {
    parameters: ["pointer", "buffer", "pointer"],
    result: "void",
  },
  gtk_widget_get_first_child: { parameters: ["pointer"], result: "pointer" },
  gtk_widget_get_next_sibling: { parameters: ["pointer"], result: "pointer" },
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
});

const adwaita = Deno.dlopen(LINUX_LIB_PATHS.adwaita, {
  adw_init: { parameters: [], result: "void" },
  adw_application_new: { parameters: ["buffer", "i32"], result: "pointer" },
  adw_header_bar_new: { parameters: [], result: "pointer" },
  adw_header_bar_pack_end: {
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
  adw_combo_row_new: { parameters: [], result: "pointer" },
  adw_switch_row_new: { parameters: [], result: "pointer" },
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
    parameters: ["pointer", "pointer", "pointer", "pointer"],
    result: "void",
  },
  adw_alert_dialog_new: {
    parameters: ["buffer", "buffer"],
    result: "pointer",
  },
  adw_alert_dialog_add_response: {
    parameters: ["pointer", "buffer", "buffer"],
    result: "void",
  },
  adw_alert_dialog_set_response_appearance: {
    parameters: ["pointer", "buffer", "i32"],
    result: "void",
  },
  adw_alert_dialog_set_default_response: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_alert_dialog_set_close_response: {
    parameters: ["pointer", "buffer"],
    result: "void",
  },
  adw_header_bar_pack_start: {
    parameters: ["pointer", "pointer"],
    result: "void",
  },
});

// Initialize GTK and Adwaita
adwaita.symbols.adw_init();

// Helper to create null-terminated string buffer
function cstr(str: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(str + "\0");
  return new Uint8Array(encoded.buffer);
}

// Helper to read C string
function readCStr(ptr: Deno.PointerValue): string {
  if (!ptr) return "";
  const view = new Deno.UnsafePointerView(ptr);
  return view.getCString();
}

// Helper to create GValue
function createGValue(): Uint8Array<ArrayBuffer> {
  // GValue is typically 24 bytes on 64-bit systems
  const buffer = new ArrayBuffer(24);
  return new Uint8Array(buffer);
}

// Base class for GObject wrappers
export class GObject {
  public ptr: Deno.PointerValue;

  constructor(ptr: Deno.PointerValue) {
    this.ptr = ptr;
    if (ptr) {
      gobject.symbols.g_object_ref(ptr);
    }
  }

  unref(): void {
    if (this.ptr) {
      gobject.symbols.g_object_unref(this.ptr);
      this.ptr = null;
    }
  }

  connect(signal: string, callback: (...args: unknown[]) => unknown): number {
    const signalCStr = cstr(signal);
    const cb = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "pointer"],
        result: "void",
      } as Deno.UnsafeCallbackDefinition,
      () => {
        callback();
      },
    );

    const signalId = gobject.symbols.g_signal_connect_data(
      this.ptr,
      signalCStr,
      cb.pointer as Deno.PointerValue,
      null,
      null,
      0,
    );

    return Number(signalId);
  }

  disconnect(signalId: number): void {
    gobject.symbols.g_signal_handler_disconnect(this.ptr, BigInt(signalId));
  }

  setProperty(name: string, value: unknown): void {
    const nameCStr = cstr(name);
    const gvalue = createGValue();
    const gvaluePtr = Deno.UnsafePointer.of(gvalue)!;

    if (typeof value === "string") {
      gobject.symbols.g_value_init(gvaluePtr, BigInt(G_TYPE_STRING));
      gobject.symbols.g_value_set_string(
        gvaluePtr as Deno.PointerValue,
        cstr(value),
      );
    } else if (typeof value === "boolean") {
      gobject.symbols.g_value_init(gvaluePtr, BigInt(G_TYPE_BOOLEAN));
      gobject.symbols.g_value_set_boolean(gvaluePtr, value);
    } else if (typeof value === "number") {
      gobject.symbols.g_value_init(gvaluePtr, BigInt(G_TYPE_INT));
      gobject.symbols.g_value_set_int(gvaluePtr, value);
    } else if (value instanceof GObject) {
      gobject.symbols.g_value_init(gvaluePtr, BigInt(G_TYPE_OBJECT));
      gobject.symbols.g_value_set_object(gvaluePtr, value.ptr);
    } else if (typeof value === "object" && value !== null) {
      // Handle raw Deno.PointerValue for object properties
      gobject.symbols.g_value_init(gvaluePtr, BigInt(G_TYPE_OBJECT));
      gobject.symbols.g_value_set_object(gvaluePtr, value as Deno.PointerValue);
    }

    gobject.symbols.g_object_set_property(
      this.ptr,
      nameCStr,
      gvaluePtr as Deno.PointerValue,
    );
    gobject.symbols.g_value_unset(gvaluePtr);
  }

  getProperty(name: string, type?: number): unknown {
    const nameCStr = cstr(name);
    const gvalue = createGValue();
    const gvaluePtr = Deno.UnsafePointer.of(gvalue)!;

    // Auto-infer type from property name if not provided
    if (type === undefined) {
      if (
        name === "active" || name === "visible" || name === "sensitive" ||
        name === "modal" || name === "hide-on-close"
      ) {
        type = G_TYPE_BOOLEAN;
      } else if (
        name === "selected" || name === "width" || name === "height"
      ) {
        type = G_TYPE_UINT;
      } else if (
        name === "title" || name === "subtitle" || name === "icon-name"
      ) {
        type = G_TYPE_STRING;
      } else {
        type = G_TYPE_OBJECT;
      }
    }

    gobject.symbols.g_value_init(gvaluePtr, BigInt(type));
    gobject.symbols.g_object_get_property(
      this.ptr,
      nameCStr,
      gvaluePtr as Deno.PointerValue,
    );

    let result: unknown;
    if (type === G_TYPE_STRING) {
      const strPtr = gobject.symbols.g_value_get_string(gvaluePtr);
      result = readCStr(strPtr);
    } else if (type === G_TYPE_BOOLEAN) {
      result = gobject.symbols.g_value_get_boolean(gvaluePtr);
    } else if (type === G_TYPE_INT) {
      result = gobject.symbols.g_value_get_int(gvaluePtr);
    } else if (type === G_TYPE_UINT) {
      result = gobject.symbols.g_value_get_uint(gvaluePtr);
    } else if (type === G_TYPE_OBJECT) {
      result = gobject.symbols.g_value_get_object(gvaluePtr);
    }

    gobject.symbols.g_value_unset(gvaluePtr);
    return result;
  }
}

// GTK Widget wrapper
export class Widget extends GObject {
  setMarginTop(margin: number): void {
    gtk.symbols.gtk_widget_set_margin_top(this.ptr, margin);
  }

  setMarginBottom(margin: number): void {
    gtk.symbols.gtk_widget_set_margin_bottom(this.ptr, margin);
  }

  setMarginStart(margin: number): void {
    gtk.symbols.gtk_widget_set_margin_start(this.ptr, margin);
  }

  setMarginEnd(margin: number): void {
    gtk.symbols.gtk_widget_set_margin_end(this.ptr, margin);
  }

  setHalign(align: number): void {
    gtk.symbols.gtk_widget_set_halign(this.ptr, align);
  }

  setValign(align: number): void {
    gtk.symbols.gtk_widget_set_valign(this.ptr, align);
  }

  setHexpand(expand: boolean): void {
    gtk.symbols.gtk_widget_set_hexpand(this.ptr, expand);
  }

  setVexpand(expand: boolean): void {
    gtk.symbols.gtk_widget_set_vexpand(this.ptr, expand);
  }

  setVisible(visible: boolean): void {
    gtk.symbols.gtk_widget_set_visible(this.ptr, visible);
  }

  setApplication(app: Application): void {
    this.setProperty("application", app.ptr);
  }

  setTitlebar(titlebar: Widget): void {
    this.setProperty("titlebar", titlebar.ptr);
  }

  setModel(model: GObject): void {
    this.setProperty("model", model.ptr);
  }

  setTransientForWidget(parent: Widget): void {
    this.setProperty("transient-for", parent.ptr);
  }
}

// AdwApplication extends GtkApplication extends GApplication extends GObject
// We use AdwApplication directly which gives us both GTK and Adwaita features
export class Application extends GObject {
  constructor(applicationId: string, flags: number) {
    const idCStr = cstr(applicationId);
    const ptr = adwaita.symbols.adw_application_new(idCStr, flags);
    super(ptr);
  }

  run(args: string[]): number {
    return gio.symbols.g_application_run(this.ptr, args.length, null);
  }

  quit(): void {
    gio.symbols.g_application_quit(this.ptr);
  }

  register(): void {
    gio.symbols.g_application_register(this.ptr, null, null);
  }

  activate(): void {
    gio.symbols.g_application_activate(this.ptr);
  }

  inhibit(window: Widget | null, flags: number, reason: string): number {
    const reasonCStr = cstr(reason);
    const windowPtr = window ? window.ptr : null;
    return gtk.symbols.gtk_application_inhibit(
      this.ptr,
      windowPtr,
      flags,
      reasonCStr,
    );
  }

  uninhibit(cookie: number): void {
    gtk.symbols.gtk_application_uninhibit(this.ptr, cookie);
  }

  addAction(action: SimpleAction): void {
    gio.symbols.g_action_map_add_action(this.ptr, action.ptr);
  }

  setAccelsForAction(detailedActionName: string, accels: string[]): void {
    // Create a NULL-terminated array of C strings
    const accelPtrs = new BigUint64Array(accels.length + 1);
    const accelCStrs: Uint8Array[] = [];

    for (let i = 0; i < accels.length; i++) {
      const cstr = new TextEncoder().encode(accels[i] + "\0");
      accelCStrs.push(cstr);
      const ptr = Deno.UnsafePointer.of(cstr);
      accelPtrs[i] = ptr ? BigInt(Deno.UnsafePointer.value(ptr)) : 0n;
    }
    accelPtrs[accels.length] = 0n; // NULL terminator

    const actionCStr = cstr(detailedActionName);
    gtk.symbols.gtk_application_set_accels_for_action(
      this.ptr,
      actionCStr,
      Deno.UnsafePointer.of(accelPtrs),
    );
  }
}

// Application inhibit flags
export const GTK_APPLICATION_INHIBIT_LOGOUT = 1 << 0;
export const GTK_APPLICATION_INHIBIT_SWITCH = 1 << 1;
export const GTK_APPLICATION_INHIBIT_SUSPEND = 1 << 2;
export const GTK_APPLICATION_INHIBIT_IDLE = 1 << 3;

// GTK Window base class
export class Window extends Widget {
  constructor(ptr: Deno.PointerValue) {
    super(ptr);
  }

  setTitle(title: string): void {
    const titleCStr = cstr(title);
    gtk.symbols.gtk_window_set_title(this.ptr, titleCStr);
  }

  setDefaultSize(width: number, height: number): void {
    gtk.symbols.gtk_window_set_default_size(this.ptr, width, height);
  }

  setChild(child: Widget): void {
    gtk.symbols.gtk_window_set_child(this.ptr, child.ptr);
  }

  getChild(): Deno.PointerValue | null {
    return gtk.symbols.gtk_window_get_child(this.ptr);
  }

  present(): void {
    gtk.symbols.gtk_window_present(this.ptr);
  }

  close(): void {
    gtk.symbols.gtk_window_close(this.ptr);
  }

  setTransientFor(parent: Window): void {
    gtk.symbols.gtk_window_set_transient_for(this.ptr, parent.ptr);
  }

  setModal(modal: boolean): void {
    gtk.symbols.gtk_window_set_modal(this.ptr, modal);
  }

  destroy(): void {
    gtk.symbols.gtk_window_destroy(this.ptr);
  }
}

// GTK ApplicationWindow extends Window
export class ApplicationWindow extends Window {
  constructor(app: Application) {
    const ptr = gtk.symbols.gtk_application_window_new(app.ptr);
    super(ptr);
  }
}

// GTK Box
export class Box extends Widget {
  constructor(orientation: number, spacing: number) {
    const ptr = gtk.symbols.gtk_box_new(orientation, spacing);
    super(ptr);
  }

  append(child: Widget): void {
    gtk.symbols.gtk_box_append(this.ptr, child.ptr);
  }

  remove(child: Widget): void {
    gtk.symbols.gtk_box_remove(this.ptr, child.ptr);
  }
}

// GTK Label
export class Label extends Widget {
  constructor(text: string) {
    const textCStr = cstr(text);
    const ptr = gtk.symbols.gtk_label_new(textCStr);
    super(ptr);
  }

  setText(text: string): void {
    const textCStr = cstr(text);
    gtk.symbols.gtk_label_set_text(this.ptr, textCStr);
  }

  setMarkup(markup: string): void {
    const markupCStr = cstr(markup);
    gtk.symbols.gtk_label_set_markup(this.ptr, markupCStr);
  }

  setUseMarkup(useMarkup: boolean): void {
    gtk.symbols.gtk_label_set_use_markup(this.ptr, useMarkup);
  }
}

// GTK Button
export class Button extends Widget {
  constructor(label: string) {
    const labelCStr = cstr(label);
    const ptr = gtk.symbols.gtk_button_new_with_label(labelCStr);
    super(ptr);
  }

  setLabel(label: string): void {
    const labelCStr = cstr(label);
    gtk.symbols.gtk_button_set_label(this.ptr, labelCStr);
  }
}

// GTK Frame
export class Frame extends Widget {
  constructor(label?: string) {
    const labelCStr = label ? cstr(label) : null;
    const ptr = gtk.symbols.gtk_frame_new(labelCStr);
    super(ptr);
  }

  setChild(child: Widget): void {
    gtk.symbols.gtk_frame_set_child(this.ptr, child.ptr);
  }
}

// GTK ScrolledWindow extends GtkWidget
export class ScrolledWindow extends Widget {
  constructor() {
    const ptr = gtk.symbols.gtk_scrolled_window_new();
    super(ptr);
  }

  setChild(child: Widget): void {
    gtk.symbols.gtk_scrolled_window_set_child(this.ptr, child.ptr);
  }

  setMinContentHeight(height: number): void {
    gtk.symbols.gtk_scrolled_window_set_min_content_height(this.ptr, height);
  }
}

// GTK ListBox extends GtkWidget
export class ListBox extends Widget {
  constructor() {
    const ptr = gtk.symbols.gtk_list_box_new();
    super(ptr);
  }

  append(row: Widget): void {
    gtk.symbols.gtk_list_box_append(this.ptr, row.ptr);
  }

  remove(row: Widget): void {
    gtk.symbols.gtk_list_box_remove(this.ptr, row.ptr);
  }

  setSelectionMode(mode: number): void {
    gtk.symbols.gtk_list_box_set_selection_mode(this.ptr, mode);
  }

  getFirstChild(): Deno.PointerValue | null {
    return gtk.symbols.gtk_widget_get_first_child(this.ptr);
  }

  getNextSibling(child: Deno.PointerValue): Deno.PointerValue | null {
    return gtk.symbols.gtk_widget_get_next_sibling(child);
  }
}

// GTK ListBoxRow extends GtkWidget
export class ListBoxRow extends Widget {
  constructor(ptr?: Deno.PointerValue) {
    const actualPtr = ptr ?? gtk.symbols.gtk_list_box_row_new();
    super(actualPtr);
  }

  setChild(child: Widget): void {
    gtk.symbols.gtk_list_box_row_set_child(this.ptr, child.ptr);
  }
}

// GtkStringList extends GObject (implements GListModel)
export class StringList extends GObject {
  constructor() {
    const ptr = gtk.symbols.gtk_string_list_new(null);
    super(ptr);
  }

  append(text: string): void {
    const textCStr = cstr(text);
    gtk.symbols.gtk_string_list_append(this.ptr, textCStr);
  }

  getString(position: number): string {
    const ptr = gtk.symbols.gtk_string_list_get_string(this.ptr, position);
    return readCStr(ptr);
  }
}

// GTK DropDown extends GtkWidget
export class DropDown extends Widget {
  constructor(model: StringList) {
    const ptr = gtk.symbols.gtk_drop_down_new(model.ptr, null);
    super(ptr);
  }

  getSelected(): number {
    return gtk.symbols.gtk_drop_down_get_selected(this.ptr);
  }

  setSelected(position: number): void {
    gtk.symbols.gtk_drop_down_set_selected(this.ptr, position);
  }
}

// GTK Entry extends GtkWidget
export class Entry extends Widget {
  constructor() {
    const ptr = gtk.symbols.gtk_entry_new();
    super(ptr);
  }

  getText(): string {
    const ptr = gtk.symbols.gtk_editable_get_text(this.ptr);
    return readCStr(ptr);
  }

  setText(text: string): void {
    const textCStr = cstr(text);
    gtk.symbols.gtk_editable_set_text(this.ptr, textCStr);
  }
}

// AdwHeaderBar extends GtkWidget
export class HeaderBar extends Widget {
  constructor() {
    const ptr = adwaita.symbols.adw_header_bar_new();
    super(ptr);
  }

  packStart(child: Widget): void {
    adwaita.symbols.adw_header_bar_pack_start(this.ptr, child.ptr);
  }

  packEnd(child: Widget): void {
    adwaita.symbols.adw_header_bar_pack_end(this.ptr, child.ptr);
  }
}

// AdwAboutDialog extends AdwDialog extends GtkWidget
// Note: AdwDialog is not GtkWindow in GTK4, it's a separate widget
export class AboutDialog extends Widget {
  constructor() {
    const ptr = adwaita.symbols.adw_about_dialog_new();
    super(ptr);
  }

  setApplicationName(name: string): void {
    const nameCStr = cstr(name);
    adwaita.symbols.adw_about_dialog_set_application_name(this.ptr, nameCStr);
  }

  setVersion(version: string): void {
    const versionCStr = cstr(version);
    adwaita.symbols.adw_about_dialog_set_version(this.ptr, versionCStr);
  }

  setDeveloperName(name: string): void {
    const nameCStr = cstr(name);
    adwaita.symbols.adw_about_dialog_set_developer_name(this.ptr, nameCStr);
  }

  setComments(comments: string): void {
    const commentsCStr = cstr(comments);
    adwaita.symbols.adw_about_dialog_set_comments(this.ptr, commentsCStr);
  }

  setTransientFor(parent: Widget): void {
    this.setProperty("transient-for", parent.ptr);
  }

  setModal(modal: boolean): void {
    this.setProperty("modal", modal);
  }

  show(): void {
    this.setProperty("visible", true);
  }
}

// AdwToolbarView extends GtkWidget
export class ToolbarView extends Widget {
  constructor() {
    const ptr = adwaita.symbols.adw_toolbar_view_new();
    super(ptr);
  }

  setContent(content: Widget): void {
    adwaita.symbols.adw_toolbar_view_set_content(this.ptr, content.ptr);
  }

  addTopBar(topBar: Widget): void {
    adwaita.symbols.adw_toolbar_view_add_top_bar(this.ptr, topBar.ptr);
  }
}

// GLib MainLoop
export class MainLoop {
  private ptr: Deno.PointerValue;

  constructor() {
    const context = glib.symbols.g_main_context_default();
    this.ptr = glib.symbols.g_main_loop_new(context, false);
  }

  run(): void {
    glib.symbols.g_main_loop_run(this.ptr);
  }

  quit(): void {
    glib.symbols.g_main_loop_quit(this.ptr);
  }
}

// GLib timeout
export function timeout(ms: number, callback: () => boolean): number {
  const cb = new Deno.UnsafeCallback(
    {
      parameters: ["pointer"],
      result: "bool",
    } as Deno.UnsafeCallbackDefinition,
    () => {
      return callback();
    },
  );

  return glib.symbols.g_timeout_add(ms, cb.pointer as Deno.PointerValue, null);
}

export function removeTimeout(id: number): void {
  glib.symbols.g_source_remove(id);
}

// GMenu extends GMenuModel extends GObject
export class Menu extends GObject {
  constructor() {
    const ptr = gio.symbols.g_menu_new();
    super(ptr);
  }

  append(label: string, detailedAction: string): void {
    const labelCStr = cstr(label);
    const actionCStr = cstr(detailedAction);
    gio.symbols.g_menu_append(this.ptr, labelCStr, actionCStr);
  }
}

// GSimpleAction extends GObject
export class SimpleAction extends GObject {
  constructor(name: string) {
    const nameCStr = cstr(name);
    const ptr = gio.symbols.g_simple_action_new(nameCStr, null);
    super(ptr);
  }
}

export function addAction(app: Application, action: SimpleAction): void {
  gio.symbols.g_action_map_add_action(app.ptr, action.ptr);
}

// Export constants
export const Orientation = {
  HORIZONTAL: GTK_ORIENTATION_HORIZONTAL,
  VERTICAL: GTK_ORIENTATION_VERTICAL,
};

export const Align = {
  FILL: GTK_ALIGN_FILL,
  START: GTK_ALIGN_START,
  END: GTK_ALIGN_END,
  CENTER: GTK_ALIGN_CENTER,
  BASELINE: GTK_ALIGN_BASELINE,
};

export const SelectionMode = {
  NONE: GTK_SELECTION_NONE,
  SINGLE: GTK_SELECTION_SINGLE,
  BROWSE: GTK_SELECTION_BROWSE,
  MULTIPLE: GTK_SELECTION_MULTIPLE,
};

// Helper function to create GObject instances from type name
export function createGObject(typeName: string): Deno.PointerValue | null {
  const type = gobject.symbols.g_type_from_name(cstr(typeName));
  if (!type) return null;
  return gobject.symbols.g_object_new(type, null);
}

// AdwPreferencesGroup extends GtkWidget
export class PreferencesGroup extends Widget {
  constructor() {
    const ptr = adwaita.symbols.adw_preferences_group_new();
    super(ptr);
  }

  add(widget: Widget | ActionRow | ComboRow): void {
    adwaita.symbols.adw_preferences_group_add(this.ptr, widget.ptr);
  }
}

// AdwPreferencesPage extends GtkWidget
export class PreferencesPage extends Widget {
  constructor() {
    const ptr = adwaita.symbols.adw_preferences_page_new();
    super(ptr);
  }

  add(group: PreferencesGroup): void {
    adwaita.symbols.adw_preferences_page_add(this.ptr, group.ptr);
  }
}

// AdwPreferencesWindow extends AdwWindow extends GtkWindow
// Since we don't have AdwWindow class, extend Window directly
export class PreferencesWindow extends Window {
  constructor() {
    const ptr = adwaita.symbols.adw_preferences_window_new();
    super(ptr);
  }

  add(page: PreferencesPage): void {
    adwaita.symbols.adw_preferences_window_add(this.ptr, page.ptr);
  }
}

// AdwActionRow extends AdwPreferencesRow extends GtkListBoxRow extends GtkWidget
export class ActionRow extends ListBoxRow {
  constructor(ptr?: Deno.PointerValue) {
    const actualPtr = ptr ?? createGObject("AdwActionRow");
    if (!actualPtr) throw new Error("Failed to create ActionRow");
    super(actualPtr);
  }
}

// AdwComboRow extends AdwActionRow extends AdwPreferencesRow extends GtkListBoxRow extends GtkWidget
export class ComboRow extends ActionRow {
  constructor() {
    const ptr = createGObject("AdwComboRow");
    if (!ptr) throw new Error("Failed to create ComboRow");
    super(ptr);
  }
}

// AdwMessageDialog extends GtkWindow extends GtkWidget
export class MessageDialog extends Window {
  constructor(parent: Window | null, heading: string, body: string) {
    const headingCStr = cstr(heading);
    const bodyCStr = cstr(body);
    const ptr = adwaita.symbols.adw_message_dialog_new(
      parent ? parent.ptr : null,
      headingCStr,
      bodyCStr,
    );
    super(ptr);
  }

  addResponse(id: string, label: string): void {
    const idCStr = cstr(id);
    const labelCStr = cstr(label);
    adwaita.symbols.adw_message_dialog_add_response(
      this.ptr,
      idCStr,
      labelCStr,
    );
  }

  setResponseAppearance(response: string, appearance: number): void {
    const responseCStr = cstr(response);
    adwaita.symbols.adw_message_dialog_set_response_appearance(
      this.ptr,
      responseCStr,
      appearance,
    );
  }

  setDefaultResponse(response: string): void {
    const responseCStr = cstr(response);
    adwaita.symbols.adw_message_dialog_set_default_response(
      this.ptr,
      responseCStr,
    );
  }

  setCloseResponse(response: string): void {
    const responseCStr = cstr(response);
    adwaita.symbols.adw_message_dialog_set_close_response(
      this.ptr,
      responseCStr,
    );
  }

  onResponse(callback: (response: string) => void): void {
    // The "response" signal on AdwMessageDialog passes the response ID as a string parameter
    const cb = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "pointer", "pointer"],
        result: "void",
      } as const,
      (
        _self: Deno.PointerValue,
        responseIdPtr: Deno.PointerValue,
        _userData: Deno.PointerValue,
      ) => {
        const responseId = readCStr(responseIdPtr);
        callback(responseId);
      },
    );

    const signalCStr = cstr("response");
    gobject.symbols.g_signal_connect_data(
      this.ptr,
      signalCStr,
      cb.pointer,
      null,
      null,
      0,
    );
  }
}

// Response appearance constants
export const ADW_RESPONSE_DEFAULT = 0;
export const ADW_RESPONSE_SUGGESTED = 1;
export const ADW_RESPONSE_DESTRUCTIVE = 2;

// StyleManager wrapper for Adwaita theme control
export class StyleManager {
  ptr: Deno.PointerValue;

  private constructor(ptr: Deno.PointerValue) {
    this.ptr = ptr;
  }

  static getDefault(): StyleManager {
    const ptr = adwaita.symbols.adw_style_manager_get_default();
    return new StyleManager(ptr);
  }

  setColorScheme(scheme: number): void {
    adwaita.symbols.adw_style_manager_set_color_scheme(this.ptr, scheme);
  }

  getColorScheme(): number {
    return adwaita.symbols.adw_style_manager_get_color_scheme(
      this.ptr,
    ) as number;
  }
}

// GtkMenuButton extends GtkWidget
export class MenuButton extends Widget {
  constructor() {
    const ptr = createGObject("GtkMenuButton");
    if (!ptr) throw new Error("Failed to create MenuButton");
    super(ptr);
  }

  setMenuModel(menu: Menu): void {
    this.setProperty("menu-model", menu.ptr);
  }

  setPrimary(primary: boolean): void {
    this.setProperty("primary", primary);
  }

  setIconName(iconName: string): void {
    this.setProperty("icon-name", iconName);
  }
}

// GtkBuilder extends GObject
export class Builder extends GObject {
  constructor() {
    const ptr = gtk.symbols.gtk_builder_new();
    super(ptr);
  }

  addFromFile(filename: string): boolean {
    const filenameCStr = cstr(filename);
    return gtk.symbols.gtk_builder_add_from_file(this.ptr, filenameCStr, null);
  }

  addFromString(uiDefinition: string): boolean {
    const uiCStr = cstr(uiDefinition);
    return gtk.symbols.gtk_builder_add_from_string(
      this.ptr,
      uiCStr,
      BigInt(uiCStr.length - 1),
      null,
    );
  }

  getObject(name: string): Deno.PointerValue | null {
    const nameCStr = cstr(name);
    return gtk.symbols.gtk_builder_get_object(this.ptr, nameCStr);
  }

  getWidget(name: string): Widget | null {
    const ptr = this.getObject(name);
    if (!ptr) return null;
    return new Widget(ptr);
  }
}

// GSimpleAction wrapper

// Initialize Adwaita
export function initAdwaita(): void {
  adwaita.symbols.adw_init();
}
