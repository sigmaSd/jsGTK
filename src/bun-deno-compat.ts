// deno-lint-ignore-file
/**
 * Deno compatibility layer for Bun
 * This module provides Deno APIs implemented using Bun's FFI equivalents
 */

import process from "node:process";
if (navigator.userAgent.startsWith("Bun")) {
  const { dlopen, FFIType, CString, ptr, JSCallback } = await import("bun:ffi");
  const { type } = await import("node:os");

  class DenoCompat {
    static env = {
      get(name: string) {
        return Bun.env[name];
      },
    };

    static build = {
      os: (() => {
        const osType = type().toLowerCase();
        if (osType === "linux") return "linux";
        if (osType === "darwin") return "darwin";
        if (osType === "windows_nt") return "windows";
        return osType;
      })(),
    };

    static exit(code?: number) {
      process.exit(code);
    }

    static transformFFIType(denoType: string) {
      switch (denoType) {
        case "void":
          return FFIType.void;
        case "bool":
          return FFIType.bool;
        case "u8":
          return FFIType.u8;
        case "i8":
          return FFIType.i8;
        case "u16":
          return FFIType.u16;
        case "i16":
          return FFIType.i16;
        case "u32":
          return FFIType.u32;
        case "i32":
          return FFIType.i32;
        case "u64":
          return FFIType.u64;
        case "i64":
          return FFIType.i64;
        case "usize":
          return FFIType.u64;
        case "isize":
          return FFIType.i64;
        case "f32":
          return FFIType.f32;
        case "f64":
          return FFIType.f64;
        case "pointer":
        case "buffer":
          return FFIType.ptr;
        case "function":
          return FFIType.function;
        default:
          throw new Error(`FFI type not supported: ${denoType}`);
      }
    }

    static dlopen(path: string, symbols: Record<string, any>) {
      const bunSymbols: Record<string, any> = {};
      const optionalSymbols: Record<string, any> = {};

      for (const name in symbols) {
        const symbol = symbols[name];
        if ("type" in symbol) {
          throw new Error("Symbol type notation not supported");
        }

        const bunSymbol = {
          args: symbol.parameters.map((type: string) =>
            this.transformFFIType(type)
          ),
          returns: this.transformFFIType(symbol.result),
        };

        if (symbol.optional) {
          optionalSymbols[name] = bunSymbol;
        } else {
          bunSymbols[name] = bunSymbol;
        }
      }

      const lib = dlopen(path, bunSymbols);

      // Try to load optional symbols
      for (const name in optionalSymbols) {
        try {
          const optLib = dlopen(path, {
            [name]: optionalSymbols[name],
          });
          (lib.symbols as any)[name] = optLib.symbols[name];
        } catch (_e) {
          // Symbol not found or failed to load, skip it
        }
      }

      return lib;
    }

    static UnsafeCallback = class UnsafeCallback {
      inner: any;
      pointer: any;

      constructor(def: any, fn: any) {
        this.inner = new JSCallback(fn, {
          args: def.parameters.map((type: string) =>
            DenoCompat.transformFFIType(type)
          ),
          returns: DenoCompat.transformFFIType(def.result),
        });
        this.pointer = this.inner.ptr;
      }

      close() {
        this.inner.close();
      }
    };

    static UnsafePointerView = class UnsafePointerView {
      static getCString(pointer: any) {
        return new CString(pointer).toString();
      }

      constructor(public ptr: any) {}

      getCString() {
        return new CString(this.ptr).toString();
      }
    };

    static UnsafePointer = class UnsafePointer {
      static equals(a: any, b: any) {
        return a === b;
      }

      static create(value: bigint | number) {
        return Number(value);
      }

      // @ts-ignore TypedArray exists in Bun ?
      static of(buffer: ArrayBuffer | TypedArray) {
        return ptr(buffer);
      }

      static value(pointer: any) {
        return pointer;
      }
    };

    static async test(
      name: string | object,
      fnOrOptions?: Function | object,
      maybeFn?: Function,
    ) {
      const testName = typeof name === "string" ? name : (name as any).name;
      // Handle overload: test(name, fn) vs test(name, options, fn)
      let testFn: Function;

      if (typeof fnOrOptions === "function") {
        testFn = fnOrOptions;
      } else if (typeof name !== "string" && (name as any).fn) {
        testFn = (name as any).fn;
      } else {
        testFn = maybeFn!;
      }

      try {
        const { test } = await import("bun:test");
        test(testName, testFn as any);
      } catch (e) {
        console.error("Failed to load bun:test", e);
      }
    }
  }

  (globalThis as any).Deno = DenoCompat;
}

export {};
