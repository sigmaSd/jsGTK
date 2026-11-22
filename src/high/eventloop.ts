/**
 * Event loop integration for GTK applications with async/await support.
 *
 * This module provides the `EventLoop` class which integrates GLib's MainContext
 * with the JavaScript event loop of Deno, Node or Bun, enabling the use of
 * async/await, Promises, fetch(), setTimeout(), and other async JavaScript APIs
 * within GTK applications.
 *
 * By default, GTK's `app.run()` blocks JavaScript's event loop. The EventLoop
 * runs GLib's main context step by step instead: GLib says which file
 * descriptors to watch and for how long, the wait happens on a worker thread,
 * and GLib's sources are dispatched on the main thread as soon as they are
 * ready. JavaScript keeps running while GLib waits, and nothing wakes up while
 * the application is idle.
 *
 * @example
 * ```typescript
 * import { Application } from "@sigmasd/gtk/gtk4";
 * import { EventLoop } from "@sigmasd/gtk/eventloop";
 *
 * const app = new Application("com.example.App", 0);
 * const eventLoop = new EventLoop();
 *
 * app.connect("activate", async () => {
 *   // Now you can use async/await!
 *   const response = await fetch("https://api.example.com");
 *   const data = await response.json();
 * });
 *
 * await eventLoop.start(app);
 * ```
 *
 * @module
 */

import type { Application } from "./gtk4.ts";
import { glib } from "../low/glib.ts";

export interface EventLoopOptions {
  /**
   * Polling interval in milliseconds, used only when GLib can't be waited on
   * from a worker thread (on Bun, or with GLib older than 2.72). The loop then
   * checks GLib right away while busy and backs off from `pollInterval` to
   * 250 ms while idle.
   * @default 16
   */
  pollInterval?: number;
}

/**
 * How the loop waits for GLib: `"driven"` watches GLib's file descriptors on a
 * worker thread, `"polling"` checks GLib on a timer.
 */
export type EventLoopMode = "driven" | "polling";

/** Size of a GPollFD: `{ gint fd; gushort events; gushort revents; }`. */
const POLLFD_SIZE = 8;

/** G_MAIN_CONTEXT_FLAGS_OWNERLESS_POLLING, since GLib 2.72. */
const OWNERLESS_POLLING = 1;

/**
 * Offsets in GLib's private `struct _GMainContext`, which starts with
 * `GMutex mutex; GCond cond; GThread *owner; guint owner_count;
 * GMainContextFlags flags;`. They are checked at runtime before use.
 */
const OWNER_OFFSET = 24;
const OWNER_COUNT_OFFSET = 32;
const FLAGS_OFFSET = 36;

let ownerlessPolling: boolean | undefined;

function offset(pointer: Deno.PointerObject, bytes: number) {
  return Deno.UnsafePointer.create(
    BigInt(Deno.UnsafePointer.value(pointer)) + BigInt(bytes),
  );
}

/**
 * Ask GLib to wake a waiting loop whenever a source is added, including from
 * the thread that owns the context. Without this, a timeout or idle source
 * added by JavaScript on the main thread (for example the redraw GTK queues
 * after a label changes) would wait until something else woke the loop.
 *
 * The default context can't be created with this flag, so it is set in place,
 * after checking that the context's private layout is the one expected: the
 * owner and owner count must follow an extra acquire and release exactly.
 * Must be called with the context acquired by this thread.
 */
function enableOwnerlessPolling(context: Deno.PointerObject): boolean {
  if (ownerlessPolling !== undefined) return ownerlessPolling;
  ownerlessPolling = false;
  if (glib.symbols.glib_check_version(2, 72, 0) !== null) return false;

  const view = new Deno.UnsafePointerView(context);
  const self = BigInt(
    Deno.UnsafePointer.value(glib.symbols.g_thread_self()),
  );
  const owner = () => view.getBigUint64(OWNER_OFFSET);
  const count = () => view.getUint32(OWNER_COUNT_OFFSET);

  const before = count();
  if (owner() !== self || before < 1) return false;
  if (!glib.symbols.g_main_context_acquire(context)) return false;
  const nested = count();
  glib.symbols.g_main_context_release(context);
  if (nested !== before + 1 || count() !== before || owner() !== self) {
    return false;
  }
  if ((view.getUint32(FLAGS_OFFSET) & ~OWNERLESS_POLLING) !== 0) return false;

  glib.symbols.g_atomic_int_or(
    offset(context, FLAGS_OFFSET),
    OWNERLESS_POLLING,
  );
  ownerlessPolling = true;
  return true;
}

/** Whether g_poll runs on a worker thread and returns a promise. */
function canPollOffThread(): boolean {
  const empty = new Uint8Array(POLLFD_SIZE * 16);
  const result: unknown = glib.symbols.g_poll(
    Deno.UnsafePointer.of(empty),
    0,
    0,
  );
  return result instanceof Promise;
}

/**
 * Event loop that integrates GLib's MainContext with Javascript's event loop.
 *
 * By default, using `app.run()` blocks Javascript's event loop because GLib's
 * MainContext takes control of the main thread. This event loop runs GLib's
 * prepare, query, poll, check and dispatch steps itself, waiting for GLib's
 * file descriptors on a worker thread so JavaScript keeps running meanwhile.
 * Where that isn't possible it falls back to checking GLib on a timer.
 */
export class EventLoop {
  #isRunning = false;
  readonly #pollInterval: number;
  #app?: Application;
  #mainContextPtr: Deno.PointerObject;
  #mode: EventLoopMode | null = null;

  constructor(options: EventLoopOptions = {}) {
    this.#pollInterval = options.pollInterval ?? 16;
    this.#mainContextPtr = glib.symbols.g_main_context_default()!;
  }

  /**
   * Starts the event loop and resolves once it is stopped.
   */
  async start(app?: Application): Promise<void> {
    if (this.#isRunning) {
      return;
    }

    this.#app = app;
    this.#app?.register();
    this.#app?.activate();
    this.#isRunning = true;

    const context = this.#mainContextPtr;
    if (glib.symbols.g_main_context_acquire(context)) {
      try {
        if (enableOwnerlessPolling(context) && canPollOffThread()) {
          this.#mode = "driven";
          await this.#runDriven();
          return;
        }
      } finally {
        glib.symbols.g_main_context_release(context);
      }
    }
    this.#mode = "polling";
    await this.#runPolling();
  }

  /** Run GLib's main context one iteration at a time, waiting off-thread. */
  async #runDriven(): Promise<void> {
    const context = this.#mainContextPtr;
    // At least 128 bytes each, so the engine keeps them at a fixed address.
    const priority = new Int32Array(32);
    const timeout = new Int32Array(32);
    const priorityPtr = Deno.UnsafePointer.of(priority);
    const timeoutPtr = Deno.UnsafePointer.of(timeout);
    let fds = new Uint8Array(POLLFD_SIZE * 16);
    let fdsPtr = Deno.UnsafePointer.of(fds);

    while (this.#isRunning) {
      // Dispatch whatever is ready now. This runs GLib's whole
      // prepare-poll-check-dispatch cycle without JavaScript in between.
      glib.symbols.g_main_context_iteration(context, false);

      // Ask GLib what to wait for next. GDK's Wayland source starts a read
      // in prepare, and Wayland calls such as window.present() block until
      // every started read finishes. check() with no events finishes it by
      // cancelling, so JavaScript never runs while a read is pending.
      let ready = glib.symbols.g_main_context_prepare(context, priorityPtr);

      let capacity = fds.length / POLLFD_SIZE;
      let count = glib.symbols.g_main_context_query(
        context,
        priority[0],
        timeoutPtr,
        fdsPtr,
        capacity,
      );
      while (count > capacity) {
        fds = new Uint8Array(POLLFD_SIZE * count * 2);
        fdsPtr = Deno.UnsafePointer.of(fds);
        capacity = fds.length / POLLFD_SIZE;
        count = glib.symbols.g_main_context_query(
          context,
          priority[0],
          timeoutPtr,
          fdsPtr,
          capacity,
        );
      }

      // query() cleared the returned events, so this only finishes the cycle,
      // dispatching sources that became ready on their own (timeouts).
      if (
        glib.symbols.g_main_context_check(context, priority[0], fdsPtr, count)
      ) {
        glib.symbols.g_main_context_dispatch(context);
        ready = true;
      }

      // Wait on a worker thread while JavaScript keeps running. Sources
      // added meanwhile wake the wait through GLib's wakeup descriptor. When
      // work is already ready, this only lets JavaScript run once.
      await glib.symbols.g_poll(
        fdsPtr,
        ready ? 0 : count,
        ready ? 0 : timeout[0],
      );
    }
  }

  /** Check GLib on a timer: right away while busy, backing off when idle. */
  async #runPolling(): Promise<void> {
    let idleCount = 0;
    while (this.#isRunning) {
      const hadEvents = glib.symbols.g_main_context_pending(
        this.#mainContextPtr,
      );

      while (glib.symbols.g_main_context_pending(this.#mainContextPtr)) {
        glib.symbols.g_main_context_iteration(this.#mainContextPtr, false);
      }

      if (hadEvents) {
        idleCount = 0;
        await new Promise((resolve) =>
          queueMicrotask(() => resolve(undefined))
        );
      } else {
        idleCount++;
        // Exponential backoff: 16ms, 32ms, 64ms, ... up to 250ms
        const delay = Math.min(
          this.#pollInterval * Math.pow(2, Math.min(idleCount, 4)),
          250,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Stops the event loop.
   * This will stop processing GLib events and exit the event loop.
   */
  stop(): void {
    if (!this.#isRunning) {
      return;
    }
    if (this.#app) {
      this.#app.quit();
    }
    this.#isRunning = false;
    // End a wait in progress so start() resolves right away.
    glib.symbols.g_main_context_wakeup(this.#mainContextPtr);
  }

  /**
   * Returns whether the event loop is currently running.
   */
  get isRunning(): boolean {
    return this.#isRunning;
  }

  /**
   * How the running loop waits for GLib: `"driven"` when GLib's file
   * descriptors are watched on a worker thread, `"polling"` when GLib is
   * checked on a timer. `null` before the loop starts.
   */
  get mode(): EventLoopMode | null {
    return this.#mode;
  }

  /**
   * Returns the poll interval in milliseconds, used in `"polling"` mode.
   */
  get pollInterval(): number {
    return this.#pollInterval;
  }
}
