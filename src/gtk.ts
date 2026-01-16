import { adwaita, gio, gtk } from "./libs.ts";
import { cstr, readCStr } from "./utils.ts";
import { GObject } from "./gobject.ts";
import { Menu, SimpleAction } from "./gio.ts";
import { CairoContext } from "./cairo.ts";

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

  getVisible(): boolean {
    return gtk.symbols.gtk_widget_get_visible(this.ptr);
  }

  setSizeRequest(width: number, height: number): void {
    gtk.symbols.gtk_widget_set_size_request(this.ptr, width, height);
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

  queueDraw(): void {
    gtk.symbols.gtk_widget_queue_draw(this.ptr);
  }

  grabFocus(): boolean {
    return gtk.symbols.gtk_widget_grab_focus(this.ptr);
  }

  getDisplay(): Display {
    const ptr = gtk.symbols.gtk_widget_get_display(this.ptr);
    // deno-lint-ignore no-explicit-any
    return new (Display as any)(ptr);
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

  getIsRemote(): boolean {
    return gio.symbols.g_application_get_is_remote(this.ptr);
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

  setDecorated(decorated: boolean): void {
    this.setProperty("decorated", decorated);
  }

  destroy(): void {
    gtk.symbols.gtk_window_destroy(this.ptr);
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

  getText(): string {
    const ptr = gtk.symbols.gtk_label_get_text(this.ptr);
    return readCStr(ptr);
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
  constructor(label?: string) {
    const labelCStr = label ? cstr(label) : null;
    const ptr = gtk.symbols.gtk_button_new_with_label(labelCStr);
    super(ptr);
  }

  setLabel(label: string): void {
    const labelCStr = cstr(label);
    gtk.symbols.gtk_button_set_label(this.ptr, labelCStr);
  }

  // High-level signal connection for clicked
  onClick(callback: () => void): number {
    return this.connect("clicked", callback);
  }
}

// GTK Spinner
export class Spinner extends Widget {
  constructor() {
    const ptr = gtk.symbols.gtk_spinner_new();
    super(ptr);
  }

  start(): void {
    gtk.symbols.gtk_spinner_start(this.ptr);
  }

  stop(): void {
    gtk.symbols.gtk_spinner_stop(this.ptr);
  }
}

// GTK Image
export class Image extends Widget {
  constructor(options?: { iconName?: string; file?: string }) {
    let ptr: Deno.PointerValue;
    if (options?.iconName) {
      ptr = gtk.symbols.gtk_image_new_from_icon_name(cstr(options.iconName));
    } else if (options?.file) {
      ptr = gtk.symbols.gtk_image_new_from_file(cstr(options.file));
    } else {
      // Default to empty image if no option provided, although usually you'd want one
      ptr = gtk.symbols.gtk_image_new_from_icon_name(cstr("image-missing"));
    }
    super(ptr);
  }

  setPixelSize(size: number): void {
    gtk.symbols.gtk_image_set_pixel_size(this.ptr, size);
  }

  setIconName(iconName: string): void {
    this.setProperty("icon-name", iconName);
  }

  setFile(file: string): void {
    const fileCStr = cstr(file);
    gtk.symbols.gtk_image_set_from_file(this.ptr, fileCStr);
  }
}

// GTK CheckButton
export class CheckButton extends Widget {
  constructor(label?: string) {
    let ptr: Deno.PointerValue;
    if (label) {
      const labelCStr = cstr(label);
      ptr = gtk.symbols.gtk_check_button_new_with_label(labelCStr);
    } else {
      ptr = gtk.symbols.gtk_check_button_new();
    }
    super(ptr);
  }

  setActive(active: boolean): void {
    gtk.symbols.gtk_check_button_set_active(this.ptr, active);
  }

  getActive(): boolean {
    return gtk.symbols.gtk_check_button_get_active(this.ptr);
  }

  setLabel(label: string): void {
    const labelCStr = cstr(label);
    gtk.symbols.gtk_check_button_set_label(this.ptr, labelCStr);
  }

  getLabel(): string | null {
    const ptr = gtk.symbols.gtk_check_button_get_label(this.ptr);
    return ptr ? readCStr(ptr) : null;
  }

  setGroup(group: CheckButton): void {
    gtk.symbols.gtk_check_button_set_group(this.ptr, group.ptr);
  }

  setInconsistent(inconsistent: boolean): void {
    gtk.symbols.gtk_check_button_set_inconsistent(this.ptr, inconsistent);
  }

  getInconsistent(): boolean {
    return gtk.symbols.gtk_check_button_get_inconsistent(this.ptr);
  }

  // High-level signal connection for toggled
  onToggled(callback: () => void): number {
    return this.connect("toggled", callback);
  }
}

// GTK Picture
export class Picture extends Widget {
  constructor(filename?: string) {
    const ptr = gtk.symbols.gtk_picture_new();
    super(ptr);
    if (filename) {
      this.setFilename(filename);
    }
  }

  setFilename(filename: string): void {
    const filenameCStr = cstr(filename);
    gtk.symbols.gtk_picture_set_filename(this.ptr, filenameCStr);
  }

  setCanShrink(canShrink: boolean): void {
    gtk.symbols.gtk_picture_set_can_shrink(this.ptr, canShrink);
  }
}

// GTK DrawingArea
export class DrawingArea extends Widget {
  private drawCallback?: Deno.UnsafeCallback;

  constructor() {
    const ptr = gtk.symbols.gtk_drawing_area_new();
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
      } as Deno.UnsafeCallbackDefinition,
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
    );

    gtk.symbols.gtk_drawing_area_set_draw_func(
      this.ptr,
      this.drawCallback.pointer as Deno.PointerValue,
      null,
      null,
    );
  }

  setContentWidth(width: number): void {
    gtk.symbols.gtk_drawing_area_set_content_width(this.ptr, width);
  }

  setContentHeight(height: number): void {
    gtk.symbols.gtk_drawing_area_set_content_height(this.ptr, height);
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

// GTK ListBoxRow extends GtkWidget
export class ListBoxRow extends Widget {
  constructor(ptr?: Deno.PointerValue) {
    const actualPtr = ptr ?? gtk.symbols.gtk_list_box_row_new();
    super(actualPtr);
  }

  setChild(child: Widget): void {
    gtk.symbols.gtk_list_box_row_set_child(this.ptr, child.ptr);
  }

  getIndex(): number {
    return gtk.symbols.gtk_list_box_row_get_index(this.ptr);
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
  constructor(model?: GObject) {
    const ptr = gtk.symbols.gtk_drop_down_new(model?.ptr ?? null, null);
    super(ptr);
  }

  getSelected(): number {
    return gtk.symbols.gtk_drop_down_get_selected(this.ptr);
  }

  setSelected(position: number): void {
    gtk.symbols.gtk_drop_down_set_selected(this.ptr, position);
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
    const ptr = gtk.symbols.gtk_menu_button_new();
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

// GDK Display wrapper
export class Display extends GObject {
  private constructor(ptr: Deno.PointerValue) {
    super(ptr);
  }

  static getDefault(): Display | null {
    const ptr = gtk.symbols.gdk_display_get_default();
    if (!ptr) return null;
    return new Display(ptr);
  }

  getClipboard(): Clipboard {
    const ptr = gtk.symbols.gdk_display_get_clipboard(this.ptr);
    // deno-lint-ignore no-explicit-any
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
    gtk.symbols.gdk_clipboard_set_text(this.ptr, textCStr);
  }
}

// GTK IconTheme wrapper
export class IconTheme extends GObject {
  private constructor(ptr: Deno.PointerValue) {
    super(ptr);
  }

  static getForDisplay(display: Display): IconTheme | null {
    const ptr = gtk.symbols.gtk_icon_theme_get_for_display(display.ptr);
    if (!ptr) return null;
    return new IconTheme(ptr);
  }

  hasIcon(iconName: string): boolean {
    const iconNameCStr = cstr(iconName);
    return gtk.symbols.gtk_icon_theme_has_icon(this.ptr, iconNameCStr);
  }
}

export function addAction(app: Application, action: SimpleAction): void {
  gio.symbols.g_action_map_add_action(app.ptr, action.ptr);
}
