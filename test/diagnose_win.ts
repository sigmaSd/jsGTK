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

// List GTK-related DLLs in the directory
for (const dir of foundDirs) {
  const gtkFiles: string[] = [];
  try {
    for (const entry of Deno.readDirSync(dir)) {
      const lower = entry.name.toLowerCase();
      if (lower.startsWith("libgtk") || lower.startsWith("libgdk") || lower.startsWith("libgsk") || lower.startsWith("libatk")) {
        gtkFiles.push(entry.name);
      }
    }
    if (gtkFiles.length > 0) console.log(`GTK DLLs in ${dir}: [${gtkFiles.join(", ")}]`);
  } catch { /* skip */ }
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
  "libgdk-4-1-0.dll", "libgsk-4-1-0.dll",
  "libcairo-gobject-2.dll", "libpixman-1-0.dll",
  "libatk-1.0-0.dll", "libintl-8.dll",
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

// Try ntldd on each failing DLL
try {
  const which = new Deno.Command("where", { args: ["ntldd"], stderr: "null" });
  const wResult = which.outputSync();
  if (!wResult.success) {
    console.log("ntldd: not found in PATH");
  } else {
    const ntlddExe = new TextDecoder().decode(wResult.stdout).trim().split("\n")[0];
    for (const dll of ["libgtk-4-1.dll", "libadwaita-1-0.dll"]) {
      for (const dir of foundDirs) {
        const dllPath = join(dir, dll);
        try { Deno.statSync(dllPath); } catch { continue; }
        const r = new Deno.Command(ntlddExe, { args: ["-R", dllPath] }).outputSync();
        const out = new TextDecoder().decode(r.stdout);
        console.log(`ntldd ${dll}:`);
        for (const line of out.split("\n").filter(l => l.trim())) {
          if (line.toLowerCase().includes("not found")) console.log(`  MISSING: ${line.trim()}`);
          else console.log(`  ${line.trim()}`);
        }
      }
    }
  }
} catch (e) {
  console.log(`ntldd error: ${(e as Error).message}`);
}
