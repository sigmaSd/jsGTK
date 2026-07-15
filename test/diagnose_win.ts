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
          if (Deno.statSync(full).isDirectory) {
            let count = 0;
            for (const _ of Deno.readDirSync(full)) count++;
            console.log(`  ${full}: EXISTS (${count} entries)`);
            foundDirs.push(full);
          }
        } catch {
          // not found
        }
      }
    }
  } catch {
    console.log(`${base}: NOT FOUND`);
  }
}

// Try loading DLLs from found directories
for (const dll of ["libadwaita-1-0.dll", "libgtk-4-1.dll", "libgio-2.0-0.dll", "libglib-2.0-0.dll"]) {
  for (const dir of foundDirs) {
    const fullPath = join(dir, dll);
    try {
      Deno.statSync(fullPath);
      console.log(`${fullPath}: EXISTS`);
      try {
        const lib = Deno.dlopen(fullPath, {});
        console.log(`  LOAD OK`);
        lib.close();
      } catch (e) {
        console.log(`  LOAD FAIL: ${(e as Error).message}`);
      }
    } catch {
      // doesn't exist at this path
    }
  }
}

// Try ntldd to list DLL dependencies
for (const base of MSYS2_BASE) {
  for (const toolPath of [
    `${base}/usr/bin/ntldd.exe`,
    `${base}/mingw64/bin/ntldd.exe`,
    `${base}/ucrt64/bin/ntldd.exe`,
  ]) {
    try {
      Deno.statSync(toolPath);
      const adwaitaPath = join(foundDirs[0] || "", "libadwaita-1-0.dll");
      if (!adwaitaPath) continue;
      const cmd = new Deno.Command(toolPath, { args: ["R", adwaitaPath] });
      const { stdout } = cmd.outputSync();
      console.log(`ntldd (${toolPath}):`);
      for (const line of new TextDecoder().decode(stdout).split("\n")) {
        if (line.includes("not found")) console.log(`  MISSING: ${line.trim()}`);
      }
    } catch {
      // tool not found
    }
  }
}

// Try objdump to list DLL dependencies
for (const base of MSYS2_BASE) {
  for (const toolPath of [
    `${base}/usr/bin/objdump.exe`,
    `${base}/mingw64/bin/objdump.exe`,
    `${base}/ucrt64/bin/objdump.exe`,
  ]) {
    try {
      Deno.statSync(toolPath);
      const adwaitaPath = join(foundDirs[0] || "", "libadwaita-1-0.dll");
      if (!adwaitaPath) continue;
      const cmd = new Deno.Command(toolPath, { args: ["-p", adwaitaPath] });
      const { stdout } = cmd.outputSync();
      const deps = new TextDecoder().decode(stdout).split("\n").filter(l => l.includes("DLL Name"));
      console.log(`objdump DLL deps (${toolPath}):`);
      for (const d of deps) console.log(`  ${d.trim()}`);
    } catch {
      // tool not found
    }
  }
}
