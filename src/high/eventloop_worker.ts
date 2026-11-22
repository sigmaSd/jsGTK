/**
 * Bun only: blocks in g_poll on its own thread for the EventLoop, which
 * can't make nonblocking FFI calls on Bun. The main thread sends the GLib
 * library path once, then `{ fds, count, timeout }` per wait, with `fds` a
 * SharedArrayBuffer of GPollFDs; this posts back when g_poll returns.
 *
 * @module
 */

type Poll = (fds: unknown, count: number, timeout: number) => number;
interface BunFfi {
  dlopen(
    path: string,
    symbols: Record<string, { args: unknown[]; returns: unknown }>,
  ): { symbols: Record<string, Poll> };
  FFIType: Record<string, unknown>;
  ptr(view: ArrayBufferView): unknown;
}

const scope = globalThis as unknown as {
  onmessage: ((event: { data: Record<string, unknown> }) => void) | null;
  postMessage(message: unknown): void;
};

// Not a static import: Deno and Node never load this file.
const ffi: BunFfi = await import(["bun", "ffi"].join(":"));
let poll: Poll | null = null;

scope.onmessage = ({ data }) => {
  if (typeof data.library === "string") {
    try {
      const { FFIType } = ffi;
      poll = ffi.dlopen(data.library, {
        g_poll: {
          args: [FFIType.ptr, FFIType.u32, FFIType.i32],
          returns: FFIType.i32,
        },
      }).symbols.g_poll;
      scope.postMessage("ready");
    } catch {
      scope.postMessage("failed");
    }
    return;
  }
  const fds = new Uint8Array(data.fds as SharedArrayBuffer);
  poll!(ffi.ptr(fds), data.count as number, data.timeout as number);
  scope.postMessage("done");
};
