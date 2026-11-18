// Deno's worker-based test runner conflicts with AppKit's main-thread event loop.
if (Deno.build.os !== "darwin" && Deno.args[0] !== "--main-thread") {
  const test = new Deno.Command(Deno.execPath(), {
    args: [
      "test",
      "--v8-flags=--expose-gc",
      "--allow-ffi",
      "--allow-env",
      "test/runner_test.ts",
    ],
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  Deno.exit((await test.status).code);
}

type TestCase = {
  name: string;
  fn: () => void | Promise<void>;
  ignore?: boolean;
};

const cases: TestCase[] = [];
Object.defineProperty(Deno, "test", {
  value(
    nameOrCase: string | TestCase,
    optionsOrBody?: Omit<TestCase, "name" | "fn"> | TestCase["fn"],
    body?: TestCase["fn"],
  ) {
    if (typeof nameOrCase !== "string") {
      cases.push(nameOrCase);
    } else if (typeof optionsOrBody === "function") {
      cases.push({ name: nameOrCase, fn: optionsOrBody });
    } else if (body) {
      cases.push({ ...optionsOrBody, name: nameOrCase, fn: body });
    } else {
      throw new Error(`Missing test body for ${nameOrCase}`);
    }
  },
});

await import("./runner_test.ts");
if (cases.length === 0) throw new Error("No GTK tests registered");

let passed = 0;
let ignored = 0;
let failed = 0;
for (const { name, fn, ignore } of cases) {
  if (ignore) {
    console.log(`ignored ${name}`);
    ignored++;
    continue;
  }
  try {
    await fn();
    console.log(`ok ${name}`);
    passed++;
  } catch (error) {
    console.error(`failed ${name}`, error);
    failed++;
  }
}
console.log(`${passed} passed | ${failed} failed | ${ignored} ignored`);
if (failed > 0) Deno.exitCode = 1;
