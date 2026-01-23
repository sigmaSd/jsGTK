import { adw } from "../low/adw.ts";
import { cstr, readCStr } from "../low/utils.ts";
import { type Application, ListBoxRow, Widget, Window } from "./gtk4.ts";
import { gobject } from "../low/gobject.ts";

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

  show(): void {
    this.setProperty("visible", true);
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

// AdwActionRow extends AdwPreferencesRow extends GtkListBoxRow extends GtkWidget
export class ActionRow extends ListBoxRow {
  constructor(ptr?: Deno.PointerValue) {
    const actualPtr = ptr ?? adw.symbols.adw_action_row_new();
    super(actualPtr);
  }

  addSuffix(widget: Widget): void {
    adw.symbols.adw_action_row_add_suffix(this.ptr, widget.ptr);
  }
}

// AdwComboRow extends AdwActionRow extends AdwPreferencesRow extends GtkListBoxRow extends GtkWidget
export class ComboRow extends ActionRow {
  constructor() {
    const ptr = adw.symbols.adw_combo_row_new();
    super(ptr);
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

// StyleManager wrapper for Adwaita theme control
export class StyleManager {
  ptr: Deno.PointerValue;

  private constructor(ptr: Deno.PointerValue) {
    this.ptr = ptr;
  }

  static getDefault(): StyleManager {
    const ptr = adw.symbols.adw_style_manager_get_default();
    return new StyleManager(ptr);
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
