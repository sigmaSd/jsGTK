// Windows-only: diagnose DLL loading issues (dependency chain)
import "@sigma/deno-compat";
import { LIB_PATHS } from "../src/low/paths/mod.ts";
import { join } from "node:path";

console.log(`LIB_PATHS.adwaita = ${LIB_PATHS.adwaita}`);
console.log(`LIB_PATHS.gtk4 = ${LIB_PATHS.gtk4}`);
console.log(`LIB_PATHS.gio = ${LIB_PATHS.gio}`);
console.log(`LIB_PATHS.glib = ${LIB_PATHS.glib}`);

// Check which MSYS2 directories exist (path changed in newer MSYS2)
const foundDirs: string[] = [];
const MSYS2_BASE = ["C:/tools/msys64", "C:/msys64"];
const SUBDIRS = ["mingw64/bin", "ucrt64/bin", "clang64/bin", "clangarm64/bin"];
for (const base of MSYS2_BASE) {
  try {
    if (Deno.statSync(base).isDirectory) {
      console.log(`${base}: FOUND`);
      for (const sub of SUBDIRS) {
        const full = `${base}/${sub}`;
        try {
          const s = Deno.statSync(full);
          if (s.isDirectory) {
            let count = 0;
            for (const _ of Deno.readDirSync(full)) count++;
            console.log(`  ${full}: EXISTS (${count} entries)`);
            foundDirs.push(full);
          } else {
            console.log(`  ${full}: EXISTS but not dir`);
          }
        } catch (e) {
          console.log(`  ${full}: STAT FAIL — ${(e as Error).message}`);
        }
      }
    }
  } catch (e) {
    console.log(`${base}: ERROR — ${(e as Error).message}`);
  }
}

// Try loading DLLs from found directories
const DllsToCheck = [
  "libadwaita-1-0.dll", "libgtk-4-1.dll",
  "libgio-2.0-0.dll", "libglib-2.0-0.dll",
  "libgobject-2.0-0.dll", "libpango-1.0-0.dll",
  "libpangowin32-1.0-0.dll", "libcairo-2.dll",
  "libepoxy-0.dll", "libgdk-pixbuf-2.0-0.dll",
  "libpcre2-8-0.dll", "libffi-8.dll",
  "libharfbuzz-0.dll", "libfribidi-0.dll",
  "libpangoft2-1.0-0.dll",
];
for (const dll of DllsToCheck) {
  for (const dir of foundDirs) {
    const fullPath = join(dir, dll);
    try {
      Deno.statSync(fullPath);
      try {
        const lib = Deno.dlopen(fullPath, {});
        console.log(`OK ${dll}`);
        lib.close();
      } catch (e) {
        console.log(`FAIL ${dll}: ${(e as Error).message}`);
      }
    } catch {
      // doesn't exist at this path
    }
  }
}

// Find and use ntldd/objdump from MSYS2 to check deps
const toolBases: [string, string[]][] = [];
for (const base of MSYS2_BASE) {
  for (const sub of ["ucrt64/bin", "mingw64/bin", "usr/bin"]) {
    const p = `${base}/${sub}`;
    try {
      if (Deno.statSync(p).isDirectory) toolBases.push([base, [sub]]);
    } catch { /* skip */ }
  }
}

for (const dll of ["libgtk-4-1.dll", "libadwaita-1-0.dll"]) {
  const dllPath = join(foundDirs[0] || "", dll);
  try { Deno.statSync(dllPath); } catch { continue; }

  // Try dumpbin (from MSVC tools)
  for (const cmdName of ["dumpbin", "ntldd", "objdump"]) {
    try {
      const cmd = new Deno.Command("where", { args: [cmdName], stderr: "null" });
      const { stdout, success } = cmd.outputSync();
      if (!success) continue;
      const exe = new TextDecoder().decode(stdout).trim().split("\n")[0];
      if (cmdName === "dumpbin") {
        const r = new Deno.Command(exe, { args: ["/dependents", dllPath] }).outputSync();
        const out = new TextDecoder().decode(r.stdout);
        for (const line of out.split("\n")) {
          if (line.includes(".dll")) console.log(`  ${dll} dep: ${line.trim()}`);
        }
      } else if (cmdName === "ntldd") {
        const r = new Deno.Command(exe, { args: ["-R", dllPath] }).outputSync();
        for (const line of new TextDecoder().decode(r.stdout).split("\n")) {
          const lower = line.toLowerCase();
          if (lower.includes("not found")) console.log(`  ${dll} MISSING: ${line.trim()}`);
        }
      } else if (cmdName === "objdump") {
        const r = new Deno.Command(exe, { args: ["-p", dllPath] }).outputSync();
        const out = new TextDecoder().decode(r.stdout);
        for (const line of out.split("\n").filter(l => l.includes("DLL Name"))) {
          console.log(`  ${dll} dep: ${line.trim()}`);
        }
      }
    } catch { /* not found */ }
  }
}
