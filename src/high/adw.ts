import { adw } from "../low/adw.ts";
import { cstr, readCStr } from "../low/utils.ts";
import {
  type Application,
  type Builder,
  ListBoxRow,
  Widget,
  Window,
} from "./gtk4.ts";
import { GObject } from "./gobject.ts";
import { type ToastMethods, toastMethods } from "./generated/adw.ts";
import { applyGenerated, registerWrappers } from "./wrappers.ts";

// ============================================================================
// Builder Extensions for Adwaita Widgets
// ============================================================================

/** Get a SwitchRow from a Builder by name */
export function getSwitchRow(builder: Builder, name: string): SwitchRow | null {
  const ptr = builder.getObject(name);
  if (!ptr) return null;
  const row = Object.create(SwitchRow.prototype) as SwitchRow;
  row.ptr = ptr;
  return row;
}

/** Get a ComboRow from a Builder by name */
export function getComboRow(builder: Builder, name: string): ComboRow | null {
  const ptr = builder.getObject(name);
  if (!ptr) return null;
  const row = Object.create(ComboRow.prototype) as ComboRow;
  row.ptr = ptr;
  return row;
}

/** Get a PreferencesWindow from a Builder by name */
export function getPreferencesWindow(
  builder: Builder,
  name: string,
): PreferencesWindow | null {
  const ptr = builder.getObject(name);
  if (!ptr) return null;
  const win = Object.create(PreferencesWindow.prototype) as PreferencesWindow;
  win.ptr = ptr;
  return win;
}

// ============================================================================
// Adwaita Enums and Constants
// ============================================================================

// Adwaita color scheme enum (for StyleManager)
export const ColorScheme = {
  DEFAULT: 0,
  FORCE_LIGHT: 1,
  FORCE_DARK: 4,
  PREFER_DARK: 2,
  PREFER_LIGHT: 3,
} as const;

// AdwToastPriority
export const ToastPriority = {
  NORMAL: 0,
  HIGH: 1,
} as const;

// Adwaita response appearance (for MessageDialog)
export const ResponseAppearance = {
  DEFAULT: 0,
  SUGGESTED: 1,
  DESTRUCTIVE: 2,
} as const;

// ============================================================================
// Adwaita Widgets
// ============================================================================

// Libadwaita Window extends GtkWindow
export class AdwWindow extends Window {
  constructor(ptr?: Deno.PointerValue) {
    const actualPtr = ptr ?? adw.symbols.adw_window_new();
    super(actualPtr);
  }

  setContent(content: Widget): void {
    adw.symbols.adw_window_set_content(this.ptr, content.ptr);
  }
}

// Libadwaita ApplicationWindow extends AdwWindow
export class AdwApplicationWindow extends AdwWindow {
  constructor(app: Application) {
    const ptr = adw.symbols.adw_application_window_new(app.ptr);
    super(ptr);
  }

  override setContent(content: Widget): void {
    adw.symbols.adw_application_window_set_content(this.ptr, content.ptr);
  }
}

// AdwHeaderBar extends GtkWidget
export class HeaderBar extends Widget {
  constructor() {
    const ptr = adw.symbols.adw_header_bar_new();
    super(ptr);
  }

  packStart(child: Widget): void {
    adw.symbols.adw_header_bar_pack_start(this.ptr, child.ptr);
  }

  packEnd(child: Widget): void {
    adw.symbols.adw_header_bar_pack_end(this.ptr, child.ptr);
  }

  setTitleWidget(widget: Widget): void {
    adw.symbols.adw_header_bar_set_title_widget(this.ptr, widget.ptr);
  }
}

// AdwAboutDialog extends AdwDialog extends GtkWidget
export class AboutDialog extends Widget {
  constructor() {
    const ptr = adw.symbols.adw_about_dialog_new();
    super(ptr);
  }

  present(parent?: Widget): void {
    if (adw.symbols.adw_dialog_present) {
      adw.symbols.adw_dialog_present(this.ptr, parent ? parent.ptr : null);
    } else {
      // Fallback for older libadw where it is a Window
      this.setProperty("visible", true);
    }
  }

  setApplicationName(name: string): void {
    const nameCStr = cstr(name);
    adw.symbols.adw_about_dialog_set_application_name(this.ptr, nameCStr);
  }

  setVersion(version: string): void {
    const versionCStr = cstr(version);
    adw.symbols.adw_about_dialog_set_version(this.ptr, versionCStr);
  }

  setDeveloperName(name: string): void {
    const nameCStr = cstr(name);
    adw.symbols.adw_about_dialog_set_developer_name(this.ptr, nameCStr);
  }

  setComments(comments: string): void {
    const commentsCStr = cstr(comments);
    adw.symbols.adw_about_dialog_set_comments(this.ptr, commentsCStr);
  }

  setModal(modal: boolean): void {
    this.setProperty("modal", modal);
  }

  setWebsite(url: string): void {
    adw.symbols.adw_about_dialog_set_website(this.ptr, cstr(url));
  }

  setIssueUrl(url: string): void {
    adw.symbols.adw_about_dialog_set_issue_url(this.ptr, cstr(url));
  }

  setDevelopers(developers: string[]): void {
    // const char** developers
    const ptrs = new BigUint64Array(developers.length + 1);
    developers.forEach((dev, i) => {
      const c = cstr(dev);
      ptrs[i] = BigInt(Deno.UnsafePointer.value(Deno.UnsafePointer.of(c)!));
    });
    ptrs[developers.length] = 0n;
    adw.symbols.adw_about_dialog_set_developers(
      this.ptr,
      Deno.UnsafePointer.of(ptrs),
    );
  }

  setLicenseType(type: number): void {
    adw.symbols.adw_about_dialog_set_license_type(this.ptr, type);
  }

  setApplicationIcon(iconName: string): void {
    adw.symbols.adw_about_dialog_set_application_icon(
      this.ptr,
      cstr(iconName),
    );
  }
}

// AdwAboutWindow - older API but still commonly used
export class AboutWindow extends Window {
  constructor() {
    const ptr = adw.symbols.adw_about_window_new();
    super(ptr);
  }

  setApplicationName(name: string): void {
    adw.symbols.adw_about_window_set_application_name(this.ptr, cstr(name));
  }

  setVersion(version: string): void {
    adw.symbols.adw_about_window_set_version(this.ptr, cstr(version));
  }

  setDeveloperName(name: string): void {
    adw.symbols.adw_about_window_set_developer_name(this.ptr, cstr(name));
  }

  setDevelopers(developers: string[]): void {
    const ptrs = new BigUint64Array(developers.length + 1);
    developers.forEach((dev, i) => {
      const c = cstr(dev);
      ptrs[i] = BigInt(Deno.UnsafePointer.value(Deno.UnsafePointer.of(c)!));
    });
    ptrs[developers.length] = 0n;
    adw.symbols.adw_about_window_set_developers(
      this.ptr,
      Deno.UnsafePointer.of(ptrs),
    );
  }

  setDesigners(designers: string[]): void {
    const ptrs = new BigUint64Array(designers.length + 1);
    designers.forEach((designer, i) => {
      const c = cstr(designer);
      ptrs[i] = BigInt(Deno.UnsafePointer.value(Deno.UnsafePointer.of(c)!));
    });
    ptrs[designers.length] = 0n;
    adw.symbols.adw_about_window_set_designers(
      this.ptr,
      Deno.UnsafePointer.of(ptrs),
    );
  }

  setTranslatorCredits(credits: string): void {
    adw.symbols.adw_about_window_set_translator_credits(
      this.ptr,
      cstr(credits),
    );
  }

  setLicenseType(type: number): void {
    adw.symbols.adw_about_window_set_license_type(this.ptr, type);
  }

  setWebsite(url: string): void {
    adw.symbols.adw_about_window_set_website(this.ptr, cstr(url));
  }

  setIssueUrl(url: string): void {
    adw.symbols.adw_about_window_set_issue_url(this.ptr, cstr(url));
  }

  setApplicationIcon(iconName: string): void {
    adw.symbols.adw_about_window_set_application_icon(this.ptr, cstr(iconName));
  }
}

export class StatusPage extends Widget {
  constructor() {
    const ptr = adw.symbols.adw_status_page_new();
    super(ptr);
  }

  setTitle(title: string): void {
    adw.symbols.adw_status_page_set_title(this.ptr, cstr(title));
  }

  setDescription(description: string): void {
    adw.symbols.adw_status_page_set_description(this.ptr, cstr(description));
  }

  setIconName(iconName: string): void {
    adw.symbols.adw_status_page_set_icon_name(this.ptr, cstr(iconName));
  }

  /** Content shown below the description, such as buttons or a list. */
  setChild(child: Widget | null): void {
    adw.symbols.adw_status_page_set_child(this.ptr, child?.ptr ?? null);
  }
}

// AdwWindowTitle: a title and subtitle for a header bar
export class WindowTitle extends Widget {
  constructor(title = "", subtitle = "") {
    super(adw.symbols.adw_window_title_new(cstr(title), cstr(subtitle)));
  }

  setTitle(title: string): void {
    adw.symbols.adw_window_title_set_title(this.ptr, cstr(title));
  }

  setSubtitle(subtitle: string): void {
    adw.symbols.adw_window_title_set_subtitle(this.ptr, cstr(subtitle));
  }
}

// AdwButtonContent: an icon and a label, for use as a button's child
export class ButtonContent extends Widget {
  constructor() {
    super(adw.symbols.adw_button_content_new());
  }

  setIconName(iconName: string): void {
    adw.symbols.adw_button_content_set_icon_name(this.ptr, cstr(iconName));
  }

  setLabel(label: string): void {
    adw.symbols.adw_button_content_set_label(this.ptr, cstr(label));
  }
}

// AdwToast: a short message shown by a ToastOverlay
export class Toast extends GObject {
  constructor(title: string) {
    super(adw.symbols.adw_toast_new(cstr(title)));
  }

  setTitle(title: string): void {
    adw.symbols.adw_toast_set_title(this.ptr, cstr(title));
  }

  /** Show a button on the toast. Pass an empty string to hide it. */
  setButtonLabel(label: string): void {
    adw.symbols.adw_toast_set_button_label(
      this.ptr,
      label ? cstr(label) : null,
    );
  }

  /** Seconds before the toast hides itself; 0 keeps it until dismissed. */
  setTimeout(seconds: number): void {
    adw.symbols.adw_toast_set_timeout(this.ptr, seconds);
  }

  /** One of {@link ToastPriority}. */
  setPriority(priority: number): void {
    adw.symbols.adw_toast_set_priority(this.ptr, priority);
  }

  dismiss(): void {
    adw.symbols.adw_toast_dismiss(this.ptr);
  }

  onButtonClicked(callback: () => void): number {
    return this.connect("button-clicked", () => callback());
  }

  onDismissed(callback: () => void): number {
    return this.connect("dismissed", () => callback());
  }
}

// Methods generated from GIR; the ones above take precedence.
export interface Toast extends ToastMethods {}
applyGenerated(Toast, toastMethods);

// AdwToastOverlay: shows toasts above its child
export class ToastOverlay extends Widget {
  constructor() {
    super(adw.symbols.adw_toast_overlay_new());
  }

  setChild(child: Widget | null): void {
    adw.symbols.adw_toast_overlay_set_child(this.ptr, child?.ptr ?? null);
  }

  /** Show a toast. The overlay takes ownership of it. */
  addToast(toast: Toast): void {
    adw.symbols.adw_toast_overlay_add_toast(this.ptr, toast.ptr);
  }
}

// AdwOverlaySplitView: a sidebar next to, or sliding over, the content
export class OverlaySplitView extends Widget {
  constructor() {
    super(adw.symbols.adw_overlay_split_view_new());
  }

  setContent(content: Widget | null): void {
    adw.symbols.adw_overlay_split_view_set_content(
      this.ptr,
      content?.ptr ?? null,
    );
  }

  setSidebar(sidebar: Widget | null): void {
    adw.symbols.adw_overlay_split_view_set_sidebar(
      this.ptr,
      sidebar?.ptr ?? null,
    );
  }

  setShowSidebar(show: boolean): void {
    adw.symbols.adw_overlay_split_view_set_show_sidebar(this.ptr, show);
  }

  getShowSidebar(): boolean {
    return adw.symbols.adw_overlay_split_view_get_show_sidebar(this.ptr);
  }

  /** When collapsed, the sidebar slides over the content instead of beside it. */
  setCollapsed(collapsed: boolean): void {
    adw.symbols.adw_overlay_split_view_set_collapsed(this.ptr, collapsed);
  }

  /** `PackType.START` or `PackType.END` from the gtk4 module. */
  setSidebarPosition(position: number): void {
    adw.symbols.adw_overlay_split_view_set_sidebar_position(
      this.ptr,
      position,
    );
  }

  setMinSidebarWidth(width: number): void {
    adw.symbols.adw_overlay_split_view_set_min_sidebar_width(this.ptr, width);
  }

  setMaxSidebarWidth(width: number): void {
    adw.symbols.adw_overlay_split_view_set_max_sidebar_width(this.ptr, width);
  }

  setSidebarWidthFraction(fraction: number): void {
    adw.symbols.adw_overlay_split_view_set_sidebar_width_fraction(
      this.ptr,
      fraction,
    );
  }

  onShowSidebarChanged(callback: (shown: boolean) => void): number {
    return this.connectNotify(
      "show-sidebar",
      (object) =>
        callback(adw.symbols.adw_overlay_split_view_get_show_sidebar(object)),
    );
  }
}

// AdwToolbarView extends GtkWidget
export class ToolbarView extends Widget {
  constructor() {
    const ptr = adw.symbols.adw_toolbar_view_new();
    super(ptr);
  }

  setContent(content: Widget): void {
    adw.symbols.adw_toolbar_view_set_content(this.ptr, content.ptr);
  }

  addTopBar(topBar: Widget): void {
    adw.symbols.adw_toolbar_view_add_top_bar(this.ptr, topBar.ptr);
  }

  addBottomBar(bottomBar: Widget): void {
    adw.symbols.adw_toolbar_view_add_bottom_bar(this.ptr, bottomBar.ptr);
  }
}

// AdwPreferencesGroup extends GtkWidget
export class PreferencesGroup extends Widget {
  constructor() {
    const ptr = adw.symbols.adw_preferences_group_new();
    super(ptr);
  }

  add(widget: Widget | ActionRow | ComboRow): void {
    adw.symbols.adw_preferences_group_add(this.ptr, widget.ptr);
  }

  setTitle(title: string): void {
    adw.symbols.adw_preferences_group_set_title(this.ptr, cstr(title));
  }

  /** A widget shown at the end of the group's title row. */
  setHeaderSuffix(suffix: Widget | null): void {
    adw.symbols.adw_preferences_group_set_header_suffix(
      this.ptr,
      suffix?.ptr ?? null,
    );
  }

  setDescription(description: string): void {
    adw.symbols.adw_preferences_group_set_description(
      this.ptr,
      cstr(description),
    );
  }
}

// AdwPreferencesPage extends GtkWidget
export class PreferencesPage extends Widget {
  constructor() {
    const ptr = adw.symbols.adw_preferences_page_new();
    super(ptr);
  }

  add(group: PreferencesGroup): void {
    adw.symbols.adw_preferences_page_add(this.ptr, group.ptr);
  }
}

// AdwPreferencesWindow extends AdwWindow extends GtkWindow
// Since we don't have AdwWindow class, extend Window directly
export class PreferencesWindow extends Window {
  constructor() {
    const ptr = adw.symbols.adw_preferences_window_new();
    super(ptr);
  }

  add(page: PreferencesPage): void {
    adw.symbols.adw_preferences_window_add(this.ptr, page.ptr);
  }
}

function requireAdwaita<T>(
  binding: T | null | undefined,
  name: string,
  minimum: string,
): T {
  if (binding == null) {
    throw new Error(`${name} requires libadwaita ${minimum} or later`);
  }
  return binding;
}

/** An Adwaita dialog hosted inside another widget instead of a separate GtkWindow. */
export abstract class Dialog extends Widget {
  present(parent: Widget): void {
    adw.symbols.adw_dialog_present(this.ptr, parent.ptr);
  }

  close(): boolean {
    return requireAdwaita(adw.symbols.adw_dialog_close, "Dialog", "1.5")(
      this.ptr,
    );
  }

  onClosed(callback: () => void): number {
    return this.connect("closed", callback);
  }
}

/** Preferences pages and subpage navigation, available with libadwaita 1.5 or later. */
export class PreferencesDialog extends Dialog {
  constructor() {
    super(
      requireAdwaita(
        adw.symbols.adw_preferences_dialog_new,
        "PreferencesDialog",
        "1.5",
      )(),
    );
  }

  static isSupported(): boolean {
    return Boolean(adw.symbols.adw_preferences_dialog_new);
  }

  add(page: PreferencesPage): void {
    requireAdwaita(
      adw.symbols.adw_preferences_dialog_add,
      "PreferencesDialog",
      "1.5",
    )(this.ptr, page.ptr);
  }

  pushSubpage(page: NavigationPage): void {
    requireAdwaita(
      adw.symbols.adw_preferences_dialog_push_subpage,
      "PreferencesDialog",
      "1.5",
    )(this.ptr, page.ptr);
  }

  popSubpage(): void {
    requireAdwaita(
      adw.symbols.adw_preferences_dialog_pop_subpage,
      "PreferencesDialog",
      "1.5",
    )(this.ptr);
  }
}

/** A titled page that can be pushed onto an Adwaita navigation stack. */
export class NavigationPage extends Widget {
  constructor(child: Widget, title: string) {
    super(
      requireAdwaita(
        adw.symbols.adw_navigation_page_new,
        "NavigationPage",
        "1.4",
      )(child.ptr, cstr(title)),
    );
  }

  setTag(tag: string): void {
    requireAdwaita(
      adw.symbols.adw_navigation_page_set_tag,
      "NavigationPage",
      "1.4",
    )(this.ptr, cstr(tag));
  }

  getTag(): string | null {
    const tag = requireAdwaita(
      adw.symbols.adw_navigation_page_get_tag,
      "NavigationPage",
      "1.4",
    )(this.ptr);
    return tag ? readCStr(tag) : null;
  }
}

/** A stack of navigation pages, available with libadwaita 1.4 or later. */
export class NavigationView extends Widget {
  constructor() {
    super(
      requireAdwaita(
        adw.symbols.adw_navigation_view_new,
        "NavigationView",
        "1.4",
      )(),
    );
  }

  static isSupported(): boolean {
    return Boolean(adw.symbols.adw_navigation_view_new);
  }

  add(page: NavigationPage): void {
    requireAdwaita(
      adw.symbols.adw_navigation_view_add,
      "NavigationView",
      "1.4",
    )(this.ptr, page.ptr);
  }

  push(page: NavigationPage): void {
    requireAdwaita(
      adw.symbols.adw_navigation_view_push,
      "NavigationView",
      "1.4",
    )(this.ptr, page.ptr);
  }

  pop(): boolean {
    return requireAdwaita(
      adw.symbols.adw_navigation_view_pop,
      "NavigationView",
      "1.4",
    )(this.ptr);
  }

  getVisiblePageTag(): string | null {
    const tag = requireAdwaita(
      adw.symbols.adw_navigation_view_get_visible_page_tag,
      "NavigationView",
      "1.4",
    )(this.ptr);
    return tag ? readCStr(tag) : null;
  }

  setPopOnEscape(enabled: boolean): void {
    requireAdwaita(
      adw.symbols.adw_navigation_view_set_pop_on_escape,
      "NavigationView",
      "1.4",
    )(this.ptr, enabled);
  }
}

// AdwActionRow extends AdwPreferencesRow extends GtkListBoxRow extends GtkWidget
export class ActionRow extends ListBoxRow {
  constructor(ptr?: Deno.PointerValue) {
    const actualPtr = ptr ?? adw.symbols.adw_action_row_new();
    super(actualPtr);
  }

  addSuffix(widget: Widget): void {
    adw.symbols.adw_action_row_add_suffix(this.ptr, widget.ptr);
  }

  addPrefix(widget: Widget): void {
    adw.symbols.adw_action_row_add_prefix(this.ptr, widget.ptr);
  }

  /** Activating the row activates this widget, e.g. toggles a check button. */
  setActivatableWidget(widget: Widget | null): void {
    adw.symbols.adw_action_row_set_activatable_widget(
      this.ptr,
      widget?.ptr ?? null,
    );
  }

  setTitle(title: string): void {
    adw.symbols.adw_preferences_row_set_title(this.ptr, cstr(title));
  }

  getTitle(): string | null {
    const ptr = adw.symbols.adw_preferences_row_get_title(this.ptr);
    return ptr ? readCStr(ptr) : null;
  }

  setSubtitle(subtitle: string): void {
    adw.symbols.adw_action_row_set_subtitle(this.ptr, cstr(subtitle));
  }

  getSubtitle(): string | null {
    const ptr = adw.symbols.adw_action_row_get_subtitle(this.ptr);
    return ptr ? readCStr(ptr) : null;
  }

  override setSensitive(sensitive: boolean): void {
    this.setProperty("sensitive", sensitive);
  }
}

// AdwComboRow extends AdwActionRow extends AdwPreferencesRow extends GtkListBoxRow extends GtkWidget
export class ComboRow extends ActionRow {
  constructor(ptr?: Deno.PointerValue) {
    const actualPtr = ptr ?? adw.symbols.adw_combo_row_new();
    super(actualPtr);
  }

  override setModel(model: GObject): void {
    adw.symbols.adw_combo_row_set_model(this.ptr, model.ptr);
  }

  getModel(): Deno.PointerValue | null {
    return adw.symbols.adw_combo_row_get_model(this.ptr);
  }

  setSelected(position: number): void {
    adw.symbols.adw_combo_row_set_selected(this.ptr, position);
  }

  getSelected(): number {
    return adw.symbols.adw_combo_row_get_selected(this.ptr);
  }

  onSelectedChanged(callback: (selectedIndex: number) => void): number {
    return this.connectNotify(
      "selected",
      (object) => callback(adw.symbols.adw_combo_row_get_selected(object)),
    );
  }
}

// AdwSwitchRow extends AdwActionRow
export class SwitchRow extends ActionRow {
  constructor(ptr?: Deno.PointerValue) {
    const actualPtr = ptr ?? adw.symbols.adw_switch_row_new();
    super(actualPtr);
  }

  setActive(is_active: boolean): void {
    adw.symbols.adw_switch_row_set_active(this.ptr, is_active);
  }

  getActive(): boolean {
    return adw.symbols.adw_switch_row_get_active(this.ptr);
  }

  onActiveChanged(callback: (active: boolean) => void): number {
    return this.connectNotify(
      "active",
      (object) => callback(adw.symbols.adw_switch_row_get_active(object)),
    );
  }
}

// AdwSpinRow: an action row with a number entry and +/- buttons
export class SpinRow extends ActionRow {
  constructor(min: number, max: number, step: number) {
    super(adw.symbols.adw_spin_row_new_with_range(min, max, step));
  }

  setValue(value: number): void {
    adw.symbols.adw_spin_row_set_value(this.ptr, value);
  }

  getValue(): number {
    return adw.symbols.adw_spin_row_get_value(this.ptr);
  }

  setDigits(digits: number): void {
    adw.symbols.adw_spin_row_set_digits(this.ptr, digits);
  }

  setRange(min: number, max: number): void {
    adw.symbols.adw_spin_row_set_range(this.ptr, min, max);
  }

  onValueChanged(callback: (value: number) => void): number {
    return this.connectNotify(
      "value",
      (object) => callback(adw.symbols.adw_spin_row_get_value(object)),
    );
  }
}

// AdwMessageDialog extends GtkWindow extends GtkWidget
// Adwaita MessageDialog
export class MessageDialog extends Window {
  constructor(parent: Window | null, heading: string, body?: string) {
    const headingCStr = cstr(heading);
    const bodyCStr = body ? cstr(body) : null;
    const ptr = adw.symbols.adw_message_dialog_new(
      parent ? parent.ptr : null,
      headingCStr,
      bodyCStr,
    );
    super(ptr);
  }

  addResponse(id: string, label: string): void {
    const idCStr = cstr(id);
    const labelCStr = cstr(label);
    adw.symbols.adw_message_dialog_add_response(
      this.ptr,
      idCStr,
      labelCStr,
    );
  }

  setResponseAppearance(response: string, appearance: number): void {
    const responseCStr = cstr(response);
    adw.symbols.adw_message_dialog_set_response_appearance(
      this.ptr,
      responseCStr,
      appearance,
    );
  }

  setDefaultResponse(response: string): void {
    const responseCStr = cstr(response);
    adw.symbols.adw_message_dialog_set_default_response(
      this.ptr,
      responseCStr,
    );
  }

  setCloseResponse(response: string): void {
    const responseCStr = cstr(response);
    adw.symbols.adw_message_dialog_set_close_response(
      this.ptr,
      responseCStr,
    );
  }

  onResponse(callback: (response: string) => void): number {
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
    return this.connectNative("response", cb);
  }
}

// StyleManager wrapper for Adwaita theme control
export class StyleManager extends GObject {
  private constructor(ptr: Deno.PointerValue) {
    super(ptr);
  }

  static getDefault(): StyleManager {
    const ptr = adw.symbols.adw_style_manager_get_default();
    return GObject.lookup<StyleManager>(ptr) ?? new StyleManager(ptr);
  }

  /** Whether the app currently uses the dark style. */
  getDark(): boolean {
    return adw.symbols.adw_style_manager_get_dark(this.ptr);
  }

  onDarkChanged(callback: (dark: boolean) => void): number {
    return this.connectNotify(
      "dark",
      (object) => callback(adw.symbols.adw_style_manager_get_dark(object)),
    );
  }

  setColorScheme(scheme: number): void {
    adw.symbols.adw_style_manager_set_color_scheme(this.ptr, scheme);
  }

  getColorScheme(): number {
    return adw.symbols.adw_style_manager_get_color_scheme(
      this.ptr,
    ) as number;
  }
}

export class Clamp extends Widget {
  constructor() {
    const ptr = adw.symbols.adw_clamp_new();
    super(ptr);
  }
  setMaximumSize(size: number): void {
    adw.symbols.adw_clamp_set_maximum_size(this.ptr, size);
  }
  setChild(child: Widget): void {
    adw.symbols.adw_clamp_set_child(this.ptr, child.ptr);
  }
}

export class Spinner extends Widget {
  constructor() {
    if (!adw.symbols.adw_spinner_new) {
      throw new Error(
        "adw_spinner_new not available - requires libadwaita 1.4+",
      );
    }
    const ptr = adw.symbols.adw_spinner_new();
    super(ptr);
  }
}

export class Carousel extends Widget {
  constructor() {
    const ptr = adw.symbols.adw_carousel_new();
    super(ptr);
  }

  get nPages(): number {
    return adw.symbols.adw_carousel_get_n_pages(this.ptr) as number;
  }

  get position(): number {
    return adw.symbols.adw_carousel_get_position(this.ptr) as number;
  }

  get interactive(): boolean {
    return adw.symbols.adw_carousel_get_interactive(this.ptr) as boolean;
  }

  set interactive(value: boolean) {
    adw.symbols.adw_carousel_set_interactive(this.ptr, value);
  }

  get revealDuration(): number {
    return adw.symbols.adw_carousel_get_reveal_duration(this.ptr) as number;
  }

  set revealDuration(value: number) {
    adw.symbols.adw_carousel_set_reveal_duration(this.ptr, value);
  }

  get allowMouseDrag(): boolean {
    return adw.symbols.adw_carousel_get_allow_mouse_drag(this.ptr) as boolean;
  }

  set allowMouseDrag(value: boolean) {
    adw.symbols.adw_carousel_set_allow_mouse_drag(this.ptr, value);
  }

  get allowScrollWheel(): boolean {
    return adw.symbols.adw_carousel_get_allow_scroll_wheel(this.ptr) as boolean;
  }

  set allowScrollWheel(value: boolean) {
    adw.symbols.adw_carousel_set_allow_scroll_wheel(this.ptr, value);
  }

  get allowLongSwipes(): boolean {
    return adw.symbols.adw_carousel_get_allow_long_swipes(this.ptr) as boolean;
  }

  set allowLongSwipes(value: boolean) {
    adw.symbols.adw_carousel_set_allow_long_swipes(this.ptr, value);
  }

  append(child: Widget): void {
    adw.symbols.adw_carousel_append(this.ptr, child.ptr);
  }

  prepend(child: Widget): void {
    adw.symbols.adw_carousel_prepend(this.ptr, child.ptr);
  }

  insert(child: Widget, position: number): void {
    adw.symbols.adw_carousel_insert(this.ptr, child.ptr, position);
  }

  reorder(child: Widget, position: number): void {
    adw.symbols.adw_carousel_reorder(this.ptr, child.ptr, position);
  }

  remove(child: Widget): void {
    adw.symbols.adw_carousel_remove(this.ptr, child.ptr);
  }

  scrollTo(widget: Widget, animate = true): void {
    adw.symbols.adw_carousel_scroll_to(this.ptr, widget.ptr, animate);
  }

  getNthPage(n: number): Widget | null {
    const ptr = adw.symbols.adw_carousel_get_nth_page(this.ptr, n);
    if (!ptr) return null;
    return new Widget(ptr);
  }
}

export class CarouselIndicatorDots extends Widget {
  constructor() {
    const ptr = adw.symbols.adw_carousel_indicator_dots_new();
    super(ptr);
  }

  get carousel(): Carousel | null {
    const ptr = adw.symbols.adw_carousel_indicator_dots_get_carousel(this.ptr);
    if (!ptr) return null;
    const carousel = Object.create(Carousel.prototype);
    carousel.ptr = ptr;
    return carousel;
  }

  set carousel(value: Carousel | null) {
    adw.symbols.adw_carousel_indicator_dots_set_carousel(
      this.ptr,
      value?.ptr ?? null,
    );
  }
}

export class CarouselIndicatorLines extends Widget {
  constructor() {
    const ptr = adw.symbols.adw_carousel_indicator_lines_new();
    super(ptr);
  }

  get carousel(): Carousel | null {
    const ptr = adw.symbols.adw_carousel_indicator_lines_get_carousel(this.ptr);
    if (!ptr) return null;
    const carousel = Object.create(Carousel.prototype);
    carousel.ptr = ptr;
    return carousel;
  }

  set carousel(value: Carousel | null) {
    adw.symbols.adw_carousel_indicator_lines_set_carousel(
      this.ptr,
      value?.ptr ?? null,
    );
  }
}

// Wrap objects libadwaita hands back in the most specific class available.
registerWrappers({
  AdwActionRow: ActionRow,
  AdwComboRow: ComboRow,
  AdwSwitchRow: SwitchRow,
  AdwSpinRow: SpinRow,
  AdwToast: Toast,
  AdwWindow: AdwWindow,
  AdwStatusPage: StatusPage,
  AdwNavigationPage: NavigationPage,
});
