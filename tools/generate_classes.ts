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
  /**
   * Generate only these interfaces' methods: for a hand-written class whose
   * hand-written subclasses aren't GIR subclasses but do implement these
   * interfaces (Entry and SearchEntry both implement Editable).
   */
  interfacesOnly?: string[];
  /**
   * Interfaces from other namespaces whose methods the class gets, qualified
   * (`Gdk.Paintable` for `Gtk.WidgetPaintable`). Same-namespace interfaces
   * are always included.
   */
  interfaces?: string[];
};

export type ClassProfile = {
  /**
   * GIR namespace of the classes, e.g. `Gtk`. A class from another namespace
   * the same library provides is listed qualified, e.g. `Gsk.Renderer`.
   */
  namespace: string;
  /** Name of the low-level library export, e.g. `gtk4`. */
  library: string;
  /** Low-level module, relative to `src/high/generated`. */
  libraryModule: string;
  classes: Record<string, ClassConfig>;
  /** Symbols the library lists explicitly; set by the GIR tool. */
  listed?: Set<string>;
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
  Gsk: ["gtk4.ts"],
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
          isWrappable(entry) && entry.getAttribute("name") === name
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
        isType(entry) && entry.getAttribute("name") === name
      );
    chain.push(current);
    const parent: string | null | undefined = node?.getAttribute("parent");
    current = parent
      ? (parent.includes(".") ? parent : `${ns}.${parent}`)
      : null;
  }
  return chain;
}

/** The `implements` elements of a type and its GIR ancestors. */
export function implementsOf(
  namespaces: Map<string, Namespace>,
  qualified: string,
): Element[] {
  const found: Element[] = [];
  for (const ancestor of girAncestors(namespaces, qualified)) {
    const [ns, name] = ancestor.split(".", 2);
    const owner = namespaces.get(ns);
    const node = owner &&
      children(owner.node).find((e) =>
        isType(e) && e.getAttribute("name") === name
      );
    for (const entry of node ? children(node) : []) {
      if (entry.localName === "implements") found.push(entry);
    }
  }
  return found;
}

/** A type's GIR ancestors and the interfaces they implement, qualified. */
function lineage(
  namespaces: Map<string, Namespace>,
  qualified: string,
): string[] {
  const result = girAncestors(namespaces, qualified);
  for (const entry of implementsOf(namespaces, qualified)) {
    const iface = entry.getAttribute("name")!;
    const ns = entry.parentNode
      ? ((entry.parentNode as Element).parentNode as Element).getAttribute(
        "name",
      )
      : null;
    result.push(iface.includes(".") ? iface : `${ns}.${iface}`);
  }
  return result;
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

/** Whether a hand-written class derives from `Refcounted`. */
function extendsRefcounted(handWritten: HandWritten, key: string): boolean {
  for (
    let current: string | null = key;
    current;
    current = parentKey(handWritten, current)
  ) {
    if (handWritten.get(current)?.parent === "Refcounted") return true;
  }
  return false;
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
  /** Interface-only classes: GIR class -> interfaces whose methods it gets. */
  interfaceOnly: Map<string, string[]> = new Map(),
): void {
  const gir = girClasses(namespaces, handWritten);
  const problems: string[] = [];
  for (const key of handWritten.keys()) {
    const own = gir.get(key);
    if (!own) continue;
    const ancestors = lineage(namespaces, own);
    for (
      let parent = parentKey(handWritten, key);
      parent;
      parent = parentKey(handWritten, parent)
    ) {
      const parentGir = gir.get(parent);
      for (const iface of parentGir ? interfaceOnly.get(parentGir) ?? [] : []) {
        if (!ancestors.includes(iface)) {
          problems.push(
            `${key} (${own}) inherits generated ${iface} methods from ${parent}, but doesn't implement ${iface}`,
          );
        }
      }
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

/** GIR classes and interfaces: the types wrappers can stand for. */
function isType(node: Element): boolean {
  return node.localName === "class" || node.localName === "interface";
}

/** Types a hand-written class can wrap: also boxed records (`Gsk.Transform`). */
function isWrappable(node: Element): boolean {
  return isType(node) || node.localName === "record";
}

/** The namespace and local name of a `classes` key: `Gsk.Renderer` or `Label`. */
export function classRef(
  profile: ClassProfile,
  key: string,
): { ns: string; name: string } {
  const [ns, name] = key.includes(".")
    ? key.split(".", 2)
    : [profile.namespace, key];
  return { ns, name };
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

  /**
   * Namespace that unqualified type names resolve in: the namespace of the
   * class or interface whose member is being generated.
   */
  context: string;

  constructor(
    readonly namespaces: Map<string, Namespace>,
    readonly profile: ClassProfile,
    readonly handWritten: HandWritten,
  ) {
    this.context = profile.namespace;
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

  /**
   * The hand-written `Refcounted` wrapper of a ref-counted type that isn't a
   * GObject (a fundamental class or a boxed record), with the GType name its
   * generated methods register it under; null when it has none.
   */
  countedWrapper(
    resolved: Resolved,
  ): { name: string; typeName: string } | null {
    for (
      const gir of girAncestors(
        this.namespaces,
        `${resolved.namespace}.${resolved.name}`,
      )
    ) {
      const key = this.byGir.get(gir);
      if (!key) continue;
      if (!extendsRefcounted(this.handWritten, key)) return null;
      const [ns, local] = gir.split(".", 2);
      const node = children(this.namespaces.get(ns)!.node).find((e) =>
        isWrappable(e) && e.getAttribute("name") === local
      )!;
      const [module, name] = key.split(":");
      this.import(`../${module}`, name);
      return { name, typeName: node.getAttributeNS(GLIB, "type-name")! };
    }
    return null;
  }

  /** The `Refcounted` wrapper of a listed class, or null for a GObject one. */
  countedClass(qualified: string): string | null {
    const [ns, name] = qualified.split(".", 2);
    const node = children(this.namespaces.get(ns)!.node).find((e) =>
      isWrappable(e) && e.getAttribute("name") === name
    );
    if (!node) return null;
    return this.countedWrapper({
      kind: node.localName!,
      namespace: ns,
      name,
      node,
    })
      ?.name ?? null;
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
    const counted = (resolved.kind === "class" || resolved.kind === "record") &&
      this.countedWrapper(resolved);
    if (counted) {
      // Ref-counted non-GObjects: the wrapper owns one reference.
      if (transfer === "container") {
        throw new Unsupported("container ownership");
      }
      this.runtime.add("takeCounted");
      this.runtime.add("borrowedCounted");
      const { name: wrapper, typeName } = counted;
      const wrap = (fn: string, v: string) =>
        nullable
          ? `${fn}<${wrapper}>("${typeName}", ${v})`
          : `${fn}<${wrapper}>("${typeName}", ${v})!`;
      return {
        ts: nullable ? `${wrapper} | null` : wrapper,
        abi: "pointer",
        // A callee taking ownership gets a reference of its own.
        toNative: (v: string) =>
          transfer === "full"
            ? nullable ? `${v}?.newRef() ?? null` : `${v}.newRef()`
            : nullable
            ? `${v}?.ptr ?? null`
            : `${v}.ptr`,
        fromNative: (v: string) =>
          wrap(
            direction === "out" && transfer === "full"
              ? "takeCounted"
              : "borrowedCounted",
            v,
          ),
        fromSignal: (v: string) => wrap("borrowedCounted", v),
      };
    }
    if (resolved.kind === "class" || resolved.kind === "interface") {
      if (resolved.node.getAttributeNS(GLIB, "fundamental") === "1") {
        throw new Unsupported("fundamental type");
      }
      if (direction === "out" && transfer === "container") {
        throw new Unsupported("returned object ownership");
      }
      const take = direction === "out" && transfer === "full";
      if (direction === "in" && transfer !== "none") {
        throw new Unsupported("object ownership transfer");
      }
      const wrapper = this.wrapperType(resolved);
      this.runtime.add("borrowed");
      return {
        ts: nullable ? `${wrapper} | null` : wrapper,
        abi: "pointer",
        toNative: (v: string) => nullable ? `${v}?.ptr ?? null` : `${v}.ptr`,
        fromNative: (v: string) => {
          const wrap = take ? "owned" : "borrowed";
          this.runtime.add(wrap);
          return nullable
            ? `${wrap}<${wrapper}>(${v})`
            : `${wrap}<${wrapper}>(${v})!`;
        },
        fromSignal: (v: string) =>
          nullable
            ? `borrowed<${wrapper}>(${v})`
            : `borrowed<${wrapper}>(${v})!`,
      };
    }
    if (resolved.kind === "record" || resolved.kind === "union") {
      // Structs pass through as opaque pointers.
      if (transfer !== "none") throw new Unsupported("struct ownership");
      return {
        ts: "Deno.PointerValue",
        abi: "pointer",
        toNative: (v: string) => v,
        fromNative: (v: string) => v,
        fromSignal: (v: string) => v,
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
    if (
      node.getAttribute("introspectable") === "0" ||
      node.getAttribute("deprecated") === "1" ||
      node.hasAttribute("shadowed-by") || node.hasAttribute("moved-to")
    ) return null;
    const owner_ = node.parentNode as Element;
    // Finish functions are called by the async methods that need them.
    if (finishedBy(owner_, node.getAttribute("name")!)) return null;
    const finishName = node.getAttributeNS(GLIB, "finish-func");
    const finish = finishName
      ? children(owner_).find((m) =>
        m.localName === "method" && m.getAttribute("name") === finishName
      )
      : undefined;
    if (finishName && !finish) throw new Unsupported("missing finish function");
    const throws = node.getAttribute("throws") === "1";
    const args = params(node);
    const consumed = new Set<number>();
    const nulls = new Set<number>();
    const tsParams: string[] = [];
    const prelude: string[] = [];
    // A ref-counted wrapper's own references are managed by `Refcounted`.
    const counted = this.countedType !== null;
    const methodName = node.getAttribute("name")!;
    if (counted && ["ref", "unref", "free", "copy"].includes(methodName)) {
      return null;
    }
    const instance = child(
      child(node, "parameters") ?? node,
      "instance-parameter",
    );
    const takesInstance =
      instance?.getAttribute("transfer-ownership") === "full";
    // A method that consumes its instance is given a reference of its own,
    // so the wrapper, which keeps its reference, stays valid (GskTransform's
    // methods return a new transform and take the old one).
    if (takesInstance && !counted) this.runtime.add("newObjectRef");
    const nativeArgs: string[] = [
      !takesInstance
        ? "this.ptr"
        : counted
        ? "this.newRef()"
        : "newObjectRef(this.ptr)",
    ];
    for (const [index, arg] of args.entries()) {
      if (nulls.has(index)) {
        nativeArgs.push("null");
        continue;
      }
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
      const resolved = typeName ? this.resolve(typeName, this.context) : null;
      if (
        resolved?.kind === "callback" && finish &&
        arg.getAttribute("scope") === "async"
      ) {
        // The GAsyncReadyCallback; asyncCall() provides it.
        const closure = arg.getAttribute("closure");
        if (closure !== null) nulls.add(Number(closure));
        nativeArgs.push("__callback");
        continue;
      }
      if (resolved?.kind === "callback") {
        const callback = this.callback(arg, resolved, args, index, consumed);
        tsParams.push(`${name}: ${callback.ts}`);
        prelude.push(...callback.prelude(name));
        nativeArgs.push(`__${index}`);
        continue;
      }
      if (typeName === "gpointer") throw new Unsupported("raw pointer");
      const value = this.value(arg, this.context, "in");
      if (!("toNative" in value)) throw new Unsupported("void parameter");
      tsParams.push(`${name}: ${value.ts}`);
      nativeArgs.push(value.toNative!(name));
    }
    // Callback arguments filled in by the prelude.
    // Symbols only generated methods use are optional in the FFI table:
    // newer than the library's minimum version, or missing on a platform.
    const fn = this.symbol(node);
    const name = camel(node.getAttribute("name")!);
    if (throws) {
      this.runtime.add("ErrorSlot");
      nativeArgs.push("__error.pointer");
    }
    const call = `${fn}(${nativeArgs.join(", ")})`;

    if (finish) {
      // Resolve with what the finish function returns.
      const finishSymbol = finish.getAttributeNS(C, "identifier")!;
      const finishArgs = params(finish);
      if (
        finishArgs.length !== 1 ||
        child(finishArgs[0], "type")?.getAttribute("name") !==
              "Gio.AsyncResult" &&
          child(finishArgs[0], "type")?.getAttribute("name") !== "AsyncResult"
      ) {
        throw new Unsupported("finish function with out parameters");
      }
      const result = this.value(
        child(finish, "return-value")!,
        this.context,
        "out",
      );
      const finishFn = this.symbol(finish);
      const finishCall = `${finishFn}(this.ptr, __result${
        finish.getAttribute("throws") === "1" ? ", __error.pointer" : ""
      })`;
      this.runtime.add("asyncCall");
      this.used.add(finishSymbol);
      const resolveWith = result.ts === "void"
        ? `${finishCall}`
        : result.fromNative!(finishCall);
      const body = [
        ...prelude,
        ...(throws ? ["const __error = new ErrorSlot();"] : []),
        `return asyncCall((__callback) => {`,
        `  ${call};`,
        ...(throws ? ["  __error.check();"] : []),
        `}, (__result, __error) => ${resolveWith});`,
      ];
      return {
        name,
        doc: this.doc(node),
        signature: `${name}(${tsParams.join(", ")}): Promise<${result.ts}>`,
        body,
        owner,
      };
    }

    const returned = this.value(
      child(node, "return-value")!,
      this.context,
      "out",
    );
    let body: string[];
    if (throws) {
      body = [
        ...prelude,
        "const __error = new ErrorSlot();",
        returned.ts === "void" ? `${call};` : `const __value = ${call};`,
        "__error.check();",
        ...(returned.ts === "void"
          ? []
          : [`return ${returned.fromNative!("__value")};`]),
      ];
    } else {
      body = returned.ts === "void"
        ? [...prelude, `${call};`]
        : [...prelude, `return ${returned.fromNative!(call)};`];
    }
    return {
      name,
      doc: this.doc(node),
      signature: `${name}(${tsParams.join(", ")}): ${returned.ts}`,
      body,
      owner,
    };
  }

  /** Symbols of finish functions generated async methods call. */
  used = new Set<string>();

  /**
   * The `Refcounted` wrapper of the class being generated, or null for a
   * GObject class. Its methods take `this` as that wrapper.
   */
  countedType: string | null = null;

  /** A symbol reference, guarded when it may be missing. */
  symbol(node: Element): string {
    const symbol = node.getAttributeNS(C, "identifier")!;
    const version = node.getAttribute("version") ??
      (node.parentNode as Element).getAttribute("version");
    const optional = !this.profile.listed?.has(symbol);
    if (!optional && !version) {
      return `${this.profile.library}.symbols.${symbol}`;
    }
    this.runtime.add("missing");
    return `(${this.profile.library}.symbols.${symbol} ?? missing("${symbol}"${
      version ? `, "${version}"` : ""
    }))`;
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
    const returnType = child(child(node, "return-value")!, "type")
      ?.getAttribute("name");
    const result = returnType === "none"
      ? { ts: "void", abi: "void", wrap: (v: string) => v }
      : returnType === "gboolean"
      ? { ts: "boolean", abi: "i32", wrap: (v: string) => `(${v}) ? 1 : 0` }
      : INTEGERS.has(returnType ?? "")
      ? {
        ts: "number",
        abi: INTEGERS.get(returnType!)!,
        wrap: (v: string) => v,
      }
      : (() => {
        throw new Unsupported("signal with a result");
      })();
    const tsArgs: string[] = [];
    const abi = ["pointer"];
    const conversions: string[] = [];
    for (const [i, arg] of params(node).entries()) {
      const value = this.value(arg, this.context, "out");
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
      signature: `${name}(callback: (${
        tsArgs.join(", ")
      }) => ${result.ts}): number`,
      body: [
        `return connectSignal(this, ${JSON.stringify(signal)}, { parameters: ${
          JSON.stringify(abi)
        }, result: "${result.abi}" }, (${typedArgs.join(", ")}) => ${
          result.wrap(`callback(${conversions.join(", ")})`)
        });`,
      ],
      owner,
    };
  }

  /** Every method name a hand-written class and its ancestors define. */
  handWrittenNames(qualified: string): Set<string> {
    const names = new Set<string>();
    let key = this.byGir.get(qualified) ?? null;
    if (!key) {
      throw new Error(
        `${qualified}: no hand-written class to add generated methods to`,
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

/** Whether a method is another method's finish function. */
function finishedBy(owner: Element, name: string): boolean {
  return children(owner).some((m) =>
    m.localName === "method" && m.getAttributeNS(GLIB, "finish-func") === name
  );
}

/**
 * The members generated for a class: its own methods and signals (unless
 * `interfacesOnly`), then those of the same-namespace interfaces it
 * implements that no GIR ancestor already implements, and of the
 * other-namespace interfaces its config lists. `ownerNs` is the namespace
 * the member's types resolve in.
 */
function membersOf(
  namespaces: Map<string, Namespace>,
  ns: string,
  name: string,
  config: ClassConfig,
): { member: Element; owner: string; ownerNs: string }[] {
  const namespace = namespaces.get(ns);
  if (!namespace) {
    throw new Error(`${ns}.${name}: namespace ${ns} isn't an input`);
  }
  const node = classNode(namespace, name);
  const isMember = (m: Element) =>
    m.localName === "method" ||
    m.namespaceURI === GLIB && m.localName === "signal";
  const only = config.interfacesOnly;
  const result = only ? [] : children(node).filter(isMember).map((member) => ({
    member,
    owner: name,
    ownerNs: ns,
  }));
  const inherited = new Set<string>();
  for (
    const ancestor of girAncestors(namespaces, `${namespace.name}.${name}`)
      .slice(1)
  ) {
    const [ancestorNs, local] = ancestor.split(".", 2);
    const owner = namespaces.get(ancestorNs);
    const ancestorNode = owner &&
      children(owner.node).find((e) =>
        isType(e) && e.getAttribute("name") === local
      );
    for (const entry of ancestorNode ? children(ancestorNode) : []) {
      if (entry.localName === "implements") {
        const iface = entry.getAttribute("name")!;
        inherited.add(iface.includes(".") ? iface : `${ancestorNs}.${iface}`);
      }
    }
  }
  for (const entry of children(node)) {
    const listed = entry.getAttribute("name");
    if (entry.localName !== "implements" || !listed) continue;
    const qualified = listed.includes(".") ? listed : `${ns}.${listed}`;
    const [ifaceNs, iface] = qualified.split(".", 2);
    const wanted = ifaceNs === ns || config.interfaces?.includes(qualified);
    if (
      !wanted || inherited.has(qualified) ||
      only && !only.includes(iface)
    ) continue;
    const ifaceNode = namespaces.get(ifaceNs) &&
      children(namespaces.get(ifaceNs)!.node).find((e) =>
        e.localName === "interface" && e.getAttribute("name") === iface
      );
    if (!ifaceNode) continue;
    for (const member of children(ifaceNode).filter(isMember)) {
      result.push({
        member,
        owner: ifaceNs === ns ? iface : qualified,
        ownerNs: ifaceNs,
      });
    }
  }
  for (const wanted of config.interfaces ?? []) {
    if (!result.some((m) => m.owner === wanted)) {
      throw new Error(`${ns}.${name} doesn't implement ${wanted}`);
    }
  }
  return result;
}

/** Find a class, interface or boxed record in a namespace. */
function classNode(namespace: Namespace, name: string): Element {
  const node = children(namespace.node).find((entry) =>
    isWrappable(entry) && entry.getAttribute("name") === name
  );
  if (!node) throw new Error(`${namespace.name}.${name}: no such class in GIR`);
  return node;
}

/** C symbols of the methods the generator would emit for a class. */
export function classSymbols(
  namespaces: Map<string, Namespace>,
  profile: ClassProfile,
  handWritten: HandWritten = new Map(),
): string[] {
  const symbols: string[] = [];
  for (const [key, config] of Object.entries(profile.classes)) {
    const { ns, name } = classRef(profile, key);
    for (
      const { member, owner, ownerNs } of membersOf(
        namespaces,
        ns,
        name,
        config,
      )
    ) {
      if (member.localName !== "method") continue;
      if (config.skip?.[member.getAttribute("name")!]) continue;
      const generator = new Generator(namespaces, profile, handWritten);
      generator.countedType = generator.countedClass(`${ns}.${name}`);
      generator.context = ownerNs;
      try {
        if (generator.method(member, owner)) {
          symbols.push(member.getAttributeNS(C, "identifier")!);
          symbols.push(...generator.used);
        }
      } catch (error) {
        if (!(error instanceof Unsupported)) throw error;
      }
    }
  }
  return [...new Set(symbols)];
}

/** Elements the snapshot must keep so the classes generate the same way. */
export function classMembers(
  namespaces: Map<string, Namespace>,
  profile: ClassProfile,
): { members: Element[]; types: Set<string> } {
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
  for (const [key, config] of Object.entries(profile.classes)) {
    const { ns, name } = classRef(profile, key);
    types.add(`${ns}.${name}`);
    for (
      const { member, owner, ownerNs } of membersOf(
        namespaces,
        ns,
        name,
        config,
      )
    ) {
      members.push(member);
      types.add(owner.includes(".") ? owner : `${ownerNs}.${owner}`);
      for (const arg of [...params(member), child(member, "return-value")]) {
        if (arg) {
          addType(child(arg, "type")?.getAttribute("name") ?? null, ownerNs);
        }
      }
    }
    // Which interfaces the class and its ancestors implement.
    for (const ancestor of girAncestors(namespaces, `${ns}.${name}`)) {
      const [ancestorNs, local] = ancestor.split(".", 2);
      const owner = namespaces.get(ancestorNs);
      const ancestorNode = owner &&
        children(owner.node).find((e) =>
          isType(e) && e.getAttribute("name") === local
        );
      for (const entry of ancestorNode ? children(ancestorNode) : []) {
        if (entry.localName === "implements") members.push(entry);
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
  const blocks: string[] = [];
  const exported = new Map<string, string>();
  for (const [key, config] of Object.entries(profile.classes)) {
    const { ns, name: className } = classRef(profile, key);
    const qualified = `${ns}.${className}`;
    const clash = exported.get(className);
    if (clash) {
      throw new Error(
        `${qualified} and ${clash} would both generate ${className}Methods`,
      );
    }
    exported.set(className, qualified);
    const node = classNode(namespaces.get(ns)!, className);
    const taken = generator.handWrittenNames(qualified);
    generator.countedType = generator.countedClass(qualified);
    // Names GIR ancestors already use: a subclass method with the same name
    // and another signature can't be typed, so it is left out.
    const inherited = new Map<string, string>();
    for (const ancestor of girAncestors(namespaces, qualified).slice(1)) {
      const [ancestorNs, name] = ancestor.split(".", 2);
      const owner = namespaces.get(ancestorNs);
      const ancestorNode = owner &&
        children(owner.node).find((entry) =>
          isType(entry) && entry.getAttribute("name") === name
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
    const names = new Set<string>();
    for (
      const { member, owner, ownerNs } of membersOf(
        namespaces,
        ns,
        className,
        config,
      )
    ) {
      const isSignal = member.localName === "signal";
      const girName = member.getAttribute("name")!;
      if (config.skip?.[girName]) continue;
      generator.context = ownerNs;
      try {
        const generated = isSignal
          ? generator.signal(member, owner)
          : generator.method(member, owner);
        if (!generated || taken.has(generated.name)) continue;
        // The class's own member wins over an interface's of the same name.
        if (names.has(generated.name)) {
          generator.skipped.push(
            `${className}.${girName} (${owner}): name taken by another member`,
          );
          continue;
        }
        names.add(generated.name);
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
        generator.skipped.push(
          `${className}.${girName}${
            owner === className ? "" : ` (${owner})`
          }: ${error.message}`,
        );
      }
    }
    const typeName = node.getAttributeNS(GLIB, "type-name");
    const lower = className[0].toLowerCase() + className.slice(1);
    // Methods of a ref-counted wrapper run on that wrapper, not a GObject.
    const self = generator.countedType ?? "GObject";
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
      `export const ${lower}Methods: ${className}Methods & ThisType<${self}> = {`,
    );
    for (const member of members) {
      lines.push(`  ${
        member.signature.replace(/^(\w+)\(/, `$1(this: ${self}, `)
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
