// Helper to create null-terminated string buffer
export function cstr(str: string): Uint8Array<ArrayBuffer> {
  const encoded = new TextEncoder().encode(str + "\0");
  return new Uint8Array(encoded.buffer);
}

// Helper to read C string
export function readCStr(ptr: Deno.PointerValue): string {
  if (!ptr) return "";
  const view = new Deno.UnsafePointerView(ptr);
  return view.getCString();
}

// Helper to create GValue
export function createGValue(): Uint8Array<ArrayBuffer> {
  // GValue is typically 24 bytes on 64-bit systems
  return new Uint8Array(new ArrayBuffer(24));
}
