import {
  DOMImplementation,
  DOMParser,
  type Element,
  XMLSerializer,
} from "@xmldom/xmldom";
import { join } from "node:path";
import config from "./gir/bindings.json" with { type: "json" };
import {
  checkHierarchy,
  classMembers,
  type ClassProfile,
  classSymbols,
  generateClasses,
  girAncestors,
  girClasses,
  type HandWritten,
  implementsOf,
  type Namespace,
} from "./generate_classes.ts";

const ROOT = new URL("../", import.meta.url);
const GIR = new URL("./gir/", import.meta.url);
const CORE = "http://www.gtk.org/introspection/core/1.0";
const C = "http://www.gtk.org/introspection/c/1.0";
const GLIB = "http://www.gtk.org/introspection/glib/1.0";
const XMLNS = "http://www.w3.org/2000/xmlns/";

const callables = new Set(["function", "method", "constructor"]);
const types = new Set(["enumeration", "bitfield", "callback"]);
const signatureTags = new Set([
  "return-value",
  "parameters",
  "parameter",
  "instance-parameter",
  "type",
  "array",
  "varargs",
]);

type FfiParameter =
  | Extract<Deno.ForeignFunction["parameters"][number], string>
  | "gboolean";
type FfiResult = Deno.NativeResultType | "gboolean";

const scalars = new Map<string, FfiParameter | "void">([
  ["void", "void"],
  ["gboolean", "gboolean"],
  ["gint", "i32"],
  ["int", "i32"],
  ["unsigned int", "u32"],
  ["unsigned", "u32"],
  ["short", "i16"],
  ["unsigned short", "u16"],
  ["char", "i8"],
  ["unsigned char", "u8"],
  ["guint", "u32"],
  ["gint8", "i8"],
  ["guint8", "u8"],
  ["gint16", "i16"],
  ["guint16", "u16"],
  ["gint32", "i32"],
  ["guint32", "u32"],
  ["gint64", "i64"],
  ["guint64", "u64"],
  ["gfloat", "f32"],
  ["float", "f32"],
  ["gdouble", "f64"],
  ["double", "f64"],
  ["gsize", "usize"],
  ["gssize", "isize"],
  ["GType", "usize"],
  ["gpointer", "pointer"],
  ["gconstpointer", "pointer"],
]);

type Binding = {
  parameters: FfiParameter[];
  result: FfiResult;
  optional?: boolean;
  nonblocking?: boolean;
};

type Override = {
  reason: string;
  signature?: Binding;
  parameters?: Record<string, FfiParameter>;
  result?: FfiResult;
  optional?: boolean;
};

export type Profile = {
  exportName: string;
  inputs: string[];
  minimumVersion: string;
  symbols: string[];
  optionalGroups?: { reason: string; symbols: string[] }[];
  overrides?: Record<string, Override>;
  /** High-level classes whose methods are generated from GIR. */
  highLevel?: ClassProfile;
};

/** The GIR namespaces a profile's classes can refer to. */
function namespacesFor(
  profile: Profile,
  inputs: Map<string, Input>,
): Map<string, Namespace> {
  const namespaces = new Map<string, Namespace>();
  const add = (file: string) => {
    const input = inputs.get(file)!;
    namespaces.set(input.source.namespace, {
      name: input.source.namespace,
      node: input.namespace,
    });
  };
  // GTK 3 shares GTK 4's namespace name; only GTK 3 profiles see it.
  for (const file of inputs.keys()) if (file !== "Gtk-3.0.gir") add(file);
  for (const file of profile.inputs) add(file);
  return namespaces;
}

/** Every symbol a profile binds: its list, then its generated methods. */
function profileSymbols(profile: Profile, inputs: Map<string, Input>) {
  const symbols = [...profile.symbols];
  if (profile.highLevel) {
    const listed = new Set(symbols);
    for (
      const symbol of classSymbols(
        namespacesFor(profile, inputs),
        profile.highLevel,
      )
    ) {
      if (!listed.has(symbol)) {
        listed.add(symbol);
        symbols.push(symbol);
      }
    }
  }
  return symbols;
}

type Source = { namespace: string; package: string; optional?: boolean };
type Input = { source: Source; namespace: Element; text: string };
type Declaration = { node: Element; since: string | null; getter: boolean };

const parser = new DOMParser({
  onError(_level, message) {
    throw new Error(message);
  },
});

function children(node: Element): Element[] {
  return Array.from(node.childNodes)
    .filter((child): child is Element => child.nodeType === 1);
}

function child(node: Element, ...names: string[]): Element | undefined {
  return children(node).find((entry) =>
    entry.namespaceURI === CORE && names.includes(entry.localName ?? "")
  );
}

export function parse(text: string, source: Source): Input {
  const root = parser.parseFromString(text, "application/xml").documentElement;
  const namespace = root && child(root, "namespace");
  if (namespace?.getAttribute("name") !== source.namespace) {
    throw new Error(`Expected GIR namespace ${source.namespace}`);
  }
  return { source, namespace, text };
}

function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

function* scan(
  node: Element,
  inherited: string | null = null,
): Generator<[string, Declaration]> {
  // A namespace version is its API name, not the release that introduced a symbol.
  const version = node.localName === "namespace"
    ? null
    : node.getAttribute("version");
  const since =
    version && (!inherited || compareVersions(version, inherited) > 0)
      ? version
      : inherited;
  if (
    node.namespaceURI === CORE && callables.has(node.localName ?? "") &&
    !node.hasAttribute("moved-to")
  ) {
    const symbol = node.getAttributeNS(C, "identifier");
    if (symbol) yield [symbol, { node, since, getter: false }];
  }
  const getter = node.getAttributeNS(GLIB, "get-type");
  if (getter) yield [getter, { node, since, getter: true }];
  for (const entry of children(node)) {
    if (entry.namespaceURI === CORE && entry.localName !== "doc") {
      yield* scan(entry, since);
    }
  }
}

function nativeTypes(inputs: Iterable<Input>): Map<string, string> {
  const known = new Map<string, string>();
  for (const { namespace } of inputs) {
    for (const entry of children(namespace)) {
      const cType = entry.getAttributeNS(C, "type");
      if (cType && types.has(entry.localName ?? "")) {
        known.set(cType, entry.localName!);
      }
    }
  }
  return known;
}

function abiType(
  value: Element,
  known: Map<string, string>,
  symbol: string,
  parameter: boolean,
): FfiParameter | "void" {
  const entry = child(value, "type", "array");
  const cType = entry?.getAttributeNS(C, "type")?.replace(/\s+\*/g, "*").trim();
  if (!cType) throw new Error(`${symbol}: missing GIR C type`);
  const typeKind = known.get(cType);
  // Callbacks are passed as pointers: Bun rejects NULL for "function".
  if (parameter && typeKind === "callback") {
    return "pointer";
  }
  const scalar = scalars.get(cType);
  if (scalar) return scalar;
  if (typeKind === "enumeration" || typeKind === "bitfield") return "i32";
  if (parameter && (cType === "const char*" || cType === "const gchar*")) {
    return "buffer";
  }
  if (cType.endsWith("*")) return "pointer";
  throw new Error(
    `${symbol}: unsupported GIR C type ${cType}. Add an explicit override.`,
  );
}

function parameters(node: Element): Element[] {
  const args = child(node, "parameters");
  return args
    ? children(args).filter((entry) =>
      entry.localName === "instance-parameter" ||
      entry.localName === "parameter"
    )
    : [];
}

function signature(
  symbol: string,
  declaration: Declaration,
  known: Map<string, string>,
  override?: Override,
): Binding {
  if (override?.signature) return { ...override.signature };
  const { node, getter } = declaration;
  if (getter) return { parameters: [], result: override?.result ?? "usize" };

  const container = child(node, "parameters");
  if (container && child(container, "varargs")) {
    throw new Error(
      `${symbol}: variadic declaration needs an explicit signature override`,
    );
  }
  const args = parameters(node);
  for (const key of Object.keys(override?.parameters ?? {})) {
    if (!args.some((_, index) => String(index) === key)) {
      throw new Error(
        `${symbol}: parameter override ${key} is outside the GIR signature`,
      );
    }
  }
  const nativeArgs = args.map((arg, index) => {
    if (child(arg, "varargs")) {
      throw new Error(
        `${symbol}: variadic declaration needs an explicit signature override`,
      );
    }
    const type = override?.parameters?.[index] ??
      abiType(arg, known, symbol, true);
    if (type === "void") throw new Error(`${symbol}: invalid void parameter`);
    return type;
  });
  if (node.getAttribute("throws") === "1") nativeArgs.push("pointer");

  const returned = child(node, "return-value");
  if (!returned) throw new Error(`${symbol}: missing return value in GIR`);
  const result = override?.result ?? abiType(returned, known, symbol, false);
  return { parameters: nativeArgs, result };
}

function annotations({ node, since }: Declaration): string[] {
  const notes: string[] = [];
  if (since) notes.push(`Since ${since}`);
  if (node.getAttribute("throws") === "1") notes.push("Trailing GError**");
  const transfer = child(node, "return-value")?.getAttribute(
    "transfer-ownership",
  );
  if (transfer === "full" || transfer === "container") {
    notes.push(`Return transfer ${transfer}`);
  }
  for (const arg of parameters(node)) {
    const name = arg.getAttribute("name");
    const scope = arg.getAttribute("scope");
    const direction = arg.getAttribute("direction");
    if (scope) notes.push(`${name} has ${scope} scope`);
    if (
      (direction === "out" || direction === "inout") &&
      arg.getAttribute("transfer-ownership") === "full"
    ) {
      notes.push(`${name} (${direction}) transfer full`);
    }
  }
  return notes;
}

export function build(profile: Profile, inputs: Map<string, Input>) {
  if (new Set(profile.symbols).size !== profile.symbols.length) {
    throw new Error("Duplicate symbol in the allowlist");
  }
  const symbols = profileSymbols(profile, inputs);
  const listed = new Set(profile.symbols);
  const requested = new Set(symbols);
  const declarations = new Map<
    string,
    { declaration: Declaration; source: Source }
  >();
  for (const file of profile.inputs) {
    const input = inputs.get(file);
    if (!input) throw new Error(`Unknown GIR input ${file}`);
    for (const [symbol, declaration] of scan(input.namespace)) {
      if (!requested.has(symbol)) continue;
      if (declarations.has(symbol)) {
        throw new Error(`${symbol}: duplicate GIR declaration`);
      }
      declarations.set(symbol, { declaration, source: input.source });
    }
  }

  const known = nativeTypes(inputs.values());
  const overrides = profile.overrides ?? {};
  const optional = new Set<string>();
  for (const group of profile.optionalGroups ?? []) {
    if (!group.reason) {
      throw new Error("Every optional symbol group needs a reason");
    }
    for (const symbol of group.symbols) optional.add(symbol);
  }
  for (const symbol of [...Object.keys(overrides), ...optional]) {
    if (!requested.has(symbol)) {
      throw new Error(`${symbol}: policy references an unlisted symbol`);
    }
  }
  for (const [symbol, override] of Object.entries(overrides)) {
    if (!override.reason) throw new Error(`${symbol}: override needs a reason`);
  }

  const missing = symbols.filter((symbol) => !declarations.has(symbol));
  if (missing.length) {
    throw new Error(`No GIR declarations for ${missing.join(", ")}`);
  }
  return symbols.map((symbol) => {
    const { declaration, source } = declarations.get(symbol)!;
    const override = overrides[symbol];
    const binding = signature(symbol, declaration, known, override);
    // Generated methods may use symbols a platform lacks (e.g. Unix-only
    // GIO functions on Windows), so they never stop the library loading.
    const optionalByPolicy = optional.has(symbol) || !!source.optional ||
      !listed.has(symbol) ||
      declaration.since !== null &&
        compareVersions(declaration.since, profile.minimumVersion) > 0;
    if (override?.optional ?? optionalByPolicy) binding.optional = true;
    return { symbol, binding, notes: annotations(declaration) };
  });
}

function copySignature(node: Element, doc = false) {
  const copy = node.cloneNode(false);
  for (const entry of children(node)) {
    if (
      entry.namespaceURI === CORE &&
      (signatureTags.has(entry.localName ?? "") ||
        doc && entry.localName === "doc")
    ) {
      // Only the declaration's own documentation, not its parameters'.
      copy.appendChild(
        entry.localName === "doc"
          ? entry.cloneNode(true)
          : copySignature(entry),
      );
    }
  }
  return copy;
}

type WidgetSelection = {
  properties: Record<string, string[]>;
  signals: Record<string, string[]>;
};

function widgetDeclarations(input: Input) {
  const owners = children(input.namespace);
  const members = (groups: Record<string, string[]>, tag: string, ns: string) =>
    Object.entries(groups).flatMap(([ownerName, names]) => {
      const owner = owners.find((node) =>
        node.getAttribute("name") === ownerName
      );
      if (!owner) {
        throw new Error(`Gtk: missing widget or interface ${ownerName}`);
      }
      return names.map((name) => {
        const node = children(owner).find((entry) =>
          entry.namespaceURI === ns && entry.localName === tag &&
          entry.getAttribute("name") === name
        );
        if (!node) throw new Error(`Gtk.${ownerName}: missing ${tag} ${name}`);
        return { name, owner, node };
      });
    });

  return Object.entries(
    config.widgetMetadata as Record<string, WidgetSelection>,
  ).map(([name, spec]) => ({
    name,
    properties: members(spec.properties, "property", CORE),
    signals: members(spec.signals, "signal", GLIB),
  }));
}

function widgetTypes(input: Input): string[] {
  const enums = new Set(
    children(input.namespace).filter((entry) =>
      entry.localName === "enumeration" || entry.localName === "bitfield"
    ).map((entry) => entry.getAttribute("name")),
  );
  return widgetDeclarations(input).flatMap(({ name, properties, signals }) => {
    const lines = ["", `export interface ${name}Properties {`];
    for (const { name: property, node } of properties) {
      const type = child(node, "type")?.getAttribute("name");
      const tsType = type === "utf8"
        ? "string"
        : type === "gboolean"
        ? "boolean"
        : type === "gint" || type === "guint"
        ? "number"
        : undefined;
      if (
        !tsType || node.getAttribute("writable") !== "1" ||
        node.getAttribute("construct-only") === "1"
      ) {
        throw new Error(`${name}.${property}: unsupported writable property`);
      }
      lines.push(`  ${JSON.stringify(property)}: ${tsType};`);
    }
    lines.push("}", "", `export interface ${name}Signals {`);
    const definitions = [];
    for (const { name: signal, node } of signals) {
      if (
        child(child(node, "return-value")!, "type")?.getAttribute("name") !==
          "none"
      ) {
        throw new Error(`${name}.${signal}: expected a void signal`);
      }
      const args = parameters(node).map((arg) => {
        const type = child(arg, "type")?.getAttribute("name");
        if (
          arg.hasAttribute("direction") ||
          (!enums.has(type ?? null) && type !== "gint" && type !== "guint")
        ) {
          throw new Error(
            `${name}.${signal}: unsupported signal argument ${type}`,
          );
        }
        return {
          name: arg.getAttribute("name")!.replace(
            /_([a-z])/g,
            (_, letter: string) => letter.toUpperCase(),
          ),
          abi: type === "guint" ? "u32" : "i32",
        };
      });
      lines.push(
        `  ${JSON.stringify(signal)}: (${
          args.map((arg) => `${arg.name}: number`).join(", ")
        }) => void;`,
      );
      definitions.push(
        `  ${JSON.stringify(signal)}: { parameters: ${
          JSON.stringify([
            "pointer",
            ...args.map((arg) => arg.abi),
            "pointer",
          ])
        }, result: "void" },`,
      );
    }
    const symbol = name[0].toLowerCase() + name.slice(1) + "Signals";
    return [
      ...lines,
      "}",
      "",
      `export const ${symbol} = {`,
      ...definitions,
      "} as const;",
    ];
  });
}

async function snapshots(
  profiles: Profile[],
  inputs: Map<string, Input>,
  handWritten: HandWritten,
) {
  const selected = new Map<string, Set<string>>();
  for (const profile of profiles) {
    for (const file of profile.inputs) {
      const symbols = selected.get(file) ?? new Set<string>();
      for (const name of profileSymbols(profile, inputs)) symbols.add(name);
      selected.set(file, symbols);
    }
  }
  // Class members and the types they use, kept whole so the high-level
  // classes generate the same from the snapshot.
  const classNodes = new Set<Element>();
  const classTypes = new Set<string>();
  for (const profile of profiles) {
    if (!profile.highLevel) continue;
    const { members, types } = classMembers(
      namespacesFor(profile, inputs),
      profile.highLevel,
    );
    for (const member of members) classNodes.add(member);
    for (const type of types) classTypes.add(type);
  }
  // Keep every wrapped class and the ancestors of all kept classes, so
  // wrapper lookups and the hierarchy check work from the snapshot.
  const withClasses = profiles.find((profile) => profile.highLevel);
  if (withClasses) {
    const namespaces = namespacesFor(withClasses, inputs);
    for (const gir of girClasses(namespaces, handWritten).values()) {
      classTypes.add(gir);
      // What each wrapped type implements, for the hierarchy check.
      for (const entry of implementsOf(namespaces, gir)) classNodes.add(entry);
    }
    for (const type of [...classTypes]) {
      for (const ancestor of girAncestors(namespaces, type)) {
        classTypes.add(ancestor);
      }
    }
  }
  const requiredTypes = new Set<string>();
  const declarations = new Map<string, Declaration[]>();
  for (const [file, { namespace }] of inputs) {
    const entries: Declaration[] = [];
    for (const [name, declaration] of scan(namespace)) {
      if (!selected.get(file)?.has(name)) continue;
      entries.push(declaration);
      for (
        const arg of [
          ...parameters(declaration.node),
          child(declaration.node, "return-value"),
        ]
      ) {
        const cType = arg &&
          child(arg, "type", "array")?.getAttributeNS(C, "type");
        if (cType) requiredTypes.add(cType);
      }
    }
    declarations.set(file, entries);
  }

  const result = new Map<string, string>();
  for (const [file, input] of inputs) {
    const { text, source, namespace } = input;
    const doc = new DOMImplementation().createDocument(
      CORE,
      "repository",
      null,
    );
    const root = doc.documentElement!;
    root.setAttribute("version", "1.2");
    root.setAttributeNS(XMLNS, "xmlns:c", C);
    root.setAttributeNS(XMLNS, "xmlns:glib", GLIB);
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(text),
    );
    const hash = Array.from(
      new Uint8Array(digest),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    root.appendChild(
      doc.createComment(
        ` Signature-only snapshot of ${file} from ${source.package}. `,
      ),
    );
    root.appendChild(doc.createComment(` Upstream SHA-256 ${hash} `));
    const copiedNamespace = doc.createElementNS(CORE, "namespace");
    copiedNamespace.setAttribute("name", source.namespace);
    copiedNamespace.setAttribute(
      "version",
      namespace.getAttribute("version") ?? "",
    );
    root.appendChild(copiedNamespace);
    const containers = new Map<Element, Element>([[
      namespace,
      copiedNamespace,
    ]]);

    const copyContainer = (node: Element): Element => {
      const existing = containers.get(node);
      if (existing) return existing;
      const copy = doc.importNode(node, false);
      copyContainer(node.parentNode as Element).appendChild(copy);
      containers.set(node, copy);
      return copy;
    };

    for (const { node, getter } of declarations.get(file)!) {
      if (getter) copyContainer(node);
      else {copyContainer(node.parentNode as Element).appendChild(
          doc.importNode(copySignature(node, classNodes.has(node)), true),
        );}
    }
    if (file !== "Gtk-3.0.gir") {
      for (const node of classNodes) {
        if (
          node.localName !== "signal" && node.localName !== "implements" ||
          node.ownerDocument !== namespace.ownerDocument
        ) continue;
        const container = copyContainer(node.parentNode as Element);
        // A class implements an interface once, however many lists say so.
        if (
          node.localName === "implements" &&
          children(container).some((e) =>
            e.localName === "implements" &&
            e.getAttribute("name") === node.getAttribute("name")
          )
        ) continue;
        container.appendChild(
          doc.importNode(
            copySignature(node, node.localName === "signal"),
            true,
          ),
        );
      }
      for (const entry of children(namespace)) {
        const qualified = `${source.namespace}.${entry.getAttribute("name")}`;
        if (!classTypes.has(qualified)) continue;
        if (
          entry.localName === "enumeration" || entry.localName === "bitfield"
        ) {
          const copy = copyContainer(entry);
          if (!children(copy).some((m) => m.localName === "member")) {
            const text = child(entry, "doc");
            if (text) {
              copy.appendChild(doc.importNode(text.cloneNode(true), true));
            }
            for (const member of children(entry)) {
              if (member.localName === "member") {
                copy.appendChild(doc.importNode(member.cloneNode(false), true));
              }
            }
          }
        } else if (entry.localName === "callback") {
          if (!requiredTypes.has(entry.getAttributeNS(C, "type") ?? "")) {
            copiedNamespace.appendChild(
              doc.importNode(copySignature(entry), true),
            );
          }
        } else copyContainer(entry);
      }
    }
    for (const entry of children(namespace)) {
      const cType = entry.getAttributeNS(C, "type");
      if (
        cType && types.has(entry.localName ?? "") && requiredTypes.has(cType)
      ) {
        if (entry.localName === "callback") {
          copiedNamespace.appendChild(
            doc.importNode(copySignature(entry), true),
          );
        } else copyContainer(entry);
      }
    }

    if (file === "Gtk-4.0.gir") {
      const signalTypes = new Set<string>();
      const copied = new Set<Element>();
      for (const { properties, signals } of widgetDeclarations(input)) {
        for (const { owner, node } of [...properties, ...signals]) {
          if (copied.has(node) || classNodes.has(node)) continue;
          copied.add(node);
          copyContainer(owner).appendChild(
            doc.importNode(copySignature(node), true),
          );
        }
        for (const { node } of signals) {
          for (const arg of parameters(node)) {
            const type = child(arg, "type")?.getAttribute("name");
            if (type) signalTypes.add(type);
          }
        }
      }
      for (const entry of children(namespace)) {
        if (
          types.has(entry.localName ?? "") &&
          signalTypes.has(entry.getAttribute("name") ?? "")
        ) {
          copyContainer(entry);
        }
      }
    }

    const indent = (node: Element, depth: number): void => {
      const items = Array.from(node.childNodes);
      if (!items.length) return;
      for (const entry of items) {
        node.insertBefore(
          doc.createTextNode("\n" + "  ".repeat(depth + 1)),
          entry,
        );
        if (entry.nodeType === 1) indent(entry as Element, depth + 1);
      }
      node.appendChild(doc.createTextNode("\n" + "  ".repeat(depth)));
    };

    indent(root, 0);
    result.set(
      file,
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        new XMLSerializer().serializeToString(doc) + "\n",
    );
  }
  return result;
}

async function generate(
  profile: Profile,
  entries: ReturnType<typeof build>,
  widgets: string[] = [],
): Promise<string> {
  const lines = [
    "// Generated by tools/generate_gir.ts from the pinned GIR snapshots.",
    "// Edit tools/gir/bindings.json to change the symbol list, policy or overrides.",
    "",
    `export const ${profile.exportName} = {`,
  ];
  for (const { symbol, binding, notes } of entries) {
    if (notes.length) lines.push("  // " + notes.join(". ") + ".");
    const fields = Object.entries(binding).map(([key, value]) =>
      `${key}: ${JSON.stringify(value)}`
    );
    lines.push(`  ${symbol}: { ${fields.join(", ")} },`);
  }
  lines.push("} as const;", ...widgets);
  return await format(lines.join("\n") + "\n");
}

/** deno fmt, run until stable: one pass doesn't always settle long lines. */
async function format(text: string): Promise<string> {
  let current = text;
  for (let pass = 0; pass < 3; pass++) {
    const next = await formatOnce(current);
    if (next === current) return next;
    current = next;
  }
  return current;
}

async function formatOnce(text: string): Promise<string> {
  const formatter = new Deno.Command(Deno.execPath(), {
    args: ["fmt", "--ext", "ts", "-"],
    cwd: ROOT,
    stdin: "piped",
    stdout: "piped",
  }).spawn();
  const writer = formatter.stdin.getWriter();
  await writer.write(new TextEncoder().encode(text));
  await writer.close();
  const result = await formatter.output();
  if (!result.success) {
    throw new Error("Could not format generated code");
  }
  return new TextDecoder().decode(result.stdout);
}

/** Hand-written classes in src/high, read with `deno doc`. */
async function handWrittenClasses(): Promise<HandWritten> {
  const modules = ["gobject.ts", "gtk4.ts", "adw.ts", "gio.ts"];
  // Read the class bodies only: generated interfaces merged into them are
  // separate declarations, so a rerun sees the same hand-written methods.
  const output = await new Deno.Command(Deno.execPath(), {
    args: ["doc", "--json", ...modules.map((m) => `src/high/${m}`)],
    cwd: ROOT,
    stdout: "piped",
  }).output();
  if (!output.success) throw new Error("deno doc failed on src/high");
  const doc = JSON.parse(new TextDecoder().decode(output.stdout));
  const result: HandWritten = new Map();
  for (const [url, module] of Object.entries(doc.nodes)) {
    const file = url.slice(url.lastIndexOf("/") + 1);
    // deno-lint-ignore no-explicit-any
    for (const symbol of (module as any).symbols) {
      for (const declaration of symbol.declarations) {
        if (declaration.kind !== "class") continue;
        const def = declaration.def;
        const methods = new Set<string>([
          // deno-lint-ignore no-explicit-any
          ...(def.methods ?? []).map((m: any) => m.name),
          // deno-lint-ignore no-explicit-any
          ...(def.properties ?? []).map((p: any) => p.name),
        ]);
        const parent = typeof def.extends === "string"
          ? def.extends
          : def.extends?.repr ?? null;
        result.set(`${file}:${symbol.name}`, {
          module: file,
          methods,
          parent,
        });
      }
    }
  }
  return result;
}

async function main(args: string[]) {
  const check = args.length === 1 && args[0] === "--check";
  const refresh = args.length === 2 && args[0] === "--refresh-from"
    ? args[1]
    : undefined;
  if (args.length && !check && !refresh) {
    throw new Error(
      "Usage: generate_gir.ts [--check | --refresh-from GIR_DIR]",
    );
  }

  const sources: Record<string, Source> = config.sources;
  const profiles = Object.entries(config.libraries) as [string, Profile][];
  const inputs = new Map<string, Input>();
  for (const [file, source] of Object.entries(sources)) {
    const path = refresh ? join(refresh, file) : new URL(file, GIR);
    inputs.set(file, parse(await Deno.readTextFile(path), source));
  }
  const withClasses = profiles.filter(([, profile]) => profile.highLevel);
  const handWritten: HandWritten = withClasses.length
    ? await handWrittenClasses()
    : new Map();
  const pinned = refresh
    ? await snapshots(
      profiles.map(([, profile]) => profile),
      inputs,
      handWritten,
    )
    : undefined;
  const pinnedInputs = pinned &&
    new Map(
      Array.from(
        pinned,
        ([file, text]) => [file, parse(text, sources[file])] as const,
      ),
    );
  const generated = await Promise.all(profiles.map(async ([name, profile]) => {
    const entries = build(profile, inputs);
    const gtk4 = "Gtk-4.0.gir";
    const widgets = name === "gtk4" ? widgetTypes(inputs.get(gtk4)!) : [];
    if (
      name === "gtk4" && pinnedInputs &&
      JSON.stringify(widgets) !==
        JSON.stringify(widgetTypes(pinnedInputs.get(gtk4)!))
    ) {
      throw new Error("GTK4 snapshot changed the generated widget metadata");
    }
    if (pinnedInputs) {
      const projected = build(profile, pinnedInputs);
      if (JSON.stringify(entries) !== JSON.stringify(projected)) {
        throw new Error(
          `${name}: snapshot changed the generated binding metadata`,
        );
      }
    }
    return {
      name,
      count: entries.length,
      text: await generate(profile, entries, widgets),
    };
  }));
  const classInputs = pinnedInputs ?? inputs;
  if (withClasses.length) {
    // Classes whose own methods are generated; interface-only ones add
    // methods every subclass implementing the interface may call.
    const generatedClasses = new Set(
      withClasses.flatMap(([, profile]) =>
        Object.entries(profile.highLevel!.classes)
          .filter(([, config]) => !config.interfacesOnly)
          .map(([name]) => `${profile.highLevel!.namespace}.${name}`)
      ),
    );
    const interfaceOnly = new Map(
      withClasses.flatMap(([, profile]) =>
        Object.entries(profile.highLevel!.classes)
          .filter(([, config]) => config.interfacesOnly)
          .map(([name, config]) =>
            [
              `${profile.highLevel!.namespace}.${name}`,
              config.interfacesOnly!.map((i) =>
                `${profile.highLevel!.namespace}.${i}`
              ),
            ] as const
          )
      ),
    );
    checkHierarchy(
      namespacesFor(withClasses[0][1], classInputs),
      generatedClasses,
      handWritten,
      interfaceOnly,
    );
  }
  const classModules = await Promise.all(
    withClasses.map(async ([name, profile]) => ({
      name,
      text: await format(
        generateClasses(
          namespacesFor(profile, classInputs),
          { ...profile.highLevel!, listed: new Set(profile.symbols) },
          handWritten,
        ),
      ),
    })),
  );
  if (pinned) {
    for (const [file, text] of pinned) {
      await Deno.writeTextFile(new URL(file, GIR), text);
    }
  }
  for (const { name, text, count } of generated) {
    const path = new URL(`src/low/generated/${name}.ts`, ROOT);
    if (check) {
      if (await Deno.readTextFile(path) !== text) {
        throw new Error(
          `${name}: generated bindings are stale. Run deno task gir.`,
        );
      }
    } else await Deno.writeTextFile(path, text);
    console.log(`${name}: ${count} symbols`);
  }
  for (const { name, text } of classModules) {
    const path = new URL(`src/high/generated/${name}.ts`, ROOT);
    if (check) {
      if (await Deno.readTextFile(path) !== text) {
        throw new Error(
          `${name}: generated classes are stale. Run deno task gir.`,
        );
      }
    } else await Deno.writeTextFile(path, text);
    console.log(`${name}: generated classes`);
  }
}

if (import.meta.main) {
  try {
    await main(Deno.args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exitCode = 1;
  }
}
