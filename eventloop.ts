// Event loop integration for GTK FFI to support async/await with GLib MainContext

import { Application } from "./gtk-ffi.ts";

export interface EventLoopOptions {
  /**
   * Maximum sleep interval in milliseconds when no events are pending.
   * When events are actively being processed, the loop will check again
   * immediately using microtasks for sub-millisecond latency.
   * @default 16
   */
  pollInterval?: number;
}

/**
 * Event loop that integrates GLib's MainContext with Javascript's event loop.
 *
 * By default, using `app.run()` blocks Javascript's event loop because GLib's MainContext
 * takes control of the main thread. This event loop provides a workaround by
 * intelligently processing GLib events: using microtasks for immediate response
 * when events are flowing, and sleeping to conserve CPU when idle.
 */
export class EventLoop {
  private _isRunning = false;
  private readonly _pollInterval: number;
  private _app?: Application;
  private mainContextPtr: Deno.PointerValue;
  private glib: Deno.DynamicLibrary<{
    g_main_context_default: { parameters: []; result: "pointer" };
    g_main_context_pending: { parameters: ["pointer"]; result: "bool" };
    g_main_context_iteration: {
      parameters: ["pointer", "bool"];
      result: "bool";
    };
  }>;

  constructor(options: EventLoopOptions = {}) {
    this._pollInterval = options.pollInterval ?? 16;

    // Load GLib for main context functions
    this.glib = Deno.dlopen("libglib-2.0.so.0", {
      g_main_context_default: { parameters: [], result: "pointer" },
      g_main_context_pending: { parameters: ["pointer"], result: "bool" },
      g_main_context_iteration: {
        parameters: ["pointer", "bool"],
        result: "bool",
      },
    });

    this.mainContextPtr = this.glib.symbols.g_main_context_default();
  }

  /**
   * Starts the event loop.
   * Uses a hybrid approach: sub-millisecond latency when events are active,
   * and sleeps when idle to conserve CPU.
   */
  async start(app: Application): Promise<void> {
    if (this._isRunning) {
      return;
    }

    this._app = app;
    this._isRunning = true;

    // Hybrid event loop: fast when busy, efficient when idle
    while (this._isRunning) {
      // Check if there are pending events before processing
      const hadEvents = this.glib.symbols.g_main_context_pending(
        this.mainContextPtr,
      );

      // Process all currently pending events
      while (this.glib.symbols.g_main_context_pending(this.mainContextPtr)) {
        this.glib.symbols.g_main_context_iteration(this.mainContextPtr, false);
      }

      // Adapt sleep strategy based on event activity
      if (hadEvents) {
        // Events were processed - check again immediately with minimal delay
        // This gives sub-millisecond response time during active periods
        await new Promise((resolve) =>
          queueMicrotask(() => resolve(undefined))
        );
      } else {
        // No events - sleep for the full interval to save CPU
        await new Promise((resolve) => setTimeout(resolve, this._pollInterval));
      }
    }
  }

  /**
   * Stops the event loop.
   * This will stop processing GLib events and exit the event loop.
   */
  stop(): void {
    if (!this._isRunning) {
      return;
    }
    if (this._app) {
      this._app.quit();
    }
    this._isRunning = false;
  }

  /**
   * Returns whether the event loop is currently running.
   */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Returns the current poll interval in milliseconds.
   */
  get pollInterval(): number {
    return this._pollInterval;
  }
}
