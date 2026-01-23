// deno-lint-ignore-file no-explicit-any
import { adw } from "../low/adw.ts";
import { gio } from "../low/gio.ts";
import { glib } from "../low/glib.ts";
import { gobject } from "../low/gobject.ts";
import { gtk4 } from "../low/gtk4.ts";
import { cstr, readCStr } from "../low/utils.ts";
import { CairoContext } from "./cairo.ts";
import type { Menu, SimpleAction } from "./gio.ts";
import { GObject } from "./gobject.ts";

// ============================================================================
// GTK Enums and Constants
// ============================================================================

// GTK Orientation enum
export const Orientation = {
  HORIZONTAL: 0,
  VERTICAL: 1,
} as const;

// GTK Align enum
export const Align = {
  FILL: 0,
  START: 1,
  END: 2,
  CENTER: 3,
  BASELINE: 4,
} as const;

// GTK SelectionMode enum
export const SelectionMode = {
  NONE: 0,
  SINGLE: 1,
  BROWSE: 2,
  MULTIPLE: 3,
} as const;

// GApplicationFlags (used by Application)
export const ApplicationFlags = {
  NONE: 0,
  IS_SERVICE: 1 << 0,
  IS_LAUNCHER: 1 << 1,
  HANDLES_OPEN: 1 << 2,
  HANDLES_COMMAND_LINE: 1 << 3,
  SEND_ENVIRONMENT: 1 << 4,
  NON_UNIQUE: 1 << 5,
  CAN_OVERRIDE_APP_ID: 1 << 6,
  ALLOW_REPLACEMENT: 1 << 7,
  REPLACE: 1 << 8,
} as const;

// GTK License types (for AboutDialog)
export const License = {
  UNKNOWN: 0,
  CUSTOM: 1,
  GPL_2_0: 2,
  GPL_3_0: 3,
  LGPL_2_1: 4,
  LGPL_3_0: 5,
  BSD: 6,
  MIT_X11: 7,
  ARTISTIC: 8,
  GPL_2_0_ONLY: 9,
  GPL_3_0_ONLY: 10,
  LGPL_2_1_ONLY: 11,
  LGPL_3_0_ONLY: 12,
  AGPL_3_0: 13,
  AGPL_3_0_ONLY: 14,
  BSD_3: 15,
  APACHE_2_0: 16,
  MPL_2_0: 17,
} as const;

// GTK Style Provider Priority
export const StyleProviderPriority = {
  FALLBACK: 1,
  THEME: 200,
  SETTINGS: 400,
  APPLICATION: 600,
  USER: 800,
} as const;

// GTK Application Inhibit flags
export const ApplicationInhibitFlags = {
  LOGOUT: 1,
  SWITCH: 2,
  SUSPEND: 4,
  IDLE: 8,
} as const;

// Drag action flags
export const DragAction = {
  COPY: 1,
  MOVE: 2,
  LINK: 4,
  ASK: 8,
} as const;

// Modifier type flags (for keyboard shortcuts)
export const ModifierType = {
  SHIFT_MASK: 1,
  LOCK_MASK: 2,
  CONTROL_MASK: 4,
  ALT_MASK: 8,
} as const;

// Common key values
export const Key = {
  v: 118,
  o: 111,
  t: 116,
  r: 114,
  q: 113,
  w: 119,
} as const;

// GTK Widget wrapper
export class Widget extends GObject {
  setMarginTop(margin: number): void {
    gtk4.symbols.gtk_widget_set_margin_top(this.ptr, margin);
  }

  setMarginBottom(margin: number): void {
    gtk4.symbols.gtk_widget_set_margin_bottom(this.ptr, margin);
  }

  setMarginStart(margin: number): void {
    gtk4.symbols.gtk_widget_set_margin_start(this.ptr, margin);
  }

  setMarginEnd(margin: number): void {
    gtk4.symbols.gtk_widget_set_margin_end(this.ptr, margin);
  }

  setHalign(align: number): void {
    gtk4.symbols.gtk_widget_set_halign(this.ptr, align);
  }

  setValign(align: number): void {
    gtk4.symbols.gtk_widget_set_valign(this.ptr, align);
  }

  setHexpand(expand: boolean): void {
    gtk4.symbols.gtk_widget_set_hexpand(this.ptr, expand);
  }

  setVexpand(expand: boolean): void {
    gtk4.symbols.gtk_widget_set_vexpand(this.ptr, expand);
  }

  setVisible(visible: boolean): void {
    gtk4.symbols.gtk_widget_set_visible(this.ptr, visible);
  }

  getVisible(): boolean {
    return gtk4.symbols.gtk_widget_get_visible(this.ptr);
  }

  setSizeRequest(width: number, height: number): void {
    gtk4.symbols.gtk_widget_set_size_request(this.ptr, width, height);
  }

  setApplication(app: Application): void {
    this.setProperty("application", app);
  }

  setTitlebar(titlebar: Widget): void {
    this.setProperty("titlebar", titlebar);
  }

  setModel(model: GObject): void {
    this.setProperty("model", model);
  }

  setTransientForWidget(parent: Widget): void {
    this.setProperty("transient-for", parent);
  }

  queueDraw(): void {
    gtk4.symbols.gtk_widget_queue_draw(this.ptr);
  }

  grabFocus(): boolean {
    return gtk4.symbols.gtk_widget_grab_focus(this.ptr);
  }

  getDisplay(): Display {
    const ptr = gtk4.symbols.gtk_widget_get_display(this.ptr);
    return new (Display as any)(ptr);
  }

  getStyleContext(): StyleContext {
    const ptr = gtk4.symbols.gtk_widget_get_style_context(this.ptr);
    return new StyleContext(ptr);
  }

  addController(controller: EventController): void {
    gtk4.symbols.gtk_widget_add_controller(this.ptr, controller.ptr);
  }

  setTooltipText(text: string): void {
    const textCStr = cstr(text);
    gtk4.symbols.gtk_widget_set_tooltip_text(this.ptr, textCStr);
  }

  setCursor(cursor: Cursor | null): void {
    gtk4.symbols.gtk_widget_set_cursor(this.ptr, cursor ? cursor.ptr : null);
  }

  addCssClass(className: string): void {
    const classNameCStr = cstr(className);
    gtk4.symbols.gtk_widget_add_css_class(this.ptr, classNameCStr);
  }

  removeCssClass(className: string): void {
    const classNameCStr = cstr(className);
    gtk4.symbols.gtk_widget_remove_css_class(this.ptr, classNameCStr);
  }
}

// AdwApplication extends GtkApplication extends GApplication extends GObject
// We use AdwApplication directly which gives us both GTK and Adwaita features
export class Application extends GObject {
  constructor(applicationId: string, flags: number) {
    const idCStr = cstr(applicationId);
    const ptr = adw.symbols.adw_application_new(idCStr, flags);
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

  getIsRemote(): boolean {
    return gio.symbols.g_application_get_is_remote(this.ptr);
  }

  inhibit(window: Widget | null, flags: number, reason: string): number {
    const reasonCStr = cstr(reason);
    const windowPtr = window ? window.ptr : null;
    return gtk4.symbols.gtk_application_inhibit(
      this.ptr,
      windowPtr,
      flags,
      reasonCStr,
    );
  }

  uninhibit(cookie: number): void {
    gtk4.symbols.gtk_application_uninhibit(this.ptr, cookie);
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
    gtk4.symbols.gtk_application_set_accels_for_action(
      this.ptr,
      actionCStr,
      Deno.UnsafePointer.of(accelPtrs),
    );
  }

  // High-level signal connection for activate
  onActivate(callback: () => void): number {
    return this.connect("activate", callback);
  }

  // High-level signal connection for shutdown
  onShutdown(callback: () => void): number {
    return this.connect("shutdown", callback);
  }

  // High-level signal connection for startup
  onStartup(callback: () => void): number {
    return this.connect("startup", callback);
  }
}

// GTK Window base class
export class Window extends Widget {
  constructor(ptr: Deno.PointerValue) {
    super(ptr);
  }

  setTitle(title: string): void {
    const titleCStr = cstr(title);
    gtk4.symbols.gtk_window_set_title(this.ptr, titleCStr);
  }

  setDefaultSize(width: number, height: number): void {
    gtk4.symbols.gtk_window_set_default_size(this.ptr, width, height);
  }

  setChild(child: Widget): void {
    gtk4.symbols.gtk_window_set_child(this.ptr, child.ptr);
  }

  getChild(): Deno.PointerValue | null {
    return gtk4.symbols.gtk_window_get_child(this.ptr);
  }

  present(): void {
    gtk4.symbols.gtk_window_present(this.ptr);
  }

  close(): void {
    gtk4.symbols.gtk_window_close(this.ptr);
  }

  setTransientFor(parent: Window): void {
    gtk4.symbols.gtk_window_set_transient_for(this.ptr, parent.ptr);
  }

  setModal(modal: boolean): void {
    gtk4.symbols.gtk_window_set_modal(this.ptr, modal);
  }

  setDecorated(decorated: boolean): void {
    this.setProperty("decorated", decorated);
  }

  destroy(): void {
    gtk4.symbols.gtk_window_destroy(this.ptr);
  }

  setResizable(resizable: boolean): void {
    gtk4.symbols.gtk_window_set_resizable(this.ptr, resizable);
  }

  // High-level signal connection for close-request
  onCloseRequest(callback: () => boolean): number {
    return this.connect("close-request", callback);
  }

  // High-level signal connection for destroy
  onDestroy(callback: () => void): number {
    return this.connect("destroy", callback);
  }
}

// GTK ApplicationWindow extends GtkWindow
export class ApplicationWindow extends Window {
  constructor(app: Application) {
    const ptr = gtk4.symbols.gtk_application_window_new(app.ptr);
    super(ptr);
  }
}

// GTK Box
export class Box extends Widget {
  constructor(orientation: number, spacing: number) {
    const ptr = gtk4.symbols.gtk_box_new(orientation, spacing);
    super(ptr);
  }

  append(child: Widget): void {
    gtk4.symbols.gtk_box_append(this.ptr, child.ptr);
  }

  remove(child: Widget): void {
    gtk4.symbols.gtk_box_remove(this.ptr, child.ptr);
  }

  setSpacing(spacing: number): void {
    gtk4.symbols.gtk_box_set_spacing(this.ptr, spacing);
  }
}

// GTK Label
export class Label extends Widget {
  constructor(text: string) {
    const textCStr = cstr(text);
    const ptr = gtk4.symbols.gtk_label_new(textCStr);
    super(ptr);
  }

  setText(text: string): void {
    const textCStr = cstr(text);
    gtk4.symbols.gtk_label_set_text(this.ptr, textCStr);
  }

  getText(): string {
    const ptr = gtk4.symbols.gtk_label_get_text(this.ptr);
    return readCStr(ptr);
  }

  setMarkup(markup: string): void {
    const markupCStr = cstr(markup);
    gtk4.symbols.gtk_label_set_markup(this.ptr, markupCStr);
  }

  setUseMarkup(useMarkup: boolean): void {
    gtk4.symbols.gtk_label_set_use_markup(this.ptr, useMarkup);
  }

  setWrap(wrap: boolean): void {
    gtk4.symbols.gtk_label_set_wrap(this.ptr, wrap);
  }

  setXalign(xalign: number): void {
    gtk4.symbols.gtk_label_set_xalign(this.ptr, xalign);
  }
}

// GTK Button
export class Button extends Widget {
  constructor(label?: string) {
    const labelCStr = label ? cstr(label) : null;
    const ptr = gtk4.symbols.gtk_button_new_with_label(labelCStr);
    super(ptr);
  }

  setLabel(label: string): void {
    const labelCStr = cstr(label);
    gtk4.symbols.gtk_button_set_label(this.ptr, labelCStr);
  }

  setIconName(iconName: string): void {
    const iconNameCStr = cstr(iconName);
    gtk4.symbols.gtk_button_set_icon_name(this.ptr, iconNameCStr);
  }

  // High-level signal connection for clicked
  onClick(callback: () => void): number {
    return this.connect("clicked", callback);
  }
}

// GTK Spinner
export class Spinner extends Widget {
  constructor() {
    const ptr = gtk4.symbols.gtk_spinner_new();
    super(ptr);
  }

  start(): void {
    gtk4.symbols.gtk_spinner_start(this.ptr);
  }

  stop(): void {
    gtk4.symbols.gtk_spinner_stop(this.ptr);
  }
}

// GTK Image
export class Image extends Widget {
  constructor(options?: { iconName?: string; file?: string }) {
    let ptr: Deno.PointerValue;
    if (options?.iconName) {
      ptr = gtk4.symbols.gtk_image_new_from_icon_name(cstr(options.iconName));
    } else if (options?.file) {
      ptr = gtk4.symbols.gtk_image_new_from_file(cstr(options.file));
    } else {
      // Default to empty image if no option provided, although usually you'd want one
      ptr = gtk4.symbols.gtk_image_new_from_icon_name(cstr("image-missing"));
    }
    super(ptr);
  }

  setPixelSize(size: number): void {
    gtk4.symbols.gtk_image_set_pixel_size(this.ptr, size);
  }

  setIconName(iconName: string): void {
    this.setProperty("icon-name", iconName);
  }

  setFile(file: string): void {
    const fileCStr = cstr(file);
    gtk4.symbols.gtk_image_set_from_file(this.ptr, fileCStr);
  }
}

// GTK CheckButton
export class CheckButton extends Widget {
  constructor(label?: string) {
    let ptr: Deno.PointerValue;
    if (label) {
      const labelCStr = cstr(label);
      ptr = gtk4.symbols.gtk_check_button_new_with_label(labelCStr);
    } else {
      ptr = gtk4.symbols.gtk_check_button_new();
    }
    super(ptr);
  }

  setActive(active: boolean): void {
    gtk4.symbols.gtk_check_button_set_active(this.ptr, active);
  }

  getActive(): boolean {
    return gtk4.symbols.gtk_check_button_get_active(this.ptr);
  }

  setLabel(label: string): void {
    const labelCStr = cstr(label);
    gtk4.symbols.gtk_check_button_set_label(this.ptr, labelCStr);
  }

  getLabel(): string | null {
    const ptr = gtk4.symbols.gtk_check_button_get_label(this.ptr);
    return ptr ? readCStr(ptr) : null;
  }

  setGroup(group: CheckButton): void {
    gtk4.symbols.gtk_check_button_set_group(this.ptr, group.ptr);
  }

  setInconsistent(inconsistent: boolean): void {
    gtk4.symbols.gtk_check_button_set_inconsistent(this.ptr, inconsistent);
  }

  getInconsistent(): boolean {
    return gtk4.symbols.gtk_check_button_get_inconsistent(this.ptr);
  }

  // High-level signal connection for toggled
  onToggled(callback: () => void): number {
    return this.connect("toggled", callback);
  }
}

// GTK Picture
export class Picture extends Widget {
  constructor(filename?: string) {
    const ptr = gtk4.symbols.gtk_picture_new();
    super(ptr);
    if (filename) {
      this.setFilename(filename);
    }
  }

  setFilename(filename: string): void {
    const filenameCStr = cstr(filename);
    gtk4.symbols.gtk_picture_set_filename(this.ptr, filenameCStr);
  }

  setCanShrink(canShrink: boolean): void {
    gtk4.symbols.gtk_picture_set_can_shrink(this.ptr, canShrink);
  }

  setKeepAspectRatio(keep: boolean): void {
    this.setProperty("keep-aspect-ratio", keep);
  }
}

// GTK DrawingArea
export class DrawingArea extends Widget {
  private drawCallback?: Deno.UnsafeCallback;

  constructor() {
    const ptr = gtk4.symbols.gtk_drawing_area_new();
    super(ptr);
  }

  setDrawFunc(
    callback: (
      area: DrawingArea,
      cr: CairoContext,
      width: number,
      height: number,
    ) => void,
  ): void {
    this.drawCallback = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "pointer", "i32", "i32", "pointer"],
        result: "void",
      },
      (
        _areaPtr: Deno.PointerValue,
        crPtr: Deno.PointerValue,
        width: number,
        height: number,
        _userData: Deno.PointerValue,
      ) => {
        const cr = new CairoContext(crPtr);
        callback(this, cr, width, height);
      },
    ) as unknown as Deno.UnsafeCallback;

    gtk4.symbols.gtk_drawing_area_set_draw_func(
      this.ptr,
      this.drawCallback.pointer as Deno.PointerValue,
      null,
      null,
    );
  }

  setContentWidth(width: number): void {
    gtk4.symbols.gtk_drawing_area_set_content_width(this.ptr, width);
  }

  setContentHeight(height: number): void {
    gtk4.symbols.gtk_drawing_area_set_content_height(this.ptr, height);
  }
}

// GTK Frame
export class Frame extends Widget {
  constructor(label?: string) {
    const labelCStr = label ? cstr(label) : null;
    const ptr = gtk4.symbols.gtk_frame_new(labelCStr);
    super(ptr);
  }

  setChild(child: Widget): void {
    gtk4.symbols.gtk_frame_set_child(this.ptr, child.ptr);
  }
}

// GTK ScrolledWindow extends GtkWidget
export class ScrolledWindow extends Widget {
  constructor() {
    const ptr = gtk4.symbols.gtk_scrolled_window_new();
    super(ptr);
  }

  setChild(child: Widget): void {
    gtk4.symbols.gtk_scrolled_window_set_child(this.ptr, child.ptr);
  }

  setMinContentHeight(height: number): void {
    gtk4.symbols.gtk_scrolled_window_set_min_content_height(this.ptr, height);
  }
}

// GTK ListBoxRow extends GtkWidget
export class ListBoxRow extends Widget {
  constructor(ptr?: Deno.PointerValue) {
    const actualPtr = ptr ?? gtk4.symbols.gtk_list_box_row_new();
    super(actualPtr);
  }

  setChild(child: Widget): void {
    gtk4.symbols.gtk_list_box_row_set_child(this.ptr, child.ptr);
  }

  getIndex(): number {
    return gtk4.symbols.gtk_list_box_row_get_index(this.ptr);
  }
}

// GTK ListBox extends GtkWidget
export class ListBox extends Widget {
  constructor() {
    const ptr = gtk4.symbols.gtk_list_box_new();
    super(ptr);
  }

  append(row: Widget): void {
    gtk4.symbols.gtk_list_box_append(this.ptr, row.ptr);
  }

  remove(row: Widget): void {
    gtk4.symbols.gtk_list_box_remove(this.ptr, row.ptr);
  }

  setSelectionMode(mode: number): void {
    gtk4.symbols.gtk_list_box_set_selection_mode(this.ptr, mode);
  }

  getSelectedRow(): ListBoxRow | null {
    const ptr = gtk4.symbols.gtk_list_box_get_selected_row(this.ptr);
    if (!ptr) return null;
    return new ListBoxRow(ptr);
  }

  selectRow(row: ListBoxRow | null): void {
    gtk4.symbols.gtk_list_box_select_row(this.ptr, row ? row.ptr : null);
  }

  getFirstChild(): Deno.PointerValue | null {
    return gtk4.symbols.gtk_widget_get_first_child(this.ptr);
  }

  getNextSibling(child: Deno.PointerValue): Deno.PointerValue | null {
    return gtk4.symbols.gtk_widget_get_next_sibling(child);
  }

  // High-level signal connection for row-activated
  onRowActivated(callback: (row: ListBoxRow, index: number) => void): number {
    return this.connect("row-activated", (rowPtr: Deno.PointerValue) => {
      if (rowPtr) {
        const row = new ListBoxRow(rowPtr);
        const index = row.getIndex();
        callback(row, index);
      }
    });
  }
}

// GtkStringList extends GObject (implements GListModel)
export class StringList extends GObject {
  constructor() {
    const ptr = gtk4.symbols.gtk_string_list_new(null);
    super(ptr);
  }

  append(text: string): void {
    const textCStr = cstr(text);
    gtk4.symbols.gtk_string_list_append(this.ptr, textCStr);
  }

  getString(position: number): string {
    const ptr = gtk4.symbols.gtk_string_list_get_string(this.ptr, position);
    return readCStr(ptr);
  }
}

// GTK DropDown extends GtkWidget
export class DropDown extends Widget {
  constructor(model?: GObject) {
    const ptr = gtk4.symbols.gtk_drop_down_new(model?.ptr ?? null, null);
    super(ptr);
  }

  getSelected(): number {
    return gtk4.symbols.gtk_drop_down_get_selected(this.ptr);
  }

  setSelected(position: number): void {
    gtk4.symbols.gtk_drop_down_set_selected(this.ptr, position);
  }

  // High-level signal connection for selection change
  onSelectedChanged(callback: (selectedIndex: number) => void): number {
    return this.connect("notify::selected", () => {
      callback(this.getSelected());
    });
  }
}

// GTK Entry extends GtkWidget
export class Entry extends Widget {
  constructor() {
    const ptr = gtk4.symbols.gtk_entry_new();
    super(ptr);
  }

  getText(): string {
    const ptr = gtk4.symbols.gtk_editable_get_text(this.ptr);
    return readCStr(ptr);
  }

  setText(text: string): void {
    const textCStr = cstr(text);
    gtk4.symbols.gtk_editable_set_text(this.ptr, textCStr);
  }

  setPlaceholderText(text: string): void {
    const textCStr = cstr(text);
    gtk4.symbols.gtk_entry_set_placeholder_text(this.ptr, textCStr);
  }

  // High-level signal connection for activate (Enter key pressed)
  onActivate(callback: () => void): number {
    return this.connect("activate", callback);
  }

  // High-level signal connection for changed
  onChanged(callback: () => void): number {
    return this.connect("changed", callback);
  }
}

// GtkMenuButton extends GtkWidget
export class MenuButton extends Widget {
  constructor() {
    const ptr = gtk4.symbols.gtk_menu_button_new();
    super(ptr);
  }

  setMenuModel(menu: Menu): void {
    this.setProperty("menu-model", menu);
  }

  setPrimary(primary: boolean): void {
    this.setProperty("primary", primary);
  }

  setIconName(iconName: string): void {
    this.setProperty("icon-name", iconName);
  }

  setPopover(popover: Widget): void {
    gtk4.symbols.gtk_menu_button_set_popover(this.ptr, popover.ptr);
  }
}

// GtkBuilder extends GObject
export class Builder extends GObject {
  constructor() {
    const ptr = gtk4.symbols.gtk_builder_new();
    super(ptr);
  }

  addFromFile(filename: string): boolean {
    const filenameCStr = cstr(filename);
    return gtk4.symbols.gtk_builder_add_from_file(this.ptr, filenameCStr, null);
  }

  addFromString(uiDefinition: string): boolean {
    const uiCStr = cstr(uiDefinition);
    return gtk4.symbols.gtk_builder_add_from_string(
      this.ptr,
      uiCStr,
      BigInt(uiCStr.length - 1),
      null,
    );
  }

  getObject(name: string): Deno.PointerValue | null {
    const nameCStr = cstr(name);
    return gtk4.symbols.gtk_builder_get_object(this.ptr, nameCStr);
  }

  getWidget(name: string): Widget | null {
    const ptr = this.getObject(name);
    if (!ptr) return null;
    return new Widget(ptr);
  }
}

// GDK Display wrapper
export class Display extends GObject {
  private constructor(ptr: Deno.PointerValue) {
    super(ptr);
  }

  static getDefault(): Display | null {
    const ptr = gtk4.symbols.gdk_display_get_default();
    if (!ptr) return null;
    return new Display(ptr);
  }

  getClipboard(): Clipboard {
    const ptr = gtk4.symbols.gdk_display_get_clipboard(this.ptr);
    return new (Clipboard as any)(ptr);
  }
}

// GDK Clipboard wrapper
export class Clipboard extends GObject {
  private constructor(ptr: Deno.PointerValue) {
    super(ptr);
  }

  set(text: string): void {
    const textCStr = cstr(text);
    gtk4.symbols.gdk_clipboard_set_text(this.ptr, textCStr);
  }

  readAsync(
    mimeTypes: string[],
    priority: number,
    cancellable: any,
    callback: (source: Clipboard, result: any) => void,
  ) {
    // mimeTypes: const char**
    // priority: int
    // cancellable: GCancellable*
    // callback: GAsyncReadyCallback

    const cb = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "pointer", "pointer"],
        result: "void",
      } as const,
      (
        _source: Deno.PointerValue,
        result: Deno.PointerValue,
        _userData: Deno.PointerValue,
      ) => {
        callback(this, result);
      },
    );

    // Construct null terminated string array
    const ptrs = new BigUint64Array(mimeTypes.length + 1);
    mimeTypes.forEach((mime, i) => {
      const c = cstr(mime);
      ptrs[i] = BigInt(Deno.UnsafePointer.value(Deno.UnsafePointer.of(c)!));
    });
    ptrs[mimeTypes.length] = 0n;

    gtk4.symbols.gdk_clipboard_read_async(
      this.ptr,
      Deno.UnsafePointer.of(ptrs),
      priority,
      cancellable,
      cb.pointer,
      null,
    );
  }

  readFinish(result: any): [any, string] {
    const outMime = new BigUint64Array(1);
    const streamPtr = gtk4.symbols.gdk_clipboard_read_finish(
      this.ptr,
      result,
      Deno.UnsafePointer.of(outMime),
      null,
    );
    // outMime is char** ? No, char** out_mime_type.
    const mimePtr = Deno.UnsafePointer.create(outMime[0]);
    const mime = mimePtr ? readCStr(mimePtr) : "";
    return [streamPtr, mime];
  }

  readTextAsync(
    cancellable: any,
    callback: (source: Clipboard, result: any) => void,
  ) {
    const cb = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "pointer", "pointer"],
        result: "void",
      } as const,
      (
        _source: Deno.PointerValue,
        result: Deno.PointerValue,
        _userData: Deno.PointerValue,
      ) => {
        callback(this, result);
      },
    );
    gtk4.symbols.gdk_clipboard_read_text_async(
      this.ptr,
      cancellable,
      cb.pointer,
      null,
    );
  }

  readTextFinish(result: any): string {
    const ptr = gtk4.symbols.gdk_clipboard_read_text_finish(
      this.ptr,
      result,
      null,
    );
    return ptr ? readCStr(ptr) : "";
  }

  readTextureAsync(
    cancellable: any,
    callback: (source: Clipboard, result: any) => void,
  ) {
    const cb = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "pointer", "pointer"],
        result: "void",
      } as const,
      (
        _source: Deno.PointerValue,
        result: Deno.PointerValue,
        _userData: Deno.PointerValue,
      ) => {
        callback(this, result);
      },
    );
    gtk4.symbols.gdk_clipboard_read_texture_async(
      this.ptr,
      cancellable,
      cb.pointer,
      null,
    );
  }

  readTextureFinish(result: any): Texture {
    const ptr = gtk4.symbols.gdk_clipboard_read_texture_finish(
      this.ptr,
      result,
      null,
    );
    return new Texture(ptr);
  }
}

export class Texture extends GObject {
  constructor(ptr: Deno.PointerValue) {
    super(ptr);
  }
  saveToPng(filename: string): boolean {
    return gtk4.symbols.gdk_texture_save_to_png(this.ptr, cstr(filename));
  }
}

// GTK IconTheme wrapper
export class IconTheme extends GObject {
  private constructor(ptr: Deno.PointerValue) {
    super(ptr);
  }

  static getForDisplay(display: Display): IconTheme | null {
    const ptr = gtk4.symbols.gtk_icon_theme_get_for_display(display.ptr);
    if (!ptr) return null;
    return new IconTheme(ptr);
  }

  hasIcon(iconName: string): boolean {
    const iconNameCStr = cstr(iconName);
    return gtk4.symbols.gtk_icon_theme_has_icon(this.ptr, iconNameCStr);
  }
}

export function addAction(app: Application, action: SimpleAction): void {
  gio.symbols.g_action_map_add_action(app.ptr, action.ptr);
}

// New additions

export class CssProvider extends GObject {
  constructor() {
    const ptr = gtk4.symbols.gtk_css_provider_new();
    super(ptr);
  }

  loadFromData(data: string): void {
    const dataCStr = cstr(data);
    gtk4.symbols.gtk_css_provider_load_from_data(
      this.ptr,
      dataCStr,
      BigInt(-1),
    );
  }
}

export class StyleContext extends GObject {
  constructor(ptr: Deno.PointerValue) {
    super(ptr);
  }

  addClass(className: string): void {
    const classNameCStr = cstr(className);
    gtk4.symbols.gtk_style_context_add_class(this.ptr, classNameCStr);
  }

  removeClass(className: string): void {
    const classNameCStr = cstr(className);
    gtk4.symbols.gtk_style_context_remove_class(this.ptr, classNameCStr);
  }

  static addProviderForDisplay(
    display: Display,
    provider: CssProvider,
    priority: number,
  ): void {
    gtk4.symbols.gtk_style_context_add_provider_for_display(
      display.ptr,
      provider.ptr,
      priority,
    );
  }
}

export class EventController extends GObject {}

export class Cursor extends GObject {
  static newFromName(name: string, fallback: Cursor | null): Cursor | null {
    const nameCStr = cstr(name);
    const ptr = gtk4.symbols.gdk_cursor_new_from_name(
      nameCStr,
      fallback ? fallback.ptr : null,
    );
    if (!ptr) return null;
    return new Cursor(ptr);
  }
}

export class EventControllerKey extends EventController {
  constructor() {
    const ptr = gtk4.symbols.gtk_event_controller_key_new();
    super(ptr);
  }

  onKeyPressed(
    callback: (keyval: number, keycode: number, state: number) => boolean,
  ): number {
    const cb = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "u32", "u32", "i32", "pointer"],
        result: "bool",
      } as const,
      (
        _self: Deno.PointerValue,
        keyval: number,
        keycode: number,
        state: number,
        _userData: Deno.PointerValue,
      ) => {
        return callback(keyval, keycode, state);
      },
    );
    const signalCStr = cstr("key-pressed");
    return Number(gobject.symbols.g_signal_connect_data(
      this.ptr,
      signalCStr,
      cb.pointer,
      null,
      null,
      0,
    ));
  }
}

export class DropTarget extends EventController {
  constructor(type: number | bigint, actions: number) {
    const ptr = gtk4.symbols.gtk_drop_target_new(BigInt(type), actions);
    super(ptr);
  }

  onDrop(
    callback: (value: Deno.PointerValue, x: number, y: number) => boolean,
  ): number {
    const cb = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "pointer", "f64", "f64", "pointer"],
        result: "bool",
      } as const,
      (
        _self: Deno.PointerValue,
        value: Deno.PointerValue,
        x: number,
        y: number,
        _userData: Deno.PointerValue,
      ) => {
        const objPtr = gobject.symbols.g_value_get_object(value);
        return callback(objPtr, x, y);
      },
    );

    const signalCStr = cstr("drop");
    return Number(gobject.symbols.g_signal_connect_data(
      this.ptr,
      signalCStr,
      cb.pointer,
      null,
      null,
      0,
    ));
  }
}

export class FileDialog extends GObject {
  constructor() {
    const ptr = gtk4.symbols.gtk_file_dialog_new();
    super(ptr);
  }
  setTitle(title: string): void {
    gtk4.symbols.gtk_file_dialog_set_title(this.ptr, cstr(title));
  }
  setFilters(filters: GObject): void {
    gtk4.symbols.gtk_file_dialog_set_filters(this.ptr, filters.ptr);
  }
  setDefaultFilter(filter: FileFilter): void {
    gtk4.symbols.gtk_file_dialog_set_default_filter(this.ptr, filter.ptr);
  }
  open(
    parent: Window,
    cancellable: GObject | null,
    callback: (source: FileDialog, result: Deno.PointerValue) => void,
  ): void {
    const cb = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "pointer", "pointer"],
        result: "void",
      } as const,
      (
        _source: Deno.PointerValue,
        result: Deno.PointerValue,
        _userData: Deno.PointerValue,
      ) => {
        callback(new FileDialog(), result);
      },
    );
    gtk4.symbols.gtk_file_dialog_open(
      this.ptr,
      parent.ptr,
      cancellable ? cancellable.ptr : null,
      cb.pointer,
      null,
    );
  }
  openFinish(result: Deno.PointerValue): GObject {
    const ptr = gtk4.symbols.gtk_file_dialog_open_finish(
      this.ptr,
      result,
      null,
    );
    return new GObject(ptr);
  }
  selectFolder(
    parent: Window,
    cancellable: GObject | null,
    callback: (source: FileDialog, result: Deno.PointerValue) => void,
  ): void {
    const cb = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "pointer", "pointer"],
        result: "void",
      } as const,
      (
        _source: Deno.PointerValue,
        result: Deno.PointerValue,
        _userData: Deno.PointerValue,
      ) => {
        callback(new FileDialog(), result);
      },
    );
    gtk4.symbols.gtk_file_dialog_select_folder(
      this.ptr,
      parent.ptr,
      cancellable ? cancellable.ptr : null,
      cb.pointer,
      null,
    );
  }
  selectFolderFinish(result: Deno.PointerValue): GObject {
    const ptr = gtk4.symbols.gtk_file_dialog_select_folder_finish(
      this.ptr,
      result,
      null,
    );
    return new GObject(ptr);
  }
}

export class FileFilter extends GObject {
  constructor() {
    const ptr = gtk4.symbols.gtk_file_filter_new();
    super(ptr);
  }
  static getType(): bigint {
    return BigInt(gtk4.symbols.gtk_file_filter_get_type());
  }
  setName(name: string): void {
    gtk4.symbols.gtk_file_filter_set_name(this.ptr, cstr(name));
  }
  addPattern(pattern: string): void {
    gtk4.symbols.gtk_file_filter_add_pattern(this.ptr, cstr(pattern));
  }
  addMimeType(mimeType: string): void {
    gtk4.symbols.gtk_file_filter_add_mime_type(this.ptr, cstr(mimeType));
  }
}

export class PopoverMenu extends Widget {
  constructor(model?: Menu) {
    const ptr = gtk4.symbols.gtk_popover_menu_new_from_model(
      model ? model.ptr : null,
    );
    super(ptr);
  }
  setMenuModel(model: Menu): void {
    gtk4.symbols.gtk_popover_menu_set_menu_model(this.ptr, model.ptr);
  }
}

export class GestureClick extends EventController {
  constructor() {
    const ptr = gtk4.symbols.gtk_gesture_click_new();
    super(ptr);
  }
  onReleased(
    callback: (n_press: number, x: number, y: number) => void,
  ): number {
    const cb = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "i32", "f64", "f64", "pointer"],
        result: "void",
      } as const,
      (
        _self: Deno.PointerValue,
        n_press: number,
        x: number,
        y: number,
        _userData: Deno.PointerValue,
      ) => {
        callback(n_press, x, y);
      },
    );
    const signalCStr = cstr("released");
    return Number(gobject.symbols.g_signal_connect_data(
      this.ptr,
      signalCStr,
      cb.pointer,
      null,
      null,
      0,
    ));
  }
}

export function unixSignalAdd(signum: number, callback: () => boolean): number {
  if (!glib.symbols.g_unix_signal_add) {
    throw new Error("unixSignalAdd is not supported on this platform");
  }
  const cb = new Deno.UnsafeCallback(
    { parameters: ["pointer"], result: "bool" } as const,
    (_userData: Deno.PointerValue) => {
      return callback();
    },
  );
  // @ts-ignore: glib import
  return glib.symbols.g_unix_signal_add(signum, cb.pointer, null);
}

export function typeFromName(name: string): number | bigint {
  return gobject.symbols.g_type_from_name(cstr(name));
}
