import { gobject } from "../low/gobject.ts";
import { createGValue, cstr, readCStr } from "../low/utils.ts";

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

// Base class for GObject wrappers
export class GObject {
  /**
   * @internal
   * Internal pointer to the underlying GTK object.
   * Do not use directly in application code - use the high-level methods instead.
   */
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

  connect(
    signal: string,
    callback: (...args: Deno.PointerValue[]) => unknown,
  ): number {
    const signalCStr = cstr(signal);
    const cb = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "pointer", "pointer", "pointer", "pointer"],
        result: "void",
      },
      (_objectPtr: Deno.PointerValue, ...args: Deno.PointerValue[]) => {
        // Pass the raw pointer arguments to the callback
        // Higher-level wrappers will convert these as needed
        callback(...args);
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

  emit(signal: string): void {
    const signalCStr = cstr(signal);
    gobject.symbols.g_signal_emit_by_name(this.ptr, signalCStr);
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
      if (Number.isInteger(value)) {
        gobject.symbols.g_value_init(gvaluePtr, BigInt(G_TYPE_INT));
        gobject.symbols.g_value_set_int(gvaluePtr, value);
      } else {
        gobject.symbols.g_value_init(gvaluePtr, BigInt(G_TYPE_DOUBLE));
        gobject.symbols.g_value_set_double(gvaluePtr, value);
      }
    } else if (value instanceof GObject) {
      gobject.symbols.g_value_init(gvaluePtr, BigInt(G_TYPE_OBJECT));
      gobject.symbols.g_value_set_object(gvaluePtr, value.ptr);
    } else if (typeof value === "object" && value !== null) {
      // Handle raw Deno.PointerValue for object properties
      gobject.symbols.g_value_init(gvaluePtr, BigInt(G_TYPE_OBJECT));
      gobject.symbols.g_value_set_object(
        gvaluePtr,
        value as Deno.PointerValue,
      );
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
    } else if (type === G_TYPE_DOUBLE) {
      result = gobject.symbols.g_value_get_double(gvaluePtr);
    } else if (type === G_TYPE_UINT) {
      result = gobject.symbols.g_value_get_uint(gvaluePtr);
    } else if (type === G_TYPE_OBJECT) {
      result = gobject.symbols.g_value_get_object(gvaluePtr);
    }

    gobject.symbols.g_value_unset(gvaluePtr);
    return result;
  }
}

// Helper function to create GObject instances from type name
export function createGObject(typeName: string): Deno.PointerValue | null {
  const type = gobject.symbols.g_type_from_name(cstr(typeName));
  if (!type) return null;
  return gobject.symbols.g_object_new(type, null);
}
