import { gio } from "../low/gio.ts";
import { glib } from "../low/glib.ts";
import { gobject } from "../low/gobject.ts";
import { cstr, readCStr } from "../low/utils.ts";
import { GObject } from "./gobject.ts";
import {
  type AppInfoMethods,
  appInfoMethods,
  type AppLaunchContextMethods,
  appLaunchContextMethods,
  type CancellableMethods,
  cancellableMethods,
  type DBusProxyMethods,
  dBusProxyMethods,
  type FileMethods,
  fileMethods,
  type InputStreamMethods,
  inputStreamMethods,
  type ListStoreMethods,
  listStoreMethods,
  type MenuMethods,
  menuMethods,
  type NotificationMethods,
  notificationMethods,
  type OutputStreamMethods,
  outputStreamMethods,
  type SimpleActionMethods,
  simpleActionMethods,
  type SubprocessMethods,
  subprocessMethods,
} from "./generated/gio.ts";
import { applyGenerated } from "./wrappers.ts";

// ============================================================================
// GIO Enums and Constants
// ============================================================================

export const SubprocessFlags = {
  NONE: 0,
  STDIN_PIPE: 1 << 0,
  STDIN_INHERIT: 1 << 1,
  STDOUT_PIPE: 1 << 2,
  STDOUT_SILENCE: 1 << 3,
  STDERR_PIPE: 1 << 4,
  STDERR_SILENCE: 1 << 5,
  STDERR_MERGE: 1 << 6,
  INHERIT_FDS: 1 << 7,
} as const;

export const BusType = {
  STARTER: -1,
  NONE: 0,
  SYSTEM: 1,
  SESSION: 2,
} as const;

export const DBusProxyFlags = {
  NONE: 0,
  DO_NOT_LOAD_PROPERTIES: 1 << 0,
  DO_NOT_CONNECT_SIGNALS: 1 << 1,
  DO_NOT_AUTO_START: 1 << 2,
  GET_INVALIDATED_PROPERTIES: 1 << 3,
  DO_NOT_AUTO_START_AT_CONSTRUCTION: 1 << 4,
} as const;

export const DBusCallFlags = {
  NONE: 0,
  NO_AUTO_START: 1 << 0,
  ALLOW_INTERACTIVE_AUTHORIZATION: 1 << 1,
} as const;

export class Cancellable extends GObject {
  constructor() {
    super(gio.symbols.g_cancellable_new());
  }

  cancel(): void {
    gio.symbols.g_cancellable_cancel(this.ptr);
  }

  isCancelled(): boolean {
    return gio.symbols.g_cancellable_is_cancelled(this.ptr);
  }
}

// Methods generated from GIR; the ones above take precedence.
export interface Cancellable extends CancellableMethods {}
applyGenerated(Cancellable, cancellableMethods, "GCancellable");

// ============================================================================
// GIO Classes
// ============================================================================

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

  removeAll(): void {
    gio.symbols.g_menu_remove_all(this.ptr);
  }
}

// Methods generated from GIR; the ones above take precedence.
export interface Menu extends MenuMethods {}
applyGenerated(Menu, menuMethods, "GMenu");

// GSimpleAction extends GObject
export class SimpleAction extends GObject {
  constructor(name: string) {
    const nameCStr = cstr(name);
    const ptr = gio.symbols.g_simple_action_new(nameCStr, null);
    super(ptr);
  }
}

// Methods generated from GIR; the ones above take precedence.
export interface SimpleAction extends SimpleActionMethods {}
applyGenerated(SimpleAction, simpleActionMethods, "GSimpleAction");

export class ListStore extends GObject {
  constructor(type: number | bigint) {
    const ptr = gio.symbols.g_list_store_new(BigInt(type));
    super(ptr);
  }
  append(item: GObject): void {
    gio.symbols.g_list_store_append(this.ptr, item.ptr);
  }
  removeAll(): void {
    gio.symbols.g_list_store_remove_all(this.ptr);
  }
}

// Methods generated from GIR; the ones above take precedence.
export interface ListStore extends ListStoreMethods {}
applyGenerated(ListStore, listStoreMethods, "GListStore");

function ownedString(ptr: Deno.PointerValue): string | null {
  if (!ptr) return null;
  try {
    return readCStr(ptr);
  } finally {
    glib.symbols.g_free(ptr);
  }
}

function withFileList<T>(
  files: readonly File[],
  call: (list: Deno.PointerValue) => T,
): T {
  let list: Deno.PointerValue = null;
  try {
    for (let index = files.length - 1; index >= 0; index--) {
      const file = files[index].ptr;
      if (!file) {
        throw new Error("Cannot launch an application with a released File");
      }
      list = glib.symbols.g_list_prepend(list, file);
    }
    return call(list);
  } finally {
    glib.symbols.g_list_free(list);
  }
}

function checkLaunch(
  call: (error: Deno.PointerValue) => boolean,
  fallback: string,
): void {
  const error = new BigUint64Array(1);
  if (call(Deno.UnsafePointer.of(error))) return;
  const ptr = Deno.UnsafePointer.create(error[0]);
  if (!ptr) throw new Error(fallback);
  try {
    // GError starts with a GQuark and an int, followed by its message pointer.
    const view = new Deno.UnsafePointerView(ptr);
    const message = view.getPointer?.(8) ?? null;
    throw new Error(readCStr(message) || fallback);
  } finally {
    glib.symbols.g_error_free(ptr);
  }
}

/** Launch parameters, including the startup notification supplied by a display. */
export class AppLaunchContext extends GObject {
  constructor(ptr: Deno.PointerValue = gio.symbols.g_app_launch_context_new()) {
    super(ptr);
  }

  /** Set an environment variable in the launched application. */
  setEnv(name: string, value: string): void {
    gio.symbols.g_app_launch_context_setenv(this.ptr, cstr(name), cstr(value));
  }

  /** Request a startup notification ID or Wayland activation token if supported. */
  getStartupNotifyId(app: AppInfo, files: readonly File[] = []): string | null {
    return withFileList(
      files,
      (list) =>
        ownedString(
          gio.symbols.g_app_launch_context_get_startup_notify_id(
            this.ptr,
            app.ptr,
            list,
          ),
        ),
    );
  }
}

// Methods generated from GIR; the ones above take precedence.
export interface AppLaunchContext extends AppLaunchContextMethods {}
applyGenerated(AppLaunchContext, appLaunchContextMethods, "GAppLaunchContext");

/** Common desktop application icon representations. */
export type AppIcon =
  | { kind: "file"; path: string }
  | { kind: "themed"; names: string[] };

const pendingLaunchCallbacks = new Set<Pick<Deno.UnsafeCallback, "close">>();

/** An installed application and its launch options. Instances own a native reference. */
export class AppInfo extends GObject {
  protected constructor(ptr: NonNullable<Deno.PointerValue>) {
    super(ptr);
  }

  /** List registered applications. Use shouldShow() to exclude hidden entries. */
  static getAll(): AppInfo[] {
    const list = gio.symbols.g_app_info_get_all();
    try {
      const apps: AppInfo[] = [];
      const length = glib.symbols.g_list_length(list);
      for (let index = 0; index < length; index++) {
        const ptr = glib.symbols.g_list_nth_data(list, index);
        if (ptr) apps.push(new AppInfo(ptr));
      }
      return apps;
    } finally {
      glib.symbols.g_list_free(list);
    }
  }

  static getDefaultForType(
    contentType: string,
    mustSupportUris = false,
  ): AppInfo | null {
    const ptr = gio.symbols.g_app_info_get_default_for_type(
      cstr(contentType),
      mustSupportUris,
    );
    return ptr ? new AppInfo(ptr) : null;
  }

  static getDefaultForUriScheme(scheme: string): AppInfo | null {
    const ptr = gio.symbols.g_app_info_get_default_for_uri_scheme(cstr(scheme));
    return ptr ? new AppInfo(ptr) : null;
  }

  getId(): string | null {
    const ptr = gio.symbols.g_app_info_get_id(this.ptr);
    return ptr ? readCStr(ptr) : null;
  }

  getName(): string {
    return readCStr(gio.symbols.g_app_info_get_name(this.ptr));
  }

  getDisplayName(): string {
    return readCStr(gio.symbols.g_app_info_get_display_name(this.ptr));
  }

  /** The program the application runs, as written in its launcher. */
  getExecutable(): string {
    return readCStr(gio.symbols.g_app_info_get_executable(this.ptr));
  }

  getDescription(): string | null {
    const ptr = gio.symbols.g_app_info_get_description(this.ptr);
    return ptr ? readCStr(ptr) : null;
  }

  shouldShow(): boolean {
    return gio.symbols.g_app_info_should_show(this.ptr);
  }

  /** Return a file icon or icon-theme candidates, if the application provides one. */
  getIcon(): AppIcon | null {
    const icon = gio.symbols.g_app_info_get_icon(this.ptr);
    if (!icon) return null;
    if (
      gobject.symbols.g_type_check_instance_is_a(
        icon,
        gio.symbols.g_file_icon_get_type(),
      )
    ) {
      const file = gio.symbols.g_file_icon_get_file(icon);
      const path = ownedString(gio.symbols.g_file_get_path(file));
      return path ? { kind: "file", path } : null;
    }
    if (
      gobject.symbols.g_type_check_instance_is_a(
        icon,
        gio.symbols.g_themed_icon_get_type(),
      )
    ) {
      const list = gio.symbols.g_themed_icon_get_names(icon);
      if (!list) return null;
      const value = glib.symbols.g_variant_new_strv(list, -1n);
      try {
        const names: string[] = [];
        const length = Number(glib.symbols.g_variant_n_children(value));
        for (let index = 0; index < length; index++) {
          const child = glib.symbols.g_variant_get_child_value(
            value,
            BigInt(index),
          );
          try {
            names.push(
              readCStr(glib.symbols.g_variant_get_string(child, null)),
            );
          } finally {
            glib.symbols.g_variant_unref(child);
          }
        }
        return { kind: "themed", names };
      } finally {
        glib.symbols.g_variant_unref(value);
      }
    }
    return null;
  }

  /** Launch the application with optional files. Throws if GIO rejects the launch. */
  launch(files: readonly File[] = [], context?: AppLaunchContext): void {
    withFileList(files, (list) =>
      checkLaunch(
        (error) =>
          gio.symbols.g_app_info_launch(
            this.ptr,
            list,
            context?.ptr ?? null,
            error,
          ),
        "Could not launch application",
      ));
  }

  /** Open a URI with its default handler. */
  static launchDefaultForUri(uri: string, context?: AppLaunchContext): void {
    checkLaunch(
      (error) =>
        gio.symbols.g_app_info_launch_default_for_uri(
          cstr(uri),
          context?.ptr ?? null,
          error,
        ),
      "Could not open URI",
    );
  }

  /** Open a URI and wait for GIO's asynchronous result while the GLib main loop is running. */
  static launchDefaultForUriAsync(
    uri: string,
    context?: AppLaunchContext,
    cancellable?: Cancellable,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const callback = new Deno.UnsafeCallback(
        { parameters: ["pointer", "pointer", "pointer"], result: "void" },
        (_source, result) => {
          try {
            checkLaunch(
              (error) =>
                gio.symbols.g_app_info_launch_default_for_uri_finish(
                  result,
                  error,
                ),
              "Could not open URI",
            );
            resolve();
          } catch (error) {
            reject(error);
          } finally {
            pendingLaunchCallbacks.delete(callback);
            queueMicrotask(() => callback.close());
          }
        },
      );
      pendingLaunchCallbacks.add(callback);
      try {
        gio.symbols.g_app_info_launch_default_for_uri_async(
          cstr(uri),
          context?.ptr ?? null,
          cancellable?.ptr ?? null,
          callback.pointer,
          null,
        );
      } catch (error) {
        pendingLaunchCallbacks.delete(callback);
        callback.close();
        reject(error);
      }
    });
  }
}

// Methods generated from GIR; the ones above take precedence.
export interface AppInfo extends AppInfoMethods {}
applyGenerated(AppInfo, appInfoMethods, "GAppInfo");

/** Application backed by a Freedesktop .desktop entry on a supported GIO build. */
export class DesktopAppInfo extends AppInfo {
  static isSupported(): boolean {
    return Boolean(
      gio.symbols.g_desktop_app_info_new &&
        gio.symbols.g_desktop_app_info_new_from_filename &&
        gio.symbols.g_desktop_app_info_get_filename,
    );
  }

  static fromId(id: string): DesktopAppInfo | null {
    const ptr = gio.symbols.g_desktop_app_info_new?.(cstr(id));
    return ptr ? new DesktopAppInfo(ptr) : null;
  }

  static fromFilename(filename: string): DesktopAppInfo | null {
    const ptr = gio.symbols.g_desktop_app_info_new_from_filename?.(
      cstr(filename),
    );
    return ptr ? new DesktopAppInfo(ptr) : null;
  }

  getFilename(): string | null {
    const ptr = gio.symbols.g_desktop_app_info_get_filename?.(this.ptr);
    return ptr ? readCStr(ptr) : null;
  }

  /** The window class the application sets, from `StartupWMClass`. */
  getStartupWmClass(): string | null {
    const ptr = gio.symbols.g_desktop_app_info_get_startup_wm_class?.(
      this.ptr,
    );
    return ptr ? readCStr(ptr) : null;
  }
}

export class File extends GObject {
  constructor(ptr?: Deno.PointerValue) {
    super(ptr ?? null!); // Allow wrapping existing pointer
  }

  static newForPath(path: string): File {
    const ptr = gio.symbols.g_file_new_for_path(cstr(path));
    return new File(ptr);
  }

  static newForUri(uri: string): File {
    return new File(gio.symbols.g_file_new_for_uri(cstr(uri)));
  }

  static getType(): bigint {
    return BigInt(gio.symbols.g_file_get_type());
  }

  getPath(): string | null {
    return ownedString(gio.symbols.g_file_get_path(this.ptr));
  }

  getUri(): string {
    return ownedString(gio.symbols.g_file_get_uri(this.ptr)) ?? "";
  }

  loadContents(): [boolean, Uint8Array] {
    const contents = new BigUint64Array(1);
    const length = new BigUint64Array(1);

    const success = gio.symbols.g_file_load_contents(
      this.ptr,
      null,
      Deno.UnsafePointer.of(contents),
      Deno.UnsafePointer.of(length),
      null, // No ETag requested.
      null, // The wrapper reports failure through the boolean return value.
    );

    if (success) {
      const len = Number(length[0]);
      const ptr = Deno.UnsafePointer.create(contents[0]);
      if (ptr) {
        const view = new Deno.UnsafePointerView(ptr);
        const arr = new Uint8Array(len);
        view.copyInto(arr);
        glib.symbols.g_free(ptr);
        return [true, arr];
      }
    }
    return [false, new Uint8Array(0)];
  }
}

// Methods generated from GIR; the ones above take precedence.
export interface File extends FileMethods {}
applyGenerated(File, fileMethods, "GFile");

export class AsyncResult extends GObject {}

// GNotification
export class Notification extends GObject {
  constructor(title: string) {
    const titleCStr = cstr(title);
    const ptr = gio.symbols.g_notification_new(titleCStr);
    super(ptr);
  }

  setBody(body: string): void {
    const bodyCStr = cstr(body);
    gio.symbols.g_notification_set_body(this.ptr, bodyCStr);
  }
}

// Methods generated from GIR; the ones above take precedence.
export interface Notification extends NotificationMethods {}
applyGenerated(Notification, notificationMethods, "GNotification");

// GOutputStream wrapper
export class OutputStream extends GObject {
  constructor(ptr: Deno.PointerValue) {
    super(ptr);
  }

  write(data: Uint8Array): number {
    const written = gio.symbols.g_output_stream_write(
      this.ptr,
      Deno.UnsafePointer.of(data as BufferSource),
      BigInt(data.length),
      null,
      null,
    );
    return Number(written);
  }

  writeAllAsync(
    data: Uint8Array,
    priority: number,
    callback?: (success: boolean, bytesWritten: number) => void,
  ): void {
    // An internal callback is always used so both it and the data buffer
    // (which g_output_stream_write_all_async does not copy) stay alive until
    // the write completes, then get released.
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
        const bytesWritten = new BigUint64Array(1);
        const success = gio.symbols.g_output_stream_write_all_finish(
          this.ptr,
          result,
          Deno.UnsafePointer.of(bytesWritten),
          null,
        );
        callback?.(success, Number(bytesWritten[0]));
        this.releaseCallback(cb);
        this.releaseCallback(data);
      },
    );
    this.retainCallback(cb);
    this.retainCallback(data);

    gio.symbols.g_output_stream_write_all_async(
      this.ptr,
      Deno.UnsafePointer.of(data as BufferSource),
      BigInt(data.length),
      priority,
      null,
      cb.pointer,
      null,
    );
  }

  flush(): boolean {
    return gio.symbols.g_output_stream_flush(this.ptr, null, null);
  }

  close(): boolean {
    return gio.symbols.g_output_stream_close(this.ptr, null, null);
  }
}

// Methods generated from GIR; the ones above take precedence.
export interface OutputStream extends OutputStreamMethods {}
applyGenerated(OutputStream, outputStreamMethods, "GOutputStream");

// GInputStream wrapper
export class InputStream extends GObject {
  constructor(ptr: Deno.PointerValue) {
    super(ptr);
  }

  read(buffer: Uint8Array): number {
    const bytesRead = gio.symbols.g_input_stream_read(
      this.ptr,
      Deno.UnsafePointer.of(buffer as BufferSource),
      BigInt(buffer.length),
      null,
      null,
    );
    return Number(bytesRead);
  }

  readBytesAsync(
    count: number,
    priority: number,
    callback: (data: Uint8Array | null) => void,
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
        this.releaseCallback(cb);
        const bytesPtr = gio.symbols.g_input_stream_read_bytes_finish(
          this.ptr,
          result,
          null,
        );

        if (!bytesPtr) {
          callback(null);
          return;
        }

        const sizePtr = new BigUint64Array(1);
        const dataPtr = glib.symbols.g_bytes_get_data(
          bytesPtr,
          Deno.UnsafePointer.of(sizePtr),
        );

        if (!dataPtr) {
          glib.symbols.g_bytes_unref(bytesPtr);
          callback(null);
          return;
        }

        const size = Number(sizePtr[0]);
        if (size === 0) {
          glib.symbols.g_bytes_unref(bytesPtr);
          callback(new Uint8Array(0));
          return;
        }

        const view = new Deno.UnsafePointerView(dataPtr);
        const data = new Uint8Array(size);
        view.copyInto(data);

        glib.symbols.g_bytes_unref(bytesPtr);
        callback(data);
      },
    );

    this.retainCallback(cb);

    gio.symbols.g_input_stream_read_bytes_async(
      this.ptr,
      BigInt(count),
      priority,
      null,
      cb.pointer,
      null,
    );
  }

  close(): boolean {
    return gio.symbols.g_input_stream_close(this.ptr, null, null);
  }
}

// Methods generated from GIR; the ones above take precedence.
export interface InputStream extends InputStreamMethods {}
applyGenerated(InputStream, inputStreamMethods, "GInputStream");

// GSubprocess
export class Subprocess extends GObject {
  constructor(argv: string[], flags: number) {
    // Build null-terminated array of C strings
    const argvPtrs = new BigUint64Array(argv.length + 1);
    const cStrings: Uint8Array[] = [];

    for (let i = 0; i < argv.length; i++) {
      const c = cstr(argv[i]);
      cStrings.push(c); // Keep reference to prevent GC
      argvPtrs[i] = BigInt(Deno.UnsafePointer.value(Deno.UnsafePointer.of(c)!));
    }
    argvPtrs[argv.length] = 0n; // NULL terminator

    const ptr = gio.symbols.g_subprocess_newv(
      Deno.UnsafePointer.of(argvPtrs),
      flags,
      null,
    );

    if (!ptr) {
      throw new Error("Failed to create subprocess");
    }

    super(ptr);
  }

  getStdinPipe(): OutputStream | null {
    const ptr = gio.symbols.g_subprocess_get_stdin_pipe(this.ptr);
    return ptr ? new OutputStream(ptr) : null;
  }

  getStdoutPipe(): InputStream | null {
    const ptr = gio.symbols.g_subprocess_get_stdout_pipe(this.ptr);
    return ptr ? new InputStream(ptr) : null;
  }

  getStderrPipe(): InputStream | null {
    const ptr = gio.symbols.g_subprocess_get_stderr_pipe(this.ptr);
    return ptr ? new InputStream(ptr) : null;
  }

  wait(): boolean {
    return gio.symbols.g_subprocess_wait(this.ptr, null, null);
  }

  waitAsync(callback: (success: boolean) => void): void {
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
        this.releaseCallback(cb);
        const success = gio.symbols.g_subprocess_wait_finish(
          this.ptr,
          result,
          null,
        );
        callback(success);
      },
    );
    this.retainCallback(cb);

    gio.symbols.g_subprocess_wait_async(this.ptr, null, cb.pointer, null);
  }

  getSuccessful(): boolean {
    return gio.symbols.g_subprocess_get_successful(this.ptr);
  }

  getExitStatus(): number {
    return gio.symbols.g_subprocess_get_exit_status(this.ptr);
  }

  forceExit(): void {
    gio.symbols.g_subprocess_force_exit(this.ptr);
  }
}

// Methods generated from GIR; the ones above take precedence.
export interface Subprocess extends SubprocessMethods {}
applyGenerated(Subprocess, subprocessMethods, "GSubprocess");

// GDBusProxy
export class DBusProxy extends GObject {
  constructor(ptr: Deno.PointerValue) {
    super(ptr);
  }

  static newForBusSync(
    busType: number,
    flags: number,
    _info: null,
    name: string,
    objectPath: string,
    interfaceName: string,
  ): DBusProxy | null {
    if (!gio.symbols.g_dbus_proxy_new_for_bus_sync) {
      throw new Error("D-Bus is not available on this platform");
    }

    const ptr = gio.symbols.g_dbus_proxy_new_for_bus_sync(
      busType,
      flags,
      null, // info
      cstr(name),
      cstr(objectPath),
      cstr(interfaceName),
      null, // cancellable
      null, // error
    );

    return ptr ? new DBusProxy(ptr) : null;
  }

  callSync(
    methodName: string,
    parameters: Deno.PointerValue | null,
    flags: number = DBusCallFlags.NONE,
    timeoutMsec: number = -1,
  ): Deno.PointerValue | null {
    if (!gio.symbols.g_dbus_proxy_call_sync) {
      throw new Error("D-Bus is not available on this platform");
    }

    return gio.symbols.g_dbus_proxy_call_sync(
      this.ptr,
      cstr(methodName),
      parameters,
      flags,
      timeoutMsec,
      null, // cancellable
      null, // error
    );
  }

  // Helper to call methods with string parameters and get uint32 result
  callWithStringsGetUint32(
    methodName: string,
    ...args: string[]
  ): number | null {
    // Build variant tuple of strings
    const variantPtrs = new BigUint64Array(args.length);
    for (let i = 0; i < args.length; i++) {
      const strVariant = glib.symbols.g_variant_new_string(cstr(args[i]));
      variantPtrs[i] = BigInt(Deno.UnsafePointer.value(strVariant!));
    }

    const tupleVariant = glib.symbols.g_variant_new_tuple(
      Deno.UnsafePointer.of(variantPtrs),
      BigInt(args.length),
    );

    const result = this.callSync(methodName, tupleVariant);

    if (!result) {
      return null;
    }

    // Extract uint32 from result tuple (first child)
    const child = glib.symbols.g_variant_get_child_value(result, 0n);
    if (!child) {
      glib.symbols.g_variant_unref(result);
      return null;
    }

    const value = glib.symbols.g_variant_get_uint32(child);
    glib.symbols.g_variant_unref(child);
    glib.symbols.g_variant_unref(result);

    return value;
  }

  // Call sync with string args, returns Variant result
  callSyncWithStrings(
    methodName: string,
    ...args: string[]
  ): Variant | null {
    const variantPtrs = new BigUint64Array(args.length);
    for (let i = 0; i < args.length; i++) {
      const strVariant = glib.symbols.g_variant_new_string(cstr(args[i]));
      variantPtrs[i] = BigInt(Deno.UnsafePointer.value(strVariant!));
    }

    const tupleVariant = glib.symbols.g_variant_new_tuple(
      Deno.UnsafePointer.of(variantPtrs),
      BigInt(args.length),
    );

    const result = this.callSync(methodName, tupleVariant);
    return result ? new Variant(result) : null;
  }

  // Call sync with mixed type args (strings and numbers)
  callSyncWithMixed(
    methodName: string,
    ...args: (string | number)[]
  ): Variant | null {
    const variantPtrs = new BigUint64Array(args.length);

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      let variant: Deno.PointerValue;

      if (typeof arg === "string") {
        variant = glib.symbols.g_variant_new_string(cstr(arg))!;
      } else {
        variant = glib.symbols.g_variant_new_uint32(arg)!;
      }

      variantPtrs[i] = BigInt(Deno.UnsafePointer.value(variant));
    }

    const tupleVariant = glib.symbols.g_variant_new_tuple(
      Deno.UnsafePointer.of(variantPtrs),
      BigInt(args.length),
    );

    const result = this.callSync(methodName, tupleVariant);
    return result ? new Variant(result) : null;
  }

  // Helper to call methods with uint32 parameter
  callWithUint32(methodName: string, value: number): void {
    // Create a uint32 variant wrapped in a tuple for D-Bus call
    const uint32Variant = glib.symbols.g_variant_new_uint32(value);
    const variantPtrs = new BigUint64Array(1);
    variantPtrs[0] = BigInt(Deno.UnsafePointer.value(uint32Variant!));

    const tupleVariant = glib.symbols.g_variant_new_tuple(
      Deno.UnsafePointer.of(variantPtrs),
      1n,
    );

    this.callSync(methodName, tupleVariant);
  }

  // Async call with callback
  callAsync(
    methodName: string,
    parameters: Deno.PointerValue | null,
    callback: (result: Deno.PointerValue | null) => void,
    flags: number = DBusCallFlags.NONE,
    timeoutMsec: number = -1,
    cancellable?: Cancellable | null,
  ): void {
    if (!gio.symbols.g_dbus_proxy_call) {
      throw new Error("D-Bus async is not available");
    }

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
        this.releaseCallback(cb);
        const finish = gio.symbols.g_dbus_proxy_call_finish;
        if (finish) {
          const variant = finish(this.ptr, result, null);
          callback(variant);
        } else {
          callback(null);
        }
      },
    );
    this.retainCallback(cb);

    gio.symbols.g_dbus_proxy_call(
      this.ptr,
      cstr(methodName),
      parameters,
      flags,
      timeoutMsec,
      cancellable?.ptr ?? null,
      cb.pointer,
      null,
    );
  }

  // Call with string args, returns Variant result via async
  callAsyncWithStrings(
    methodName: string,
    ...args: (string | Cancellable | null)[]
  ): Promise<Variant | null> {
    const lastArg = args[args.length - 1];
    const cancellable = lastArg instanceof Cancellable
      ? (args.pop() as Cancellable)
      : null;

    const strArgs = args as string[];
    const strVariants = new Array(strArgs.length);
    for (let i = 0; i < strArgs.length; i++) {
      strVariants[i] = glib.symbols.g_variant_new_string(cstr(strArgs[i]));
    }

    const variantPtrs = new BigUint64Array(strArgs.length);
    for (let i = 0; i < strArgs.length; i++) {
      variantPtrs[i] = BigInt(Deno.UnsafePointer.value(strVariants[i]!));
    }

    const tupleVariant = glib.symbols.g_variant_new_tuple(
      Deno.UnsafePointer.of(variantPtrs),
      BigInt(strArgs.length),
    );

    return new Promise((resolve, reject) => {
      const timeoutId = cancellable ? null : setTimeout(() => {
        reject(new Error("D-Bus call timeout"));
      }, 5000);

      this.callAsync(
        methodName,
        tupleVariant,
        (result) => {
          if (timeoutId) clearTimeout(timeoutId);
          if (cancellable?.isCancelled()) {
            resolve(null);
            return;
          }
          if (!result) {
            resolve(null);
            return;
          }
          resolve(new Variant(result));
        },
        DBusCallFlags.NONE,
        -1,
        cancellable,
      );
    });
  }

  callAsyncWithMixed(
    methodName: string,
    ...args: (string | number | Cancellable | null)[]
  ): Promise<Variant | null> {
    const lastArg = args[args.length - 1];
    const cancellable = lastArg instanceof Cancellable
      ? (args.pop() as Cancellable)
      : null;

    const mixedArgs = args as (string | number)[];
    const variantPtrs = new BigUint64Array(mixedArgs.length);

    for (let i = 0; i < mixedArgs.length; i++) {
      const arg = mixedArgs[i];
      let variant: Deno.PointerValue;

      if (typeof arg === "string") {
        variant = glib.symbols.g_variant_new_string(cstr(arg))!;
      } else {
        variant = glib.symbols.g_variant_new_uint32(arg)!;
      }

      variantPtrs[i] = BigInt(Deno.UnsafePointer.value(variant));
    }

    const tupleVariant = glib.symbols.g_variant_new_tuple(
      Deno.UnsafePointer.of(variantPtrs),
      BigInt(mixedArgs.length),
    );

    return new Promise((resolve, reject) => {
      const timeoutId = cancellable ? null : setTimeout(() => {
        reject(new Error("D-Bus call timeout"));
      }, 5000);

      this.callAsync(
        methodName,
        tupleVariant,
        (result) => {
          if (timeoutId) clearTimeout(timeoutId);
          if (cancellable?.isCancelled()) {
            resolve(null);
            return;
          }
          if (!result) {
            resolve(null);
            return;
          }
          resolve(new Variant(result));
        },
        DBusCallFlags.NONE,
        -1,
        cancellable,
      );
    });
  }
}

// Methods generated from GIR; the ones above take precedence.
export interface DBusProxy extends DBusProxyMethods {}
applyGenerated(DBusProxy, dBusProxyMethods, "GDBusProxy");

// Helper class for creating GVariant values
export class Variant {
  ptr: Deno.PointerValue;

  constructor(ptr: Deno.PointerValue) {
    this.ptr = ptr;
  }

  static newString(value: string): Variant {
    const ptr = glib.symbols.g_variant_new_string(cstr(value));
    return new Variant(ptr!);
  }

  static newUint32(value: number): Variant {
    const ptr = glib.symbols.g_variant_new_uint32(value);
    return new Variant(ptr!);
  }

  static newTuple(children: Variant[]): Variant {
    const ptrs = new BigUint64Array(children.length);
    for (let i = 0; i < children.length; i++) {
      ptrs[i] = BigInt(Deno.UnsafePointer.value(children[i].ptr!));
    }
    const ptr = glib.symbols.g_variant_new_tuple(
      Deno.UnsafePointer.of(ptrs),
      BigInt(children.length),
    );
    return new Variant(ptr!);
  }

  getChildValue(index: number): Variant | null {
    const ptr = glib.symbols.g_variant_get_child_value(this.ptr, BigInt(index));
    return ptr ? new Variant(ptr) : null;
  }

  getString(): string | null {
    const ptr = glib.symbols.g_variant_get_string(this.ptr, null);
    return ptr ? readCStr(ptr) : null;
  }

  getUint32(): number {
    return glib.symbols.g_variant_get_uint32(this.ptr);
  }

  getInt32(): number {
    return glib.symbols.g_variant_get_int32(this.ptr);
  }

  getUint16(): number {
    return glib.symbols.g_variant_get_uint16(this.ptr);
  }

  getTypeString(): string {
    const ptr = glib.symbols.g_variant_get_type_string(this.ptr);
    return ptr ? readCStr(ptr) : "";
  }

  getChildrenCount(): number {
    const count = glib.symbols.g_variant_n_children(this.ptr);
    return Number(count);
  }

  isOfType(typeString: string): boolean {
    return this.getTypeString() === typeString;
  }

  getStrv(): string[] {
    if (!this.isOfType("as")) return [];
    const count = this.getChildrenCount();
    const arr: string[] = [];
    for (let i = 0; i < count; i++) {
      const child = this.getChildValue(i);
      arr.push(child?.getString() || "");
    }
    return arr;
  }

  isNull(): boolean {
    return this.ptr === null;
  }

  unref(): void {
    glib.symbols.g_variant_unref(this.ptr);
  }
}
