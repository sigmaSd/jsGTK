/**
 * Runtime support for the methods generated from GIR (`src/high/generated`):
 * wrapping borrowed objects in the right class, keeping callbacks alive until
 * GLib releases them, and mixing generated methods into hand-written classes.
 *
 * @module
 */

import { gobject } from "../low/gobject.ts";
import { cstr, readCStr } from "../low/utils.ts";
import { glib } from "../low/glib.ts";
import { GObject } from "./gobject.ts";

/** A class whose prototype wraps a GType; its constructor may be private. */
type WrapperClass = { prototype: GObject };

/** Wrapper classes by GType name, e.g. `GtkListBoxRow`. */
const wrappers = new Map<string, WrapperClass>();

/**
 * Register the classes that wrap GTypes, so objects GTK hands back are
 * wrapped in the most specific class available.
 */
export function registerWrappers(classes: Record<string, WrapperClass>): void {
  for (const [typeName, wrapper] of Object.entries(classes)) {
    wrappers.set(typeName, wrapper);
  }
}

/** The registered class for an object's GType or its nearest ancestor. */
function wrapperFor(ptr: NonNullable<Deno.PointerValue>): WrapperClass {
  let name = readCStr(gobject.symbols.g_type_name_from_instance(ptr));
  let type = gobject.symbols.g_type_from_name(cstr(name));
  while (name) {
    const wrapper = wrappers.get(name);
    if (wrapper) return wrapper;
    type = gobject.symbols.g_type_parent(type);
    if (!type) break;
    name = readCStr(gobject.symbols.g_type_name(type));
  }
  return GObject as WrapperClass;
}

/**
 * Wrap an object GTK lends without transferring a reference. Returns the
 * wrapper already registered for it when there is one; otherwise a wrapper of
 * its class that takes no reference, valid while GTK keeps the object alive.
 */
export function borrowed<T extends GObject>(ptr: Deno.PointerValue): T | null {
  if (!ptr) return null;
  const existing = GObject.lookup<T>(ptr);
  if (existing) return existing;
  const wrapper = Object.create(wrapperFor(ptr).prototype) as T;
  wrapper.ptr = ptr;
  return wrapper;
}

/** Read a string GLib returns with `transfer full`, then free it. */
export function takeString(ptr: Deno.PointerValue): string | null {
  if (!ptr) return null;
  const text = readCStr(ptr);
  glib.symbols.g_free(ptr);
  return text;
}

/** A C string argument, or NULL. */
export function cstrOrNull(text: string | null): Uint8Array | null {
  return text === null ? null : cstr(text);
}

/** Callbacks GLib still holds, by the user data passed with them. */
const notified = new Map<bigint, { close(): void }>();

const notifiedDestroyed = new Deno.UnsafeCallback(
  { parameters: ["pointer"], result: "void" },
  (userData) => {
    const key = BigInt(Deno.UnsafePointer.value(userData));
    const callback = notified.get(key);
    if (!callback) return;
    notified.delete(key);
    callback.close();
  },
);

/**
 * Hand GLib a callback with `scope="notified"`: it stays alive until GLib
 * calls the destroy notify, then it is closed. Returns the function pointer,
 * the user data and the destroy notify to pass.
 */
export function notifiedCallback(
  callback: { pointer: Deno.PointerObject; close(): void },
): [Deno.PointerObject, Deno.PointerObject, Deno.PointerObject] {
  const pointer = callback.pointer;
  notified.set(BigInt(Deno.UnsafePointer.value(pointer)), callback);
  return [pointer, pointer, notifiedDestroyed.pointer];
}

/** Throw for a method whose symbol this library version lacks. */
export function missing(symbol: string, version?: string): never {
  throw new Error(
    version
      ? `${symbol} needs version ${version} of its library`
      : `${symbol} isn't available in this build of its library`,
  );
}

/** What generated signal helpers need from GObject's protected API. */
interface SignalTarget {
  connectDeclared(
    signal: string,
    callback: (...args: never[]) => unknown,
    definitions?: Record<string, Deno.UnsafeCallbackDefinition>,
  ): number;
}

/** Connect a generated signal helper with its native signature. */
export function connectSignal(
  object: GObject,
  signal: string,
  definition: Deno.UnsafeCallbackDefinition,
  handler: (...args: never[]) => unknown,
): number {
  return (object as unknown as SignalTarget).connectDeclared(
    signal,
    handler,
    { [signal]: definition },
  );
}

/**
 * Add generated methods to a hand-written class and register it as the
 * wrapper for its GType. Methods the class defines itself are kept; the
 * class's TypeScript interface omits them too.
 */
export function applyGenerated(
  target: WrapperClass,
  methods: object,
  typeName: string,
): void {
  wrappers.set(typeName, target);
  const prototype: object = target.prototype;
  for (const [name, method] of Object.entries(methods)) {
    if (Object.hasOwn(prototype, name)) continue;
    Object.defineProperty(prototype, name, {
      value: method,
      writable: true,
      configurable: true,
    });
  }
}
