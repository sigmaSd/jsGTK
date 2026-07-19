import { glib } from "../low/glib.ts";

// ============================================================================
// GLib Enums and Constants
// ============================================================================

// GLib Priority levels (for timeouts, idle handlers, etc.)
export const Priority = {
  HIGH: -100,
  DEFAULT: 0,
  HIGH_IDLE: 100,
  DEFAULT_IDLE: 200,
  LOW: 300,
} as const;

// Unix signal numbers
export const UnixSignal = {
  SIGINT: 2,
  SIGTERM: 15,
} as const;

// GIOCondition flags (for ioAddWatch)
export const IOCondition = {
  IN: 1,
  PRI: 2,
  OUT: 4,
  ERR: 8,
  HUP: 16,
  NVAL: 32,
} as const;

// GSource callbacks must stay referenced from JS for as long as the source is
// alive, otherwise V8 may garbage-collect the UnsafeCallback and GLib ends up
// invoking a freed function pointer (random segfaults). Sources are dropped
// from the registry when the callback returns false or via sourceRemove().
const sourceCallbacks = new Map<number, Deno.UnsafeCallback>();

function addSource(
  register: (cb: Deno.UnsafeCallback) => number,
  callback: () => boolean,
  persistent = false,
): number {
  let id = 0;
  const cb = new Deno.UnsafeCallback(
    {
      parameters: ["pointer"],
      result: "bool",
    } as Deno.UnsafeCallbackDefinition,
    () => {
      const keep = callback();
      if (!keep && !persistent) sourceCallbacks.delete(id);
      return keep;
    },
  ) as Deno.UnsafeCallback;
  id = register(cb);
  sourceCallbacks.set(id, cb);
  return id;
}

// ============================================================================
// GLib Classes
// ============================================================================

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

// GLib timeout (milliseconds)
export function timeout(ms: number, callback: () => boolean): number {
  return addSource(
    (cb) =>
      glib.symbols.g_timeout_add(ms, cb.pointer as Deno.PointerValue, null),
    callback,
  );
}

// GLib timeout (seconds)
export function timeoutSeconds(
  seconds: number,
  callback: () => boolean,
): number {
  return addSource(
    (cb) =>
      glib.symbols.g_timeout_add_seconds(
        seconds,
        cb.pointer as Deno.PointerValue,
        null,
      ),
    callback,
  );
}

// GLib idle add
export function idleAdd(callback: () => boolean): number {
  return addSource(
    (cb) => glib.symbols.g_idle_add(cb.pointer as Deno.PointerValue, null),
    callback,
  );
}

export function removeTimeout(id: number): void {
  sourceRemove(id);
}

// Alias for removeTimeout - works for any source
export function sourceRemove(id: number): boolean {
  sourceCallbacks.delete(id);
  return glib.symbols.g_source_remove(id);
}

// Unix signal add (only available on Unix)
export function unixSignalAdd(signum: number, callback: () => boolean): number {
  if (!glib.symbols.g_unix_signal_add) {
    throw new Error("g_unix_signal_add is not available on this platform");
  }

  return addSource(
    (cb) =>
      glib.symbols.g_unix_signal_add!(
        signum,
        cb.pointer as Deno.PointerValue,
        null,
      ),
    callback,
    // Signal sources stay installed even when the handler returns true forever;
    // keep the callback alive for the process lifetime.
    true,
  );
}

/**
 * Watch a unix file descriptor with the GLib main loop (g_io_add_watch).
 *
 * The callback receives the triggered IOCondition flags and should return
 * true to keep watching, or false to remove the watch.
 *
 * @example
 * ```typescript
 * // Watch stdin for input
 * ioAddWatch(0, IOCondition.IN, () => {
 *   const buf = new Uint8Array(512);
 *   const n = Deno.stdin.readSync(buf);
 *   // ... handle input ...
 *   return true;
 * });
 * ```
 */
export function ioAddWatch(
  fd: number,
  condition: number,
  callback: (condition: number) => boolean,
): number {
  if (!glib.symbols.g_io_channel_unix_new) {
    throw new Error("ioAddWatch is not available on this platform");
  }
  const channel = glib.symbols.g_io_channel_unix_new(fd);
  if (!channel) throw new Error(`Failed to create IO channel for fd ${fd}`);

  let id = 0;
  const cb = new Deno.UnsafeCallback(
    {
      parameters: ["pointer", "i32", "pointer"],
      result: "bool",
    } as const,
    (
      _channel: Deno.PointerValue,
      cond: number,
      _data: Deno.PointerValue,
    ) => {
      const keep = callback(cond);
      if (!keep) sourceCallbacks.delete(id);
      return keep;
    },
  ) as Deno.UnsafeCallback;

  id = glib.symbols.g_io_add_watch(
    channel,
    condition,
    cb.pointer as Deno.PointerValue,
    null,
  );
  sourceCallbacks.set(id, cb);
  // The watch source holds its own reference to the channel
  glib.symbols.g_io_channel_unref(channel);
  return id;
}
