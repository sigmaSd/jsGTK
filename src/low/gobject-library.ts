type GObjectFunction = Omit<Deno.ForeignFunction, "parameters" | "result"> & {
  parameters: readonly (Deno.NativeType | "gboolean")[];
  result: Deno.NativeResultType | "gboolean";
};

type Symbols = Record<string, GObjectFunction | Deno.ForeignStatic>;
type JSBoolean<T> = T extends "gboolean" ? "bool" : T;
type JSParameters<T extends GObjectFunction["parameters"]> = {
  [K in keyof T]: JSBoolean<T[K]>;
};
type JSSymbols<S extends Symbols> = {
  [K in keyof S]: S[K] extends Deno.ForeignStatic ? S[K]
    : S[K] extends GObjectFunction ? Omit<S[K], "parameters" | "result"> & {
        parameters: JSParameters<S[K]["parameters"]>;
        result: JSBoolean<S[K]["result"]>;
      }
    : never;
};

/**
 * Open a library's symbols. Each symbol is bound the first time it is used:
 * an app calls a small part of what jsGTK declares, and binding every symbol
 * up front made importing jsGTK take hundreds of milliseconds.
 *
 * Native `gboolean` is passed as a C int and presented to JavaScript as a
 * boolean, in arguments and results. An optional symbol the library lacks
 * reads as null or undefined, as with `Deno.dlopen`.
 */
export function openGObjectLibrary<const S extends Symbols>(
  path: string,
  definitions: S,
): Deno.DynamicLibrary<JSSymbols<S>> {
  const opened: { close(): void }[] = [];

  /** Open one symbol; null when it is optional and the library lacks it. */
  function open(
    name: string,
    definition: Deno.ForeignFunction | Deno.ForeignStatic,
  ): unknown {
    let library;
    try {
      library = Deno.dlopen(path, { [name]: definition });
    } catch (error) {
      // Deno returns null for a missing optional symbol, but Bun's
      // dlopen (through deno-compat) throws when it is the only one.
      if (definition.optional) return null;
      throw error;
    }
    opened.push(library);
    return library.symbols[name];
  }

  function bind(name: string, definition: S[keyof S]): unknown {
    if ("type" in definition) return open(name, definition);
    const call = open(name, {
      ...definition,
      parameters: definition.parameters.map((type) =>
        type === "gboolean" ? "i32" : type
      ),
      result: definition.result === "gboolean" ? "i32" : definition.result,
    } as Deno.ForeignFunction) as
      | ((...args: unknown[]) => unknown)
      | null
      | undefined;
    const positions = definition.parameters.flatMap((type, index) =>
      type === "gboolean" ? [index] : []
    );
    const returnsBoolean = definition.result === "gboolean";
    if (!call || (!positions.length && !returnsBoolean)) return call;
    return (...args: unknown[]) => {
      for (const index of positions) args[index] = args[index] ? 1 : 0;
      const result = call(...args);
      if (!returnsBoolean) return result;
      return result instanceof Promise ? result.then(Boolean) : Boolean(result);
    };
  }

  const symbols: Record<string, unknown> = {};
  for (const [name, definition] of Object.entries(definitions)) {
    Object.defineProperty(symbols, name, {
      configurable: true,
      enumerable: true,
      get() {
        const value = bind(name, definition as S[keyof S]);
        // From now on a plain property: no getter on later calls.
        Object.defineProperty(symbols, name, { value, enumerable: true });
        return value;
      },
    });
  }
  return {
    symbols: symbols as Deno.DynamicLibrary<JSSymbols<S>>["symbols"],
    close: () => {
      for (const library of opened) library.close();
    },
  };
}
