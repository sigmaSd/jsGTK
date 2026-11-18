import {
  DOMImplementation,
  DOMParser,
  type Element,
  XMLSerializer,
} from "@xmldom/xmldom";
import { join } from "node:path";
import config from "./gir/bindings.json" with { type: "json" };

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

type FfiParameter = Extract<Deno.ForeignFunction["parameters"][number], string>;

const scalars = new Map<string, FfiParameter | "void">([
  ["void", "void"],
  ["gboolean", "bool"],
  ["gint", "i32"],
  ["int", "i32"],
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
  result: Deno.NativeResultType;
  optional?: boolean;
  nonblocking?: boolean;
};

type Override = {
  reason: string;
  signature?: Binding;
  parameters?: Record<string, FfiParameter>;
  result?: Deno.NativeResultType;
  optional?: boolean;
};

export type Profile = {
  exportName: string;
  inputs: string[];
  minimumVersion: string;
  symbols: string[];
  optionalGroups?: { reason: string; symbols: string[] }[];
  overrides?: Record<string, Override>;
};

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
  if (parameter && typeKind === "callback") {
    return "function";
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
  const requested = new Set(profile.symbols);
  if (requested.size !== profile.symbols.length) {
    throw new Error("Duplicate symbol in the allowlist");
  }
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

  const missing = profile.symbols.filter((symbol) => !declarations.has(symbol));
  if (missing.length) {
    throw new Error(`No GIR declarations for ${missing.join(", ")}`);
  }
  return profile.symbols.map((symbol) => {
    const { declaration, source } = declarations.get(symbol)!;
    const override = overrides[symbol];
    const binding = signature(symbol, declaration, known, override);
    const optionalByPolicy = optional.has(symbol) || !!source.optional ||
      declaration.since !== null &&
        compareVersions(declaration.since, profile.minimumVersion) > 0;
    if (override?.optional ?? optionalByPolicy) binding.optional = true;
    return { symbol, binding, notes: annotations(declaration) };
  });
}

function copySignature(node: Element) {
  const copy = node.cloneNode(false);
  for (const entry of children(node)) {
    if (
      entry.namespaceURI === CORE && signatureTags.has(entry.localName ?? "")
    ) {
      copy.appendChild(copySignature(entry));
    }
  }
  return copy;
}

async function snapshots(profiles: Profile[], inputs: Map<string, Input>) {
  const selected = new Map<string, Set<string>>();
  for (const profile of profiles) {
    for (const file of profile.inputs) {
      const symbols = selected.get(file) ?? new Set<string>();
      for (const name of profile.symbols) symbols.add(name);
      selected.set(file, symbols);
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
          doc.importNode(copySignature(node), true),
        );}
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
  lines.push("} as const;");
  const formatter = new Deno.Command(Deno.execPath(), {
    args: ["fmt", "--ext", "ts", "-"],
    cwd: ROOT,
    stdin: "piped",
    stdout: "piped",
  }).spawn();
  const writer = formatter.stdin.getWriter();
  await writer.write(new TextEncoder().encode(lines.join("\n") + "\n"));
  await writer.close();
  const result = await formatter.output();
  if (!result.success) {
    throw new Error("Could not format the generated FFI table");
  }
  return new TextDecoder().decode(result.stdout);
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
  const pinned = refresh
    ? await snapshots(profiles.map(([, profile]) => profile), inputs)
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
      text: await generate(profile, entries),
    };
  }));
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
}

if (import.meta.main) {
  try {
    await main(Deno.args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exitCode = 1;
  }
}
