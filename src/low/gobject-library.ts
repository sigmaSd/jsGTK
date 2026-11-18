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

/** Load native gboolean as a C int and preserve boolean arguments and results in JS. */
export function openGObjectLibrary<const S extends Symbols>(
  path: string,
  definitions: S,
): Deno.DynamicLibrary<JSSymbols<S>> {
  const native: Deno.ForeignLibraryInterface = {};
  for (const [name, definition] of Object.entries(definitions)) {
    native[name] = "type" in definition ? definition : {
      ...definition,
      parameters: definition.parameters.map((type) =>
        type === "gboolean" ? "i32" : type
      ),
      result: definition.result === "gboolean" ? "i32" : definition.result,
    };
  }
  const library = Deno.dlopen(path, native);
  const symbols: Record<string, unknown> = { ...library.symbols };
  for (const [name, definition] of Object.entries(definitions)) {
    if ("type" in definition) continue;
    const positions = definition.parameters.flatMap((type, index) =>
      type === "gboolean" ? [index] : []
    );
    const returnsBoolean = definition.result === "gboolean";
    if (!positions.length && !returnsBoolean) continue;
    const call = symbols[name] as ((...args: unknown[]) => unknown) | undefined;
    if (!call) continue;
    symbols[name] = (...args: unknown[]) => {
      for (const index of positions) args[index] = args[index] ? 1 : 0;
      const result = call(...args);
      if (!returnsBoolean) return result;
      return result instanceof Promise ? result.then(Boolean) : Boolean(result);
    };
  }
  return {
    symbols: symbols as Deno.DynamicLibrary<JSSymbols<S>>["symbols"],
    close: () => library.close(),
  };
}
