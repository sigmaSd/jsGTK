// Generates typed methods and signal helpers for jsGTK's high-level classes
// from the pinned GIR snapshots. Hand-written methods win: the generated
// module leaves out every name a class (or its hand-written ancestors)
// already defines, and `applyGenerated` never replaces an own method.

import type { Element } from "@xmldom/xmldom";

const CORE = "http://www.gtk.org/introspection/core/1.0";
const C = "http://www.gtk.org/introspection/c/1.0";
const GLIB = "http://www.gtk.org/introspection/glib/1.0";

/** A parsed GIR namespace. */
export type Namespace = { name: string; node: Element };

/** Per-class generator settings from bindings.json. */
export type ClassConfig = {
  /** The hand-written class, when its name differs from the GIR class. */
  wrapper?: string;
  /** Methods or signals to leave out, by GIR name, with the reason. */
  skip?: Record<string, string>;
};

export type ClassProfile = {
  /** GIR namespace of the classes, e.g. `Gtk`. */
  namespace: string;
  /** Name of the low-level library export, e.g. `gtk4`. */
  library: string;
  /** Low-level module, relative to `src/high/generated`. */
  libraryModule: string;
  classes: Record<string, ClassConfig>;
};

/** Hand-written classes: TS class name -> methods it defines, and parent. */
export type HandWritten = Map<
  string,
  { module: string; methods: Set<string>; parent: string | null }
>;

/** Modules holding hand-written wrappers for each GIR namespace. */
const WRAPPER_MODULES: Record<string, string[]> = {
  Gtk: ["gtk4.ts"],
  Gdk: ["gtk4.ts"],
  Adw: ["adw.ts", "gtk4.ts"],
  Gio: ["gio.ts"],
  GObject: ["gobject.ts"],
};

/** Hand-written classes named differently from their GIR class. */
const ALIASES: Record<string, string> = {
  "adw.ts:AdwWindow": "Adw.Window",
  "adw.ts:AdwApplicationWindow": "Adw.ApplicationWindow",
  "gtk4.ts:GdkAppLaunchContext": "Gdk.AppLaunchContext",
  "gobject.ts:GObject": "GObject.Object",
};

/** The GIR class each hand-written class wraps, by `module:Name` key. */
export function girClasses(
  namespaces: Map<string, Namespace>,
  handWritten: HandWritten,
): Map<string, string> {
  const result = new Map<string, string>();
  for (const key of handWritten.keys()) {
    const [module, name] = key.split(":");
    const alias = ALIASES[key];
    if (alias) {
      result.set(key, alias);
      continue;
    }
    for (const [ns, modules] of Object.entries(WRAPPER_MODULES)) {
      if (!modules.includes(module) || result.has(key)) continue;
      const node = namespaces.get(ns) &&
        children(namespaces.get(ns)!.node).find((entry) =>
          entry.localName === "class" && entry.getAttribute("name") === name
        );
      if (node) result.set(key, `${ns}.${name}`);
    }
  }
  return result;
}

/** A GIR class and its ancestors, qualified, e.g. `Gtk.Label`, `Gtk.Widget`. */
export function girAncestors(
  namespaces: Map<string, Namespace>,
  qualified: string,
): string[] {
  const chain: string[] = [];
  let current: string | null = qualified;
  while (current && !chain.includes(current)) {
    const [ns, name]: string[] = current.split(".", 2);
    const owner: Namespace | undefined = namespaces.get(ns);
    const node: Element | undefined = owner &&
      children(owner.node).find((entry) =>
        entry.localName === "class" && entry.getAttribute("name") === name
      );
    chain.push(current);
    const parent: string | null | undefined = node?.getAttribute("parent");
    current = parent
      ? (parent.includes(".") ? parent : `${ns}.${parent}`)
      : null;
  }
  return chain;
}

/** The hand-written key of a class's parent. */
function parentKey(handWritten: HandWritten, key: string): string | null {
  const entry = handWritten.get(key)!;
  const parent = entry.parent;
  if (!parent) return null;
  if (handWritten.has(`${entry.module}:${parent}`)) {
    return `${entry.module}:${parent}`;
  }
  return [...handWritten.keys()].find((k) => k.endsWith(`:${parent}`)) ??
    null;
}

/**
 * Generated methods are added to a hand-written class and inherited by its
 * hand-written subclasses, so each of those must really derive from it in
 * GIR. Throws listing the subclasses that don't.
 */
export function checkHierarchy(
  namespaces: Map<string, Namespace>,
  generated: Set<string>,
  handWritten: HandWritten,
): void {
  const gir = girClasses(namespaces, handWritten);
  const problems: string[] = [];
  for (const key of handWritten.keys()) {
    const own = gir.get(key);
    if (!own) continue;
    const ancestors = girAncestors(namespaces, own);
    for (
      let parent = parentKey(handWritten, key);
      parent;
      parent = parentKey(handWritten, parent)
    ) {
      const parentGir = gir.get(parent);
      if (
        parentGir && generated.has(parentGir) && !ancestors.includes(parentGir)
      ) {
        problems.push(
          `${key} (${own}) inherits generated ${parentGir} methods from ${parent}, but isn't a ${parentGir}`,
        );
      }
    }
  }
  if (problems.length) {
    throw new Error(
      "Generated methods would reach classes they don't apply to:\n" +
        problems.join("\n"),
    );
  }
}

function children(node: Element): Element[] {
  return Array.from(node.childNodes)
    .filter((child): child is Element => child.nodeType === 1);
}

function child(node: Element, ...names: string[]): Element | undefined {
  return children(node).find((entry) =>
    entry.namespaceURI === CORE && names.includes(entry.localName ?? "")
  );
}

function params(node: Element): Element[] {
  const list = child(node, "parameters");
  return list
    ? children(list).filter((entry) => entry.localName === "parameter")
    : [];
}

const camel = (name: string) =>
  name.replace(/[_-]([a-z0-9])/g, (_, c: string) => c.toUpperCase());
const pascal = (name: string) => {
  const value = camel(name);
  return value[0].toUpperCase() + value.slice(1);
};

const INTEGERS = new Map([
  ["gint", "i32"],
  ["guint", "u32"],
  ["gint8", "i8"],
  ["guint8", "u8"],
  ["gint16", "i16"],
  ["guint16", "u16"],
  ["gint32", "i32"],
  ["guint32", "u32"],
  ["gfloat", "f32"],
  ["gdouble", "f64"],
  ["gchar", "i8"],
  ["guchar", "u8"],
]);

/** Thrown for GIR shapes the generator doesn't handle; the member is skipped. */
class Unsupported extends Error {}

type Resolved = {
  kind: string;
  namespace: string;
  name: string;
  node: Element;
};

class Generator {
  imports = new Map<string, Set<string>>();
  enums = new Map<string, Resolved>();
  runtime = new Set<string>();
  skipped: string[] = [];

  /** Hand-written class key by the GIR class it wraps. */
  readonly byGir = new Map<string, string>();

  constructor(
    readonly namespaces: Map<string, Namespace>,
    readonly profile: ClassProfile,
    readonly handWritten: HandWritten,
  ) {
    for (const [key, gir] of girClasses(namespaces, handWritten)) {
      if (!this.byGir.has(gir)) this.byGir.set(gir, key);
    }
  }

  resolve(typeName: string, context: string): Resolved | null {
    const [ns, name] = typeName.includes(".")
      ? typeName.split(".", 2)
      : [context, typeName];
    const namespace = this.namespaces.get(ns);
    if (!namespace) return null;
    const node = children(namespace.node).find((entry) =>
      entry.getAttribute("name") === name
    );
    return node ? { kind: node.localName!, namespace: ns, name, node } : null;
  }

  /** The TS class wrapping a GIR class, imported as a type, or GObject. */
  wrapperType(resolved: Resolved): string {
    // The nearest ancestor with a hand-written wrapper.
    for (
      const gir of girAncestors(
        this.namespaces,
        `${resolved.namespace}.${resolved.name}`,
      )
    ) {
      const key = this.byGir.get(gir);
      if (!key) continue;
      const [module, name] = key.split(":");
      this.import(`../${module}`, name);
      return name;
    }
    this.import("../gobject.ts", "GObject");
    return "GObject";
  }

  import(module: string, name: string) {
    const names = this.imports.get(module) ?? new Set();
    names.add(name);
    this.imports.set(module, names);
  }

  /** Map one GIR value (parameter, return or signal argument). */
  value(node: Element, context: string, direction: "in" | "out") {
    if (child(node, "array") || child(node, "varargs")) {
      throw new Unsupported("arrays and varargs");
    }
    const type = child(node, "type");
    const name = type?.getAttribute("name");
    if (!type || !name) throw new Unsupported("missing type");
    const nullable = node.getAttribute("nullable") === "1";
    const transfer = node.getAttribute("transfer-ownership") ?? "none";

    if (name === "none") return { ts: "void", abi: "void" } as const;
    if (name === "gboolean") {
      return {
        ts: "boolean",
        abi: "i32",
        toNative: (v: string) => v,
        fromNative: (v: string) => v,
        fromSignal: (v: string) => `${v} !== 0`,
      };
    }
    const integer = INTEGERS.get(name);
    if (integer) {
      return {
        ts: "number",
        abi: integer,
        toNative: (v: string) => v,
        fromNative: (v: string) => v,
        fromSignal: (v: string) => v,
      };
    }
    if (name === "utf8" || name === "filename") {
      if (direction === "in" && transfer !== "none") {
        throw new Unsupported("string ownership transfer");
      }
      // Non-const char* parameters are typed as pointers in the FFI table.
      const constant = type.getAttributeNS(C, "type")?.startsWith("const ");
      const wrap = (code: string) =>
        constant ? code : `Deno.UnsafePointer.of(${code})`;
      this.runtime.add("cstrOrNull");
      const ts = nullable ? "string | null" : "string";
      return {
        ts,
        abi: "pointer",
        toNative: (v: string) =>
          nullable
            ? constant
              ? `cstrOrNull(${v})`
              : `((s) => s === null ? null : Deno.UnsafePointer.of(cstr(s)))(${v})`
            : wrap(`cstr(${v})`),
        fromNative: (v: string) => {
          if (direction === "out" && transfer === "full") {
            this.runtime.add("takeString");
            return nullable ? `takeString(${v})` : `takeString(${v}) ?? ""`;
          }
          if (transfer !== "none") throw new Unsupported("string ownership");
          return nullable
            ? `((p) => p ? readCStr(p) : null)(${v})`
            : `readCStr(${v})`;
        },
        fromSignal: (v: string) =>
          nullable ? `((p) => p ? readCStr(p) : null)(${v})` : `readCStr(${v})`,
      };
    }
    const resolved = this.resolve(name, context);
    if (!resolved) throw new Unsupported(`unknown type ${name}`);
    if (resolved.kind === "enumeration") {
      const enumName = this.enumName(resolved);
      return {
        ts: enumName,
        abi: "i32",
        toNative: (v: string) => v,
        fromNative: (v: string) => `${v} as ${enumName}`,
        fromSignal: (v: string) => `${v} as ${enumName}`,
      };
    }
    if (resolved.kind === "bitfield") {
      return {
        ts: "number",
        abi: "u32",
        toNative: (v: string) => v,
        fromNative: (v: string) => v,
        fromSignal: (v: string) => v,
      };
    }
    if (resolved.kind === "class" || resolved.kind === "interface") {
      if (resolved.node.getAttributeNS(GLIB, "fundamental") === "1") {
        throw new Unsupported("fundamental type");
      }
      if (direction === "out" && transfer !== "none") {
        throw new Unsupported("returned object ownership");
      }
      if (direction === "in" && transfer !== "none") {
        throw new Unsupported("object ownership transfer");
      }
      const wrapper = this.wrapperType(resolved);
      this.runtime.add("borrowed");
      return {
        ts: nullable ? `${wrapper} | null` : wrapper,
        abi: "pointer",
        toNative: (v: string) => nullable ? `${v}?.ptr ?? null` : `${v}.ptr`,
        fromNative: (v: string) =>
          nullable
            ? `borrowed<${wrapper}>(${v})`
            : `borrowed<${wrapper}>(${v})!`,
        fromSignal: (v: string) =>
          nullable
            ? `borrowed<${wrapper}>(${v})`
            : `borrowed<${wrapper}>(${v})!`,
      };
    }
    throw new Unsupported(`${resolved.kind} ${name}`);
  }

  enumName(resolved: Resolved): string {
    const name = resolved.namespace === this.profile.namespace
      ? resolved.name
      : resolved.namespace + resolved.name;
    this.enums.set(name, resolved);
    return name;
  }

  doc(node: Element): string[] {
    const text = child(node, "doc")?.textContent?.trim();
    if (!text) return [];
    const paragraph = text.split(/\n\s*\n/)[0]
      .replace(
        /\[(?:method|func|ctor)@[\w.]+\.(\w+)\]/g,
        (_, m: string) => "`" + camel(m) + "()`",
      )
      .replace(
        /\[(?:class|iface|struct|enum|flags)@(?:\w+\.)?([\w]+)\]/g,
        "`$1`",
      )
      .replace(/\[(?:property|signal)@[\w.]+:{1,2}([\w-]+)\]/g, "`$1`")
      .replace(/%TRUE/g, "`true`").replace(/%FALSE/g, "`false`")
      .replace(/%NULL|`NULL`/g, "`null`")
      .replace(/@(\w+)/g, (_, p: string) => "`" + camel(p) + "`")
      .replace(/\*\//g, "* /");
    return paragraph.split("\n").map((line) => line.trimEnd());
  }

  /** One generated method, or null when its shape isn't supported. */
  method(node: Element, owner: string) {
    const symbol = node.getAttributeNS(C, "identifier")!;
    if (
      node.getAttribute("introspectable") === "0" ||
      node.getAttribute("deprecated") === "1" ||
      node.hasAttribute("shadowed-by") || node.hasAttribute("moved-to")
    ) return null;
    if (node.getAttribute("throws") === "1") {
      throw new Unsupported("GError");
    }
    const args = params(node);
    const consumed = new Set<number>();
    const tsParams: string[] = [];
    const prelude: string[] = [];
    const nativeArgs: string[] = ["this.ptr"];
    for (const [index, arg] of args.entries()) {
      if (consumed.has(index)) {
        nativeArgs.push(`__${index}`);
        continue;
      }
      if (
        arg.getAttribute("direction") && arg.getAttribute("direction") !== "in"
      ) {
        throw new Unsupported("out parameter");
      }
      const name = camel(arg.getAttribute("name")!);
      const typeName = child(arg, "type")?.getAttribute("name") ?? "";
      const resolved = typeName
        ? this.resolve(typeName, this.profile.namespace)
        : null;
      if (resolved?.kind === "callback") {
        const callback = this.callback(arg, resolved, args, index, consumed);
        tsParams.push(`${name}: ${callback.ts}`);
        prelude.push(...callback.prelude(name));
        nativeArgs.push(`__${index}`);
        continue;
      }
      if (typeName === "gpointer") throw new Unsupported("raw pointer");
      const value = this.value(arg, this.profile.namespace, "in");
      if (!("toNative" in value)) throw new Unsupported("void parameter");
      tsParams.push(`${name}: ${value.ts}`);
      nativeArgs.push(value.toNative!(name));
    }
    // Callback arguments filled in by the prelude.
    // Symbols newer than the library's minimum version may be missing.
    const version = node.getAttribute("version") ??
      (node.parentNode as Element).getAttribute("version");
    if (version) this.runtime.add("missing");
    const fn = version
      ? `(${this.profile.library}.symbols.${symbol} ?? missing("${symbol}", "${version}"))`
      : `${this.profile.library}.symbols.${symbol}`;
    const call = `${fn}(${nativeArgs.join(", ")})`;
    const returned = this.value(
      child(node, "return-value")!,
      this.profile.namespace,
      "out",
    );
    const body = returned.ts === "void"
      ? [...prelude, `${call};`]
      : [...prelude, `return ${returned.fromNative!(call)};`];
    const name = camel(node.getAttribute("name")!);
    return {
      name,
      doc: this.doc(node),
      signature: `${name}(${tsParams.join(", ")}): ${returned.ts}`,
      body,
      owner,
    };
  }

  /** A callback parameter; marks its user data and destroy notify consumed. */
  callback(
    arg: Element,
    resolved: Resolved,
    _args: Element[],
    index: number,
    consumed: Set<number>,
  ) {
    const scope = arg.getAttribute("scope");
    const closure = arg.getAttribute("closure");
    const destroy = arg.getAttribute("destroy");
    if (scope !== "notified" && scope !== "call") {
      throw new Unsupported(`callback scope ${scope}`);
    }
    if (closure === null) throw new Unsupported("callback without user data");
    if (scope === "notified" && destroy === null) {
      throw new Unsupported("notified callback without destroy");
    }
    consumed.add(Number(closure));
    if (destroy !== null) consumed.add(Number(destroy));
    const nullable = arg.getAttribute("nullable") === "1";

    const cbArgs = params(resolved.node);
    const jsArgs: string[] = [];
    const abi: string[] = [];
    const conversions: string[] = [];
    for (const [i, cbArg] of cbArgs.entries()) {
      if (cbArg.hasAttribute("closure")) {
        abi.push("pointer");
        conversions.push("");
        continue;
      }
      if (child(cbArg, "type")?.getAttribute("name") === "gpointer") {
        abi.push("pointer");
        conversions.push("");
        continue;
      }
      const value = this.value(cbArg, resolved.namespace, "out");
      if (!("fromSignal" in value)) throw new Unsupported("callback argument");
      const name = camel(cbArg.getAttribute("name")!);
      jsArgs.push(`${name}: ${value.ts}`);
      abi.push(value.abi);
      conversions.push(value.fromSignal!(`a${i}`));
    }
    const result = this.value(
      child(resolved.node, "return-value")!,
      resolved.namespace,
      "in",
    );
    const resultTs = result.ts;
    const resultAbi = result.abi;
    const toResult = resultTs === "void"
      ? (v: string) => `${v};`
      : resultTs === "boolean"
      ? (v: string) => `return ${v} ? 1 : 0;`
      : resultTs === "number"
      ? (v: string) =>
        `{ const r = ${v}; return Number.isFinite(r) ? Math.trunc(r) : 0; }`
      : (() => {
        throw new Unsupported("callback result");
      })();
    const ts = `(${jsArgs.join(", ")}) => ${resultTs}`;
    const definition = `{ parameters: ${
      JSON.stringify(abi)
    }, result: "${resultAbi}" } as const`;
    const used = conversions.filter(Boolean);
    const signature = cbArgs.map((_, i) => `a${i}`).join(", ");
    const closureIndex = Number(closure);
    const destroyIndex = destroy === null ? null : Number(destroy);
    return {
      ts: nullable ? `(${ts}) | null` : ts,
      prelude: (name: string) => {
        const lines = [
          `let __${index}: Deno.PointerObject | null = null;`,
          `let __${closureIndex}: Deno.PointerObject | null = null;`,
        ];
        if (destroyIndex !== null) {
          lines.push(
            `let __${destroyIndex}: Deno.PointerObject | null = null;`,
          );
        }
        lines.push(
          `${nullable ? `if (${name}) ` : ""}{`,
          `  const cb = new Deno.UnsafeCallback(${definition}, (${signature}) => {`,
          `    ${toResult(`${name}(${used.join(", ")})`)}`,
          `  });`,
        );
        if (scope === "notified") {
          this.runtime.add("notifiedCallback");
          lines.push(
            `  [__${index}, __${closureIndex}, __${destroyIndex}] = notifiedCallback(cb);`,
          );
        } else {
          lines.push(
            `  __${index} = cb.pointer;`,
            `  queueMicrotask(() => cb.close());`,
          );
        }
        lines.push(`}`);
        return lines;
      },
    };
  }

  signal(node: Element, owner: string) {
    if (node.getAttribute("deprecated") === "1") return null;
    const returned = child(child(node, "return-value")!, "type")
      ?.getAttribute("name");
    if (returned !== "none") throw new Unsupported("signal with a result");
    const tsArgs: string[] = [];
    const abi = ["pointer"];
    const conversions: string[] = [];
    for (const [i, arg] of params(node).entries()) {
      const value = this.value(arg, this.profile.namespace, "out");
      if (!("fromSignal" in value)) throw new Unsupported("signal argument");
      const name = camel(arg.getAttribute("name")!);
      tsArgs.push(`${name}: ${value.ts}`);
      abi.push(value.abi);
      conversions.push(value.fromSignal!(`a${i}`));
    }
    abi.push("pointer");
    this.runtime.add("connectSignal");
    const signal = node.getAttribute("name")!;
    const name = "on" + pascal(signal);
    const args = conversions.map((_, i) => `a${i}`);
    const typedArgs = args.map((a) => `${a}: never`);
    return {
      name,
      doc: this.doc(node),
      signature: `${name}(callback: (${tsArgs.join(", ")}) => void): number`,
      body: [
        `return connectSignal(this, ${JSON.stringify(signal)}, { parameters: ${
          JSON.stringify(abi)
        }, result: "void" }, (${typedArgs.join(", ")}) => callback(${
          conversions.join(", ")
        }));`,
      ],
      owner,
    };
  }

  /** Every method name a hand-written class and its ancestors define. */
  handWrittenNames(className: string): Set<string> {
    const names = new Set<string>();
    let key = this.byGir.get(`${this.profile.namespace}.${className}`) ?? null;
    if (!key) {
      throw new Error(
        `${this.profile.namespace}.${className}: no hand-written class to add generated methods to`,
      );
    }
    const seen = new Set<string>();
    while (key && !seen.has(key)) {
      seen.add(key);
      for (const method of this.handWritten.get(key)!.methods) {
        names.add(method);
      }
      key = parentKey(this.handWritten, key);
    }
    return names;
  }
}

/** Find a class in a namespace. */
function classNode(namespace: Namespace, name: string): Element {
  const node = children(namespace.node).find((entry) =>
    entry.localName === "class" && entry.getAttribute("name") === name
  );
  if (!node) throw new Error(`${namespace.name}.${name}: no such class in GIR`);
  return node;
}

/** C symbols of the methods the generator would emit for a class. */
export function classSymbols(
  namespaces: Map<string, Namespace>,
  profile: ClassProfile,
): string[] {
  const namespace = namespaces.get(profile.namespace)!;
  const symbols: string[] = [];
  for (const [name, config] of Object.entries(profile.classes)) {
    const node = classNode(namespace, name);
    for (const method of children(node)) {
      if (method.localName !== "method") continue;
      if (config.skip?.[method.getAttribute("name")!]) continue;
      const generator = new Generator(namespaces, profile, new Map());
      try {
        if (generator.method(method, name)) {
          symbols.push(method.getAttributeNS(C, "identifier")!);
        }
      } catch (error) {
        if (!(error instanceof Unsupported)) throw error;
      }
    }
  }
  return symbols;
}

/** Elements the snapshot must keep so the classes generate the same way. */
export function classMembers(
  namespaces: Map<string, Namespace>,
  profile: ClassProfile,
): { members: Element[]; types: Set<string> } {
  const namespace = namespaces.get(profile.namespace)!;
  const members: Element[] = [];
  const types = new Set<string>();
  const addType = (name: string | null, context: string) => {
    if (!name) return;
    const qualified = name.includes(".") ? name : `${context}.${name}`;
    if (types.has(qualified)) return;
    types.add(qualified);
    const [ns, local] = qualified.split(".", 2);
    const owner = namespaces.get(ns);
    const node = owner &&
      children(owner.node).find((entry) =>
        entry.getAttribute("name") === local
      );
    if (node?.localName === "callback") {
      for (const arg of params(node)) {
        addType(child(arg, "type")?.getAttribute("name") ?? null, ns);
      }
    }
  };
  for (const name of Object.keys(profile.classes)) {
    const node = classNode(namespace, name);
    types.add(`${profile.namespace}.${name}`);
    for (const member of children(node)) {
      const isSignal = member.namespaceURI === GLIB &&
        member.localName === "signal";
      if (member.localName !== "method" && !isSignal) continue;
      members.push(member);
      for (const arg of [...params(member), child(member, "return-value")]) {
        if (arg) {
          addType(
            child(arg, "type")?.getAttribute("name") ?? null,
            profile.namespace,
          );
        }
      }
    }
  }
  return { members, types };
}

/** Generate the module of methods and signal helpers for a profile. */
export function generateClasses(
  namespaces: Map<string, Namespace>,
  profile: ClassProfile,
  handWritten: HandWritten,
): string {
  const generator = new Generator(namespaces, profile, handWritten);
  const namespace = namespaces.get(profile.namespace)!;
  const blocks: string[] = [];
  for (const [className, config] of Object.entries(profile.classes)) {
    const node = classNode(namespace, className);
    const taken = generator.handWrittenNames(className);
    // Names GIR ancestors already use: a subclass method with the same name
    // and another signature can't be typed, so it is left out.
    const inherited = new Map<string, string>();
    for (
      const ancestor of girAncestors(
        namespaces,
        `${profile.namespace}.${className}`,
      ).slice(1)
    ) {
      const [ns, name] = ancestor.split(".", 2);
      const owner = namespaces.get(ns);
      const ancestorNode = owner &&
        children(owner.node).find((entry) =>
          entry.localName === "class" && entry.getAttribute("name") === name
        );
      for (const entry of ancestorNode ? children(ancestorNode) : []) {
        const memberName = entry.getAttribute("name");
        if (!memberName) continue;
        if (entry.localName === "method") {
          inherited.set(camel(memberName), `${ancestor}.${memberName}`);
        } else if (entry.localName === "signal") {
          inherited.set(
            "on" + pascal(memberName),
            `${ancestor}::${memberName}`,
          );
        }
      }
    }
    const members = [];
    for (const member of children(node)) {
      const isSignal = member.namespaceURI === GLIB &&
        member.localName === "signal";
      if (member.localName !== "method" && !isSignal) continue;
      const girName = member.getAttribute("name")!;
      if (config.skip?.[girName]) continue;
      try {
        const generated = isSignal
          ? generator.signal(member, className)
          : generator.method(member, className);
        if (!generated || taken.has(generated.name)) continue;
        const shadowed = inherited.get(generated.name);
        if (shadowed) {
          generator.skipped.push(
            `${className}.${girName}: same name as ${shadowed}`,
          );
          continue;
        }
        members.push(generated);
      } catch (error) {
        if (!(error instanceof Unsupported)) throw error;
        generator.skipped.push(`${className}.${girName}: ${error.message}`);
      }
    }
    const typeName = node.getAttributeNS(GLIB, "type-name");
    const lower = className[0].toLowerCase() + className.slice(1);
    const lines = [
      "",
      `/** Methods generated for \`${typeName}\`. */`,
      `export interface ${className}Methods {`,
    ];
    for (const member of members) {
      if (member.doc.length) {
        lines.push(
          "  /**",
          ...member.doc.map((l) => `   * ${l}`.trimEnd()),
          "   */",
        );
      }
      lines.push(`  ${member.signature};`);
    }
    lines.push(
      "}",
      "",
      `/** Implementations of {@linkcode ${className}Methods}. */`,
      `export const ${lower}Methods: ${className}Methods & ThisType<GObject> = {`,
    );
    for (const member of members) {
      lines.push(`  ${
        member.signature.replace(/^(\w+)\(/, "$1(this: GObject, ")
          .replace(", )", ")")
      } {`);
      lines.push(...member.body.map((l) => `    ${l}`), "  },");
    }
    lines.push("};");
    blocks.push(...lines);
  }

  const enumBlocks: string[] = [];
  for (const [name, resolved] of [...generator.enums].sort()) {
    const members = children(resolved.node).filter((entry) =>
      entry.localName === "member"
    );
    enumBlocks.push(
      "",
      ...(generator.doc(resolved.node).length
        ? [
          "/**",
          ...generator.doc(resolved.node).map((l) => ` * ${l}`.trimEnd()),
          " */",
        ]
        : []),
      `export const ${name} = {`,
      ...members.map((member) =>
        `  ${
          ((key) => /^[A-Za-z_$]/.test(key) ? key : JSON.stringify(key))(
            member.getAttribute("name")!.toUpperCase(),
          )
        }: ${member.getAttribute("value")},`
      ),
      "} as const;",
      `export type ${name} = (typeof ${name})[keyof typeof ${name}];`,
    );
  }

  generator.import("../gobject.ts", "GObject");
  const header = [
    "// Generated by tools/generate_gir.ts from the pinned GIR snapshots.",
    "// Edit the `classes` section of tools/gir/bindings.json to change it.",
    "// deno-lint-ignore-file",
    "",
    `import { ${profile.library} } from "${profile.libraryModule}";`,
    `import { cstr, readCStr } from "../../low/utils.ts";`,
  ];
  if (generator.runtime.size) {
    header.push(
      `import { ${
        [...generator.runtime].sort().join(", ")
      } } from "../wrappers.ts";`,
    );
  }
  for (const [module, names] of [...generator.imports].sort()) {
    header.push(
      `import type { ${[...names].sort().join(", ")} } from "${module}";`,
    );
  }
  const skippedNote = generator.skipped.length
    ? [
      "",
      "// Not generated (unsupported shapes):",
      ...generator.skipped.sort().map((s) => `// - ${s}`),
    ]
    : [];
  return [...header, ...enumBlocks, ...blocks, ...skippedNote, ""].join("\n");
}
