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
// deno-lint-ignore ban-types
type WrapperClass = { prototype: GObject } & Function;

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

/**
 * Wrap an object GLib hands over with `transfer full`: the wrapper owns that
 * reference, as a constructed one does, and `unref()` releases it. If the
 * object already has a wrapper, the extra reference is dropped and the
 * existing wrapper returned.
 */
export function owned<T extends GObject>(ptr: Deno.PointerValue): T | null {
  if (!ptr) return null;
  const existing = GObject.lookup<T>(ptr);
  if (existing) {
    gobject.symbols.g_object_unref(ptr);
    return existing;
  }
  // GObject's constructor registers the wrapper; the object's own class
  // gives it the right methods without running that class's constructor.
  return Reflect.construct(GObject, [ptr], wrapperFor(ptr)) as T;
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

/** An error GLib reported through a `GError`. */
export class GError extends Error {
  /** The error domain, e.g. `g-io-error-quark`. */
  readonly domain: string;
  /** The domain-specific code, e.g. a `Gio.IOErrorEnum` value. */
  readonly code: number;

  constructor(message: string, domain: string, code: number) {
    super(message);
    this.name = "GError";
    this.domain = domain;
    this.code = code;
  }
}

/**
 * A `GError**` out argument: pass `pointer`, then call `check()` after the
 * call to throw what GLib reported, if anything.
 */
export class ErrorSlot {
  // At least 128 bytes, so the engine keeps it at a fixed address.
  #slot = new BigUint64Array(16);
  readonly pointer: Deno.PointerObject = Deno.UnsafePointer.of(this.#slot)!;

  check(): void {
    const address = this.#slot[0];
    if (!address) return;
    this.#slot[0] = 0n;
    const error = Deno.UnsafePointer.create(address)!;
    // struct GError { GQuark domain; gint code; gchar *message; }
    const view = new Deno.UnsafePointerView(error);
    const domain = readCStr(glib.symbols.g_quark_to_string(view.getUint32(0)));
    const code = view.getInt32(4);
    const message = readCStr(
      Deno.UnsafePointer.create(view.getBigUint64(8)),
    );
    glib.symbols.g_error_free(error);
    throw new GError(message, domain, code);
  }
}

/** Async callbacks GLib hasn't called yet; kept so they aren't collected. */
const pendingAsync = new Set<{ close(): void }>();

/**
 * Run a GIO-style async call and resolve with its finish function's result.
 * `start` receives the GAsyncReadyCallback to pass; `finish` receives the
 * GAsyncResult and an error slot, and its result is the promise's value.
 */
export function asyncCall<T>(
  start: (callback: Deno.PointerObject) => void,
  finish: (result: Deno.PointerValue, error: ErrorSlot) => T,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const callback = new Deno.UnsafeCallback(
      { parameters: ["pointer", "pointer", "pointer"], result: "void" },
      (_source, result) => {
        pendingAsync.delete(callback);
        // Not closed from inside its own call.
        queueMicrotask(() => callback.close());
        try {
          const error = new ErrorSlot();
          const value = finish(result, error);
          error.check();
          resolve(value);
        } catch (e) {
          reject(e);
        }
      },
    );
    pendingAsync.add(callback);
    try {
      start(callback.pointer);
    } catch (e) {
      pendingAsync.delete(callback);
      callback.close();
      reject(e);
    }
  });
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
