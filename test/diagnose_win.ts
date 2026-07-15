// Windows-only: diagnose DLL loading issues (dependency chain)
import "@sigma/deno-compat";
import { LIB_PATHS } from "../src/low/paths/mod.ts";
import { join } from "node:path";

console.log(`LIB_PATHS.adwaita = ${LIB_PATHS.adwaita}`);
console.log(`LIB_PATHS.gtk4 = ${LIB_PATHS.gtk4}`);
console.log(`LIB_PATHS.gio = ${LIB_PATHS.gio}`);
console.log(`LIB_PATHS.glib = ${LIB_PATHS.glib}`);

// Check which MSYS2 directories exist (path changed in newer MSYS2 versions)
const MSYS2_BASE = ["C:/tools/msys64", "C:/msys64"];
const SUBDIRS = ["mingw64/bin", "ucrt64/bin", "clang64/bin", "clangarm64/bin", "mingw32/bin", "ucrt32/bin"];
for (const base of MSYS2_BASE) {
  if (Deno.statSync(base).isDirectory) {
    console.log(`${base}: FOUND`);
    for (const sub of SUBDIRS) {
      const full = `${base}/${sub}`;
      try {
        const info = Deno.statSync(full);
        if (info.isDirectory) {
          let count = 0;
          for (const _ of Deno.readDirSync(full)) count++;
          console.log(`  ${full}: EXISTS (${count} entries)`);
        }
      } catch {
        // not found
      }
    }
  } else {
    console.log(`${base}: NOT FOUND`);
  }
}

// Check specific DLL files
const dlls = ["libadwaita-1-0.dll", "libgtk-4-1.dll", "libgio-2.0-0.dll", "libglib-2.0-0.dll"];
for (const dll of dlls) {
  for (const dir of SEARCH_DIRS) {
    const fullPath = join(dir, dll);
    try {
      Deno.statSync(fullPath);
      console.log(`${fullPath}: EXISTS`);
      // Try loading with full path
      try {
        const lib = Deno.dlopen(fullPath, {});
        console.log(`  LOAD OK`);
        lib.close();
      } catch (e) {
        console.log(`  LOAD FAIL: ${(e as Error).message}`);
        // Try alternative loading with a single simple symbol
        try {
          if (dll === "libgio-2.0-0.dll") {
            // g_free is always available in glib
            const lib = Deno.dlopen(fullPath, { g_free: { parameters: ["pointer"], result: "void" } });
            console.log(`  LOAD WITH SYMBOL OK`);
            lib.close();
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // doesn't exist at this path
    }
  }
}

// Try using ntldd to check dependencies if available
const ntlddPaths = [
  "C:/tools/msys64/usr/bin/ntldd.exe",
  "C:/tools/msys64/mingw64/bin/ntldd.exe",
];
for (const ntlddPath of ntlddPaths) {
  try {
    Deno.statSync(ntlddPath);
    const cmd = new Deno.Command(ntlddPath, {
      args: ["R", join(SEARCH_DIRS[0], "libadwaita-1-0.dll")],
    });
    const { stdout } = cmd.outputSync();
    console.log("ntldd output for libadwaita:");
    console.log(new TextDecoder().decode(stdout));
  } catch {
    // ntldd not found
  }
}

// Try using objdump from MSYS2
const objdumpPaths = [
  "C:/tools/msys64/usr/bin/objdump.exe",
  "C:/tools/msys64/mingw64/bin/objdump.exe",
];
for (const objdumpPath of objdumpPaths) {
  try {
    Deno.statSync(objdumpPath);
    const cmd = new Deno.Command(objdumpPath, {
      args: ["-p", join(SEARCH_DIRS[0], "libadwaita-1-0.dll")],
    });
    const { stdout } = cmd.outputSync();
    const output = new TextDecoder().decode(stdout);
    // only print the DLL dependency lines
    const lines = output.split("\n").filter(l => l.includes("DLL Name"));
    console.log("objdump DLL dependencies for libadwaita:");
    for (const line of lines) console.log(`  ${line.trim()}`);
  } catch {
    // objdump not found
  }
}
