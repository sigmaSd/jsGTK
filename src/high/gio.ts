import { gio } from "../low/gio.ts";
import { glib } from "../low/glib.ts";
import { cstr, readCStr } from "../low/utils.ts";
import { GObject } from "./gobject.ts";

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
}

// GSimpleAction extends GObject
export class SimpleAction extends GObject {
  constructor(name: string) {
    const nameCStr = cstr(name);
    const ptr = gio.symbols.g_simple_action_new(nameCStr, null);
    super(ptr);
  }
}

export class ListStore extends GObject {
  constructor(type: number | bigint) {
    const ptr = gio.symbols.g_list_store_new(BigInt(type));
    super(ptr);
  }
  append(item: GObject): void {
    gio.symbols.g_list_store_append(this.ptr, item.ptr);
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

  static getType(): bigint {
    return BigInt(gio.symbols.g_file_get_type());
  }

  getPath(): string | null {
    const ptr = gio.symbols.g_file_get_path(this.ptr);
    return ptr ? readCStr(ptr) : null;
  }

  loadContents(): [boolean, Uint8Array] {
    const contents = new BigUint64Array(1);
    const length = new BigUint64Array(1);
    const etag_out = new BigUint64Array(1);

    const success = gio.symbols.g_file_load_contents(
      this.ptr,
      null,
      Deno.UnsafePointer.of(contents),
      Deno.UnsafePointer.of(length),
      Deno.UnsafePointer.of(etag_out),
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
    const cb = callback
      ? new Deno.UnsafeCallback(
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
          callback(success, Number(bytesWritten[0]));
        },
      )
      : null;

    gio.symbols.g_output_stream_write_all_async(
      this.ptr,
      Deno.UnsafePointer.of(data as BufferSource),
      BigInt(data.length),
      priority,
      null,
      cb?.pointer ?? null,
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
        const dataPtr = gio.symbols.g_bytes_get_data(
          bytesPtr,
          Deno.UnsafePointer.of(sizePtr),
        );

        if (!dataPtr) {
          gio.symbols.g_bytes_unref(bytesPtr);
          callback(null);
          return;
        }

        const size = Number(sizePtr[0]);
        if (size === 0) {
          gio.symbols.g_bytes_unref(bytesPtr);
          callback(new Uint8Array(0));
          return;
        }

        const view = new Deno.UnsafePointerView(dataPtr);
        const data = new Uint8Array(size);
        view.copyInto(data);

        gio.symbols.g_bytes_unref(bytesPtr);
        callback(data);
      },
    );

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
        const success = gio.symbols.g_subprocess_wait_finish(
          this.ptr,
          result,
          null,
        );
        callback(success);
      },
    );

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
}

// Helper class for creating GVariant values
export class Variant {
  ptr: Deno.PointerValue;

  private constructor(ptr: Deno.PointerValue) {
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

  unref(): void {
    glib.symbols.g_variant_unref(this.ptr);
  }
}
