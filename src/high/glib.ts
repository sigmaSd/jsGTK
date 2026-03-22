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
  const cb = new Deno.UnsafeCallback(
    {
      parameters: ["pointer"],
      result: "bool",
    } as Deno.UnsafeCallbackDefinition,
    () => {
      return callback();
    },
  );

  return glib.symbols.g_timeout_add(ms, cb.pointer as Deno.PointerValue, null);
}

// GLib timeout (seconds)
export function timeoutSeconds(
  seconds: number,
  callback: () => boolean,
): number {
  const cb = new Deno.UnsafeCallback(
    {
      parameters: ["pointer"],
      result: "bool",
    } as Deno.UnsafeCallbackDefinition,
    () => {
      return callback();
    },
  );

  return glib.symbols.g_timeout_add_seconds(
    seconds,
    cb.pointer as Deno.PointerValue,
    null,
  );
}

// GLib idle add
export function idleAdd(callback: () => boolean): number {
  const cb = new Deno.UnsafeCallback(
    {
      parameters: ["pointer"],
      result: "bool",
    } as Deno.UnsafeCallbackDefinition,
    () => {
      return callback();
    },
  );

  return glib.symbols.g_idle_add(cb.pointer as Deno.PointerValue, null);
}

export function removeTimeout(id: number): void {
  glib.symbols.g_source_remove(id);
}

// Alias for removeTimeout - works for any source
export function sourceRemove(id: number): boolean {
  return glib.symbols.g_source_remove(id);
}

// Unix signal add (only available on Unix)
export function unixSignalAdd(signum: number, callback: () => boolean): number {
  if (!glib.symbols.g_unix_signal_add) {
    throw new Error("g_unix_signal_add is not available on this platform");
  }

  const cb = new Deno.UnsafeCallback(
    {
      parameters: ["pointer"],
      result: "bool",
    } as Deno.UnsafeCallbackDefinition,
    () => {
      return callback();
    },
  );

  return glib.symbols.g_unix_signal_add(
    signum,
    cb.pointer as Deno.PointerValue,
    null,
  );
}
